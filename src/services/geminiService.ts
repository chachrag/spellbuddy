import { KidProfile, RoundGradingResponse, WordItem } from '../types';
import { getRandomSpellingWords, getRandomSessionTheme } from '../wordBank';
import { getCachedTtsFromFirestore, saveCachedTtsToFirestore } from './firebase';

export type StudioVoice = 'Puck' | 'Kore' | 'Aoede' | 'PuckAdult';

const CUSTOM_KEY_STORAGE = 'spellbuddy_custom_gemini_api_key';
const IDB_NAME = 'spellbuddy_tts_idb_v1';
const IDB_STORE = 'tts_audio';

function openTtsIdb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function getIdbAudio(key: string): Promise<string | null> {
  const db = await openTtsIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function setIdbAudio(key: string, base64Audio: string): Promise<void> {
  const db = await openTtsIdb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(base64Audio, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

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

// Shared HTML5 Audio & Web Audio API fallback for instant, Bluetooth/AirPods-safe playback
let audioContext: AudioContext | null = null;
let activeSourceNode: AudioBufferSourceNode | null = null;
let activeHtmlAudio: HTMLAudioElement | null = null;
const audioBase64Cache = new Map<string, string>();
const audioBufferCache = new Map<string, AudioBuffer>();
const inflightBase64Requests = new Map<string, Promise<string>>();

function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
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

// If Bluetooth headphones (e.g. AirPods) connect/disconnect on macOS, reset any cached AudioContext
// so it re-binds to the new hardware output sink and sample rate.
if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
  navigator.mediaDevices.addEventListener('devicechange', () => {
    if (audioContext) {
      try {
        audioContext.close().catch(() => {});
      } catch {}
      audioContext = null;
    }
  });
}

let hasUnlockedIOSAudio = false;

/**
 * Synchronously unlocks iOS WebKit AudioContext and SpeechSynthesis audio engines once on iOS/iPadOS.
 * No-op on macOS/desktop so Bluetooth (AirPods) CoreAudio routing is never disrupted by dummy buffers.
 */
export function unlockAudioOnIOS(): void {
  if (typeof window === 'undefined' || hasUnlockedIOSAudio || !isIOSDevice()) return;
  hasUnlockedIOSAudio = true;

  // 1. Unlock Web Audio Context on iOS
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
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
      const dummy = new SpeechSynthesisUtterance(' ');
      dummy.volume = 0.01;
      dummy.rate = 10;
      dummy.lang = 'en-US';
      window.speechSynthesis.speak(dummy);
    } catch {}
  }
}

