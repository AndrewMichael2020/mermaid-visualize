"use client";

import React, { createContext, useState, ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { initClientFirebase, getAuthInstance } from "@/lib/firebase";
import { logUserActivity } from "@/lib/logging";

export interface User {
  uid: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface AuthContextType {
  user: User | null;
  signIn: () => void;
  signOut: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Initialize the Firebase client and attach an auth listener when ready.
    let unsub: (() => void) | null = null;
    let isCancelled = false;

    initClientFirebase()
      .then(() => {
        if (isCancelled) return;
        const auth = getAuthInstance();
        if (auth) {
          unsub = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
            if (firebaseUser) {
              const { uid, displayName, email, photoURL } = firebaseUser;
              const userPayload: User = {
                uid: uid,
                name: displayName,
                email: email,
                image: photoURL,
              };
              setUser(userPayload);
              localStorage.setItem("mermaid-user-session", JSON.stringify(userPayload));
              logUserActivity(uid, 'session_start', { email });
            } else {
              setUser(null);
              localStorage.removeItem("mermaid-user-session");
            }
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to initialize firebase client', err);
        setLoading(false);
      });

    return () => {
      isCancelled = true;
      try {
        if (unsub) unsub();
      } catch (_) {
        // noop
      }
    };
  }, [router]);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const auth = getAuthInstance();
      if (auth) {
        await signInWithPopup(auth, provider);
      } else {
        console.warn('Auth not initialized at sign-in time');
      }
    } catch (error) {
      console.error("Error signing in with Google", error);
      logUserActivity(undefined, 'error_sign_in', { error: String(error) });
    }
  };

  const signOut = async () => {
    try {
      if (user?.uid) {
        logUserActivity(user.uid, 'session_end');
      }
      const auth = getAuthInstance();
      if (auth) {
        await auth.signOut();
      }
      // Just reload or stay on page, no need to redirect to / as we are already there
      router.refresh(); 
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
