import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Google GenAI
function getGenAIClient(customKey?: string | null): GoogleGenAI | null {
  const key = customKey?.trim() || process.env.GEMINI_API_KEY || '';
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}
const FLASH_MODEL = 'gemini-3.8-flash';
const FALLBACK_FLASH_MODEL = 'gemini-2.5-flash';

function getValidVoice(requestedVoice?: string): string {
  const valid = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];
  if (requestedVoice && valid.includes(requestedVoice)) return requestedVoice;
  if (requestedVoice === 'Aoede') return 'Zephyr';
  return 'Kore';
}

import {
  EXPANSIVE_WORDS_BY_LEVEL,
  getCuratedWords,
  getRandomSessionTheme,
  getTotalWordBankCount,
} from './wordsData.ts';

// Server-side in-memory TTS audio cache (bounded to 1,500 entries, ~25 MB max RAM)
const serverTtsCache = new Map<string, { audio: string; format: string }>();
const MAX_SERVER_TTS_CACHE = 1500;

function setServerTtsCache(key: string, value: { audio: string; format: string }) {
  if (serverTtsCache.size >= MAX_SERVER_TTS_CACHE) {
    const oldestKey = serverTtsCache.keys().next().value;
    if (oldestKey) serverTtsCache.delete(oldestKey);
  }
  serverTtsCache.set(key, value);
}

