import { KidProfile, RoundGradingResponse, WordItem } from '../types';
import { getRandomSpellingWords } from '../wordBank';

export type StudioVoice = 'Puck' | 'Kore' | 'Aoede' | 'PuckAdult';

const CUSTOM_KEY_STORAGE = 'spellbuddy_custom_gemini_api_key';

export function getCustomApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(CUSTOM_KEY_STORAGE) || '';
}

export function setCustomApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = key.trim();
  if (!trimmed) {
    localStorage.removeItem(CUSTOM_KEY_STORAGE);
  } else {
    localStorage.setItem(CUSTOM_KEY_STORAGE, trimmed);
  }
}

export function getRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const customKey = getCustomApiKey();
  if (customKey) {
    headers['x-gemini-api-key'] = customKey;
  }
  return headers;
}

// Shared Web Audio API context & in-memory AudioBuffer cache for instant replays
let audioContext: AudioContext | null = null;
let activeSourceNode: AudioBufferSourceNode | null = null;
const audioBufferCache = new Map<string, AudioBuffer>();
const inflightRequests = new Map<string, Promise<AudioBuffer>>();

function getAudioContext(): AudioContext {
  if (!audioContext) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    try {
      // Do NOT specify custom sampleRate on initial AudioContext creation, as iOS Safari throws NotSupportedError
      audioContext = new AudioCtx();
    } catch {
      audioContext = new (window as any).webkitAudioContext();
    }
  }
  return audioContext!;
}

let hasUnlockedIOSAudio = false;

/**
 * Synchronously unlocks iOS WebKit AudioContext and SpeechSynthesis audio engines.
 * Must be executed synchronously within user interaction touchstart/click event.
 */
export function unlockAudioOnIOS(): void {
  if (typeof window === 'undefined') return;

  // 1. Unlock Web Audio Context
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    // Play a 1-sample silent buffer to unlock the hardware audio pipeline
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {}

  // 2. Unlock SpeechSynthesis on iOS Safari
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.resume();
      if (!hasUnlockedIOSAudio) {
        hasUnlockedIOSAudio = true;
        const dummy = new SpeechSynthesisUtterance(' ');
        dummy.volume = 0.01;
        dummy.rate = 10;
        dummy.lang = 'en-US';
        window.speechSynthesis.speak(dummy);
      }
    } catch {}
  }
}

// Automatically install global touch listeners to prime audio on any early touch
if (typeof window !== 'undefined') {
  const primeHandler = () => {
    unlockAudioOnIOS();
  };
  window.addEventListener('touchstart', primeHandler, { passive: true, capture: true });
  window.addEventListener('click', primeHandler, { passive: true, capture: true });
}

/**
 * Converts base64-encoded 16-bit 24kHz mono PCM into a playable Web AudioBuffer.
 */
function decodeBase64PCMToAudioBuffer(base64Data: string, ctx: AudioContext): AudioBuffer {
  const binaryString = window.atob(base64Data);
  const byteLength = binaryString.length;
  const bytes = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const int16Data = new Int16Array(bytes.buffer);
  const float32Data = new Float32Array(int16Data.length);
  for (let i = 0; i < int16Data.length; i++) {
    float32Data[i] = int16Data[i] / 32768.0;
  }

  const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
  audioBuffer.getChannelData(0).set(float32Data);
  return audioBuffer;
}

/**
 * Decodes audio data, supporting both standard WAV containers and headerless raw PCM.
 */
async function decodeAudioDataOrPCM(base64Data: string, ctx: AudioContext): Promise<AudioBuffer> {
  const binaryString = window.atob(base64Data);
  const byteLength = binaryString.length;
  const bytes = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  try {
    return await ctx.decodeAudioData(bytes.buffer.slice(0));
  } catch {
    // If not standard container, fallback to raw 16-bit 24kHz mono PCM
    return decodeBase64PCMToAudioBuffer(base64Data, ctx);
  }
}

/**
 * Stops any currently playing Gemini audio or browser fallback speech safely without deadlocking iOS speech queue.
 */
export function stopCurrentAudio(): void {
  if (activeSourceNode) {
    try {
      activeSourceNode.stop();
      activeSourceNode.disconnect();
    } catch {}
    activeSourceNode = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
      } catch {}
    }
  }
}

export type TTSErrorListener = (errorMessage: string) => void;
const ttsErrorListeners = new Set<TTSErrorListener>();

export function onTTSError(listener: TTSErrorListener): () => void {
  ttsErrorListeners.add(listener);
  return () => {
    ttsErrorListeners.delete(listener);
  };
}

