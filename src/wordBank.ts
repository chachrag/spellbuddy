import { WordItem } from './types';
import {
  EXPANSIVE_WORDS_BY_LEVEL,
  getCuratedWords,
  getTotalWordBankCount,
  getRandomSessionTheme,
} from '../wordsData';

export const COMPREHENSIVE_WORD_BANK: Record<number, WordItem[]> = EXPANSIVE_WORDS_BY_LEVEL;

export { getTotalWordBankCount, getRandomSessionTheme };

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
