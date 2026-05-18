'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

interface CreditCost {
  cost: number;
  label: string;
}

interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  priceDisplay: string;
  perCredit: string;
}

interface CreditsContextType {
  balance: number;
  loading: boolean;
  costs: Record<string, CreditCost>;
  packages: CreditPackage[];
  refresh: () => Promise<void>;
  spend: (action: string, referenceId?: string, referenceType?: string) => Promise<{ ok: boolean; insufficient?: boolean; remaining?: number; message?: string }>;
  buyPackage: (packageId: string) => Promise<{ ok: boolean; message?: string }>;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('staffnow_token') : null;
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

export function CreditsProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [costs, setCosts] = useState<Record<string, CreditCost>>({});
  const [packages, setPackages] = useState<CreditPackage[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/credits/balance`, { headers: authHeaders() });
      const data = (await res.json()) as any;
      if (data.success && data.data) {
        setBalance(data.data.balance ?? 0);
        setCosts(data.data.costs ?? {});
        setPackages(data.data.packages ?? []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const spend = useCallback(async (action: string, referenceId?: string, referenceType?: string) => {
    try {
      const res = await fetch(`${API_BASE}/credits/spend`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action, referenceId, referenceType }),
      });
      const data = (await res.json()) as any;
      if (data.success && data.data) {
        if (data.data.insufficient) {
          return { ok: false, insufficient: true, message: data.data.message };
        }
        setBalance(data.data.remainingBalance ?? 0);
        return { ok: true, remaining: data.data.remainingBalance };
      }
      return { ok: false, message: data.error?.message || 'Error' };
    } catch (err: any) {
      return { ok: false, message: err?.message || 'Network error' };
    }
  }, []);

  const buyPackage = useCallback(async (packageId: string) => {
    try {
      const res = await fetch(`${API_BASE}/credits/stripe/checkout`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ packageId }),
      });
      const data = (await res.json()) as any;
      if (data.success && data.data) {
        if (data.data.demo) {
          // Demo mode: credits added directly
          await refresh();
          return { ok: true, message: data.data.message };
        }
        if (data.data.checkoutUrl) {
          window.location.href = data.data.checkoutUrl;
          return { ok: true };
        }
      }
      return { ok: false, message: data.error?.message || 'Error' };
    } catch (err: any) {
      return { ok: false, message: err?.message || 'Network error' };
    }
  }, [refresh]);

  return (
    <CreditsContext.Provider value={{ balance, loading, costs, packages, refresh, spend, buyPackage }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const ctx = useContext(CreditsContext);
  if (!ctx) {
    return {
      balance: 0,
      loading: false,
      costs: {} as Record<string, CreditCost>,
      packages: [] as CreditPackage[],
      refresh: async () => {},
      spend: async () => ({ ok: false as const, message: 'No provider' }),
      buyPackage: async () => ({ ok: false as const, message: 'No provider' }),
    };
  }
  return ctx;
}
