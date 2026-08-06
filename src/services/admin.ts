import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  getDoc,
  deleteDoc, 
  updateDoc,
  writeBatch,
  setDoc,
  query,
  limit,
  where,
  getCountFromServer
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebaseCore";
import { jsPDF } from "jspdf";
import { getUserByUserId } from "./auth";

// Site Banner Interface
export interface Banner {
  id: string;
  imageUrl: string;
  link: string;
  title: string;
  createdAt: string;
  isHero?: boolean;
}

// Site Alert Interface
export interface SiteAlert {
  id: string;
  text: string;
  backgroundColor: string; // e.g. 'red', 'blue', 'green', 'amber'
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

// Global Site Settings Interface
export interface SiteSettings {
  unitPrice: number;            // Unit cost (default 10)
  freeCreditAmount: number;     // Free balance amount on signup
  siteName?: string;
  supportPhone?: string;
}

// Check if email belongs to admin
export function isAdminUser(email: string): boolean {
  return email === 'sdxdxa56@gmail.com';
}

// Get Site Banners
export async function getFirebaseBanners(): Promise<Banner[]> {
  const path = 'opensooq_banners';
  try {
    const snapshot = await getDocs(collection(db, path));
    const list: Banner[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        imageUrl: data.imageUrl || '',
        link: data.link || '',
        title: data.title || '',
        createdAt: data.createdAt || new Date().toISOString(),
        isHero: data.isHero || false
      });
    });
    return list;
  } catch (error) {
    console.warn("Error fetching banners from Firebase:", error);
    return [];
  }
}

