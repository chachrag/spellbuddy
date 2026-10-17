import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Eye,
  ArrowRight,
  ArrowLeft,
  Camera,
  Upload,
  CheckCircle2,
  XCircle,
  Sparkles,
  Loader2,
  RefreshCw,
  Mic,
  Settings,
  AlertCircle,
  X,
  Edit2,
  Check,
  Users,
  Star,
  Award,
  LogOut,
  ShieldAlert,
  BarChart3,
  LogIn,
} from 'lucide-react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  KidProfile,
  WordItem,
  RoundGradingResponse,
} from './types';
import {
  generateSpellingRound,
  generateSpellingRoundWithMeta,
  gradeHandwrittenSheet,
  speakWithGeminiTTS,
  prewarmRoundAudio,
  stopCurrentAudio,
  StudioVoice,
  getCustomApiKey,
  onTTSError,
  unlockAudioOnIOS,
} from './services/geminiService';
import { AnnotatedImage } from './components/AnnotatedImage';
import { SettingsModal } from './components/SettingsModal';
import { ProfileModal } from './components/ProfileModal';
import {
  loadAllProfiles,
  saveAllProfiles,
  getActiveProfileId,
  setActiveProfileId,
  resetProfileProgress,
  DEFAULT_INITIAL_PROFILE,
  LEVEL_DESCRIPTIONS,
} from './profileManager';
import {
  auth,
  signInWithGoogle,
  logOut,
  checkUserApproval,
  loadFirestoreSpellerProfiles,
  saveFirestoreSpellerProfile,
  logWordAttemptToFirestore,
  MASTER_ADMIN_EMAIL,
} from './services/firebase';