function notifyTTSError(message: string): void {
  ttsErrorListeners.forEach((fn) => {
    try {
      fn(message);
    } catch {
      // Ignore listener error
    }
  });
}

/**
 * Fetches and caches an AudioBuffer for a specific cacheKey and voice.
 * Tries Gemini TTS first, and automatically falls back to Free Microsoft Edge Neural voices on 402/429/errors.
 */
async function getOrFetchTTSBuffer(
  promptDirection: string,
  cacheKey: string,
  voiceName: StudioVoice
): Promise<AudioBuffer> {
  const fullKey = `${voiceName}:${cacheKey}`;

  const cached = audioBufferCache.get(fullKey);
  if (cached) {
    return cached;
  }

  const existingInflight = inflightRequests.get(fullKey);
  if (existingInflight) {
    return existingInflight;
  }

  const fetchPromise = (async () => {
    let base64Audio: string | null = null;
    let geminiError: string | null = null;

    const geminiVoice = voiceName === 'PuckAdult' ? 'Puck' : voiceName;
    try {
      const res = await fetch('/api/spelling/tts', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({ prompt: promptDirection, voice: geminiVoice }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audio) {
          base64Audio = data.audio;
        } else if (data.error) {
          geminiError = data.error;
        }
      } else {
        geminiError = `TTS request failed (${res.status})`;
      }
    } catch (e) {
      geminiError = e instanceof Error ? e.message : 'Gemini TTS request error';
    }

    if (!base64Audio) {
      throw new Error(geminiError || 'Audio stream unavailable.');
    }

    const ctx = getAudioContext();
    const buffer = await decodeAudioDataOrPCM(base64Audio, ctx);
    audioBufferCache.set(fullKey, buffer);
    inflightRequests.delete(fullKey);
    return buffer;
  })();

  inflightRequests.set(fullKey, fetchPromise);

  try {
    return await fetchPromise;
  } catch (err) {
    inflightRequests.delete(fullKey);
    throw err;
  }
}



/**
 * Speaks text using Gemini 2.5 Flash Native TTS with Web AudioBuffer caching for instant replays.
 * When Gemini TTS fails, logs the exact error and notifies error listeners (no silent speechSynthesis fallback).
 */
let geminiTtsQuotaHit = false;

/**
 * Speaks text using Gemini 2.5 Flash Native TTS with Web AudioBuffer caching for instant replays.
 * If Gemini TTS quota is exceeded, seamlessly switches to tuned browser speech with authentic child pitch.
 */
export async function speakWithGeminiTTS(
  promptDirection: string,
  _fallbackPlainText: string,
  cacheKey: string,
  voiceName: StudioVoice = 'Puck',
  onEnded?: () => void
): Promise<void> {
  // 1. Immediately unlock iOS audio within the direct user interaction frame
  unlockAudioOnIOS();
  stopCurrentAudio();

  // If server quota is known to be exceeded and user hasn't supplied a custom key,
  // speak via browser immediately to avoid an async roundtrip that could expire iOS user gesture
  if (geminiTtsQuotaHit && !getCustomApiKey()) {
    playWithBrowserSpeech(_fallbackPlainText, voiceName, onEnded);
    return;
  }

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    const buffer = await getOrFetchTTSBuffer(promptDirection, cacheKey, voiceName);

    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    // Keep playbackRate at natural 1.0 for studio-quality human speech (avoids robotic chipmunk distortion)
    source.playbackRate.value = 1.0;
    source.connect(ctx.destination);
    activeSourceNode = source;

    source.onended = () => {
      if (activeSourceNode === source) {
        activeSourceNode = null;
      }
      onEnded?.();
    };

    source.start(0);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/quota|429|resource_exhausted/i.test(msg)) {
      geminiTtsQuotaHit = true;
    }
    // Seamlessly pronounce via browser speech with natural human voice
    playWithBrowserSpeech(_fallbackPlainText, voiceName, onEnded);
  }
}

/**
 * Plays text using browser speech synthesis with natural human voices.
 * Crucially keeps pitch at 1.0 on iOS Safari to prevent Apple from degrading into its robotic vocoder engine.
 */
