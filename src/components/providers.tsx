"use client";

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/contexts/auth";
import { SessionCostProvider } from "@/contexts/session-cost-context";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProvider>
        <SessionCostProvider>
          {children}
          <Toaster />
        </SessionCostProvider>
      </AuthProvider>
    </SessionProvider>
  );
}
