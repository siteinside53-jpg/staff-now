import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useSegments, useRouter } from 'expo-router';
import { api, setToken, removeToken } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    confirmPassword: string;
    role: string;
    acceptTerms: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Auto-redirect hook
// ---------------------------------------------------------------------------

function useProtectedRoute(user: User | null, loading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      // Redirect unauthenticated users to login
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      // Redirect authenticated users to home
      router.replace('/(tabs)');
    }
  }, [user, segments, loading, router]);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.auth.me();
      if (res.success && res.data) {
        const data = res.data as any;
        setUser(data.user);
        setProfile(data.profile);
        setSubscription(data.subscription);
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

  // Automatic redirect based on auth state
  useProtectedRoute(user, loading);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.auth.login({ email, password });
      if (res.success && res.data) {
        const data = res.data as any;
        if (data.token) {
          await setToken(data.token);
        }
        setUser(data.user);
        await refreshUser();
      }
    },
    [refreshUser],
  );

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      confirmPassword: string;
      role: string;
      acceptTerms: boolean;
    }) => {
      const res = await api.auth.register(data);
      if (res.success && res.data) {
        const resData = res.data as any;
        if (resData.token) {
          await setToken(resData.token);
        }
        setUser(resData.user);
        await refreshUser();
      }
    },
    [refreshUser],
  );

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      await removeToken();
      setUser(null);
      setProfile(null);
      setSubscription(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        subscription,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
