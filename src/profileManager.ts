import { KidProfile } from './types';

const PROFILES_STORAGE_KEY = 'spellbuddy_profiles_v2';
const ACTIVE_PROFILE_ID_KEY = 'spellbuddy_active_profile_id';
const LEGACY_PROFILE_KEY = 'spellbuddy_profile';

export const AVATAR_OPTIONS = ['🦊', '🦁', '🚀', '🐼', '🦄', '🌟', '🦖', '🎨', '⚡', '🦉', '🐬', '🐯'];

export const LEVEL_DESCRIPTIONS: Record<number, { title: string; subtitle: string; grade: string }> = {
  1: {
    title: 'Level 1: Word Explorer',
    subtitle: '1st & 2nd Grade Phonics (CVC, blends, silent-e, simple vowel teams)',
    grade: '1st - 2nd Grade',
  },
  2: {
    title: 'Level 2: Sound Builder',
    subtitle: 'Early 3rd Grade (vowel teams, silent letters like kn/wr, igh/dge trigraphs)',
    grade: 'Early 3rd Grade',
  },
  3: {
    title: 'Level 3: Spelling Detective',
    subtitle: 'Core 3rd Grade (multisyllabic words, tricky vowels, r-controlled vowels)',
    grade: 'Core 3rd Grade',
  },
  4: {
    title: 'Level 4: Phonics Champion',
    subtitle: 'Late 3rd / 4th Grade (prefixes, suffixes like -tion/-ture, Latin roots)',
    grade: '3rd - 4th Grade',
  },
  5: {
    title: 'Level 5: Master Speller',
    subtitle: 'Challenging 4th Grade (complex silent letters, etymology, polysyllabic words)',
    grade: 'Advanced 4th Grade',
  },
};

export const DEFAULT_INITIAL_PROFILE: KidProfile = {
  id: 'profile-default',
  name: 'Alex',
  age: 8,
  avatarEmoji: '🦊',
  difficultyLevel: 2,
  roundsCompleted: 0,
  struggledWords: [],
  masteredWords: [],
  phonemeMastery: {},
  recentScores: [],
  levelRoundsCount: 0,
  consecutiveHighScores: 0,
};

export function loadAllProfiles(): KidProfile[] {
  if (typeof window === 'undefined') return [DEFAULT_INITIAL_PROFILE];

  const stored = localStorage.getItem(PROFILES_STORAGE_KEY);
  if (stored) {
    try {
      const parsed: KidProfile[] = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(sanitizeProfile);
      }
    } catch {
      // Fall through to legacy check
    }
  }

  // Check legacy single-profile migration
  const legacy = localStorage.getItem(LEGACY_PROFILE_KEY);
  if (legacy) {
    try {
      const parsedLegacy = JSON.parse(legacy);
      const migrated: KidProfile = {
        ...DEFAULT_INITIAL_PROFILE,
        ...parsedLegacy,
        id: 'profile-' + Date.now(),
        avatarEmoji: parsedLegacy.avatarEmoji || '🦊',
        levelRoundsCount: parsedLegacy.levelRoundsCount || parsedLegacy.roundsCompleted || 0,
        consecutiveHighScores: parsedLegacy.consecutiveHighScores || 0,
      };
      saveAllProfiles([migrated]);
      setActiveProfileId(migrated.id);
      return [migrated];
    } catch {
      // Ignore
    }
  }

  // Initialize fresh
  saveAllProfiles([DEFAULT_INITIAL_PROFILE]);
  setActiveProfileId(DEFAULT_INITIAL_PROFILE.id);
  return [DEFAULT_INITIAL_PROFILE];
}

export function saveAllProfiles(profiles: KidProfile[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
}

export function getActiveProfileId(): string {
  if (typeof window === 'undefined') return DEFAULT_INITIAL_PROFILE.id;
  return localStorage.getItem(ACTIVE_PROFILE_ID_KEY) || DEFAULT_INITIAL_PROFILE.id;
}

export function setActiveProfileId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_PROFILE_ID_KEY, id);
}

