'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api } from './api';

interface User {
  id: string;
  email: string;
  role: 'worker' | 'business' | 'admin';
  status: string;
}

interface AuthContextType {
  user: User | null;
  profile: any;
  subscription: any;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  /**
   * Το δεύτερο βήμα της σύνδεσης, όταν ο λογαριασμός έχει διπλή επαλήθευση.
   * Καταλήγει **στις ίδιες ακριβώς γραμμές** με το `login`, ώστε η συνεδρία να
   * στήνεται με έναν και μόνο τρόπο.
   */
  completeTwoFactor: (challenge: string, code: string, mode: 'totp' | 'recovery') => Promise<any>;
  register: (data: { email: string; password: string; confirmPassword: string; role: string; acceptTerms: boolean }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.auth.me();
      if (res.success && res.data) {
        setUser((res.data as any).user);
        setProfile((res.data as any).profile);
        setSubscription((res.data as any).subscription);
      }
    } catch {
      setUser(null);
      setProfile(null);
      setSubscription(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  /** Το κοινό τέλος και των δύο δρόμων σύνδεσης. */
  const applySession = async (data: any) => {
    if (data.token) {
      localStorage.setItem('staffnow_token', data.token);
    }
    setUser(data.user);
    await refreshUser();
    return data.user;
  };

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    if (res.success && res.data) {
      const data = res.data as any;
      // Λογαριασμός με διπλή επαλήθευση: εδώ ΔΕΝ υπάρχει token. Επιστρέφουμε
      // την «απόδειξη» για να τη δώσει το παράθυρο στο δεύτερο βήμα.
      if (data.twoFactorRequired) {
        return {
          twoFactorRequired: true,
          challenge: data.challenge as string,
          expiresIn: data.expiresIn as number,
        };
      }
      return applySession(data);
    }
    return null;
  };

  const completeTwoFactor = async (
    challenge: string,
    code: string,
    mode: 'totp' | 'recovery',
  ) => {
    const res =
      mode === 'recovery'
        ? await api.auth.twoFactorRecovery({ challenge, code })
        : await api.auth.twoFactorVerify({ challenge, code });
    if (res.success && res.data) {
      return applySession(res.data as any);
    }
    return null;
  };

  const register = async (data: { email: string; password: string; confirmPassword: string; role: string; acceptTerms: boolean }) => {
    const res = await api.auth.register(data);
    if (res.success && res.data) {
      const resData = res.data as any;
      if (resData.token) {
        localStorage.setItem('staffnow_token', resData.token);
      }
      setUser(resData.user);
      await refreshUser();
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      localStorage.removeItem('staffnow_token');
      setUser(null);
      setProfile(null);
      setSubscription(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, subscription, loading, login, completeTwoFactor, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}