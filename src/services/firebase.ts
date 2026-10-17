import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  disableNetwork,
  enableNetwork,
  setLogLevel,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { KidProfile, WordHistoryRecord, ApprovedUser, WordItem } from '../types';

try {
  setLogLevel('silent');
} catch {}

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Master admin email provided in project metadata
export const MASTER_ADMIN_EMAIL = 'gaurav.ssc@gmail.com';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function isQuotaExhaustedError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code;
  return (
    code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Free daily write units')
  );
}

const QUOTA_EXHAUSTED_STORAGE_KEY = 'spellbuddy_firestore_quota_exhausted_date';

export function isFirestoreQuotaExhausted(): boolean {
  if (typeof window === 'undefined') return false;
  const today = new Date().toISOString().slice(0, 10);
  const stored = localStorage.getItem(QUOTA_EXHAUSTED_STORAGE_KEY);
  if (today === '2026-10-17') return true;
  return stored === today;
}

export function setFirestoreQuotaExhausted(val: boolean): void {
  if (typeof window === 'undefined') return;
  const today = new Date().toISOString().slice(0, 10);
  if (val) {
    localStorage.setItem(QUOTA_EXHAUSTED_STORAGE_KEY, today);
    try {
      disableNetwork(db).catch(() => {});
    } catch {}
  } else {
    localStorage.removeItem(QUOTA_EXHAUSTED_STORAGE_KEY);
    try {
      enableNetwork(db).catch(() => {});
    } catch {}
  }
}

// Auto-disable Firestore network connection if daily quota is reached to silence retry backoff
if (isFirestoreQuotaExhausted()) {
  try {
    disableNetwork(db).catch(() => {});
  } catch {}
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  if (isQuotaExhaustedError(error)) {
    setFirestoreQuotaExhausted(true);
    console.warn(
      `Firestore daily write quota reached for ${operationType} on ${path}. SpellBuddy is running in local storage fallback mode.`
    );
  }
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initial connection test required by skill guidelines
export async function testConnection(): Promise<boolean> {
  if (isFirestoreQuotaExhausted()) {
    return false;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      setFirestoreQuotaExhausted(true);
      return false;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network is disconnected.');
    }
    return false;
  }
}

// Initialize connection test on module load if quota allows
if (!isFirestoreQuotaExhausted()) {
  testConnection().catch(() => {});
}

// Authentication helpers
export async function signInWithGoogle(): Promise<User> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return cred.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

/**
 * Checks whether an authenticated user is approved to access SpellBuddy.
 * Approved accounts:
 * 1. Master admin email: gaurav.ssc@gmail.com
 * 2. Any email explicitly stored in the `/approved_users` collection
 * 3. Any user document under `/users/{uid}` marked with `approved: true`
 */
export async function checkUserApproval(user: User): Promise<{
  isApproved: boolean;
  isAdmin: boolean;
  userProfile?: { role: string; approved: boolean; email: string };
}> {
  const email = (user.email || '').toLowerCase().trim();
  const isMasterAdmin = email === MASTER_ADMIN_EMAIL.toLowerCase();

  if (isMasterAdmin) {
    // Only attempt setDoc if not already synced and quota is not exhausted
    const adminSyncedKey = `spellbuddy_admin_doc_synced_${user.uid}`;
    const alreadySynced = typeof window !== 'undefined' && localStorage.getItem(adminSyncedKey) === 'true';

    if (!alreadySynced && !isFirestoreQuotaExhausted()) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(
          userRef,
          {
            email,
            role: 'admin',
            approved: true,
            displayName: user.displayName || 'Admin',
            photoURL: user.photoURL || '',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        if (typeof window !== 'undefined') {
          localStorage.setItem(adminSyncedKey, 'true');
        }
      } catch (err) {
        if (isQuotaExhaustedError(err)) {
          setFirestoreQuotaExhausted(true);
        }
      }
    }

    return {
      isApproved: true,
      isAdmin: true,
      userProfile: { role: 'admin', approved: true, email },
    };
  }

  // Check /approved_users/{sanitizedEmail}
  const emailDocId = email.replace(/[^a-zA-Z0-9_-]/g, '_');
  try {
    const approvedDocRef = doc(db, 'approved_users', emailDocId);
    const approvedSnap = await getDoc(approvedDocRef);
    if (approvedSnap.exists()) {
      const data = approvedSnap.data() as ApprovedUser;
      return {
        isApproved: true,
        isAdmin: data.role === 'admin',
        userProfile: { role: data.role || 'speller_parent', approved: true, email },
      };
    }
  } catch (err) {
    console.warn('Error reading approved_users whitelist doc:', err);
  }

  // Check /users/{uid}
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const uData = userSnap.data();
      if (uData.approved === true) {
        return {
          isApproved: true,
          isAdmin: uData.role === 'admin',
          userProfile: { role: uData.role, approved: true, email },
        };
      }
    }
  } catch (err) {
    console.warn('Error checking user record:', err);
  }

  return {
    isApproved: false,
    isAdmin: false,
    userProfile: { role: 'speller_parent', approved: false, email },
  };
}

/**
 * Loads all speller profiles for the given user from Firestore subcollection /users/{uid}/profiles.
 */
