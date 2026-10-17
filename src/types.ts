export interface WordItem {
  word: string;
  phoneticBreakdown: string; // e.g., "buh - leev"
  phoneticSpeechCue: string; // Spoken by TTS for phonetic button, e.g., "Listen closely: B, E, L, I, E, V, E. Buh-leev. The I and E team up to make a long E sound."
  phonemes: string[]; // e.g., ["ie", "long-e", "bl-blend"]
  exampleSentence: string;
  revealed?: boolean;
}

export interface GradedWordResult {
  wordNumber: number;
  expectedWord: string;
  transcribedText: string;
  isCorrect: boolean;
  /**
   * Normalized bounding box [ymin, xmin, ymax, xmax] scaled 0 to 1000
   * representing where the child wrote the word on the page.
   */
  box2d: [number, number, number, number];
  feedback: string;
}

export interface RoundGradingResponse {
  totalScore: number;
  results: GradedWordResult[];
  encouragementMessage: string;
}

export interface PhonemeStat {
  phoneme: string;
  attempts: number;
  correct: number;
}

export interface KidProfile {
  id: string;
  userId?: string;
  name: string;
  age: number;
  avatarEmoji: string; // e.g., 🦁, 🦊, 🚀, 🐼, 🦄, 🌟, 🦖
  difficultyLevel: number; // 1 (Easy 2nd/3rd) to 5 (Advanced 3rd/4th)
  roundsCompleted: number;
  struggledWords: string[]; // Pool of words missed or revealed in past rounds (repeated until mastered)
  masteredWords: string[]; // Words spelled correctly without hints in past rounds (NEVER repeated again)
  phonemeMastery: Record<string, PhonemeStat>;
  recentScores: number[];
  levelRoundsCount: number; // Rounds played at the current difficulty level
  consecutiveHighScores: number; // Count of consecutive rounds scoring >= 9 at current level (needs 3 to advance)
  updatedAt?: string;
}

export interface WordHistoryRecord {
  id: string;
  spellerId: string;
  spellerName: string;
  userId?: string;
  word: string;
  status: 'correct' | 'wrong';
  level: number;
  childAttempt: string;
  wasRevealed?: boolean;
  timestamp: string; // ISO format date string
  phonemes?: string[];
}

export interface ApprovedUser {
  email: string;
  role: 'admin' | 'speller_parent';
  addedBy?: string;
  createdAt?: string;
}
