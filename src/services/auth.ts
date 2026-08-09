import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc,
  writeBatch
} from "firebase/firestore";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence 
} from "firebase/auth";
import { nanoid } from 'nanoid';
import { db, auth, handleFirestoreError, OperationType } from "./firebaseCore";
import { UserData } from "../types";

// Helper: Generate Unique User ID
export function generateUserId(): string {
  return nanoid(10);
}

// Check if user exists by phone or email
export async function checkUserExists(phone: string, email?: string): Promise<any> {
  const path = 'opensooq_users';
  try {
    let q;
    if (phone) {
      q = query(collection(db, path), where('phone', '==', phone));
    } else if (email) {
      q = query(collection(db, path), where('email', '==', email));
    } else {
      return null;
    }
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const firstDoc = snapshot.docs[0];
      return { id: firstDoc.id, ...(firstDoc.data() as any) };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// Register user in Firestore and Firebase Auth
export async function registerFirebaseUser(userData: { phone: string; name: string; password: string }): Promise<any> {
  const path = 'opensooq_users';
  try {
    if (userData.phone) {
      const qCheck = query(collection(db, path), where('phone', '==', userData.phone));
      const snapCheck = await getDocs(qCheck);
      if (!snapCheck.empty) {
        throw new Error("PHONE_ALREADY_EXISTS");
      }
    }

    const userDoc = {
      phone: userData.phone,
      name: userData.name,
      password: userData.password,
      created_at: new Date().toISOString(),
      userId: generateUserId(),
      balance: 0,
      freeAdsCount: 3
    };

    await addDoc(collection(db, path), userDoc);

    try {
      await createUserWithEmailAndPassword(
        auth, 
        `${userData.phone}@opensooq-yemen.com`, 
        userData.password
      );
    } catch (authErr) {
      console.warn("Background auth registration ignored or already exists:", authErr);
    }

    return userDoc;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Login user via Firestore and sign in to Firebase Auth in background
export async function loginFirebaseUser(phone: string, password: string): Promise<any> {
  const path = 'opensooq_users';
  try {
    const q = query(collection(db, path), where('phone', '==', phone), where('password', '==', password));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    const userData = snapshot.docs[0].data();

    try {
      await signInWithEmailAndPassword(
        auth, 
        `${phone}@opensooq-yemen.com`, 
        password
      );
    } catch (authErr) {
      console.warn("Background auth login ignored:", authErr);
    }

    return {
      phone: userData.phone,
      name: userData.name
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// Register or Login via OTP
export async function registerOrLoginFirebaseUserOTP(phone: string, name?: string): Promise<{ name: string; phone: string }> {
  const path = 'opensooq_users';
  try {
    const q = query(collection(db, path), where('phone', '==', phone));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      return { phone: data.phone, name: data.name };
    } else {
      const finalName = name || 'عضو السوق المفتوح اليمني';
      const userDoc = {
        phone,
        name: finalName,
        created_at: new Date().toISOString(),
        userId: generateUserId(),
        balance: 0,
        freeAdsCount: 3
      };
      await addDoc(collection(db, path), userDoc);
      return { phone, name: finalName };
    }
  } catch (error) {
    console.error("Error in OTP user registration:", error);
    return { phone, name: name || 'عضو السوق المفتوح اليمني' };
  }
}

// Check user profile by Email
export async function checkUserByEmail(email: string): Promise<any> {
  const path = 'opensooq_users';
  try {
    const q = query(collection(db, path), where('email', '==', email));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }
    return null;
  } catch (error) {
    console.error("Error checking user by email:", error);
    return null;
  }
}

// Check Google Auth Redirect Result on App Load
export async function checkGoogleRedirectResult(): Promise<{ name: string; email: string; phone: string } | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result || !result.user) return null;

    const user = result.user;
    const phone = "";

    const userData = {
      name: user.displayName || 'مستخدم جوجل',
      email: user.email || '',
      phone: phone
    };

    const exists = await checkUserByEmail(userData.email);
    if (!exists) {
      await addDoc(collection(db, 'opensooq_users'), {
        ...userData,
        created_at: new Date().toISOString(),
        userId: generateUserId(),
        balance: 0,
        freeAdsCount: 3
      });
    } else {
      userData.phone = exists.phone || phone;
      userData.name = exists.name || userData.name;
    }

    return userData;
  } catch (error) {
    console.error("Error checking Google redirect result:", error);
    return null;
  }
}

// Google Login Integration
export async function loginWithGoogle(): Promise<{ name: string; email: string; phone: string }> {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (e) {
    console.warn("Could not set local persistence:", e);
  }

  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    const phone = "";

    const userData = {
      name: user.displayName || 'مستخدم جوجل',
      email: user.email || '',
      phone: phone
    };

    const exists = await checkUserByEmail(userData.email);
    if (!exists) {
      await addDoc(collection(db, 'opensooq_users'), {
        ...userData,
        created_at: new Date().toISOString(),
        userId: generateUserId(),
        balance: 0,
        freeAdsCount: 3
      });
    } else {
      userData.phone = exists.phone || phone;
      userData.name = exists.name || userData.name;
    }

    return userData;
  } catch (error: any) {
    console.error("Google Login Error:", error);

    if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
      throw new Error("تم إغلاق نافذة اختيار حساب جوجل قبل الإكمال.");
    }
    if (error.code === 'auth/popup-blocked') {
      throw new Error("تم حظر النافذة المنبثقة في المتصفح. يرجى السماح بالنوافذ المنبثقة لإكمال تسجيل الدخول بجوجل.");
    }
    if (error.message?.includes('missing initial state') || error.code === 'auth/unauthorized-domain') {
      throw new Error("تعذر الاتصال بخدمة جوجل في هذه البيئة. يرجى تسجيل الدخول بالبريد الإلكتروني المباشر.");
    }
    throw new Error(error.message || "فشل تسجيل الدخول عبر حساب جوجل. يمكنك تسجيل الدخول بالبريد الإلكتروني.");
  }
}