// 0. Verify / Test user's personal Gemini API key
app.post('/api/spelling/test-key', async (req, res) => {
  const customKey = (req.headers['x-gemini-api-key'] as string) || req.body?.apiKey;
  const client = getGenAIClient(customKey);
  if (!client) {
    return res.status(400).json({ valid: false, error: 'No API key provided or configured.' });
  }

  try {
    const response = await client.models.generateContent({
      model: FLASH_MODEL,
      contents: 'Respond with the word OK.',
    });
    if (response.text) {
      return res.json({ valid: true, message: 'API key is valid and connected to Gemini Flash!' });
    }
    return res.status(400).json({ valid: false, error: 'Empty response from Gemini API.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error validating API key.';
    return res.status(400).json({ valid: false, error: msg });
  }
});

// 1. Generate 10 spelling words tailored to the child (Zero-token 600-word database by default)
app.post('/api/spelling/generate', async (req, res) => {
  const profile = req.body?.profile || {};
  const useAI = req.body?.useAI === true;
  const requestedLevel = Math.min(Math.max(Number(profile.difficultyLevel) || 2, 1), 5);
  const masteredWords: string[] = profile.masteredWords || [];
  const masteredSet = new Set(masteredWords.map((w) => w.toLowerCase().trim()));
  const sessionTheme = getRandomSessionTheme();

  // Check how many unmastered words remain in the pre-populated bank for this level
  const levelPool = EXPANSIVE_WORDS_BY_LEVEL[requestedLevel] || EXPANSIVE_WORDS_BY_LEVEL[2] || [];
  const unmasteredInBank = levelPool.filter((w) => !masteredSet.has(w.word.toLowerCase()));

  // Default: Serve directly from the 600-word pre-populated bank (0 Gemini tokens!)
  // Only invoke Gemini AI if explicitly requested (useAI: true) or if child mastered the entire level bank
  if (!useAI && unmasteredInBank.length >= 10) {
    return res.json({
      words: getCuratedWords(requestedLevel, profile.struggledWords, masteredWords),
      source: 'adaptive_bank',
      theme: sessionTheme,
      bankTotal: getTotalWordBankCount(),
    });
  }

  const customKey = (req.headers['x-gemini-api-key'] as string) || req.body?.customApiKey;
  const client = getGenAIClient(customKey);

  try {
    if (!client) {
      return res.json({
        words: getCuratedWords(requestedLevel, profile.struggledWords, masteredWords),
        source: 'adaptive_bank',
        theme: sessionTheme,
        bankTotal: getTotalWordBankCount(),
      });
    }

    const sessionSalt = Math.floor(Math.random() * 1000000);
    const eligibleStruggled = (profile.struggledWords || []).filter(
      (w: string) => !masteredSet.has(w.toLowerCase().trim())
    );
    const shuffledStruggled = [...eligibleStruggled].sort(() => 0.5 - Math.random());
    const wordsToRepeat = shuffledStruggled.slice(0, 3);

    const prompt = `
You are an expert elementary spelling teacher designing a 10-word spelling round for an ${profile.age || 8}-year-old child.
Current Difficulty Level: ${requestedLevel} out of 5 (Level 1 = accessible 1st/2nd grade words, Level 2 = early 3rd grade phonics, Level 3 = core 3rd grade multisyllabic words, Level 4 = 3rd/4th grade tricky vowels & prefixes/suffixes, Level 5 = challenging 4th/5th grade words with silent letters and roots).

STRICT LEARNING CONSTRAINTS:
1. MASTERED WORDS FORBIDDEN: The child has ALREADY correctly spelled and mastered the following words. You MUST NOT generate ANY of these words under any circumstances:
${masteredWords.length > 0 ? masteredWords.slice(0, 80).join(', ') : 'None yet'}

2. STRUGGLED REVIEW WORDS:
${wordsToRepeat.length > 0 ? `The child previously struggled with these words and needs to practice them: ${wordsToRepeat.join(', ')}` : 'None to review (generate 10 completely fresh words)'}

3. SESSION RANDOMNESS DIRECTIVE (Session #${sessionSalt}):
- Generate a completely fresh set of 10 words.
- Draw vocabulary inspired by the playful theme: "${sessionTheme}".
- Every word must be suitable for spelling tests at Level ${requestedLevel}.

For each of the 10 words, provide:
1. "word": The lowercase target word.
2. "phoneticBreakdown": Syllable/sound chunks (e.g., "el - e - phant" or "kn - igh - t").
3. "phoneticSpeechCue": A friendly spoken explanation of the sounds and letter patterns without spelling out every letter in advance.
4. "phonemes": 1 to 3 specific phoneme/orthographic tags present in the word.
5. "exampleSentence": A fun, engaging kid-friendly sentence using the word.
`;

    let response;
    try {
      response = await client.models.generateContent({
        model: FLASH_MODEL,
        contents: prompt,
        config: {
          temperature: 1.0,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'List of exactly 10 spelling words for the round.',
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                phoneticBreakdown: { type: Type.STRING },
                phoneticSpeechCue: { type: Type.STRING },
                phonemes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                exampleSentence: { type: Type.STRING },
              },
              required: [
                'word',
                'phoneticBreakdown',
                'phoneticSpeechCue',
                'phonemes',
                'exampleSentence',
              ],
            },
          },
        },
      });
    } catch {
      response = await client.models.generateContent({
        model: FALLBACK_FLASH_MODEL,
        contents: prompt,
        config: {
          temperature: 1.0,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'List of exactly 10 spelling words for the round.',
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                phoneticBreakdown: { type: Type.STRING },
                phoneticSpeechCue: { type: Type.STRING },
                phonemes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                exampleSentence: { type: Type.STRING },
              },
              required: [
                'word',
                'phoneticBreakdown',
                'phoneticSpeechCue',
                'phonemes',
                'exampleSentence',
              ],
            },
          },
        },
      });
    }

    const jsonText = response.text?.trim() || '[]';
    const parsed = JSON.parse(jsonText);
    const list = Array.isArray(parsed) ? parsed : parsed.words;
    if (Array.isArray(list) && list.length > 0) {
      const filtered = list.filter((item) => !masteredSet.has(item.word.toLowerCase().trim()));
      if (filtered.length >= 10) {
        return res.json({ words: filtered.slice(0, 10), source: 'ai', theme: sessionTheme });
      }
      const backfill = getCuratedWords(requestedLevel, profile.struggledWords, masteredWords);
      const existing = new Set(filtered.map((w) => w.word.toLowerCase()));
      for (const item of backfill) {
        if (!existing.has(item.word.toLowerCase())) {
          filtered.push(item);
          existing.add(item.word.toLowerCase());
        }
        if (filtered.length >= 10) break;
      }
      return res.json({ words: filtered.slice(0, 10), source: 'ai', theme: sessionTheme });
    }
    return res.json({
      words: getCuratedWords(requestedLevel, profile.struggledWords, masteredWords),
      source: 'adaptive_bank',
      theme: sessionTheme,
    });
  } catch {
    return res.json({
      words: getCuratedWords(requestedLevel, profile.struggledWords, masteredWords),
      source: 'adaptive_bank',
      theme: sessionTheme,
    });
  }
});

function cleanSpokenText(input: string): string {
  let cleaned = input.trim();
  cleaned = cleaned.replace(/^(?:Speaking|Speak)\s+(?:in\s+a\s+[^:,\.\n]+|slowly[^:,\.\n]*|kindly[^:,\.\n]*)[,:.\s-]*/i, '');
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
  return cleaned;
}