// Automatically install one-time touch listener on iOS/iPadOS to prime audio on first touch
if (typeof window !== 'undefined' && isIOSDevice()) {
  const primeHandler = () => {
    unlockAudioOnIOS();
    window.removeEventListener('touchstart', primeHandler, true);
    window.removeEventListener('click', primeHandler, true);
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
 * Decodes audio data, supporting both standard MP3/WAV containers and headerless raw PCM.
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
 * Stops any currently playing HTML5 audio, Web Audio buffer, or browser fallback speech safely.
 */
export function stopCurrentAudio(): void {
  if (activeHtmlAudio) {
    try {
      activeHtmlAudio.pause();
      activeHtmlAudio.currentTime = 0;
      activeHtmlAudio.src = '';
    } catch {}
    activeHtmlAudio = null;
  }
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

/**
 * Fetches and caches base64 MP3 audio for a specific cacheKey.
 * Uses a 4-layer zero-token cache hierarchy:
 * 1. In-memory base64 cache (0ms)
 * 2. Browser IndexedDB persistent cache (0 network / 0 Firestore reads)
 * 3. Firestore /tts_cache/{wordKey} shared pre-created audio
 * 4. Server /api/spelling/tts (0-token Studio MP3 speech), then persists to IndexedDB + Firestore
 */
async function getOrFetchTTSBase64(
  promptDirection: string,
  cacheKey: string,
  voiceName: StudioVoice
): Promise<string> {
  const normalizedWordKey = cacheKey.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

  const cached = audioBase64Cache.get(normalizedWordKey);
  if (cached) {
    return cached;
  }

  const existingInflight = inflightBase64Requests.get(normalizedWordKey);
  if (existingInflight) {
    return existingInflight;
  }

  const fetchPromise = (async () => {
    // 1. Check client IndexedDB persistent cache
    const localBase64 = await getIdbAudio(normalizedWordKey);
    if (localBase64) {
      audioBase64Cache.set(normalizedWordKey, localBase64);
      inflightBase64Requests.delete(normalizedWordKey);
      return localBase64;
    }

    // 2. Check Firestore shared pre-created TTS cache
    const firestoreBase64 = await getCachedTtsFromFirestore(normalizedWordKey);
    if (firestoreBase64) {
      setIdbAudio(normalizedWordKey, firestoreBase64).catch(() => {});
      audioBase64Cache.set(normalizedWordKey, firestoreBase64);
      inflightBase64Requests.delete(normalizedWordKey);
      return firestoreBase64;
    }

    // 3. Fetch from server TTS endpoint (uses 0-token studio MP3 by default)
    let base64Audio: string | null = null;
    let audioFormat = 'audio/mp3';
    let ttsError: string | null = null;

    const geminiVoice = voiceName === 'PuckAdult' ? 'Puck' : voiceName;
    try {
      const res = await fetch('/api/spelling/tts', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({ prompt: promptDirection, voice: geminiVoice, useGeminiTts: false }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audio) {
          base64Audio = data.audio;
          audioFormat = data.format || 'audio/mp3';
        } else if (data.error) {
          ttsError = data.error;
        }
      } else {
        ttsError = `TTS request failed (${res.status})`;
      }
    } catch (e) {
      ttsError = e instanceof Error ? e.message : 'TTS request error';
    }

    if (!base64Audio) {
      throw new Error(ttsError || 'Audio stream unavailable.');
    }

    // Save to client IndexedDB and Firestore /tts_cache for all future sessions
    setIdbAudio(normalizedWordKey, base64Audio).catch(() => {});
    const targetWord = cacheKey.replace(/^word[-_]/i, '').toLowerCase();
    saveCachedTtsToFirestore(normalizedWordKey, targetWord, 'studio', base64Audio, audioFormat).catch(() => {});

    audioBase64Cache.set(normalizedWordKey, base64Audio);
    inflightBase64Requests.delete(normalizedWordKey);
    return base64Audio;
  })();

  inflightBase64Requests.set(normalizedWordKey, fetchPromise);

  try {
    return await fetchPromise;
  } catch (err) {
    inflightBase64Requests.delete(normalizedWordKey);
    throw err;
  }
}

let geminiTtsQuotaHit = false;

/**
 * Speaks text using cached MP3 audio via standard HTML5 Audio (with Web Audio fallback).
 * HTML5 Audio seamlessly follows macOS CoreAudio and Bluetooth (AirPods) output device routing.
 */
export async function speakWithGeminiTTS(
  promptDirection: string,
  _fallbackPlainText: string,
  cacheKey: string,
  voiceName: StudioVoice = 'Puck',
  onEnded?: () => void
): Promise<void> {
  unlockAudioOnIOS();
  stopCurrentAudio();

  if (geminiTtsQuotaHit && !getCustomApiKey()) {
    playWithBrowserSpeech(_fallbackPlainText, voiceName, onEnded);
    return;
  }

  try {
    const base64Audio = await getOrFetchTTSBase64(promptDirection, cacheKey, voiceName);

    // Primary path: standard HTML5 Audio element (handles macOS + AirPods Bluetooth routing natively)
    try {
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      audio.preload = 'auto';
      activeHtmlAudio = audio;

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          if (activeHtmlAudio === audio) {
            activeHtmlAudio = null;
          }
          onEnded?.();
          resolve();
        };
        audio.onerror = () => {
          if (activeHtmlAudio === audio) {
            activeHtmlAudio = null;
          }
          reject(new Error('HTML5 audio element failed to decode stream'));
        };
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(reject);
        }
      });
      return;
    } catch {
      // Fallback to Web Audio API if stream is raw PCM or HTML5 Audio was blocked
      const normalizedWordKey = cacheKey.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }
      let buffer = audioBufferCache.get(normalizedWordKey);
      if (!buffer) {
        buffer = await decodeAudioDataOrPCM(base64Audio, ctx);
        audioBufferCache.set(normalizedWordKey, buffer);
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
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
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/quota|429|resource_exhausted/i.test(msg)) {
      geminiTtsQuotaHit = true;
    }
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
 * Silently pre-creates and caches MP3 TTS audio for a list of words (0 Gemini tokens)
 * into client IndexedDB and Firestore /tts_cache so "Play Word" is instantaneous.
 */
export async function prewarmRoundAudio(words: WordItem[], _voice?: StudioVoice): Promise<number> {
  if (typeof window === 'undefined' || !Array.isArray(words) || words.length === 0) return 0;

  const missingItems: Array<{ word: string; exampleSentence: string; key: string }> = [];

  for (const w of words) {
    const cleanWord = w.word.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
    const key = `word_${cleanWord}`;
    if (audioBase64Cache.has(key)) continue;

    const idbHit = await getIdbAudio(key);
    if (idbHit) {
      audioBase64Cache.set(key, idbHit);
      continue;
    }

    const fsHit = await getCachedTtsFromFirestore(key);
    if (fsHit) {
      audioBase64Cache.set(key, fsHit);
      await setIdbAudio(key, fsHit);
      continue;
    }

    missingItems.push({
      word: w.word.toLowerCase().trim(),
      exampleSentence: w.exampleSentence,
      key,
    });
  }

  if (missingItems.length === 0) return words.length;

  let cachedCount = words.length - missingItems.length;
  try {
    const res = await fetch('/api/spelling/tts-batch', {
      method: 'POST',
      headers: getRequestHeaders(),
      body: JSON.stringify({
        items: missingItems.map((m) => ({
          word: m.word,
          exampleSentence: m.exampleSentence,
        })),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const generated: Record<string, { audio: string; format: string }> = data.generated || {};
      for (const m of missingItems) {
        const item = generated[m.word];
        if (item?.audio) {
          cachedCount += 1;
          audioBase64Cache.set(m.key, item.audio);
          await setIdbAudio(m.key, item.audio);
          saveCachedTtsToFirestore(m.key, m.word, 'studio', item.audio, item.format || 'audio/mp3').catch(() => {});
        }
      }
    }
  } catch {
    // Non-fatal background prewarm
  }

  return cachedCount;
}

export interface RoundGenerationResult {
  words: WordItem[];
  source: 'ai' | 'adaptive_bank';
  theme?: string;
}

/**
 * Generates 10 adaptive spelling words tailored to the child's current difficulty level
 * from the 600-word pre-populated database (0 AI tokens by default) and mixes in struggled words.
 * Also pre-warms TTS audio in the background so playback is instant.
 */
export async function generateSpellingRoundWithMeta(
  profile: KidProfile,
  options?: { useAI?: boolean }
): Promise<RoundGenerationResult> {
  const useAI = options?.useAI === true;

  // Fast path: When not explicitly requesting live AI generation, serve directly from the 600-word curated bank
  if (!useAI) {
    const curatedWords = getRandomSpellingWords(
      profile.difficultyLevel || 2,
      profile.struggledWords || [],
      profile.masteredWords || []
    );
    const theme = getRandomSessionTheme();
    // Pre-create / warm TTS audio in the background (0 Gemini tokens)
    prewarmRoundAudio(curatedWords).catch(() => {});
    return {
      words: curatedWords,
      source: 'adaptive_bank',
      theme,
    };
  }

  try {
    const res = await fetch('/api/spelling/generate', {
      method: 'POST',
      headers: getRequestHeaders(),
      body: JSON.stringify({ profile, useAI: true }),
    });

    if (res.ok) {
      const data = await res.json();
      const list: WordItem[] = Array.isArray(data) ? data : data.words;
      if (Array.isArray(list) && list.length > 0) {
        const selected = list.slice(0, 10);
        prewarmRoundAudio(selected).catch(() => {});
        return {
          words: selected,
          source: data.source === 'ai' ? 'ai' : 'adaptive_bank',
          theme: data.theme || getRandomSessionTheme(),
        };
      }
    }
  } catch (err) {
    console.warn('API generate round failed, using randomized fallback bank:', err);
  }

  const fallbackList = getRandomSpellingWords(
    profile.difficultyLevel || 2,
    profile.struggledWords || [],
    profile.masteredWords || []
  );
  prewarmRoundAudio(fallbackList).catch(() => {});
  return {
    words: fallbackList,
    source: 'adaptive_bank',
    theme: getRandomSessionTheme(),
  };
}

/**
 * Generates 10 adaptive spelling words tailored to a child's current difficulty level
 * and mixes in struggled words from previous rounds.
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
