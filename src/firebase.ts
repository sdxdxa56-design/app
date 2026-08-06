// ============================================================================
// Firebase Integration Hub - Facade Pattern
// Centrally hosts references to all specialized modular services under src/services/
// to maintain absolute backward compatibility across the entire application.
// ============================================================================

export { 
  app, 
  db, 
  auth, 
  storage, 
  OperationType, 
  handleFirestoreError,
  initSentry,
  logErrorToSentry,
  initGoogleAnalytics,
  trackPageView,
  trackEvent
} from "./services/firebaseCore";

export type { FirestoreErrorInfo } from "./services/firebaseCore";

export {
  generateUserId,
  checkUserExists,
  registerFirebaseUser,
  loginFirebaseUser,
  registerOrLoginFirebaseUserOTP,
  checkUserByEmail,
  loginWithGoogle,
  checkGoogleRedirectResult,
  registerWithEmail,
  loginWithEmail,
  updateUserProfileByPhone,
  getUserData,
  updateUserBalance,
  consumeFreeAd,
  consumeUnits,
  sendVerificationEmail,
  isEmailVerified,
  getUserByUserId,
  updateFirebaseUserName,
  getAllUserEmails
} from "./services/auth";

export {
  uploadImageToStorage,
  getFirebaseAds,
  getFirebaseAd,
  insertFirebaseAd,
  deleteFirebaseAd,
  incrementPhoneClick,
  getSellerRatings,
  submitSellerRating,
  followSeller,
  unfollowSeller,
  getSellerFollowersCount,
  isFollowingSeller,
  addPriceDropAlert,
  triggerPriceDropNotifications,
  notifySellerSubscribersOnNewAd,
  republishFirebaseAd,
  uploadImageToImgBB,
  uploadImageWithFallback,
  extendAd,
  checkExpiredAdsAndNotify
} from "./services/ads";

export type { SellerRating } from "./services/ads";

export {
  sendFirebaseMessage,
  listenFirebaseMessages,
  getFirebaseUserThreads,
  expressInterest,
  getSellerNotifications,
  markNotificationAsRead,
  updateFirebaseTypingStatus,
  listenFirebaseTypingStatus
} from "./services/chat";

export type { FirebaseMessage, SellerNotification } from "./services/chat";

export {
  isAdminUser,
  getFirebaseBanners,
  insertFirebaseBanner,
  deleteFirebaseBanner,
  getFirebaseAlerts,
  insertFirebaseAlert,
  deleteFirebaseAlert,
  updateFirebaseAlert,
  sendEmailViaEmailJS,
  getFirebaseStats,
  getSiteSettings,
  updateSiteSettings,
  giveFreeCreditToAllUsers,
  generateDailyReport,
  verifyUserByPhone,
  unverifyUserByPhone,
  chargeUserBalance
} from "./services/admin";

export type { Banner, SiteAlert, SiteSettings } from "./services/admin";

export function normalizePhone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('967') && cleaned.length > 9) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.startsWith('0') && cleaned.length > 9) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

