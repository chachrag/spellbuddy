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
  where,
  orderBy,
  onSnapshot,
  arrayUnion,
  arrayRemove,
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
  return stored === today;
}

export function setFirestoreQuotaExhausted(val: boolean): void {
  if (typeof window === 'undefined') return;
  const today = new Date().toISOString().slice(0, 10);
  if (val) {
    localStorage.setItem(QUOTA_EXHAUSTED_STORAGE_KEY, today);
  } else {
    localStorage.removeItem(QUOTA_EXHAUSTED_STORAGE_KEY);
  }
}

// Ensure Firestore network remains enabled for reads (profiles, history, allowlist)
try {
  enableNetwork(db).catch(() => {});
} catch {}

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

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// Initial connection test helper
export async function testConnection(): Promise<boolean> {
  if (isFirestoreQuotaExhausted()) {
    return false;
  }
  try {
    await withTimeout(getDocFromServer(doc(db, 'test', 'connection')), 1500, null);
    return true;
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      setFirestoreQuotaExhausted(true);
      return false;
    }
    return false;
  }
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
 * 1. Master admin email: gaurav.ssc@gmail.com (instant 0ms return)
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
    // Sync admin doc in the background without blocking startup
    const adminSyncedKey = `spellbuddy_admin_doc_synced_${user.uid}`;
    const alreadySynced = typeof window !== 'undefined' && localStorage.getItem(adminSyncedKey) === 'true';

    if (!alreadySynced && !isFirestoreQuotaExhausted()) {
      const userRef = doc(db, 'users', user.uid);
      setDoc(
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
      )
        .then(() => {
          if (typeof window !== 'undefined') {
            localStorage.setItem(adminSyncedKey, 'true');
          }
        })
        .catch((err) => {
          if (isQuotaExhaustedError(err)) {
            setFirestoreQuotaExhausted(true);
          }
        });
    }

    return {
      isApproved: true,
      isAdmin: true,
      userProfile: { role: 'admin', approved: true, email },
    };
  }

  // Check local approval cache for instant 0ms repeat startups
  const approvalCacheKey = `spellbuddy_approved_role_${email}`;
  const cachedRole = typeof window !== 'undefined' ? localStorage.getItem(approvalCacheKey) : null;
  if (cachedRole === 'admin' || cachedRole === 'speller_parent') {
    return {
      isApproved: true,
      isAdmin: cachedRole === 'admin',
      userProfile: { role: cachedRole, approved: true, email },
    };
  }

  // Query /approved_users/{sanitizedEmail} and /users/{uid} in parallel with 2.5s timeout
  const emailDocId = email.replace(/[^a-zA-Z0-9_-]/g, '_');
  try {
    const [approvedSnap, userSnap] = await withTimeout(
      Promise.all([
        getDoc(doc(db, 'approved_users', emailDocId)).catch(() => null),
        getDoc(doc(db, 'users', user.uid)).catch(() => null),
      ]),
      2500,
      [null, null]
    );

    if (approvedSnap && approvedSnap.exists()) {
      const data = approvedSnap.data() as ApprovedUser;
      const role = data.role || 'speller_parent';
      if (typeof window !== 'undefined') {
        localStorage.setItem(approvalCacheKey, role);
      }
      return {
        isApproved: true,
        isAdmin: role === 'admin',
        userProfile: { role, approved: true, email },
      };
    }

    if (userSnap && userSnap.exists()) {
      const uData = userSnap.data();
      if (uData.approved === true) {
        const role = uData.role || 'speller_parent';
        if (typeof window !== 'undefined') {
          localStorage.setItem(approvalCacheKey, role);
        }
        return {
          isApproved: true,
          isAdmin: role === 'admin',
          userProfile: { role, approved: true, email },
        };
      }
    }
  } catch (err) {
    console.warn('Error checking user approval:', err);
  }

  return {
    isApproved: false,
    isAdmin: false,
    userProfile: { role: 'speller_parent', approved: false, email },
  };
}

/**
 * Loads all speller profiles for the given user, querying both:
 * 1. Top-level /shared_profiles collection (profiles owned by or shared with this user's Gmail)
 * 2. Legacy /users/{uid}/profiles subcollection
 */
export async function loadFirestoreSpellerProfiles(
  userOrId: string | { uid: string; email?: string | null }
): Promise<KidProfile[]> {
  const userId = typeof userOrId === 'string' ? userOrId : userOrId.uid;
  const userEmail =
    typeof userOrId === 'object' && userOrId.email ? userOrId.email.toLowerCase().trim() : '';

  const profilesMap = new Map<string, KidProfile>();

  try {
    // 1. Query /shared_profiles where collaboratorEmails array-contains userEmail
    if (userEmail) {
      const sharedColl = collection(db, 'shared_profiles');
      const q = query(sharedColl, where('collaboratorEmails', 'array-contains', userEmail));
      const sharedSnap = await withTimeout(getDocs(q), 3000, null);
      if (sharedSnap) {
        sharedSnap.forEach((d) => {
          const data = d.data() as KidProfile;
          profilesMap.set(data.id, data);
        });
      }
    }

    // 2. Query legacy /users/{uid}/profiles
    const collRef = collection(db, 'users', userId, 'profiles');
    const legacySnap = await withTimeout(getDocs(collRef), 2500, null);
    if (legacySnap) {
      legacySnap.forEach((d) => {
        const legacyData = d.data() as KidProfile;
        if (!profilesMap.has(legacyData.id)) {
          profilesMap.set(legacyData.id, legacyData);
          // Automatically back up to shared_profiles so it can be shared with other Gmail accounts!
          if (userEmail) {
            saveFirestoreSpellerProfile(
              { uid: userId, email: userEmail },
              {
                ...legacyData,
                ownerId: userId,
                ownerEmail: userEmail,
                collaboratorEmails: [userEmail],
              }
            ).catch(() => {});
          }
        }
      });
    }

    return Array.from(profilesMap.values());
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      setFirestoreQuotaExhausted(true);
    }
    return Array.from(profilesMap.values());
  }
}