// Email Registration
export async function registerWithEmail(
  firstName: string,
  lastName: string,
  email: string,
  password: string
): Promise<{ name: string; email: string; phone: string }> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  
  try {
    await sendEmailVerification(credential.user);
  } catch (err) {
    console.warn("Failed to send verification email:", err);
  }
  
  const fullName = `${firstName} ${lastName}`;
  // Set empty phone initially, letting the user add their phone number manually in their profile
  const phone = "";

  await addDoc(collection(db, 'opensooq_users'), {
    name: fullName,
    firstName,
    lastName,
    email,
    phone,
    created_at: new Date().toISOString(),
    emailVerified: false,
    userId: generateUserId(),
    balance: 0,
    freeAdsCount: 3
  });

  return { name: fullName, email, phone };
}

// Email Login
export async function loginWithEmail(
  email: string,
  password: string
): Promise<{ name: string; email: string; phone: string }> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  const userDoc = await checkUserByEmail(email);
  const name = userDoc?.name || user.displayName || 'مستخدم';
  
  let phone = userDoc?.phone || '';

  return { name, email, phone };
}

// Update User Profile
export async function updateUserProfileByPhone(phone: string, updateData: { name: string; email?: string; city?: string; phone?: string }): Promise<void> {
  const path = 'opensooq_users';
  try {
    const oldPhone = phone;
    const newPhone = updateData.phone;

    // Find current user's document first
    let currentDoc: any = null;
    if (oldPhone) {
      const q = query(collection(db, path), where('phone', '==', oldPhone));
      const snap = await getDocs(q);
      if (!snap.empty) currentDoc = snap.docs[0];
    }
    if (!currentDoc && updateData.email) {
      const q = query(collection(db, path), where('email', '==', updateData.email));
      const snap = await getDocs(q);
      if (!snap.empty) currentDoc = snap.docs[0];
    }
    if (!currentDoc && auth.currentUser?.email) {
      const q = query(collection(db, path), where('email', '==', auth.currentUser.email));
      const snap = await getDocs(q);
      if (!snap.empty) currentDoc = snap.docs[0];
    }

    // Security Check: If newPhone is provided, verify it is NOT registered to ANOTHER user
    if (newPhone) {
      const qCheck = query(collection(db, path), where('phone', '==', newPhone));
      const snapshotCheck = await getDocs(qCheck);
      if (!snapshotCheck.empty) {
        const belongsToAnotherUser = snapshotCheck.docs.some(d => {
          if (!currentDoc) return true; // Cannot verify current doc, reject duplicate
          return d.id !== currentDoc.id; // Different document ID
        });
        if (belongsToAnotherUser) {
          throw new Error("PHONE_ALREADY_EXISTS");
        }
      }
    }

    if (currentDoc) {
      await updateDoc(currentDoc.ref, updateData);

      // Keep listing phone numbers synchronized to prevent orphan listings
      if (newPhone && newPhone !== oldPhone && oldPhone) {
        const adsQuery = query(collection(db, 'opensooq_listings'), where('phone', '==', oldPhone));
        const adsSnap = await getDocs(adsQuery);
        if (!adsSnap.empty) {
          const batch = writeBatch(db);
          adsSnap.forEach((adDoc) => {
            batch.update(adDoc.ref, { phone: newPhone });
          });
          await batch.commit();
        }
      }
    } else {
      const userDoc = {
        name: updateData.name,
        email: updateData.email || auth.currentUser?.email || '',
        phone: newPhone || '',
        city: updateData.city || 'صنعاء',
        userId: generateUserId(),
        created_at: new Date().toISOString(),
        balance: 0,
        freeAdsCount: 3
      };
      await addDoc(collection(db, path), userDoc);
    }
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

// Get User Data
export async function getUserData(phone: string, email?: string): Promise<UserData | null> {
  let q;
  if (phone) {
    q = query(collection(db, 'opensooq_users'), where('phone', '==', phone));
  } else if (email) {
    q = query(collection(db, 'opensooq_users'), where('email', '==', email));
  } else {
    return null;
  }
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const data = snap.docs[0].data() as any;
  return { 
    id: snap.docs[0].id, 
    phone: data.phone || '',
    name: data.name || '',
    email: data.email || undefined,
    userId: data.userId || data.phone || '',
    balance: data.balance !== undefined ? data.balance : 0,
    freeAdsCount: data.freeAdsCount !== undefined ? data.freeAdsCount : 3,
    isVerified: data.isVerified || false,
    createdAt: data.created_at || data.createdAt || new Date().toISOString()
  } as UserData;
}

// Update User Balance
export async function updateUserBalance(phone: string, newBalance: number) {
  const clampedBalance = Math.min(newBalance, 1000);
  const q = query(collection(db, 'opensooq_users'), where('phone', '==', phone));
  const snap = await getDocs(q);
  if (!snap.empty) {
    await updateDoc(snap.docs[0].ref, { balance: clampedBalance });
  }
}

// Consume Free Ad slot
export async function consumeFreeAd(phone: string): Promise<boolean> {
  const user = await getUserData(phone);
  if (!user || user.freeAdsCount <= 0 || !user.id) return false;
  await updateDoc(doc(db, 'opensooq_users', user.id), {
    freeAdsCount: user.freeAdsCount - 1
  });
  return true;
}

// Consume Units/Credits
export async function consumeUnits(phone: string, amount: number): Promise<boolean> {
  const user = await getUserData(phone);
  if (!user || user.balance < amount || !user.id) return false;
  await updateDoc(doc(db, 'opensooq_users', user.id), {
    balance: user.balance - amount
  });
  return true;
}

// Send Verification Email
export async function sendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (user && !user.emailVerified) {
    await sendEmailVerification(user);
  }
}

// Is Email Verified
export function isEmailVerified(): boolean {
  return auth.currentUser?.emailVerified ?? false;
}

// Get User by User ID
export async function getUserByUserId(userId: string): Promise<UserData | null> {
  try {
    const q = query(collection(db, 'opensooq_users'), where('userId', '==', userId.trim()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const data = snap.docs[0].data();
    return { 
      id: snap.docs[0].id, 
      phone: data.phone || '',
      name: data.name || '',
      email: data.email || undefined,
      userId: data.userId || data.phone || '',
      balance: data.balance !== undefined ? data.balance : 0,
      freeAdsCount: data.freeAdsCount !== undefined ? data.freeAdsCount : 3,
      isVerified: data.isVerified || false,
      createdAt: data.created_at || data.createdAt || new Date().toISOString()
    } as UserData;
  } catch (e) {
    console.error("Error in getUserByUserId:", e);
    return null;
  }
}

// Update User Name
export async function updateFirebaseUserName(phone: string, newName: string): Promise<void> {
  const path = 'opensooq_users';
  try {
    const q = query(collection(db, path), where('phone', '==', phone));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      await updateDoc(snapshot.docs[0].ref, { name: newName });
    }

    const adsQuery = query(collection(db, 'opensooq_listings'), where('phone', '==', phone));
    const adsSnap = await getDocs(adsQuery);
    if (!adsSnap.empty) {
      const batch = writeBatch(db);
      adsSnap.forEach((adDoc) => {
        batch.update(adDoc.ref, { ownerName: newName });
      });
      await batch.commit();
    }
  } catch (error) {
    console.error("Error updating user name in Firestore: ", error);
  }
}

// Get All User Emails
export async function getAllUserEmails(): Promise<string[]> {
  try {
    const snap = await getDocs(collection(db, 'opensooq_users'));
    const emails: string[] = [];
    snap.forEach((d) => {
      const u = d.data();
      if (u.email) emails.push(u.email);
    });
    return Array.from(new Set(emails));
  } catch (error) {
    console.error("Error fetching all user emails:", error);
    return [];
  }
}
