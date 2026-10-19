import { WordItem } from './types';
import {
  EXPANSIVE_WORDS_BY_LEVEL,
  getCuratedWords,
  getTotalWordBankCount,
  getRandomSessionTheme,
} from '../wordsData';

export const COMPREHENSIVE_WORD_BANK: Record<number, WordItem[]> = EXPANSIVE_WORDS_BY_LEVEL;

export interface LibraryWordItem extends WordItem {
  level: number;
}

/**
 * Returns all words across all levels in the app's pre-populated word library,
 * annotated with their level number.
 */
export function getAllLibraryWords(): LibraryWordItem[] {
  const all: LibraryWordItem[] = [];
  for (let lvl = 1; lvl <= 5; lvl++) {
    const list = EXPANSIVE_WORDS_BY_LEVEL[lvl] || [];
    for (const item of list) {
      all.push({
        word: item.word,
        phoneticBreakdown: item.phoneticBreakdown,
        phoneticSpeechCue: item.phoneticSpeechCue,
        phonemes: item.phonemes,
        exampleSentence: item.exampleSentence,
        level: lvl,
      });
    }
  }
  return all;
}

export { EXPANSIVE_WORDS_BY_LEVEL, getTotalWordBankCount, getRandomSessionTheme };

/**
 * Returns a truly randomized 10-word session list for the given difficulty level
 * from the 600-word pre-populated database.
 * Excludes already mastered words and integrates up to 3 review words.
 */
export function getRandomSpellingWords(
  level: number,
  struggledWords: string[] = [],
  masteredWords: string[] = []
): WordItem[] {
  return getCuratedWords(level, struggledWords, masteredWords) as WordItem[];
}

