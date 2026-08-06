import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  addDoc, 
  doc, 
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  startAfter,
  increment,
  writeBatch,
  setDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, handleFirestoreError, OperationType } from "./firebaseCore";
import { Ad } from "../types";
import { fileToCompressedBase64 } from "../utils/imageCompressor";
import { getUserData, updateUserBalance } from "./auth";

// Seller Rating interface
export interface SellerRating {
  id: string;
  sellerPhone: string;
  raterName: string;
  stars: number;
  comment: string;
  createdAt: string;
}

// Upload image to Firestore as highly-compressed Base64, fallback to Firebase Storage
export async function uploadImageToStorage(file: File): Promise<string> {
  try {
    const base64DataUrl = await fileToCompressedBase64(file);
    return base64DataUrl;
  } catch (error) {
    console.warn("Base64 compression failed, falling back to Firebase Storage uploadBytes: ", error);
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const storageRef = ref(storage, `ads/${fileName}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  }
}

// Get paginated advertisements from Firebase Firestore
export async function getFirebaseAds(filters: {
  category?: string | null;
  subcategory?: string | null;
  city?: string | null;
  search?: string;
}, lastVisibleDoc?: any, pageSize: number = 20): Promise<{ ads: Ad[]; lastVisible: any } | null> {
  const path = 'opensooq_listings';
  try {
    let q = query(collection(db, path));

    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters.subcategory) {
      q = query(q, where('subcategory', '==', filters.subcategory));
    }
    if (filters.city) {
      q = query(q, where('city', '==', filters.city));
    }

    q = query(q, orderBy('createdAt', 'desc'));

    if (lastVisibleDoc) {
      q = query(q, startAfter(lastVisibleDoc));
    }

    q = query(q, limit(pageSize));

    const snapshot = await getDocs(q);
    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

    let ads = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Ad));

    if (filters.search) {
      const term = filters.search.toLowerCase().trim();
      ads = ads.filter(ad => 
        (ad.title && ad.title.toLowerCase().includes(term)) ||
        (ad.description && ad.description.toLowerCase().includes(term))
      );
    }

    return { ads, lastVisible };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return null;
  }
}

// Fetch single ad
export async function getFirebaseAd(adId: string): Promise<Ad | null> {
  const path = `opensooq_listings/${adId}`;
  try {
    const docRef = doc(db, 'opensooq_listings', adId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Ad;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// Insert new ad
export async function insertFirebaseAd(ad: Omit<Ad, 'id' | 'createdAt' | 'views'>): Promise<Ad> {
  const path = 'opensooq_listings';
  try {
    const newAd = {
      ...ad,
      createdAt: new Date().toISOString(),
      views: 0,
      status: ad.status || 'active'
    };
    const docRef = await addDoc(collection(db, path), newAd);
    return { id: docRef.id, ...newAd } as Ad;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

// Delete ad
export async function deleteFirebaseAd(adId: string): Promise<void> {
  const path = `opensooq_listings/${adId}`;
  try {
    await deleteDoc(doc(db, 'opensooq_listings', adId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Increment phone clicks on ad
export async function incrementPhoneClick(adId: string): Promise<void> {
  try {
    const docRef = doc(db, 'opensooq_listings', adId);
    await updateDoc(docRef, { phoneClicks: increment(1) });
  } catch (error) {
    console.error("Error incrementing phone click:", error);
  }
}

// Get seller ratings
export async function getSellerRatings(sellerPhone: string): Promise<SellerRating[]> {
  const path = 'opensooq_ratings';
  try {
    const q = query(
      collection(db, path),
      where('sellerPhone', '==', sellerPhone)
    );
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SellerRating));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Submit seller rating
export async function submitSellerRating(rating: Omit<SellerRating, 'id' | 'createdAt'>): Promise<SellerRating> {
  const path = 'opensooq_ratings';
  try {
    const newRating = {
      ...rating,
      createdAt: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, path), newRating);
    return { id: docRef.id, ...newRating } as SellerRating;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

// Follow/Subscribe to a seller
export async function followSeller(sellerPhone: string, followerEmail: string): Promise<void> {
  try {
    const subId = `${sellerPhone.trim()}_${followerEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const docRef = doc(db, 'opensooq_followers', subId);
    await setDoc(docRef, {
      sellerPhone: sellerPhone.trim(),
      followerEmail: followerEmail.trim(),
      createdAt: new Date().toISOString()
    });
  } catch (e) {
    console.error("Error following seller: ", e);
  }
}

// Unfollow a seller
export async function unfollowSeller(sellerPhone: string, followerEmail: string): Promise<void> {
  try {
    const subId = `${sellerPhone.trim()}_${followerEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    await deleteDoc(doc(db, 'opensooq_followers', subId));
  } catch (e) {
    console.error("Error unfollowing seller: ", e);
  }
}

// Get followers count
export async function getSellerFollowersCount(sellerPhone: string): Promise<number> {
  try {
    const q = query(collection(db, 'opensooq_followers'), where('sellerPhone', '==', sellerPhone.trim()));
    const snap = await getDocs(q);
    return snap.size;
  } catch (e) {
    console.error("Error getting followers count: ", e);
    return 0;
  }
}

// Is follower following seller
export async function isFollowingSeller(sellerPhone: string, followerEmail: string): Promise<boolean> {
  try {
    const subId = `${sellerPhone.trim()}_${followerEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const snap = await getDoc(doc(db, 'opensooq_followers', subId));
    return snap.exists();
  } catch (e) {
    return false;
  }
}

// Price Drop Alerts
export async function addPriceDropAlert(adId: string, phone: string, targetPrice: number): Promise<void> {
  try {
    const alertId = `${adId}_${phone}`;
    await setDoc(doc(db, 'opensooq_pricedrops', alertId), {
      adId,
      phone,
      targetPrice,
      createdAt: new Date().toISOString()
    });
  } catch (e) {
    console.error("Error adding price drop alert: ", e);
  }
}

// Trigger notifications for price drops
export async function triggerPriceDropNotifications(adId: string, oldPrice: number, newPrice: number, adTitle: string): Promise<string[]> {
  const alertedPhones: string[] = [];
  try {
    const q = query(
      collection(db, 'opensooq_pricedrops'),
      where('adId', '==', adId),
      where('targetPrice', '>=', newPrice)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.forEach((alertDoc) => {
        const data = alertDoc.data();
        alertedPhones.push(data.phone);

        // Add Notification
        const notifRef = doc(collection(db, 'opensooq_notifications'));
        batch.set(notifRef, {
          sellerPhone: data.phone, // user notifications are mapped to sellerPhone key in app
          adId,
          adTitle,
          type: 'price_drop',
          message: `📉 انخفاض سعر: الإعلان "${adTitle}" الذي تتابعه تراجع سعره من ${oldPrice} إلى ${newPrice} ريال يمني!`,
          createdAt: new Date().toISOString(),
          read: false
        });

        // Delete alert so it doesn't trigger repeatedly
        batch.delete(alertDoc.ref);
      });
      await batch.commit();
    }
  } catch (e) {
    console.error("Error in triggerPriceDropNotifications: ", e);
  }
  return alertedPhones;
}

// Notify subscribers of new ad
export async function notifySellerSubscribersOnNewAd(
  sellerPhone: string,
  sellerName: string,
  adId: string,
  adTitle: string
): Promise<string[]> {
  const notifiedEmails: string[] = [];
  try {
    const q = query(collection(db, 'opensooq_followers'), where('sellerPhone', '==', sellerPhone.trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.forEach((subDoc) => {
        const sub = subDoc.data();
        if (sub.followerEmail) {
          notifiedEmails.push(sub.followerEmail);

          // System notification if subscriber has a mapped phone
          const notifRef = doc(collection(db, 'opensooq_notifications'));
          batch.set(notifRef, {
            sellerPhone: sub.followerEmail, // Notification channel uses email or phone in custom threads
            adId,
            adTitle,
            type: 'new_ad',
            message: `🔔 إعلان جديد: المعلن "${sellerName}" الذي تتابعه نشر إعلاناً جديداً بعنوان "${adTitle}"!`,
            createdAt: new Date().toISOString(),
            read: false
          });
        }
      });
      await batch.commit();
    }
  } catch (e) {
    console.error("Error in notifySellerSubscribersOnNewAd: ", e);
  }
  return notifiedEmails;
}

// Republish Expired Ad
export async function republishFirebaseAd(adId: string, updatedPrice?: number): Promise<void> {
  try {
    const docRef = doc(db, 'opensooq_listings', adId);
    const now = new Date();
    const expiry = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 Days
    
    const updateObj: Record<string, any> = {
      createdAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
      status: 'active'
    };
    if (updatedPrice !== undefined) {
      updateObj.price = updatedPrice;
    }
    await updateDoc(docRef, updateObj);
  } catch (e) {
    console.error("Error republishing ad:", e);
    throw e;
  }
}

// ImgBB Keys for dynamic load balancing
const IMGBB_KEYS = [
  "58b3721ca5635bfdcc1b47f13e285513",
  "86a79d7faf73d26f38484662ad36d9ab"
];

let currentKeyIndex = 0;

// Upload image to ImgBB
export async function uploadImageToImgBB(file: File): Promise<string> {
  for (let attempt = 0; attempt < IMGBB_KEYS.length; attempt++) {
    const apiKey = IMGBB_KEYS[currentKeyIndex];
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data && data.success && data.data && data.data.url) {
        return data.data.url;
      } else {
        console.warn(`فشل الرفع بالمفتاح ذي الفهرس ${currentKeyIndex}:`, data);
        currentKeyIndex = (currentKeyIndex + 1) % IMGBB_KEYS.length;
      }
    } catch (error) {
      console.warn(`فشل الرفع بالمفتاح ذي الفهرس ${currentKeyIndex}، تجربة المفتاح التالي...`, error);
      currentKeyIndex = (currentKeyIndex + 1) % IMGBB_KEYS.length;
    }
  }

  console.warn("جميع مفاتيح ImgBB مستنفدة حالياً. تم الانتقال التلقائي لخطة الرفع الاحتياطية المدمجة.");
  return await uploadImageToStorage(file);
}

// Helper: upload to ImgBB with specific key
async function uploadToImgBBWithKey(file: File, apiKey: string): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (data.success && data.data?.url) {
    return data.data.url;
  } else {
    throw new Error("ImgBB upload failed with key");
  }
}

// Hybrid Storage Upload Strategy (ImgBB with multiple keys and Base64 fallback)
export async function uploadImageWithFallback(file: File, adId: string = "pending"): Promise<string> {
  let url = "";
  let storageMethod = "";

  // 1. نحاول ImgBB (المفتاح الأول)
  try {
    url = await uploadToImgBBWithKey(file, IMGBB_KEYS[0]);
    storageMethod = "imgbb_key1";
  } catch (e) {
    console.warn("ImgBB key 1 failed, trying key 2...", e);
    // 2. نحاول ImgBB (المفتاح الثاني)
    try {
      url = await uploadToImgBBWithKey(file, IMGBB_KEYS[1]);
      storageMethod = "imgbb_key2";
    } catch (e2) {
      console.warn("ImgBB key 2 failed, using Base64 fallback...", e2);
      // 3. آخر ملاذ: Base64 مضغوط
      try {
        url = await uploadImageToStorage(file);
        storageMethod = "base64";
      } catch (e3) {
        console.error("Base64 fallback failed:", e3);
      }
    }
  }

  // تخزين نسخة من الرابط في Firestore إذا تم الرفع بنجاح لخدمة خارجية
  if (url && storageMethod.startsWith("imgbb")) {
    try {
      await addDoc(collection(db, "image_backups"), {
        originalUrl: url,
        storageMethod,
        adId,
        createdAt: new Date().toISOString()
      });
    } catch (dbErr) {
      console.error("Failed to store image backup record:", dbErr);
    }
  }

  return url;
}

// تمديد إعلان (أسبوع إضافي) بـ 10 وحدات
export async function extendAd(adId: string, phone: string): Promise<boolean> {
  const user = await getUserData(phone);
  if (!user || user.balance < 10) return false;
  
  const adRef = doc(db, 'opensooq_listings', adId);
  const adSnap = await getDoc(adRef);
  if (!adSnap.exists()) return false;
  
  const currentExpiry = new Date(adSnap.data().expiresAt || Date.now());
  const newExpiry = new Date(currentExpiry.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  await updateDoc(adRef, { 
    expiresAt: newExpiry.toISOString(),
    status: 'active' 
  });
  await updateUserBalance(phone, user.balance - 10);
  
  // إرسال إشعار
  await addDoc(collection(db, 'opensooq_notifications'), {
    sellerPhone: phone,
    adId,
    adTitle: adSnap.data().title || 'إعلان متميز',
    type: 'system',
    message: 'تم تمديد إعلانك لمدة أسبوع إضافي بنجاح!',
    createdAt: new Date().toISOString(),
    read: false
  });
  return true;
}

// التحقق من الإعلانات منتهية الصلاحية وإرسال إشعارات
export async function checkExpiredAdsAndNotify(phone: string) {
  const now = new Date();
  const q = query(
    collection(db, 'opensooq_listings'),
    where('phone', '==', phone),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  
  for (const d of snap.docs) {
    const ad = d.data();
    if (ad.expiresAt && new Date(ad.expiresAt) <= now) {
      // تحديث الحالة إلى منتهي
      await updateDoc(d.ref, { status: 'expired' });

      // تجنب الإشعارات المكررة لذات الإعلان
      const notifQ = query(
        collection(db, 'opensooq_notifications'), 
        where('sellerPhone', '==', phone),
        where('adId', '==', d.id),
        where('type', '==', 'system')
      );
      const notifSnap = await getDocs(notifQ);
      let alreadyNotified = false;
      notifSnap.forEach((nd) => {
        if (nd.data().message?.includes('انتهت صلاحية إعلانك')) {
          alreadyNotified = true;
        }
      });

      if (!alreadyNotified) {
        // إرسال إشعار انتهاء الصلاحية
        await addDoc(collection(db, 'opensooq_notifications'), {
          sellerPhone: phone,
          adId: d.id,
          adTitle: ad.title || 'إعلان متميز',
          type: 'system',
          message: `انتهت صلاحية إعلانك "${ad.title || 'المتميز'}". يمكنك تمديده بـ 10 وحدات للحصول على أسبوع إضافي.`,
          createdAt: new Date().toISOString(),
          read: false
        });
      }
    }
  }
}