// Insert Site Banner
export async function insertFirebaseBanner(banner: Omit<Banner, 'id' | 'createdAt'>): Promise<Banner> {
  const path = 'opensooq_banners';
  try {
    const docData = {
      imageUrl: banner.imageUrl,
      link: banner.link,
      title: banner.title,
      isHero: banner.isHero || false,
      createdAt: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, path), docData);
    return {
      id: docRef.id,
      ...docData
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

// Delete Site Banner
export async function deleteFirebaseBanner(bannerId: string): Promise<void> {
  const path = `opensooq_banners/${bannerId}`;
  try {
    await deleteDoc(doc(db, 'opensooq_banners', bannerId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Get Active Site Alerts
export async function getFirebaseAlerts(): Promise<SiteAlert[]> {
  const path = 'opensooq_alerts';
  try {
    const snapshot = await getDocs(collection(db, path));
    const list: SiteAlert[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        text: data.text || '',
        backgroundColor: data.backgroundColor || 'red',
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: data.createdAt || new Date().toISOString()
      });
    });
    return list;
  } catch (error) {
    console.warn("Error fetching site alerts from Firebase:", error);
    return [];
  }
}

// Insert Site Alert
export async function insertFirebaseAlert(alertData: Omit<SiteAlert, 'id' | 'createdAt'>): Promise<SiteAlert> {
  const path = 'opensooq_alerts';
  try {
    const docData = {
      text: alertData.text,
      backgroundColor: alertData.backgroundColor,
      startDate: alertData.startDate,
      endDate: alertData.endDate,
      isActive: alertData.isActive,
      createdAt: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, path), docData);
    return {
      id: docRef.id,
      ...docData
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

// Delete Site Alert
export async function deleteFirebaseAlert(alertId: string): Promise<void> {
  const path = `opensooq_alerts/${alertId}`;
  try {
    await deleteDoc(doc(db, 'opensooq_alerts', alertId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Update Site Alert
export async function updateFirebaseAlert(alertId: string, updatedFields: Partial<SiteAlert>): Promise<void> {
  const path = `opensooq_alerts/${alertId}`;
  try {
    await updateDoc(doc(db, 'opensooq_alerts', alertId), updatedFields);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// EmailJS Integration
export async function sendEmailViaEmailJS(email: string, subject: string, message: string): Promise<boolean> {
  console.log(`[EmailJS] Sending email to: ${email} | Subject: ${subject}`);
  const serviceId = (import.meta as any).env?.VITE_EMAILJS_SERVICE_ID;
  const templateId = (import.meta as any).env?.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = (import.meta as any).env?.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    console.warn("[EmailJS] Missing configuration. Simulating successful email dispatch.");
    return true;
  }

  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
          to_email: email,
          subject: subject,
          message: message,
          to_name: email.split('@')[0] || "User",
        },
      }),
    });

    if (response.ok) {
      console.log(`[EmailJS] Email successfully sent to ${email}`);
      return true;
    } else {
      const errText = await response.text();
      console.error(`[EmailJS] API returned error: ${response.status} - ${errText}`);
      return false;
    }
  } catch (err) {
    console.error("[EmailJS] Error sending email via fetch:", err);
    return false;
  }
}

// Get Aggregate Dashboard Stats
export async function getFirebaseStats(): Promise<{ usersCount: number; listingsCount: number; messagesCount: number; totalViews: number }> {
  try {
    const usersCountSnap = await getCountFromServer(collection(db, 'opensooq_users'));
    const listingsCountSnap = await getCountFromServer(collection(db, 'opensooq_listings'));
    const messagesCountSnap = await getCountFromServer(collection(db, 'opensooq_messages'));

    const topListingsSnap = await getDocs(query(collection(db, 'opensooq_listings'), limit(100)));
    let totalViews = 0;
    topListingsSnap.forEach(d => {
      totalViews += Number(d.data().views) || 0;
    });

    const totalListings = listingsCountSnap.data().count || 0;
    if (totalListings > 100) {
      totalViews = Math.round(totalViews * (totalListings / 100));
    }

    return {
      usersCount: usersCountSnap.data().count || 0,
      listingsCount: totalListings,
      messagesCount: messagesCountSnap.data().count || 0,
      totalViews
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return {
      usersCount: 0,
      listingsCount: 0,
      messagesCount: 0,
      totalViews: 0
    };
  }
}

// Get Site Settings
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const docRef = doc(db, 'site_settings', 'main');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        unitPrice: data.unitPrice !== undefined ? data.unitPrice : 10,
        freeCreditAmount: data.freeCreditAmount !== undefined ? data.freeCreditAmount : 0,
        siteName: data.siteName || 'السوق المفتوح اليمني',
        supportPhone: data.supportPhone || '967775378369'
      };
    }
    const defaults: SiteSettings = { unitPrice: 10, freeCreditAmount: 0, siteName: 'السوق المفتوح اليمني', supportPhone: '967775378369' };
    await setDoc(docRef, defaults);
    return defaults;
  } catch (e) {
    console.error("Error fetching site settings:", e);
    return { unitPrice: 10, freeCreditAmount: 0 };
  }
}

// Update Site Settings
export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<void> {
  const docRef = doc(db, 'site_settings', 'main');
  await setDoc(docRef, settings, { merge: true });
}

// Bulk Free Credit Allocation
export async function giveFreeCreditToAllUsers(amount: number): Promise<number> {
  const usersSnap = await getDocs(collection(db, 'opensooq_users'));
  let count = 0;
  const batch = writeBatch(db);
  usersSnap.forEach(userDoc => {
    const data = userDoc.data();
    const currentBalance = data.balance || 0;
    batch.update(userDoc.ref, { balance: Math.min(currentBalance + amount, 1000) });
    count++;
  });
  await batch.commit();
  return count;
}

// Generate Admin Daily Report
export async function generateDailyReport(): Promise<Blob> {
  const usersSnap = await getDocs(collection(db, 'opensooq_users'));
  const listingsSnap = await getDocs(collection(db, 'opensooq_listings'));
  
  const docReport = new jsPDF();
  
  docReport.setFont("helvetica", "bold");
  docReport.setFontSize(22);
  docReport.text("OpenSooq Yemen - Admin Daily Report", 20, 20);
  
  docReport.setFontSize(12);
  docReport.setFont("helvetica", "normal");
  docReport.text(`Date: ${new Date().toLocaleString()}`, 20, 30);
  docReport.text(`Total Registered Users: ${usersSnap.size}`, 20, 40);
  docReport.text(`Total Active Listings: ${listingsSnap.size}`, 20, 50);
  
  docReport.setFont("helvetica", "bold");
  docReport.text("User Report Details:", 20, 65);
  docReport.line(20, 68, 190, 68);
  
  docReport.setFontSize(10);
  docReport.text("Name", 20, 75);
  docReport.text("Phone", 65, 75);
  docReport.text("UserID", 105, 75);
  docReport.text("Balance", 145, 75);
  docReport.text("Free Ads", 175, 75);
  docReport.line(20, 78, 190, 78);
  
  let y = 85;
  docReport.setFont("helvetica", "normal");
  
  usersSnap.forEach(user => {
    if (y > 280) {
      docReport.addPage();
      y = 20;
      docReport.setFont("helvetica", "bold");
      docReport.text("Name", 20, y);
      docReport.text("Phone", 65, y);
      docReport.text("UserID", 105, y);
      docReport.text("Balance", 145, y);
      docReport.text("Free Ads", 175, y);
      docReport.line(20, y + 3, 190, y + 3);
      y += 10;
      docReport.setFont("helvetica", "normal");
    }
    
    const data = user.data();
    const name = (data.name || "N/A").substring(0, 20);
    const phone = data.phone || "N/A";
    const userId = (data.userId || data.phone || "N/A").substring(0, 18);
    const balance = String(data.balance !== undefined ? data.balance : 0);
    const freeAdsCount = String(data.freeAdsCount !== undefined ? data.freeAdsCount : 3);
    
    docReport.text(name, 20, y);
    docReport.text(phone, 65, y);
    docReport.text(userId, 105, y);
    docReport.text(balance, 145, y);
    docReport.text(freeAdsCount, 175, y);
    
    y += 8;
  });
  
  return docReport.output('blob');
}

// User Verification (Manual Admin override)
export async function verifyUserByPhone(phone: string): Promise<void> {
  const path = 'opensooq_users';
  try {
    const q = query(collection(db, path), where('phone', '==', phone));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      await updateDoc(docRef, { isVerified: true });
    }

    const adsQuery = query(collection(db, 'opensooq_listings'), where('phone', '==', phone));
    const adsSnap = await getDocs(adsQuery);
    if (!adsSnap.empty) {
      const batch = writeBatch(db);
      adsSnap.forEach((adDoc) => {
        batch.update(adDoc.ref, { ownerVerified: true });
      });
      await batch.commit();
    }
  } catch (error) {
    console.error("Error verifying user:", error);
    throw error;
  }
}