/**
 * Converts raw 24kHz 16-bit mono signed PCM (returned by Gemini TTS) into a compact,
 * universally playable RIFF WAV (12kHz or 8kHz 16-bit mono) guaranteed to fit < 190KB base64
 * for permanent Firestore /tts_cache storage and native HTML5 <audio> playback on macOS/AirPods & iOS.
 */
function convertPcm24kToCompactWavBase64(base64Pcm: string): string {
  const pcmBuf = Buffer.from(base64Pcm, 'base64');
  const totalInputSamples = Math.floor(pcmBuf.length / 2);

  // Use 2:1 downsample (12kHz) for clips up to ~5.6s; 3:1 (8kHz) for longer clips so base64 < 190,000 chars
  const ratio = totalInputSamples > 135000 ? 3 : 2;
  const sampleRate = Math.floor(24000 / ratio);
  const outSamples = Math.floor(totalInputSamples / ratio);
  const dataByteLength = outSamples * 2;

  const wavBuf = Buffer.alloc(44 + dataByteLength);
  // RIFF header
  wavBuf.write('RIFF', 0);
  wavBuf.writeUInt32LE(36 + dataByteLength, 4);
  wavBuf.write('WAVE', 8);
  // fmt subchunk
  wavBuf.write('fmt ', 12);
  wavBuf.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  wavBuf.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  wavBuf.writeUInt16LE(1, 22);  // NumChannels (1 = mono)
  wavBuf.writeUInt32LE(sampleRate, 24); // SampleRate
  wavBuf.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  wavBuf.writeUInt16LE(2, 32);  // BlockAlign
  wavBuf.writeUInt16LE(16, 34); // BitsPerSample
  // data subchunk
  wavBuf.write('data', 36);
  wavBuf.writeUInt32LE(dataByteLength, 40);

  // Low-pass box-filter averaging during downsampling to prevent aliasing
  for (let i = 0; i < outSamples; i++) {
    let sum = 0;
    const baseIdx = i * ratio;
    for (let j = 0; j < ratio; j++) {
      sum += pcmBuf.readInt16LE((baseIdx + j) * 2);
    }
    const avg = Math.max(-32768, Math.min(32767, Math.round(sum / ratio)));
    wavBuf.writeInt16LE(avg, 44 + i * 2);
  }

  return wavBuf.toString('base64');
}

async function generateGeminiTtsWav(
  textToSpeak: string,
  voiceName: string,
  customKey?: string | null
): Promise<{ audio: string; format: string } | null> {
  const client = getGenAIClient(customKey);
  if (!client) return null;

  const expressivePrompt = `Say in a warm, clear, natural elementary school teacher voice with a brief pause between sentences: ${textToSpeak}`;

  try {
    let response;
    try {
      response = await client.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [
          {
            role: 'user',
            parts: [{ text: expressivePrompt }],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });
    } catch {
      response = await client.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [{ text: expressivePrompt }],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });
    }

    const base64Pcm = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Pcm) {
      const compactWavBase64 = convertPcm24kToCompactWavBase64(base64Pcm);
      return { audio: compactWavBase64, format: 'audio/wav' };
    }
  } catch {
    // Fall through to backup speech if Gemini TTS fails or hits rate limit
  }
  return null;
}

const EDGE_TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const EDGE_CHROMIUM_FULL_VERSION = '130.0.2849.68';
const EDGE_SEC_MS_GEC_VERSION = `1-${EDGE_CHROMIUM_FULL_VERSION}`;

function generateSecMsGec(): string {
  let ticks = Math.floor(Date.now() / 1000) + 11644473600;
  ticks -= ticks % 300;
  const ticks100ns = Math.round(ticks * 1e7);
  const strToHash = `${ticks100ns}${EDGE_TRUSTED_CLIENT_TOKEN}`;
  return crypto.createHash('sha256').update(strToHash, 'ascii').digest('hex').toUpperCase();
}

function escapeXmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates studio-quality neural MP3 speech (~18-22 KB/word, 0 Gemini tokens, no RPM/RPD quota)
 * using Microsoft Edge Read-Aloud Neural TTS (en-US-AvaNeural warm teacher voice).
 */
