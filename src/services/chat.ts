import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc,
  onSnapshot,
  setDoc,
  orderBy,
  increment
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebaseCore";

export interface FirebaseMessage {
  id: string;
  chatId: string;
  adId: string;
  adTitle: string;
  senderPhone: string;
  senderName: string;
  receiverPhone: string;
  text: string;
  created_at: string;
  imageUrl?: string;
}

export interface SellerNotification {
  id: string;
  sellerPhone: string;
  adId: string;
  adTitle: string;
  type: 'system' | 'interest' | 'price_drop' | 'new_ad' | 'chat_message' | 'otp_auth' | 'admin_action' | 'site_alert' | 'billing_refill' | 'ad_expired';
  message: string;
  createdAt: string;
  read: boolean;
  buyerPhone?: string;
  buyerName?: string;
}

// Send a new live chat message
export async function sendFirebaseMessage(msg: Omit<FirebaseMessage, 'id'>): Promise<FirebaseMessage> {
  const path = 'opensooq_messages';
  try {
    const msgData = {
      ...msg,
      created_at: msg.created_at || new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, path), msgData);
    return {
      id: docRef.id,
      ...msgData
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

// Listen for message stream in a single chat room
export function listenFirebaseMessages(chatId: string, onNewMessages: (messages: FirebaseMessage[]) => void) {
  const path = 'opensooq_messages';
  const q = query(
    collection(db, path), 
    where('chatId', '==', chatId)
  );

  return onSnapshot(q, (snapshot) => {
    let list: FirebaseMessage[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        chatId: data.chatId || '',
        adId: data.adId || '',
        adTitle: data.adTitle || '',
        senderPhone: data.senderPhone || '',
        senderName: data.senderName || '',
        receiverPhone: data.receiverPhone || '',
        text: data.text || '',
        created_at: data.created_at || data.createdAt || new Date().toISOString(),
        imageUrl: data.imageUrl
      });
    });

    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    onNewMessages(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

// Fetch chat threads
export async function getFirebaseUserThreads(phone: string): Promise<FirebaseMessage[]> {
  const path = 'opensooq_messages';
  try {
    const qSender = query(collection(db, path), where('senderPhone', '==', phone));
    const qReceiver = query(collection(db, path), where('receiverPhone', '==', phone));

    const [snapSender, snapReceiver] = await Promise.all([
      getDocs(qSender),
      getDocs(qReceiver)
    ]);

    const messagesMap = new Map<string, FirebaseMessage>();

    const processDoc = (d: any) => {
      const data = d.data();
      const msg: FirebaseMessage = {
        id: d.id,
        chatId: data.chatId || '',
        adId: data.adId || '',
        adTitle: data.adTitle || '',
        senderPhone: data.senderPhone || '',
        senderName: data.senderName || '',
        receiverPhone: data.receiverPhone || '',
        text: data.text || '',
        created_at: data.created_at || data.createdAt || new Date().toISOString()
      };
      messagesMap.set(d.id, msg);
    };

    snapSender.forEach(processDoc);
    snapReceiver.forEach(processDoc);

    return Array.from(messagesMap.values());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Express interest in a listing
export async function expressInterest(
  adId: string,
  buyerPhone: string,
  buyerName: string,
  sellerPhone: string,
  adTitle: string
): Promise<void> {
  const pathNotifications = 'opensooq_notifications';
  const pathListings = 'opensooq_listings';
  try {
    const docRef = doc(db, pathListings, adId);
    await updateDoc(docRef, {
      interestsCount: increment(1)
    });

    await addDoc(collection(db, pathNotifications), {
      sellerPhone,
      adId,
      adTitle,
      type: 'interest',
      message: `${buyerName} مهتم جداً بإعلانك "${adTitle}" ويريد الشراء!`,
      buyerPhone,
      buyerName,
      createdAt: new Date().toISOString(),
      read: false
    });
  } catch (error) {
    console.warn("Error expressing interest:", error);
  }
}

// Fetch seller notifications with standard index-fallback support
export async function getSellerNotifications(sellerPhone: string): Promise<SellerNotification[]> {
  const path = 'opensooq_notifications';
  try {
    const q = query(
      collection(db, path),
      where('sellerPhone', '==', sellerPhone),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    const list: SellerNotification[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        sellerPhone: data.sellerPhone || '',
        adId: data.adId || '',
        adTitle: data.adTitle || '',
        type: data.type || 'system',
        message: data.message || '',
        createdAt: data.createdAt || 'الآن',
        read: Boolean(data.read) || false,
        buyerPhone: data.buyerPhone || '',
        buyerName: data.buyerName || ''
      });
    });
    return list;
  } catch (error) {
    try {
      const qSimple = query(collection(db, path), where('sellerPhone', '==', sellerPhone));
      const snapSimple = await getDocs(qSimple);
      const list: SellerNotification[] = [];
      snapSimple.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          sellerPhone: data.sellerPhone || '',
          adId: data.adId || '',
          adTitle: data.adTitle || '',
          type: data.type || 'system',
          message: data.message || '',
          createdAt: data.createdAt || 'الآن',
          read: Boolean(data.read) || false,
          buyerPhone: data.buyerPhone || '',
          buyerName: data.buyerName || ''
        });
      });
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
      return [];
    }
  }
}

// Mark notifications as read
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const docRef = doc(db, 'opensooq_notifications', notificationId);
    await updateDoc(docRef, { read: true });
  } catch (e) {
    console.warn("Failed marking notification as read:", e);
  }
}

// Typing indicators status update
export async function updateFirebaseTypingStatus(chatId: string, phone: string, isTyping: boolean): Promise<void> {
  const path = 'opensooq_chats_typing';
  try {
    const docRef = doc(db, path, chatId);
    await setDoc(docRef, { [phone]: isTyping }, { merge: true });
  } catch (error) {
    console.error("Error updating typing status:", error);
  }
}

// Listen to typing status change events
export function listenFirebaseTypingStatus(chatId: string, callback: (typingMap: Record<string, boolean>) => void) {
  const path = 'opensooq_chats_typing';
  const docRef = doc(db, path, chatId);
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as Record<string, boolean>);
    } else {
      callback({});
    }
  });
}
