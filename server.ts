import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
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
  return 'Puck';
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

// 2. Text-to-Speech audio generation (Zero-Token Cached Natural Studio MP3 by default, Gemini TTS optional)
app.post('/api/spelling/tts', async (req, res) => {
  const { prompt, text, voice, useGeminiTts = false } = req.body;
  const rawText = prompt || text;
  if (!rawText) {
    return res.status(400).json({ error: 'No text provided for TTS.' });
  }
  const textToSpeak = cleanSpokenText(rawText);
  const cacheKey = `${useGeminiTts ? getValidVoice(voice) : 'studio'}:${textToSpeak.toLowerCase()}`;

  // 0. Check server in-memory TTS cache first
  const cached = serverTtsCache.get(cacheKey);
  if (cached) {
    return res.json({ audio: cached.audio, format: cached.format, cached: true });
  }

  // 1. Default Zero-Token Path: Compact Natural Studio MP3 (~15-20 KB, fits easily in Firestore free tier)
  if (!useGeminiTts) {
    const naturalAudio = await fetchNaturalStudioSpeech(textToSpeak);
    if (naturalAudio) {
      const entry = { audio: naturalAudio, format: 'audio/mp3' };
      setServerTtsCache(cacheKey, entry);
      return res.json({ ...entry, cached: false });
    }
  }

  // 2. Optional or Fallback Gemini Flash Native TTS
  const customKey = (req.headers['x-gemini-api-key'] as string) || req.body?.customApiKey;
  const client = getGenAIClient(customKey);
  if (client) {
    try {
      const voiceName = getValidVoice(voice);
      let response;
      try {
        response = await client.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [{ text: textToSpeak }],
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
          model: 'gemini-2.5-flash-preview-tts',
          contents: [
            {
              role: 'user',
              parts: [{ text: textToSpeak }],
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

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const entry = { audio: base64Audio, format: 'audio/pcm' };
        setServerTtsCache(cacheKey, entry);
        return res.json({ ...entry, cached: false });
      }
    } catch {
      // Fallback to studio speech if Gemini TTS fails
    }
  }

  // 3. Final fallback to Natural Studio Speech if Gemini TTS was requested and failed
  const naturalFallback = await fetchNaturalStudioSpeech(textToSpeak);
  if (naturalFallback) {
    const entry = { audio: naturalFallback, format: 'audio/mp3' };
    setServerTtsCache(cacheKey, entry);
    return res.json({ ...entry, cached: false });
  }

  return res.json({ audio: null, error: 'Could not generate speech audio.' });
});

// 2b. Batch Pre-Create TTS Audio for a list of words (0 Gemini tokens, compact MP3s for Firestore caching)
app.post('/api/spelling/tts-batch', async (req, res) => {
  const items: Array<{ word: string; exampleSentence: string }> = Array.isArray(req.body?.items)
    ? req.body.items.slice(0, 25)
    : [];

  const generated: Record<string, { audio: string; format: string }> = {};
  for (const item of items) {
    if (!item?.word) continue;
    const cleanWord = item.word.toLowerCase().trim();
    const textToSpeak = `${cleanWord}. ${item.exampleSentence || ''}. Spell ${cleanWord}.`;
    const cacheKey = `studio:${textToSpeak.toLowerCase()}`;

    let entry = serverTtsCache.get(cacheKey);
    if (!entry) {
      const audio = await fetchNaturalStudioSpeech(textToSpeak);
      if (audio) {
        entry = { audio, format: 'audio/mp3' };
        setServerTtsCache(cacheKey, entry);
      }
    }
    if (entry) {
      generated[cleanWord] = entry;
    }
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