export function sanitizeProfile(raw: Partial<KidProfile>): KidProfile {
  return {
    id: raw.id || 'profile-' + Math.random().toString(36).slice(2, 9),
    userId: raw.userId,
    name: raw.name?.trim() || 'Speller',
    age: Number(raw.age) || 8,
    avatarEmoji: raw.avatarEmoji || '🦊',
    difficultyLevel: Math.min(Math.max(Number(raw.difficultyLevel) || 2, 1), 5),
    roundsCompleted: Number(raw.roundsCompleted) || 0,
    struggledWords: Array.isArray(raw.struggledWords) ? raw.struggledWords : [],
    masteredWords: Array.isArray(raw.masteredWords) ? raw.masteredWords : [],
    phonemeMastery: raw.phonemeMastery || {},
    recentScores: Array.isArray(raw.recentScores) ? raw.recentScores : [],
    levelRoundsCount: Number(raw.levelRoundsCount) || 0,
    consecutiveHighScores: Number(raw.consecutiveHighScores) || 0,
    updatedAt: raw.updatedAt,
  };
}

export function createNewProfile(
  name: string,
  age: number,
  startingLevel: number,
  avatarEmoji: string,
  userId?: string
): KidProfile {
  const newProfile: KidProfile = {
    id: 'profile-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    userId,
    name: name.trim() || 'Speller',
    age: Math.min(Math.max(age, 4), 14),
    avatarEmoji: avatarEmoji || '🌟',
    difficultyLevel: Math.min(Math.max(startingLevel, 1), 5),
    roundsCompleted: 0,
    struggledWords: [],
    masteredWords: [],
    phonemeMastery: {},
    recentScores: [],
    levelRoundsCount: 0,
    consecutiveHighScores: 0,
  };

  const all = loadAllProfiles();
  const updated = [...all, newProfile];
  saveAllProfiles(updated);
  setActiveProfileId(newProfile.id);
  return newProfile;
}

export function resetProfileProgress(profileId: string): KidProfile {
  const all = loadAllProfiles();
  let updatedProfile: KidProfile = DEFAULT_INITIAL_PROFILE;

  const updatedAll = all.map((p) => {
    if (p.id === profileId) {
      updatedProfile = {
        ...p,
        difficultyLevel: 1, // Start back at foundation Level 1 or starting level
        roundsCompleted: 0,
        struggledWords: [],
        masteredWords: [],
        phonemeMastery: {},
        recentScores: [],
        levelRoundsCount: 0,
        consecutiveHighScores: 0,
      };
      return updatedProfile;
    }
    return p;
  });

  saveAllProfiles(updatedAll);
  return updatedProfile;
}

export function deleteProfile(profileId: string): { remaining: KidProfile[]; nextActive: KidProfile } {
  const all = loadAllProfiles();
  const filtered = all.filter((p) => p.id !== profileId);
  const remaining = filtered.length > 0 ? filtered : [DEFAULT_INITIAL_PROFILE];
  const nextActive = remaining[0];

  saveAllProfiles(remaining);
  setActiveProfileId(nextActive.id);
  return { remaining, nextActive };
}

export function updateProfile(
  profileId: string,
  updates: {
    name: string;
    age: number;
    difficultyLevel: number;
    avatarEmoji: string;
  }
): KidProfile {
  const all = loadAllProfiles();
  let updatedProfile: KidProfile = DEFAULT_INITIAL_PROFILE;

  const updatedAll = all.map((p) => {
    if (p.id === profileId) {
      const levelChanged = p.difficultyLevel !== updates.difficultyLevel;
      updatedProfile = {
        ...p,
        name: updates.name.trim() || p.name,
        age: Math.min(Math.max(updates.age, 4), 14),
        difficultyLevel: Math.min(Math.max(updates.difficultyLevel, 1), 5),
        avatarEmoji: updates.avatarEmoji || p.avatarEmoji,
        levelRoundsCount: levelChanged ? 0 : p.levelRoundsCount,
        consecutiveHighScores: levelChanged ? 0 : p.consecutiveHighScores,
      };
      return updatedProfile;
    }
    return p;
  });

  saveAllProfiles(updatedAll);
  return updatedProfile;
}