export default function App() {
  // Authentication & Authorization state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Profile & Speller state
  const [profiles, setProfiles] = useState<KidProfile[]>(() => loadAllProfiles());
  const [profile, setProfile] = useState<KidProfile>(() => {
    const all = loadAllProfiles();
    const activeId = getActiveProfileId();
    return all.find((p) => p.id === activeId) || all[0] || DEFAULT_INITIAL_PROFILE;
  });

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalMode, setProfileModalMode] = useState<'switch' | 'create' | 'edit'>('switch');
  const [levelFeedbackNote, setLevelFeedbackNote] = useState<string | null>(null);

  const selectedVoice: StudioVoice = 'Kore';

  const [stage, setStage] = useState<'welcome' | 'round' | 'capture' | 'results'>('welcome');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'phonemes' | 'history' | 'account' | 'api'>('phonemes');
  const [hasCustomKey, setHasCustomKey] = useState(() => Boolean(getCustomApiKey()));
  const [ttsError, setTtsError] = useState<string | null>(null);

  const [words, setWords] = useState<WordItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealedIndices, setRevealedIndices] = useState<Record<number, boolean>>({});
  const [loadingWords, setLoadingWords] = useState(false);
  const [speakingMode, setSpeakingMode] = useState<'none' | 'word' | 'phonetic' | 'reveal'>('none');
  const [roundSource, setRoundSource] = useState<'ai' | 'adaptive_bank'>('adaptive_bank');
  const [roundTheme, setRoundTheme] = useState<string>('Space & Exploration');
  const [previewWords, setPreviewWords] = useState<boolean>(false);
  const [refreshSuccessNote, setRefreshSuccessNote] = useState<string | null>(null);

  // Camera & image upload state
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [cameraActive, setCameraActive] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradingResponse, setGradingResponse] = useState<RoundGradingResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingWordNum, setEditingWordNum] = useState<number | null>(null);
  const [editInputVal, setEditInputVal] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 1. Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthLoading(true);
      setAuthError(null);
      if (user) {
        setCurrentUser(user);
        try {
          const approval = await checkUserApproval(user);
          setIsApproved(approval.isApproved);
          setIsAdmin(approval.isAdmin);

          if (approval.isApproved) {
            // Load user's speller profiles from Firestore
            const cloudProfiles = await loadFirestoreSpellerProfiles(user.uid);
            if (cloudProfiles && cloudProfiles.length > 0) {
              setProfiles(cloudProfiles);
              saveAllProfiles(cloudProfiles);
              const active = cloudProfiles.find((p) => p.id === getActiveProfileId()) || cloudProfiles[0];
              setProfile(active);
              setActiveProfileId(active.id);
            } else {
              // Initialize first profile in Firestore for this user
              const initialWithUser: KidProfile = {
                ...profile,
                userId: user.uid,
                masteredWords: profile.masteredWords || [],
              };
              await saveFirestoreSpellerProfile(user.uid, initialWithUser);
              setProfiles([initialWithUser]);
              setProfile(initialWithUser);
            }
          }
        } catch (err) {
          console.error('Error verifying user approval:', err);
          setAuthError('Error validating account permissions.');
        }
      } else {
        setCurrentUser(null);
        setIsApproved(false);
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync active profile changes to Firestore and localStorage
  useEffect(() => {
    setProfiles((prev) => {
      const exists = prev.some((p) => p.id === profile.id);
      const next = exists
        ? prev.map((p) => (p.id === profile.id ? profile : p))
        : [...prev, profile];
      saveAllProfiles(next);
      return next;
    });
    setActiveProfileId(profile.id);

    if (currentUser?.uid && isApproved) {
      saveFirestoreSpellerProfile(currentUser.uid, profile).catch((err) => {
        console.warn('Failed to sync profile to Firestore:', err);
      });
    }
  }, [profile, currentUser, isApproved]);

  // Automatically generate fresh random session words whenever active profile or difficulty level changes
  useEffect(() => {
    let isCancelled = false;
    const fetchSessionWords = async () => {
      setLoadingWords(true);
      try {
        const res = await generateSpellingRoundWithMeta(profile);
        if (!isCancelled) {
          setWords(res.words);
          setRoundSource(res.source);
          if (res.theme) setRoundTheme(res.theme);
        }
      } catch (err) {
        console.warn('Initial session word generation fallback:', err);
      } finally {
        if (!isCancelled) {
          setLoadingWords(false);
        }
      }
    };

    fetchSessionWords();
    return () => {
      isCancelled = true;
    };
  }, [profile.id, profile.difficultyLevel]);

  // Clean up webcam and audio on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopCurrentAudio();
    };
  }, []);

  // Listen for Gemini TTS errors to display explicit diagnostic toast/banner
  useEffect(() => {
    return onTTSError((errMsg) => {
      setTtsError(errMsg);
    });
  }, []);

  const handleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign in failed.';
      setAuthError(msg);
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      setStage('welcome');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const playWordAudio = async (wordItem: WordItem, index: number, voice = selectedVoice) => {
    const promptDirection = `${wordItem.word}. ${wordItem.exampleSentence}. Spell ${wordItem.word}.`;
    const fallbackText = `${wordItem.word}. ${wordItem.exampleSentence}. Spell ${wordItem.word}.`;
    const cacheKey = `word_v2_${wordItem.word.toLowerCase().trim()}`;

    // Gently pre-warm the next word in the round in the background while the current word plays
    const nextWord = words[index + 1];
    if (nextWord) {
      prewarmRoundAudio([nextWord], voice, 1).catch(() => {});
    }

    setSpeakingMode('word');
    await speakWithGeminiTTS(
      promptDirection,
      fallbackText,
      cacheKey,
      voice,
      () => setSpeakingMode('none')
    );
  };

  const handlePlayWord = () => {
    unlockAudioOnIOS();
    const current = words[currentIndex];
    if (!current) return;
    playWordAudio(current, currentIndex);
  };

  const handleRevealSpelling = () => {
    stopCurrentAudio();
    setSpeakingMode('none');
    setRevealedIndices((prev) => ({ ...prev, [currentIndex]: true }));
  };

  const startNewRound = async (customProfile?: KidProfile, forceNew = false) => {
    setErrorMsg(null);
    setGradingResponse(null);
    setCapturedImage(null);
    setRevealedIndices({});
    setCurrentIndex(0);
    stopCurrentAudio();

    if (stage === 'welcome' && !forceNew && !customProfile && words.length === 10) {
      setStage('round');
      return;
    }

    setLoadingWords(true);
    try {
      const targetProf = customProfile || profile;
      const res = await generateSpellingRoundWithMeta(targetProf);
      setWords(res.words);
      setRoundSource(res.source);
      if (res.theme) setRoundTheme(res.theme);
      setStage('round');
    } catch {
      setErrorMsg('Could not generate spelling words. Using randomized adaptive word bank.');
      const fallback = await generateSpellingRound(profile);
      setWords(fallback);
      setStage('round');
    } finally {
      setLoadingWords(false);
    }
  };

  const refreshWelcomeWords = async () => {
    setErrorMsg(null);
    setLoadingWords(true);
    stopCurrentAudio();
    try {
      const res = await generateSpellingRoundWithMeta(profile);
      setWords(res.words);
      setRoundSource(res.source);
      if (res.theme) setRoundTheme(res.theme);
      setRevealedIndices({});
      setCurrentIndex(0);
      setRefreshSuccessNote(`Refreshed with 10 brand-new words for Level ${profile.difficultyLevel}!`);
      setTimeout(() => setRefreshSuccessNote(null), 3500);
    } catch {
      setErrorMsg('Could not refresh word list.');
    } finally {
      setLoadingWords(false);
    }
  };

  const goToWord = (index: number) => {
    stopCurrentAudio();
    setCurrentIndex(index);
  };

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch {
      setErrorMsg(
        'Camera access was blocked or unavailable. You can use the "Upload Photo" button instead!'
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureFromWebcam = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    setImageMimeType('image/jpeg');
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCapturedImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleGradeSubmission = async () => {
    if (!capturedImage) {
      setErrorMsg('Please capture or upload a photo of the completed spelling worksheet.');
      return;
    }
    setErrorMsg(null);
    setGrading(true);

    try {
      const result = await gradeHandwrittenSheet(capturedImage, imageMimeType, words);
      setGradingResponse(result);

      // Update Speller Profile & Word Mastery
      setProfile((prev) => {
        const updatedStruggled = new Set(prev.struggledWords.map((w) => w.toLowerCase()));
        const updatedMastered = new Set((prev.masteredWords || []).map((w) => w.toLowerCase()));
        const updatedPhonemes = { ...prev.phonemeMastery };

        words.forEach((wordObj, idx) => {
          const gradedItem = result.results.find((r) => r.wordNumber === idx + 1);
          const wasRevealed = !!revealedIndices[idx];
          const isCorrectOnPaper = gradedItem ? gradedItem.isCorrect : false;
          const masteredWithoutReveal = isCorrectOnPaper && !wasRevealed;
          const lowerWord = wordObj.word.toLowerCase();

          if (masteredWithoutReveal) {
            // Mastered correctly: Add to mastered set, remove from review queue
            updatedMastered.add(lowerWord);
            updatedStruggled.delete(lowerWord);
          } else {
            // Struggled or revealed: Add to struggled review pool, remove from mastered
            updatedStruggled.add(lowerWord);
            updatedMastered.delete(lowerWord);
          }

          // Log word attempt to Firestore
          if (currentUser?.uid) {
            logWordAttemptToFirestore(currentUser.uid, {
              id: `word-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
              userId: currentUser.uid,
              spellerId: prev.id,
              spellerName: prev.name,
              word: wordObj.word,
              status: masteredWithoutReveal ? 'correct' : 'wrong',
              level: prev.difficultyLevel,
              childAttempt: gradedItem?.transcribedText || (wasRevealed ? '(revealed)' : ''),
              wasRevealed,
              timestamp: new Date().toISOString(),
              phonemes: wordObj.phonemes,
            }).catch((e) => console.warn('Could not log word attempt:', e));
          }

          wordObj.phonemes.forEach((phoneme) => {
            const existing = updatedPhonemes[phoneme] || {
              phoneme,
              attempts: 0,
              correct: 0,
            };
            updatedPhonemes[phoneme] = {
              phoneme,
              attempts: existing.attempts + 1,
              correct: existing.correct + (masteredWithoutReveal ? 1 : 0),
            };
          });
        });

        const score = result.totalScore;
        let nextLevel = prev.difficultyLevel;
        let nextConsecutive = prev.consecutiveHighScores || 0;
        let nextLevelRounds = (prev.levelRoundsCount || 0) + 1;
        let promotionNote: string | null = null;

        if (score >= 9) {
          nextConsecutive += 1;
          if (nextConsecutive >= 3) {
            if (prev.difficultyLevel < 5) {
              nextLevel = prev.difficultyLevel + 1;
              nextConsecutive = 0;
              nextLevelRounds = 0;
              promotionNote = `🎉 Outstanding Mastery! ${prev.name} scored 9+ in 3 consecutive rounds! Promoted to Level ${nextLevel}!`;
            } else {
              promotionNote = `🌟 Maximum Mastery! ${prev.name} scored 9+ in 3 consecutive rounds at Level 5!`;
            }
          } else {
            const needed = 3 - nextConsecutive;
            promotionNote = `⭐ Level Mastery Confidence: ${nextConsecutive} of 3 rounds mastered! Need ${needed} more high-scoring round${needed > 1 ? 's' : ''} (score 9+) to advance to Level ${prev.difficultyLevel + 1}.`;
          }
        } else {
          nextConsecutive = 0;
          if (score <= 4) {
            promotionNote = `Good effort! Keep practicing at Level ${prev.difficultyLevel}. Review the tricky words below!`;
          } else {
            promotionNote = `Solid practice! Score 9 or 10 on 3 consecutive rounds to earn promotion to Level ${prev.difficultyLevel < 5 ? prev.difficultyLevel + 1 : 5}.`;
          }
        }

        setLevelFeedbackNote(promotionNote);

        const updatedProfileState: KidProfile = {
          ...prev,
          difficultyLevel: nextLevel,
          roundsCompleted: prev.roundsCompleted + 1,
          struggledWords: Array.from(updatedStruggled),
          masteredWords: Array.from(updatedMastered),
          phonemeMastery: updatedPhonemes,
          recentScores: [...prev.recentScores.slice(-4), result.totalScore],
          levelRoundsCount: nextLevelRounds,
          consecutiveHighScores: nextConsecutive,
          updatedAt: new Date().toISOString(),
        };

        if (currentUser?.uid) {
          saveFirestoreSpellerProfile(currentUser.uid, updatedProfileState).catch(() => {});
        }

        return updatedProfileState;
      });

      setStage('results');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not grade the photo. Please check your Gemini API key in Settings.';
      setErrorMsg(msg);
    } finally {
      setGrading(false);
    }
  };

  const toggleWordResult = (wordNumber: number) => {
    if (!gradingResponse) return;
    const targetItem = gradingResponse.results.find((r) => r.wordNumber === wordNumber);
    if (!targetItem) return;

    const newIsCorrect = !targetItem.isCorrect;
    const updatedResults = gradingResponse.results.map((r) => {
      if (r.wordNumber === wordNumber) {
        return {
          ...r,
          isCorrect: newIsCorrect,
          feedback: newIsCorrect
            ? 'Marked correct by parent review.'
            : 'Marked for additional practice.',
        };
      }
      return r;
    });

    const newScore = updatedResults.filter((r) => r.isCorrect).length;

    setGradingResponse({
      ...gradingResponse,
      totalScore: newScore,
      results: updatedResults,
    });

    setProfile((prev) => {
      const updatedStruggled = new Set(prev.struggledWords.map((w) => w.toLowerCase()));
      const updatedMastered = new Set((prev.masteredWords || []).map((w) => w.toLowerCase()));
      const targetWord = targetItem.expectedWord.toLowerCase();

      if (newIsCorrect) {
        updatedMastered.add(targetWord);
        updatedStruggled.delete(targetWord);
      } else {
        updatedStruggled.add(targetWord);
        updatedMastered.delete(targetWord);
      }

      const updatedProfileState: KidProfile = {
        ...prev,
        struggledWords: Array.from(updatedStruggled),
        masteredWords: Array.from(updatedMastered),
        recentScores: [...prev.recentScores.slice(0, -1), newScore],
      };

      if (currentUser?.uid) {
        saveFirestoreSpellerProfile(currentUser.uid, updatedProfileState).catch(() => {});
      }

      return updatedProfileState;
    });
  };

  const updateWordTranscription = (wordNumber: number, newTranscribed: string) => {
    if (!gradingResponse) return;
    const cleanTranscribed = newTranscribed.trim();
    const targetItem = gradingResponse.results.find((r) => r.wordNumber === wordNumber);
    if (!targetItem) return;

    const isMatch = cleanTranscribed.toLowerCase() === targetItem.expectedWord.toLowerCase();

    const updatedResults = gradingResponse.results.map((r) => {
      if (r.wordNumber === wordNumber) {
        return {
          ...r,
          transcribedText: cleanTranscribed,
          isCorrect: isMatch,
          feedback: isMatch
            ? 'Correct! Updated manually.'
            : `Child wrote "${cleanTranscribed}". Practice spelling ${r.expectedWord}.`,
        };
      }
      return r;
    });

    const newScore = updatedResults.filter((r) => r.isCorrect).length;

    setGradingResponse({
      ...gradingResponse,
      totalScore: newScore,
      results: updatedResults,
    });
  };

  const handleResetProfile = () => {
    const updated = resetProfileProgress(profile.id);
    setProfile(updated);
    if (currentUser?.uid) {
      saveFirestoreSpellerProfile(currentUser.uid, updated).catch(() => {});
    }
  };

  // 1. Loading screen while checking Firebase Auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-sky-50 via-white to-blue-50 p-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-500 text-white shadow-xl animate-pulse">
          <Sparkles className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-800">Starting SpellBuddy AI...</h2>
        <p className="mt-1 text-xs text-slate-500">Connecting to secure speller database</p>
      </div>
    );
  }

  // 2. Unauthenticated: Google Sign-In Screen
  if (!currentUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-sky-50 via-white to-indigo-50/40 p-4">
        <div className="w-full max-w-md rounded-3xl border-2 border-sky-200 bg-white p-8 shadow-2xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-sky-500 text-white shadow-lg">
            <Sparkles className="h-10 w-10" />
          </div>

          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">
            SpellBuddy AI
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Adaptive speech & handwriting AI spelling tutor for elementary learners.
          </p>

          <div className="my-6 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-xs text-sky-900 text-left">
            <ul className="space-y-1.5 font-medium">
              <li>✨ <strong>Adaptive 10-Word Rounds</strong> with human teacher speech</li>
              <li>📷 <strong>AI Handwriting Grading</strong> straight from real paper</li>
              <li>🎯 <strong>Smart Word Memory</strong>: Mastered words are never repeated</li>
              <li>🔒 <strong>Private Speller Database</strong> synced to your Google Account</li>
            </ul>
          </div>

          {authError && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {authError}
            </div>
          )}

          <button
            onClick={handleSignIn}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 py-4 text-base font-bold text-white shadow-lg transition hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign in with Google
          </button>

          <p className="mt-4 text-[11px] text-slate-400">
            Access is reserved for approved parent and student accounts.
          </p>
        </div>
      </div>
    );
  }

  // 3. Authenticated but NOT Approved Screen
  if (!isApproved) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-sky-50 via-white to-rose-50/30 p-4">
        <div className="w-full max-w-lg rounded-3xl border-2 border-rose-200 bg-white p-8 shadow-2xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <h2 className="mt-5 text-2xl font-bold text-slate-800">Account Access Pending Approval</h2>
          <p className="mt-2 text-sm text-slate-600">
            You are signed in as <strong className="text-slate-900">{currentUser.email}</strong>.
          </p>

          <div className="my-6 rounded-2xl border border-rose-100 bg-rose-50/70 p-4 text-xs text-rose-900 text-left">
            <p className="font-semibold">Access Restriction:</p>
            <p className="mt-1">
              This app is currently restricted to approved speller accounts. Your email is not yet on the approved whitelist.
            </p>
            <p className="mt-2 text-[11px] text-rose-800">
              Please contact the administrator at <strong className="font-mono">{MASTER_ADMIN_EMAIL}</strong> to request access, or sign in with an approved Google account.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleSignIn}
              className="w-full rounded-xl bg-sky-500 py-3 text-xs font-bold text-white shadow hover:bg-sky-600 transition"
            >
              Sign In with Different Google Account
            </button>
            <button
              onClick={handleSignOut}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const isCurrentRevealed = !!revealedIndices[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-blue-50/30 pb-16">
      {/* Sleek Top Header Ribbon - Fits on One Single Row */}
      <header className="sticky top-0 z-40 border-b border-sky-100 bg-white/90 backdrop-blur-md px-3 sm:px-6 py-2.5 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
          {/* Left: Branding */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-sky-950 leading-none">
                SpellBuddy AI
              </h1>
              <p className="text-[10px] font-bold text-sky-600 hidden sm:block">
                Level {profile.difficultyLevel} • {profile.struggledWords.length} to review • {profile.masteredWords?.length || 0} mastered
              </p>
            </div>
          </div>

          {/* Right Menu Strip - Fits cleanly in one row */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Active Speller Profile Switcher Badge */}
            <button
              onClick={() => {
                setProfileModalMode('switch');
                setShowProfileModal(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50/80 px-2 sm:px-2.5 py-1.5 transition hover:bg-sky-100 hover:border-sky-300"
              title="Click to switch spellers or edit profile"
            >
              <span className="text-base sm:text-lg leading-none">{profile.avatarEmoji || '🦊'}</span>
              <div className="text-left leading-none">
                <div className="text-xs font-bold text-sky-900">{profile.name}</div>
                <div className="text-[9px] font-semibold text-sky-600">Lvl {profile.difficultyLevel}</div>
              </div>
              <Users className="h-3 w-3 text-sky-500 hidden sm:inline" />
            </button>

            {/* Settings & Tools Button */}
            <button
              onClick={() => {
                setSettingsInitialTab('phonemes');
                setShowSettings(true);
              }}
              title="Phoneme Dashboard, History CSV & Settings"
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              <Settings className="h-3.5 w-3.5 text-slate-600" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {/* Google User Avatar / Sign Out button */}
            <button
              onClick={() => {
                setSettingsInitialTab('account');
                setShowSettings(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:px-2 sm:py-1 hover:bg-slate-100 transition"
              title={`Signed in as ${currentUser.email} (${isAdmin ? 'Admin' : 'Approved Speller'})`}
            >
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="User"
                  className="h-6 w-6 rounded-full border border-sky-300"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-200 text-sky-800 text-xs font-bold">
                  {currentUser.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <span className="text-[11px] font-semibold text-slate-700 hidden md:inline truncate max-w-[100px]">
                {currentUser.displayName?.split(' ')[0] || currentUser.email?.split('@')[0]}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto mt-6 max-w-4xl px-4">
        {/* Gemini TTS Diagnostic Error Banner */}
        {ttsError && (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 text-rose-800 shadow-md">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
              <div className="text-xs">
                <p className="font-bold">Audio Engine Diagnostic</p>
                <p className="mt-0.5 text-rose-700">{ttsError}</p>
              </div>
            </div>
            <button
              onClick={() => setTtsError(null)}
              className="rounded-lg p-1 text-rose-600 hover:bg-rose-100"
              title="Dismiss warning"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Level Promotion Announcement Banner */}
        {levelFeedbackNote && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border-2 border-indigo-300 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-sm">
                <Award className="h-5 w-5" />
              </span>
              <p className="text-xs font-bold text-indigo-950 sm:text-sm">
                {levelFeedbackNote}
              </p>
            </div>
            <button
              onClick={() => setLevelFeedbackNote(null)}
              className="rounded-lg p-1 text-indigo-700 hover:bg-indigo-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-6 flex items-center justify-between gap-2 rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 text-xs font-medium text-rose-800">
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="rounded p-1 text-rose-600 hover:bg-rose-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* STAGE 1: WELCOME SCREEN */}
        {stage === 'welcome' && (
          <div className="rounded-3xl border-4 border-sky-200 bg-white p-6 sm:p-10 text-center shadow-xl">
            <span className="inline-block text-6xl sm:text-7xl">
              {profile.avatarEmoji || '🦊'}
            </span>
            <h2 className="mt-4 text-3xl font-extrabold text-slate-800">
              Welcome back, {profile.name}!
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Ready for your adaptive 10-word spelling round? Grab your paper and pencil!
            </p>

            {/* Speller Level & Status Pills */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full bg-sky-100 px-3.5 py-1 text-xs font-bold text-sky-800">
                {LEVEL_DESCRIPTIONS[profile.difficultyLevel]?.title || `Level ${profile.difficultyLevel}`}
              </span>
              <span className="rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-bold text-emerald-800">
                {profile.masteredWords?.length || 0} Mastered Words
              </span>
              {profile.struggledWords.length > 0 && (
                <span className="rounded-full bg-amber-100 px-3.5 py-1 text-xs font-bold text-amber-800">
                  {profile.struggledWords.length} Review Words Queued
                </span>
              )}
            </div>

            {/* Instruction Steps */}
            <div className="my-8 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
              <div className="rounded-2xl border-2 border-sky-100 bg-sky-50/50 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500 font-bold text-white shadow-sm">
                  1
                </span>
                <h4 className="mt-3 font-bold text-slate-800">Listen & Write</h4>
                <p className="mt-1 text-xs text-slate-600">
                  Click &quot;Play Word&quot; to hear each word and sentence spoken in natural human speech.
                </p>
              </div>

              <div className="rounded-2xl border-2 border-sky-100 bg-sky-50/50 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500 font-bold text-white shadow-sm">
                  2
                </span>
                <h4 className="mt-3 font-bold text-slate-800">Snap Your Page</h4>
                <p className="mt-1 text-xs text-slate-600">
                  Take a photo of your handwritten 10-word sheet with your camera or upload a picture.
                </p>
              </div>

              <div className="rounded-2xl border-2 border-sky-100 bg-sky-50/50 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500 font-bold text-white shadow-sm">
                  3
                </span>
                <h4 className="mt-3 font-bold text-slate-800">Instant AI Grading</h4>
                <p className="mt-1 text-xs text-slate-600">
                  See visual checkmarks right on your handwriting! Mastered words are permanently saved.
                </p>
              </div>
            </div>

            {/* Refresh Success Toast */}
            {refreshSuccessNote && (
              <div className="mb-4 inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-800 shadow-sm animate-fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{refreshSuccessNote}</span>
              </div>
            )}

            {/* Session Theme & Dynamic Word Generator Status */}
            <div className="mb-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Session Theme: <span className="font-extrabold capitalize text-sky-700">{roundTheme}</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-semibold text-slate-600">
                {roundSource === 'ai' ? '🤖 Live AI Generation' : '🎲 600-Word Adaptive Phonics Bank (Zero-Token)'}
              </span>
            </div>

            {/* Action Buttons: Start Round + Randomly Refresh Words */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => startNewRound()}
                disabled={loadingWords}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-2xl bg-sky-500 px-8 py-4 text-xl font-bold text-white shadow-lg transition hover:bg-sky-600 hover:scale-105 active:scale-95 disabled:opacity-60"
              >
                {loadingWords ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Generating Fresh 10 Words...
                  </>
                ) : (
                  <>
                    <Volume2 className="h-6 w-6" />
                    Start 10-Word Round
                  </>
                )}
              </button>

              <button
                onClick={refreshWelcomeWords}
                disabled={loadingWords}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-amber-300 bg-amber-50/90 px-6 py-4 text-base font-bold text-amber-900 shadow transition hover:bg-amber-100 hover:border-amber-400 hover:scale-105 active:scale-95 disabled:opacity-60"
                title="Randomly refresh and generate 10 completely new words for this session"
              >
                <RefreshCw className={`h-5 w-5 text-amber-700 ${loadingWords ? 'animate-spin' : ''}`} />
                Randomly Refresh Words
              </button>
            </div>

            {/* Word Preview for Parents */}
            <div className="mt-5">
              <button
                onClick={() => setPreviewWords(!previewWords)}
                className="text-xs font-semibold text-slate-500 hover:text-sky-600 underline flex items-center justify-center gap-1 mx-auto"
              >
                <Eye className="h-3.5 w-3.5" />
                {previewWords ? 'Hide Word List Preview' : '👀 Preview 10 Words for this Session'}
              </button>

              {previewWords && words.length > 0 && (
                <div className="mt-3 rounded-2xl border border-sky-100 bg-slate-50/95 p-4 text-left shadow-sm">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
                      Generated 10 Words (Level {profile.difficultyLevel})
                    </span>
                    <button
                      onClick={refreshWelcomeWords}
                      disabled={loadingWords}
                      className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1"
                    >
                      <RefreshCw className={`h-3 w-3 ${loadingWords ? 'animate-spin' : ''}`} />
                      Re-roll List
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {words.map((w, idx) => (
                      <span
                        key={idx}
                        className="rounded-xl border border-sky-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 shadow-sm"
                      >
                        <span className="text-sky-500 mr-1">#{idx + 1}</span>
                        {w.word}
                        <span className="ml-1 text-[10px] font-normal text-slate-400">({w.phoneticBreakdown})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setSettingsInitialTab('phonemes');
                  setShowSettings(true);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-sky-600 underline flex items-center justify-center gap-1 mt-3 mx-auto"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                View {profile.name}&apos;s Phoneme Mastery &amp; Word History
              </button>
            </div>
          </div>
        )}

        {/* STAGE 2: 10-WORD AUDIO ROUND */}
        {stage === 'round' && currentWord && (
          <div className="rounded-3xl border-4 border-sky-200 bg-white p-6 shadow-xl sm:p-8">
            {/* Progress Pills 1..10 & Round Refresh */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-wider text-sky-600">
                  Word {currentIndex + 1} of {words.length}
                </span>
                {roundTheme && (
                  <span className="hidden sm:inline-block rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200 capitalize">
                    Theme: {roundTheme}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    startNewRound(undefined, true);
                  }}
                  disabled={loadingWords}
                  className="flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 transition shadow-sm"
                  title="Randomly generate 10 completely new words for this session"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingWords ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh Words</span>
                </button>
                <div className="flex flex-wrap gap-1.5">
                  {words.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToWord(idx)}
                    className={`h-8 w-8 rounded-full text-xs font-bold transition ${
                      idx === currentIndex
                        ? 'bg-sky-500 text-white ring-4 ring-sky-200'
                        : revealedIndices[idx]
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                </div>
              </div>
            </div>

            {/* Main Audio Controls */}
            <div className="my-8 flex flex-col items-center text-center">
              <p className="mb-4 text-sm font-semibold text-slate-500">
                Write word #{currentIndex + 1} on your paper:
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                {/* Primary Play Word Button */}
                <button
                  onClick={handlePlayWord}
                  className={`flex items-center gap-3 rounded-3xl px-8 py-5 text-2xl font-bold text-white shadow-lg transition hover:scale-105 active:scale-95 ${
                    speakingMode === 'word'
                      ? 'bg-indigo-600 ring-4 ring-indigo-200'
                      : 'bg-sky-500 hover:bg-sky-600'
                  }`}
                >
                  <Volume2
                    className={`h-8 w-8 ${speakingMode === 'word' ? 'animate-pulse' : ''}`}
                  />
                  {speakingMode === 'word' ? 'Speaking...' : 'Play Word'}
                </button>
              </div>

              {/* Reveal Spelling Option */}
              <div className="mt-8 w-full max-w-md rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-4">
                {!isCurrentRevealed ? (
                  <button
                    onClick={handleRevealSpelling}
                    className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    <Eye className="h-4 w-4" />
                    Reveal Spelling
                  </button>
                ) : (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Spelling Revealed (Queued for repeat practice!):
                    </p>
                    <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                      {currentWord.word.split('').map((letter, i) => (
                        <span
                          key={i}
                          className="flex h-10 w-9 items-center justify-center rounded-xl bg-white font-mono text-xl font-bold uppercase text-slate-800 shadow border border-amber-300"
                        >
                          {letter}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Round Navigation Bar */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-5">
              <button
                onClick={() => goToWord(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous Word
              </button>

              {currentIndex < words.length - 1 ? (
                <button
                  onClick={() => goToWord(currentIndex + 1)}
                  className="flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-bold text-white shadow transition hover:bg-sky-600"
                >
                  Next Word
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => setStage('capture')}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-600 hover:scale-105"
                >
                  Finished Writing! Grade Paper
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STAGE 3: CAPTURE / UPLOAD WORKSHEET */}
        {stage === 'capture' && (
          <div className="rounded-3xl border-4 border-sky-200 bg-white p-6 shadow-xl sm:p-8">
            <h2 className="text-2xl font-bold text-slate-800 text-center">
              Submit Your Spelling Sheet
            </h2>
            <p className="mt-1 text-xs text-slate-500 text-center">
              Snap a clear photo of the paper where {profile.name} wrote words 1 through 10.
            </p>

            {/* Camera View or Captured Preview */}
            <div className="my-6 flex flex-col items-center">
              {cameraActive ? (
                <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border-4 border-sky-400 bg-black shadow-lg">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="h-80 w-full object-cover"
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                    <button
                      onClick={captureFromWebcam}
                      className="flex items-center gap-2 rounded-2xl bg-white px-6 py-3 font-bold text-slate-900 shadow-xl transition hover:bg-slate-100"
                    >
                      <Camera className="h-5 w-5 text-sky-500" />
                      Take Photo
                    </button>
                    <button
                      onClick={stopCamera}
                      className="rounded-2xl bg-black/60 px-4 py-3 text-xs font-bold text-white hover:bg-black/80"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : capturedImage ? (
                <div className="flex flex-col items-center">
                  <div className="relative max-h-96 w-full max-w-md overflow-hidden rounded-2xl border-4 border-emerald-400 shadow-md">
                    <img
                      src={capturedImage}
                      alt="Captured spelling sheet"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setCapturedImage(null)}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Retake Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex w-full max-w-md flex-col items-center justify-center rounded-3xl border-4 border-dashed border-sky-200 bg-sky-50/40 p-8 text-center">
                  <Camera className="h-12 w-12 text-sky-400" />
                  <h4 className="mt-3 text-base font-bold text-slate-700">No photo selected yet</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Use your phone camera or upload a saved picture of the worksheet.
                  </p>

                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button
                      onClick={startCamera}
                      className="flex items-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-bold text-white shadow transition hover:bg-sky-600"
                    >
                      <Camera className="h-4 w-4" /> Open Camera
                    </button>

                    <label className="flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
                      <Upload className="h-4 w-4 text-sky-500" /> Upload Photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-5">
              <button
                onClick={() => setStage('round')}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Words
              </button>

              <button
                onClick={handleGradeSubmission}
                disabled={!capturedImage || grading}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3 text-base font-bold text-white shadow-lg transition hover:bg-emerald-600 disabled:opacity-50"
              >
                {grading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    AI Analyzing Handwriting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Grade My Spelling!
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STAGE 4: RESULTS & ANNOTATED SHEET */}
        {stage === 'results' && gradingResponse && (
          <div className="space-y-6">
            {/* Round Summary Card */}
            <div className="rounded-3xl border-4 border-sky-200 bg-white p-6 shadow-xl sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
                    Round Complete!
                  </span>
                  <h2 className="mt-1 text-3xl font-black text-slate-900">
                    Score: {gradingResponse.totalScore} / {words.length}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {gradingResponse.encouragementMessage}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => startNewRound()}
                    disabled={loadingWords}
                    className="flex items-center gap-2 rounded-2xl bg-sky-500 px-6 py-3 font-bold text-white shadow transition hover:bg-sky-600"
                  >
                    <RefreshCw className="h-4 w-4" /> Next Round
                  </button>

                  <button
                    onClick={() => {
                      setSettingsInitialTab('history');
                      setShowSettings(true);
                    }}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 hover:bg-slate-50"
                  >
                    View History CSV
                  </button>
                </div>
              </div>

              {/* Annotated Handwriting Image */}
              {capturedImage && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Handwritten Sheet Overlay
                  </h3>
                  <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-50">
                    <AnnotatedImage
                      imageDataUrl={capturedImage}
                      results={gradingResponse.results}
                      totalScore={gradingResponse.totalScore}
                    />
                  </div>
                </div>
              )}

              {/* Word-by-Word Breakdown */}
              <div className="mt-8">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-slate-800">
                    Word-by-Word Breakdown
                  </h3>
                  <span className="text-xs text-slate-500">
                    Tap <span className="font-semibold text-slate-700">Edit</span> or the <span className="font-semibold text-slate-700">✓ / ✗ badge</span> to fix any OCR misreads
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {gradingResponse.results.map((item) => (
                    <div
                      key={item.wordNumber}
                      className={`flex items-start justify-between rounded-2xl border-2 p-4 transition ${
                        item.isCorrect
                          ? 'border-emerald-200 bg-emerald-50/70'
                          : 'border-rose-200 bg-rose-50/70'
                      }`}
                    >
                      <div className="flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">
                            #{item.wordNumber}
                          </span>
                          <span className="text-lg font-bold text-slate-800">
                            {item.expectedWord}
                          </span>
                        </div>

                        {editingWordNum === item.wordNumber ? (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="text"
                              value={editInputVal}
                              onChange={(e) => setEditInputVal(e.target.value)}
                              className="w-32 rounded-lg border border-slate-300 px-2 py-1 font-mono text-sm uppercase focus:border-sky-500 focus:outline-none"
                              placeholder="Child's word"
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                updateWordTranscription(item.wordNumber, editInputVal);
                                setEditingWordNum(null);
                              }}
                              className="flex items-center gap-1 rounded-lg bg-emerald-500 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-600"
                            >
                              <Check className="h-3.5 w-3.5" /> Save
                            </button>
                            <button
                              onClick={() => setEditingWordNum(null)}
                              className="rounded-lg bg-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-600">
                            <span>Child wrote:</span>
                            <strong className="font-mono text-slate-900">
                              {item.transcribedText || '(blank)'}
                            </strong>
                            <button
                              onClick={() => {
                                setEditingWordNum(item.wordNumber);
                                setEditInputVal(item.transcribedText || '');
                              }}
                              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-sky-600 hover:bg-sky-100"
                              title="Edit OCR transcription"
                            >
                              <Edit2 className="h-3 w-3" />
                              Edit
                            </button>
                          </div>
                        )}

                        <p className="mt-1 text-xs text-slate-500">
                          {item.feedback}
                        </p>
                      </div>

                      <button
                        onClick={() => toggleWordResult(item.wordNumber)}
                        className="group flex flex-col items-center gap-1 rounded-xl p-1 transition hover:bg-white/80"
                        title={
                          item.isCorrect
                            ? 'Click to mark as incorrect'
                            : 'Click to mark as correct'
                        }
                      >
                        {item.isCorrect ? (
                          <CheckCircle2 className="h-7 w-7 text-emerald-600 transition group-hover:scale-110" />
                        ) : (
                          <XCircle className="h-7 w-7 text-rose-600 transition group-hover:scale-110" />
                        )}
                        <span className="text-[10px] font-bold text-slate-500 group-hover:underline">
                          {item.isCorrect ? 'Correct' : 'Needs Fix'}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal (Phoneme Dashboard, History CSV, Account, API Key) */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onKeyChange={(has) => setHasCustomKey(has)}
        profile={profile}
        profiles={profiles}
        currentUser={currentUser}
        isAdmin={isAdmin}
        onResetProfile={handleResetProfile}
        onSignOut={handleSignOut}
        initialTab={settingsInitialTab}
      />

      {/* Speller Profiles Modal (Switch & Edit Spellers) */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profiles={profiles}
        activeProfile={profile}
        initialMode={profileModalMode}
        onProfileChanged={(updatedActive, all) => {
          setProfile(updatedActive);
          setProfiles(all);
          setStage('welcome');
          stopCurrentAudio();
        }}
      />
    </div>
  );
}