async function fetchEdgeNeuralSpeech(
  text: string,
  voice = 'en-US-AvaNeural'
): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: string | null) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };

    const timeout = setTimeout(() => {
      try {
        ws.close();
      } catch {}
      finish(null);
    }, 2000);

    const connectionId = crypto.randomBytes(16).toString('hex');
    const requestId = crypto.randomBytes(16).toString('hex');
    const secMsGec = generateSecMsGec();
    const muid = crypto.randomBytes(16).toString('hex').toUpperCase();

    const wsUrl =
      `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1` +
      `?TrustedClientToken=${EDGE_TRUSTED_CLIENT_TOKEN}` +
      `&Sec-MS-GEC=${secMsGec}` +
      `&Sec-MS-GEC-Version=${EDGE_SEC_MS_GEC_VERSION}` +
      `&ConnectionId=${connectionId}`;

    // Add natural teacher pacing between sentences ("word. sentence. Spell word.")
    const pacedText = text.replace(/\.\s+/g, ' ... ');
    const escapedText = escapeXmlText(pacedText);

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl, {
        headers: {
          Pragma: 'no-cache',
          'Cache-Control': 'no-cache',
          Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'en-US,en;q=0.9',
          Cookie: `muid=${muid};`,
        },
      });
    } catch {
      clearTimeout(timeout);
      finish(null);
      return;
    }

    const audioChunks: Buffer[] = [];

    ws.on('open', () => {
      const timestamp = new Date().toISOString();
      const configMsg =
        `X-Timestamp:${timestamp}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`;

      const ssmlMsg =
        `X-RequestId:${requestId}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${timestamp}Z\r\n` +
        `Path:ssml\r\n\r\n` +
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
        `<voice name='${voice}'>` +
        `<prosody pitch='+0Hz' rate='-5%' volume='+0%'>${escapedText}</prosody>` +
        `</voice></speak>`;

      ws.send(configMsg);
      ws.send(ssmlMsg);
    });

    ws.on('message', (data: WebSocket.RawData, isBinary: boolean) => {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
      if (isBinary) {
        if (buf.length < 2) return;
        const headerLen = buf.readUInt16BE(0);
        if (buf.length > 2 + headerLen) {
          const headerStr = buf.subarray(2, 2 + headerLen).toString('utf8');
          if (headerStr.includes('Path:audio')) {
            audioChunks.push(buf.subarray(2 + headerLen));
          }
        }
      } else {
        const textMsg = buf.toString('utf8');
        if (textMsg.includes('Path:turn.end')) {
          clearTimeout(timeout);
          try {
            ws.close();
          } catch {}
          if (audioChunks.length > 0) {
            finish(Buffer.concat(audioChunks).toString('base64'));
          } else {
            finish(null);
          }
        }
      }
    });

    ws.on('error', () => {
      clearTimeout(timeout);
      finish(null);
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      if (audioChunks.length > 0) {
        finish(Buffer.concat(audioChunks).toString('base64'));
      } else {
        finish(null);
      }
    });
  });
}

