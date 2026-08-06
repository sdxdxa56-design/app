import * as Sentry from '@sentry/react';
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// User provided Firebase configuration from console.firebase.google.com
const firebaseConfig = {
  apiKey: "AIzaSyClcfw88-aJ6BU-RBkOni3ZkWuOxB-wlgg",
  authDomain: "ajsj-35a36.firebaseapp.com",
  projectId: "ajsj-35a36",
  storageBucket: "ajsj-35a36.firebasestorage.app",
  messagingSenderId: "836687507956",
  appId: "1:836687507956:web:f66980e5a6accf5b60c9a1"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Error Handling according to Firestore Error Guideline
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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
  logErrorToSentry(error, errInfo);
}

// Initialize Sentry for real-time live exception tracking
export function initSentry() {
  const dsn = (import.meta as any).env?.VITE_SENTRY_DSN || '';
  if (dsn) {
    Sentry.init({
      dsn,
      integrations: [],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      environment: 'production',
    });
    console.log("Sentry monitoring initiated successfully.");
  } else {
    console.debug("Sentry DSN not found, running without Sentry.");
  }
}

// Track application errors manually
export function logErrorToSentry(error: any, context?: Record<string, any>) {
  const dsn = (import.meta as any).env?.VITE_SENTRY_DSN || '';
  if (dsn) {
    Sentry.captureException(error, { extra: context });
  } else {
    console.warn("Captured error locally (no Sentry DSN configured):", error, context);
  }
}

// Initialize Google Analytics 4 (GA4) with dynamic injection to prevent static load blocks
export function initGoogleAnalytics() {
  const gaId = (import.meta as any).env?.VITE_GA_MEASUREMENT_ID || '';
  if (gaId && typeof window !== 'undefined') {
    try {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(script);

      (window as any).dataLayer = (window as any).dataLayer || [];
      function gtag(...args: any[]) {
        (window as any).dataLayer.push(arguments);
      }
      (window as any).gtag = gtag;
      (window as any).gtag('js', new Date());
      (window as any).gtag('config', gaId);
      console.log("Google Analytics initiated successfully.");
    } catch (e) {
      console.warn("Google Analytics failed to initialize dynamically: ", e);
    }
  }
}

// Track user navigation views
export function trackPageView(path: string) {
  const gaId = (import.meta as any).env?.VITE_GA_MEASUREMENT_ID || '';
  if (gaId && typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'page_view', {
      page_path: path,
      send_to: gaId
    });
  }
}

// Track custom user events (such as Chat, OTP, Ad posting, views)
export function trackEvent(action: string, category: string, label?: string, value?: number) {
  const gaId = (import.meta as any).env?.VITE_GA_MEASUREMENT_ID || '';
  if (gaId && typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value
    });
  } else {
    console.log(`[Local Event Track] Action: ${action}, Category: ${category}, Label: ${label}`);
  }
}

