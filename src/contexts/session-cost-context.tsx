'use client';

/**
 * @fileOverview Session-scoped AI cost tracker.
 *
 * Accumulates token usage and estimated C$ cost across all AI calls made
 * during the current browser session.  The counter flushes automatically
 * when the NextAuth session changes (sign-in / sign-out).
 *
 * State is persisted to sessionStorage keyed by session-user-id so it
 * survives page refreshes within the same tab but is isolated per user.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useSession } from 'next-auth/react';
import { calcCost } from '@/lib/cost-estimator';
import type { TokenUsage } from '@/lib/cost-estimator';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionCostState {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostCad: number;
  callCount: number;
}

interface SessionCostContextType extends SessionCostState {
  /** Record actual token usage returned by the API after a call completes. */
  recordUsage: (usage: TokenUsage) => void;
  /** Manually flush the counter (e.g., on explicit sign-out). */
  reset: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const SessionCostContext = createContext<SessionCostContextType | undefined>(undefined);

const EMPTY: SessionCostState = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCostCad: 0,
  callCount: 0,
};

const STORAGE_PREFIX = 'mcv-session-cost:';

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SessionCostProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  // Derive a stable session key from the authenticated user (or anon).
  const sessionKey =
    STORAGE_PREFIX +
    ((session?.user as { uid?: string } | undefined)?.uid ??
      session?.user?.email ??
      '__anon__');

  const [state, setState] = useState<SessionCostState>(EMPTY);
  const prevKeyRef = useRef<string>(sessionKey);

  // Restore from sessionStorage when the component mounts or session changes.
  useEffect(() => {
    if (prevKeyRef.current !== sessionKey) {
      // Session changed → flush in-memory state immediately.
      prevKeyRef.current = sessionKey;
      setState(EMPTY);
    }

    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem(sessionKey);
    if (stored) {
      try {
        setState(JSON.parse(stored) as SessionCostState);
      } catch {
        // Corrupt storage — ignore and start fresh.
        sessionStorage.removeItem(sessionKey);
      }
    }
  }, [sessionKey]);

  const recordUsage = useCallback(
    (usage: TokenUsage) => {
      setState((prev) => {
        const { costCad } = calcCost(usage);
        const next: SessionCostState = {
          totalInputTokens: prev.totalInputTokens + usage.inputTokens,
          totalOutputTokens: prev.totalOutputTokens + usage.outputTokens,
          totalCostCad: prev.totalCostCad + costCad,
          callCount: prev.callCount + 1,
        };
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(sessionKey, JSON.stringify(next));
        }
        return next;
      });
    },
    [sessionKey],
  );

  const reset = useCallback(() => {
    setState(EMPTY);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(sessionKey);
    }
  }, [sessionKey]);

  return (
    <SessionCostContext.Provider value={{ ...state, recordUsage, reset }}>
      {children}
    </SessionCostContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSessionCost(): SessionCostContextType {
  const ctx = useContext(SessionCostContext);
  if (!ctx) throw new Error('useSessionCost must be used within <SessionCostProvider>');
  return ctx;
}