// User Un-verification (Manual Admin override)
export async function unverifyUserByPhone(phone: string): Promise<void> {
  const path = 'opensooq_users';
  try {
    const q = query(collection(db, path), where('phone', '==', phone));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      await updateDoc(docRef, { isVerified: false });
    }

    const adsQuery = query(collection(db, 'opensooq_listings'), where('phone', '==', phone));
    const adsSnap = await getDocs(adsQuery);
    if (!adsSnap.empty) {
      const batch = writeBatch(db);
      adsSnap.forEach((adDoc) => {
        batch.update(adDoc.ref, { ownerVerified: false });
      });
      await batch.commit();
    }
  } catch (error) {
    console.error("Error unverifying user:", error);
    throw error;
  }
}

// Charge User Credits
export async function chargeUserBalance(userId: string, amount: number): Promise<void> {
  const user = await getUserByUserId(userId);
  if (!user || !user.id) throw new Error('المستخدم غير موجود');
  const newBalance = Math.min((user.balance || 0) + amount, 1000);
  await updateDoc(doc(db, 'opensooq_users', user.id), { balance: newBalance });
  
  await addDoc(collection(db, 'opensooq_notifications'), {
    sellerPhone: user.phone,
    type: 'system',
    message: `🎉 تم شحن حسابك بـ ${amount} وحدة رصيد إضافية بنجاح! رصيدك الكلي الآن هو ${newBalance} وحدة.`,
    createdAt: new Date().toISOString(),
    read: false
  });
}