async function fetchNaturalStudioSpeech(text: string): Promise<string | null> {
  try {
    const chunks: Buffer[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    for (const s of sentences) {
      const trimmed = s.trim();
      if (!trimmed) continue;
      const url =
        'https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=' +
        encodeURIComponent(trimmed);
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (!res.ok) return null;
      const arrayBuf = await res.arrayBuffer();
      chunks.push(Buffer.from(arrayBuf));
    }
    if (chunks.length === 0) return null;
    return Buffer.concat(chunks).toString('base64');
  } catch {
    return null;
  }
}

// 2. Text-to-Speech audio generation (Edge Neural 'en-US-AvaNeural' MP3 -> Gemini Native TTS WAV -> Studio Fallback)
app.post('/api/spelling/tts', async (req, res) => {
  const { prompt, text, voice } = req.body;
  const rawText = prompt || text;
  if (!rawText) {
    return res.status(400).json({ error: 'No text provided for TTS.' });
  }
  const textToSpeak = cleanSpokenText(rawText);
  const cacheKey = `neural_v3_Ava:${textToSpeak.toLowerCase()}`;

  // 0. Check server in-memory TTS cache first
  const cached = serverTtsCache.get(cacheKey);
  if (cached) {
    return res.json({ audio: cached.audio, format: cached.format, cached: true });
  }

  // 1. Primary Path: High-speed Natural Studio Speech (MP3) — 0 Gemini tokens, instant response (~100ms)
  const naturalFallback = await fetchNaturalStudioSpeech(textToSpeak);
  if (naturalFallback) {
    const entry = { audio: naturalFallback, format: 'audio/mp3' };
    setServerTtsCache(cacheKey, entry);
    return res.json({ ...entry, cached: false });
  }

  // 2. Secondary Path: Edge Neural Speech
  const edgeNeuralMp3 = await fetchEdgeNeuralSpeech(textToSpeak, 'en-US-AvaNeural');
  if (edgeNeuralMp3) {
    const entry = { audio: edgeNeuralMp3, format: 'audio/mp3' };
    setServerTtsCache(cacheKey, entry);
    return res.json({ ...entry, cached: false });
  }

  // 3. Tertiary Path: Gemini 2.5 Flash Native TTS ('Kore') encoded as compact WAV
  const customKey = (req.headers['x-gemini-api-key'] as string) || req.body?.customApiKey;
  const voiceName = getValidVoice(voice);
  const geminiWav = await generateGeminiTtsWav(textToSpeak, voiceName, customKey);
  if (geminiWav) {
    setServerTtsCache(cacheKey, geminiWav);
    return res.json({ ...geminiWav, cached: false });
  }

  return res.json({ audio: null, error: 'Could not generate speech audio.' });
});

// 2b. Batch Pre-Create TTS Audio for up to 25 words at a time (0 Gemini tokens)
app.post('/api/spelling/tts-batch', async (req, res) => {
  const items: Array<{ word: string; exampleSentence: string }> = Array.isArray(req.body?.items)
    ? req.body.items.slice(0, 25)
    : [];

  const generated: Record<string, { audio: string; format: string }> = {};

  // Process in parallel chunks of 10 for fast, reliable batch pre-caching
  for (let i = 0; i < items.length; i += 10) {
    const chunk = items.slice(i, i + 10);
    await Promise.all(
      chunk.map(async (item) => {
        if (!item?.word) return;
        const cleanWord = item.word.toLowerCase().trim();
        const textToSpeak = `${cleanWord}. ${item.exampleSentence || ''}. Spell ${cleanWord}.`;
        const cacheKey = `neural_v3_Ava:${textToSpeak.toLowerCase()}`;

        let entry = serverTtsCache.get(cacheKey);
        if (!entry) {
          // 1. Natural studio speech (fast ~100ms MP3)
          const naturalAudio = await fetchNaturalStudioSpeech(textToSpeak);
          if (naturalAudio) {
            entry = { audio: naturalAudio, format: 'audio/mp3' };
            setServerTtsCache(cacheKey, entry);
          } else {
            // 2. Edge neural speech fallback
            const mp3Audio = await fetchEdgeNeuralSpeech(textToSpeak, 'en-US-AvaNeural');
            if (mp3Audio) {
              entry = { audio: mp3Audio, format: 'audio/mp3' };
              setServerTtsCache(cacheKey, entry);
            }
          }
        }
        if (entry) {
          generated[cleanWord] = entry;
        }
      })
    );
  }

  return res.json({ generated, count: Object.keys(generated).length });
});

// Free neural TTS endpoint - safely delegates to browser speech or studio TTS
app.post('/api/free-neural-tts', (_req, res) => {
  return res.json({ audio: null, message: 'Browser speech synthesis is active.' });
});

// 3. Vision OCR Grading of child's handwritten sheet with bounding boxes
app.post('/api/spelling/grade', async (req, res) => {
  const words = req.body?.words || [];
  try {
    const customKey = (req.headers['x-gemini-api-key'] as string) || req.body?.customApiKey;
    const client = getGenAIClient(customKey);
    if (!client) {
      throw new Error('Gemini API is not configured.');
    }

    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 in request.' });
    }

    const wordListDescription = words
      .map(
        (w: { word: string }, idx: number) =>
          `Word #${idx + 1}: Expected spelling is "${w.word.toLowerCase()}"`
      )
      .join('\n');

    const prompt = `
You are an expert elementary school teacher grading a handwritten spelling test written on paper by an 8-year-old child.
Target words in numbered order (1 to 10):
${wordListDescription}

CRITICAL RULES FOR PRECISE, ACCURATE GRADING:
1. STRICT LETTER-BY-LETTER TRANSCRIPTION (ABSOLUTELY NO AUTOCORRECT):
   - You MUST transcribe EXACTLY the letters the child physically drew on the paper into "transcribedText".
   - DO NOT autocorrect or normalize mistakes! 8-year-olds frequently omit silent letters (e.g., writing "brige" instead of "bridge", "shado" instead of "shadow", "nigt" instead of "knight", "clim" instead of "climb").
   - If the child wrote "Brige", transcribe EXACTLY "Brige" (do NOT add the missing 'd').
   - If the child wrote "Shadow", transcribe EXACTLY "Shadow".
   - Inspect every letter carefully: count the letters and examine each stroke.

2. PRECISE LETTER COMPARISON & "isCorrect" DECISION:
   - Compare the child's letters directly against the expected word letters:
     * If ALL letters are present and in the correct order (e.g., "Shadow" matching expected "shadow") -> "isCorrect": true.
     * If ANY letter is missing, extra, or wrong (e.g., "Brige" instead of "Bridge" - missing 'd') -> "isCorrect": false.
     * NEVER mark a misspelled word as true!
     * NEVER mark a correctly spelled word as false!

3. WORD NUMBER & POSITION MATCHING:
   - Locate where each numbered word (#1 through #10) is written on the page.
   - If the child wrote words in two columns (e.g. 1-5 on left, 6-10 on right) or out of numerical order, match each attempt carefully to its corresponding target word.

4. BOUNDING BOX:
   - "box2d": [ymin, xmin, ymax, xmax] normalized from 0 to 1000 tightly around the child's handwritten word on the page.

5. SPECIFIC FEEDBACK & SCORE:
   - "feedback": Short, friendly feedback explaining specifically what was correct or what letter was missed (e.g., "Missed the silent 'd' in bridge: b-r-i-d-g-e" or "Spot-on! All letters correct.").
   - "totalScore": Total number of correctly spelled words (0 to 10).
   - "encouragementMessage": A warm, encouraging sentence for the student.
`;

    const imagePart = {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    };

    const response = await client.models.generateContent({
      model: FLASH_MODEL,
      contents: {
        parts: [imagePart, { text: prompt }],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            totalScore: { type: Type.INTEGER },
            encouragementMessage: { type: Type.STRING },
            results: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  wordNumber: { type: Type.INTEGER },
                  expectedWord: { type: Type.STRING },
                  transcribedText: { type: Type.STRING },
                  isCorrect: { type: Type.BOOLEAN },
                  box2d: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                    description: 'Normalized [ymin, xmin, ymax, xmax] from 0 to 1000',
                  },
                  feedback: { type: Type.STRING },
                },
                required: [
                  'wordNumber',
                  'expectedWord',
                  'transcribedText',
                  'isCorrect',
                  'box2d',
                  'feedback',
                ],
              },
            },
          },
          required: ['totalScore', 'results', 'encouragementMessage'],
        },
      },
    });

    const jsonText = response.text?.trim() || '{}';
    const parsed = JSON.parse(jsonText);

    // Programmatic verification: ensure isCorrect strictly matches transcribed letters vs expected letters
    if (Array.isArray(parsed.results)) {
      parsed.results.forEach((r: {
        wordNumber: number;
        expectedWord: string;
        transcribedText: string;
        isCorrect: boolean;
        feedback: string;
      }) => {
        const cleanTranscribed = (r.transcribedText || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z]/g, '');
        const cleanExpected = (r.expectedWord || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z]/g, '');

        if (cleanTranscribed.length > 0 && cleanTranscribed === cleanExpected) {
          r.isCorrect = true;
          if (!r.feedback || /incorrect|wrong|missed|needs practice/i.test(r.feedback)) {
            r.feedback = 'Spot-on! All letters spelled correctly.';
          }
        } else if (cleanTranscribed.length > 0 && cleanTranscribed !== cleanExpected) {
          r.isCorrect = false;
          if (!r.feedback || /perfect|correct|spot-on|great job/i.test(r.feedback)) {
            r.feedback = `Expected "${r.expectedWord}", but transcribed "${r.transcribedText}".`;
          }
        }
      });
      parsed.totalScore = parsed.results.filter((r: { isCorrect: boolean }) => r.isCorrect).length;
    }

    return res.json(parsed);
  } catch (err: unknown) {
    let errMsg = err instanceof Error ? err.message : 'Could not grade handwriting.';
    if (typeof errMsg === 'string' && (errMsg.includes('402') || errMsg.includes('prepayment') || errMsg.includes('credits'))) {
      errMsg = 'Your Gemini API key prepayment credits are depleted. Please paste your personal free Gemini API key in Settings to grade handwritten tests.';
    }
    console.warn('Grading request error:', errMsg);
    return res.status(400).json({ error: errMsg });
  }
});

// Serve frontend in production or mount Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SpellBuddy AI running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
