"use client";

import React, { createContext, useEffect, useRef } from "react";
import { useSession, signIn, signOut as nextSignOut } from "next-auth/react";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const prevUid = useRef<string | null>(null);

  const user: User | null = session?.user
    ? {
        uid: (session.user as any).uid ?? session.user.email ?? "",
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }
    : null;

  const loading = status === "loading";

  // Log session_start once per sign-in
  useEffect(() => {
    if (user && user.uid !== prevUid.current) {
      prevUid.current = user.uid;
      logUserActivity(user.uid, "session_start", { email: user.email });
    } else if (!user) {
      prevUid.current = null;
    }
  }, [user]);

  const handleSignIn = () => {
    signIn("google");
  };

  const handleSignOut = () => {
    if (user?.uid) {
      logUserActivity(user.uid, "session_end");
    }
    nextSignOut({ redirect: false });
  };

  return (
    <AuthContext.Provider value={{ user, signIn: handleSignIn, signOut: handleSignOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