export function playWithBrowserSpeech(
  text: string,
  voiceName: StudioVoice = 'Puck',
  onEnded?: () => void
): void {
  if (typeof window === 'undefined') {
    onEnded?.();
    return;
  }

  unlockAudioOnIOS();

  if ('speechSynthesis' in window) {
    // Clear any stuck queue and ensure synthesis engine is active
    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {}

    const utterance = new SpeechSynthesisUtterance(text);
    // Explicit lang is mandatory on iOS Safari, otherwise it stays completely silent
    utterance.lang = 'en-US';

    const voices = window.speechSynthesis.getVoices();

    // Filter out legacy robotic novelty voices on iOS / macOS (Fred, Junior, Zarvox, Albert, etc.)
    const naturalVoices = voices.filter(
      (v) =>
        !/fred|junior|zarvox|albert|bad news|bells|boing|cellos|deranged|good news|hysterical|pipe organ|trinoids|whisper/i.test(
          v.name
        )
    );

    // Find the best quality human voice (Ava, Samantha, Nicky, Siri, Allison)
    const bestHumanVoice =
      naturalVoices.find(
        (v) =>
          /ava|samantha|nicky|siri|allison|karen|zoe|jenny/i.test(v.name) &&
          v.lang.startsWith('en')
      ) ||
      naturalVoices.find((v) => /natural|enhanced|premium/i.test(v.name) && v.lang.startsWith('en')) ||
      naturalVoices.find((v) => v.lang.startsWith('en')) ||
      voices[0];

    if (bestHumanVoice) {
      utterance.voice = bestHumanVoice;
    }

    // CRITICAL: Pitch MUST be 1.0 on iOS Safari! Any pitch deviation forces Apple to downgrade to a tinny, robotic legacy synthesizer
    utterance.pitch = 1.0;
    utterance.rate = 0.94; // Clear, relaxed educational tempo

    let hasEnded = false;
    const finish = () => {
      if (!hasEnded) {
        hasEnded = true;
        onEnded?.();
      }
    };

    utterance.onend = finish;
    utterance.onerror = () => {
      finish();
    };

    // A tiny 35ms timeout ensures iOS Safari's speech subsystem is primed after any prior cancel
    setTimeout(() => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch {
        finish();
      }
    }, 35);
  } else {
    onEnded?.();
  }
}

/**
 * Background prefetching is disabled to prevent 429 rate-limit errors on the free tier.
 * Audio is generated strictly on-demand when clicked and cached in AudioBuffer for instant replay.
 */
export function prefetchWordAudio(
  _wordItem: WordItem,
  _wordNumber: number,
  _voiceName: StudioVoice
): void {
  // On-demand generation only
}

export interface RoundGenerationResult {
  words: WordItem[];
  source: 'ai' | 'adaptive_bank';
  theme?: string;
}

/**
 * Generates 10 adaptive spelling words tailored to the child's current difficulty level
 * and mixes in struggled words from previous rounds. Words are truly randomized every session.
 * Returns word list and generation metadata (AI vs adaptive bank, session theme).
 */
export async function generateSpellingRoundWithMeta(profile: KidProfile): Promise<RoundGenerationResult> {
  try {
    const res = await fetch('/api/spelling/generate', {
      method: 'POST',
      headers: getRequestHeaders(),
      body: JSON.stringify({ profile }),
    });

    if (res.ok) {
      const data = await res.json();
      const list: WordItem[] = Array.isArray(data) ? data : data.words;
      if (Array.isArray(list) && list.length > 0) {
        return {
          words: list.slice(0, 10),
          source: data.source === 'ai' ? 'ai' : 'adaptive_bank',
          theme: data.theme,
        };
      }
    }
  } catch (err) {
    console.warn('API generate round failed, using randomized fallback bank:', err);
  }

  // Purely randomized Fisher-Yates word generation across all 5 levels excluding mastered words
  const fallbackList = getRandomSpellingWords(
    profile.difficultyLevel || 2,
    profile.struggledWords || [],
    profile.masteredWords || []
  );
  return {
    words: fallbackList,
    source: 'adaptive_bank',
  };
}

/**
 * Generates 10 adaptive spelling words tailored to an child's current difficulty level
 * and mixes in struggled words from previous rounds. Words are truly randomized every session.
 */
export async function generateSpellingRound(profile: KidProfile): Promise<WordItem[]> {
  const result = await generateSpellingRoundWithMeta(profile);
  return result.words;
}

/**
 * Performs OCR on the child's handwritten spelling sheet, grades each of the 10 words,
 * and returns normalized 2D bounding boxes so checkmarks and crosses can be drawn on the image.
 */
export async function gradeHandwrittenSheet(
  base64Image: string,
  mimeType: string,
  words: WordItem[]
): Promise<RoundGradingResponse> {
  const res = await fetch('/api/spelling/grade', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({
      imageBase64: base64Image,
      mimeType,
      words,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to grade handwritten sheet.');
  }

  return (await res.json()) as RoundGradingResponse;
}
