'use client';

import { useEffect, useState } from 'react';
import { auth, getToken, type User } from './api';

interface UseUserResult {
  user: User | null;
  loading: boolean;
  error: string | null;
  /** Refetch /auth/me */
  refresh: () => Promise<void>;
}

export function useUser(): UseUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await auth.me();
      setUser(data.user);
    } catch (e: any) {
      setError(e?.message || 'Σφάλμα');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, loading, error, refresh: load };
}