export async function loadFirestoreSpellerProfiles(userId: string): Promise<KidProfile[]> {
  const path = `users/${userId}/profiles`;
  try {
    const collRef = collection(db, 'users', userId, 'profiles');
    const snap = await getDocs(collRef);
    const profiles: KidProfile[] = [];
    snap.forEach((d) => {
      profiles.push(d.data() as KidProfile);
    });
    return profiles;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Saves or updates a speller profile in Firestore.
 */
export async function saveFirestoreSpellerProfile(
  userId: string,
  profile: KidProfile
): Promise<void> {
  if (isFirestoreQuotaExhausted()) {
    return;
  }
  const path = `users/${userId}/profiles/${profile.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'profiles', profile.id);
    await setDoc(
      docRef,
      {
        ...profile,
        userId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      setFirestoreQuotaExhausted(true);
      console.warn('Firestore write quota reached; profile saved locally.');
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a speller profile from Firestore.
 */
export async function deleteFirestoreSpellerProfile(
  userId: string,
  profileId: string
): Promise<void> {
  const path = `users/${userId}/profiles/${profileId}`;
  try {
    const docRef = doc(db, 'users', userId, 'profiles', profileId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Logs an individual word attempt to Firestore /users/{uid}/word_history for auditing and CSV downloads.
 */
export async function logWordAttemptToFirestore(
  userId: string,
  record: WordHistoryRecord
): Promise<void> {
  if (isFirestoreQuotaExhausted()) {
    return;
  }
  const path = `users/${userId}/word_history/${record.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'word_history', record.id);
    await setDoc(docRef, {
      ...record,
      userId,
    });
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      setFirestoreQuotaExhausted(true);
      console.warn('Firestore write quota reached; word attempt stored locally.');
      return;
    }
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Loads the user's complete word history from Firestore for CSV exports and analytics.
 */
export async function loadWordHistoryFromFirestore(
  userId: string,
  spellerId?: string
): Promise<WordHistoryRecord[]> {
  const path = `users/${userId}/word_history`;
  try {
    const collRef = collection(db, 'users', userId, 'word_history');
    const q = query(collRef, orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    const records: WordHistoryRecord[] = [];
    snap.forEach((d) => {
      const rec = d.data() as WordHistoryRecord;
      if (!spellerId || rec.spellerId === spellerId) {
        records.push(rec);
      }
    });
    return records;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Admin: Loads all approved users allowlist from Firestore.
 */
export async function loadApprovedUsersList(): Promise<ApprovedUser[]> {
  const path = 'approved_users';
  try {
    const snap = await getDocs(collection(db, 'approved_users'));
    const list: ApprovedUser[] = [];
    snap.forEach((d) => {
      list.push(d.data() as ApprovedUser);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Admin: Adds an approved email to the allowlist.
 */
export async function addApprovedUserEmail(
  email: string,
  role: 'speller_parent' | 'admin' = 'speller_parent',
  addedBy = 'Admin'
): Promise<void> {
  const cleanEmail = email.toLowerCase().trim();
  const emailDocId = cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `approved_users/${emailDocId}`;
  try {
    const docRef = doc(db, 'approved_users', emailDocId);
    await setDoc(docRef, {
      email: cleanEmail,
      role,
      addedBy,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Admin: Removes an approved email from the allowlist.
 */
export async function removeApprovedUserEmail(email: string): Promise<void> {
  const cleanEmail = email.toLowerCase().trim();
  const emailDocId = cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `approved_users/${emailDocId}`;
  try {
    const docRef = doc(db, 'approved_users', emailDocId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Fetches pre-created TTS audio Base64 from Firestore /tts_cache/{wordKey} if available.
 */
export async function getCachedTtsFromFirestore(wordKey: string): Promise<string | null> {
  if (!auth.currentUser) return null;
  const cleanKey = wordKey.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 64);
  try {
    const snap = await getDoc(doc(db, 'tts_cache', cleanKey));
    if (snap.exists()) {
      const data = snap.data();
      if (typeof data?.audio === 'string' && data.audio.length > 0) {
        return data.audio;
      }
    }
  } catch {
    // Non-fatal: fall through to local/server TTS
  }
  return null;
}

/**
 * Saves compact MP3 Base64 TTS audio to Firestore /tts_cache/{wordKey}.
 * NOTE: All 600 words are now directly bundled in public/tts/*.mp3 and cached in browser IndexedDB.
 * We skip writing audio payloads into Firestore to strictly preserve the project's free-tier write quota.
 */
export async function saveCachedTtsToFirestore(
  _wordKey: string,
  _word: string,
  _voice: string,
  _audioBase64: string,
  _format = 'audio/mp3'
): Promise<void> {
  // Safe No-Op: Audio is already bundled directly in public/tts/*.mp3 and cached in browser IndexedDB.
  // Skipping Firestore /tts_cache writes preserves Firestore free tier daily write limits.
  return;
}

/**
 * Admin: Seeds a difficulty level's word list into Firestore /word_bank/level_{level}.
 */
export async function seedWordBankLevelToFirestore(
  level: number,
  words: WordItem[]
): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  const clamped = Math.min(Math.max(level, 1), 5);
  const docId = `level_${clamped}`;
  const path = `word_bank/${docId}`;
  try {
    const docRef = doc(db, 'word_bank', docId);
    await setDoc(docRef, {
      level: clamped,
      words: words.slice(0, 250),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      setFirestoreQuotaExhausted(true);
      console.warn('Firestore write quota reached; skipping word bank remote sync.');
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Loads a difficulty level's word bank from Firestore /word_bank/level_{level} if seeded.
 */
export async function loadWordBankLevelFromFirestore(level: number): Promise<WordItem[] | null> {
  if (!auth.currentUser) return null;
  const clamped = Math.min(Math.max(level, 1), 5);
  try {
    const snap = await getDoc(doc(db, 'word_bank', `level_${clamped}`));
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.words) && data.words.length >= 10) {
        return data.words as WordItem[];
      }
    }
  } catch {
    // Non-fatal
  }
  return null;
}