/**
 * Saves or updates a speller profile in Firestore in both /shared_profiles and /users/{uid}/profiles.
 */
export async function saveFirestoreSpellerProfile(
  userOrId: string | { uid: string; email?: string | null },
  profile: KidProfile
): Promise<void> {
  if (isFirestoreQuotaExhausted()) {
    return;
  }
  const userId = typeof userOrId === 'string' ? userOrId : userOrId.uid;
  const userEmail =
    typeof userOrId === 'object' && userOrId.email ? userOrId.email.toLowerCase().trim() : '';

  const ownerId = profile.ownerId || userId;
  const ownerEmail = (profile.ownerEmail || userEmail || '').toLowerCase().trim();
  const sharedWithEmails = Array.from(
    new Set(
      (profile.sharedWithEmails || [])
        .map((e) => String(e).toLowerCase().trim())
        .filter((e) => e && e !== ownerEmail)
    )
  );
  const collaboratorEmails = Array.from(
    new Set([ownerEmail, ...sharedWithEmails].filter(Boolean))
  );

  const enrichedProfile: KidProfile = {
    ...profile,
    userId: ownerId,
    ownerId,
    ownerEmail,
    sharedWithEmails,
    collaboratorEmails,
    updatedByEmail: userEmail || ownerEmail,
    updatedAt: new Date().toISOString(),
  };

  try {
    // 1. Save to /shared_profiles/{profile.id}
    const sharedRef = doc(db, 'shared_profiles', profile.id);
    await withTimeout(setDoc(sharedRef, enrichedProfile, { merge: true }), 2500, undefined);

    // 2. Also save to legacy /users/{userId}/profiles/{profile.id}
    const userProfileRef = doc(db, 'users', userId, 'profiles', profile.id);
    await withTimeout(setDoc(userProfileRef, enrichedProfile, { merge: true }), 2000, undefined);
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      setFirestoreQuotaExhausted(true);
      console.warn('Firestore write quota reached; profile saved locally.');
      return;
    }
    console.warn('Error saving shared profile to Firestore:', error);
  }
}

/**
 * Shares a speller profile with another Gmail account.
 */
export async function shareSpellerProfileWithEmail(
  user: { uid: string; email?: string | null },
  profile: KidProfile,
  emailToShare: string
): Promise<KidProfile> {
  const targetEmail = emailToShare.toLowerCase().trim();
  if (!targetEmail || !targetEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  const ownerEmail = (profile.ownerEmail || user.email || '').toLowerCase().trim();
  if (targetEmail === ownerEmail) {
    throw new Error('This profile is already owned by this account.');
  }

  const existingShared = profile.sharedWithEmails || [];
  if (existingShared.includes(targetEmail)) {
    return profile; // Already shared
  }

  const updatedShared = [...existingShared, targetEmail];
  const updatedCollaborators = Array.from(new Set([ownerEmail, ...updatedShared].filter(Boolean)));

  const updatedProfile: KidProfile = {
    ...profile,
    sharedWithEmails: updatedShared,
    collaboratorEmails: updatedCollaborators,
    updatedAt: new Date().toISOString(),
    updatedByEmail: (user.email || '').toLowerCase().trim(),
  };

  await saveFirestoreSpellerProfile(user, updatedProfile);
  return updatedProfile;
}

/**
 * Revokes sharing of a speller profile from a Gmail account.
 */
export async function unshareSpellerProfileWithEmail(
  user: { uid: string; email?: string | null },
  profile: KidProfile,
  emailToRemove: string
): Promise<KidProfile> {
  const targetEmail = emailToRemove.toLowerCase().trim();
  const ownerEmail = (profile.ownerEmail || user.email || '').toLowerCase().trim();

  const updatedShared = (profile.sharedWithEmails || []).filter((e) => e.toLowerCase() !== targetEmail);
  const updatedCollaborators = Array.from(new Set([ownerEmail, ...updatedShared].filter(Boolean)));

  const updatedProfile: KidProfile = {
    ...profile,
    sharedWithEmails: updatedShared,
    collaboratorEmails: updatedCollaborators,
    updatedAt: new Date().toISOString(),
    updatedByEmail: (user.email || '').toLowerCase().trim(),
  };

  await saveFirestoreSpellerProfile(user, updatedProfile);
  return updatedProfile;
}

/**
 * Subscribes to real-time changes on a shared speller profile so all devices stay in sync!
 */
export function subscribeToSpellerProfile(
  profileId: string,
  onUpdate: (updated: KidProfile) => void
): () => void {
  try {
    const docRef = doc(db, 'shared_profiles', profileId);
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          onUpdate(snap.data() as KidProfile);
        }
      },
      (err) => {
        console.warn('Profile subscription listener error:', err);
      }
    );
  } catch {
    return () => {};
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
    const sharedRef = doc(db, 'shared_profiles', profileId);
    await deleteDoc(sharedRef).catch(() => {});
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
    // Also log under shared_profiles for shared history access
    if (record.spellerId) {
      const sharedHistRef = doc(db, 'shared_profiles', record.spellerId, 'history', record.id);
      await setDoc(sharedHistRef, {
        ...record,
        userId,
      }).catch(() => {});
    }
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
 * NOTE: All 600 words are bundled in public/tts/*.mp3 and cached in browser IndexedDB,
 * so we return null immediately to save Firestore read units and eliminate network latency.
 */
export async function getCachedTtsFromFirestore(_wordKey: string): Promise<string | null> {
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

