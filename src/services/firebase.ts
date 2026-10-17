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
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { KidProfile, WordHistoryRecord, ApprovedUser } from '../types';

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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
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
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network is disconnected.');
    }
    return false;
  }
}

// Initialize connection test on module load
testConnection().catch(() => {});

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
    // Ensure admin user doc exists in /users/{uid}
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
    } catch {
      // Non-fatal
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
  const path = `users/${userId}/word_history/${record.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'word_history', record.id);
    await setDoc(docRef, {
      ...record,
      userId,
    });
  } catch (error) {
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
