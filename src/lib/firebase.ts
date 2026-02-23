"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Lazy-initialized references
let _app: any = null;
let _auth: any = null;
let _db: any = null;
let _analytics: any = null;

// Initialize client-side Firebase using a runtime endpoint that returns public
// NEXT_PUBLIC_FIREBASE_* values. This avoids baking secrets into build artifacts.
export async function initClientFirebase() {
  if (typeof window === "undefined") return null;

  if (getApps().length) {
    _app = getApp();
  } else {
    // Fetch runtime public config from the server-side endpoint
    const res = await fetch("/api/public-config");
    if (!res.ok) {
      throw new Error("Failed to fetch public Firebase config");
    }
    const cfg = await res.json();

    const firebaseConfig = {
      apiKey: cfg.NEXT_PUBLIC_FIREBASE_API_KEY,
      projectId: cfg.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: cfg.NEXT_PUBLIC_FIREBASE_APP_ID,
      authDomain: cfg.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      storageBucket: cfg.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: cfg.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      // measurementId is optional (used for Analytics)
      measurementId: cfg.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };

    _app = initializeApp(firebaseConfig);
  }

  _auth = getAuth(_app);
  _db = getFirestore(_app);

    // Only initialize Analytics when a measurementId is present and the runtime
    // environment supports analytics (e.g., not SSR). This avoids errors in
    // environments where analytics SDK can't run and prevents creating empty
    // analytics instances when measurementId is not provided.
    const measurementId = (typeof window !== 'undefined' && _app?.options?.measurementId) || null;
    if (measurementId) {
      isSupported().then((supported: boolean) => {
        if (supported) {
          _analytics = getAnalytics(_app);
        }
      }).catch((err) => {
        console.warn('Analytics not supported or failed to initialize:', err);
      });
    }

  return { app: _app, auth: _auth, db: _db, analytics: _analytics };
}

export function getAuthInstance() {
  return _auth;
}

export function getDbInstance() {
  return _db;
}

export function getAnalyticsInstance() {
  return _analytics;
}
