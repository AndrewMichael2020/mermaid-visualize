"use client";

import React, { createContext, ReactNode } from "react";

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
  return (
    <AuthContext.Provider value={{ user: null, signIn: () => {}, signOut: () => {}, loading: false }}>
      {children}
    </AuthContext.Provider>
  );
}
