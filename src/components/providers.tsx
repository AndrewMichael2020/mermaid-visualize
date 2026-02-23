"use client";

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/contexts/auth";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </SessionProvider>
  );
}
