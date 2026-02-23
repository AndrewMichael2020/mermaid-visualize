import { getDbInstance, getAnalyticsInstance, initClientFirebase } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';

export const logUserActivity = async (userId: string | undefined, action: string, details?: any) => {
  try {
    // If no user ID is provided (anonymous user), use 'anonymous'
    const uid = userId || 'anonymous';
    
    // Firestore doesn't accept 'undefined', so we default to null if details is missing
    const safeDetails = details === undefined ? null : details;

    // 1. Log to Firestore (Detailed Database Record)
    let db = getDbInstance();
    if (!db && typeof window !== 'undefined') {
      try {
        await initClientFirebase();
        db = getDbInstance();
      } catch (e) {
        console.error('Failed to initialize firebase for logging', e);
      }
    }
    if (db) {
      await addDoc(collection(db, 'user_logs'), {
      userId: uid,
      action,
      details: safeDetails,
      timestamp: serverTimestamp(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
    });
    }

    // 2. Log to Google Analytics (Dashboard Trends)
    let analytics = getAnalyticsInstance();
    if (!analytics && typeof window !== 'undefined') {
      try {
        await initClientFirebase();
        analytics = getAnalyticsInstance();
      } catch (e) {
        console.error('Failed to init firebase analytics for logging', e);
      }
    }
    if (analytics) {
      // Google Analytics event names should be alphanumeric and underscores only
      // Mapping common actions to standard GA events where appropriate, or keeping custom names
      const eventName = action.replace(/[^a-zA-Z0-9_]/g, '_');
      
      // Prepare params, ensuring flat structure for GA
      const params = {
        user_id: uid,
        ...safeDetails
      };

      logEvent(analytics, eventName, params);
    }

  } catch (error) {
    console.error("Error logging activity:", error);
  }
};
