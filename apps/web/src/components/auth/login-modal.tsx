'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';

// ==================== TYPES ====================

type AuthMode = 'login' | 'register';

interface LoginModalContextType {
  isOpen: boolean;
  authMode: AuthMode;
  open: (mode?: AuthMode) => void;
  close: () => void;
  setAuthMode: (mode: AuthMode) => void;
}

const LoginModalContext = createContext<LoginModalContextType | undefined>(undefined);

// ==================== HOOK ====================

/**
 * Safely read the auth modal context. Returns a fallback that navigates to
 * /auth/login or /auth/register if the hook is used outside of a provider.
 */
export function useLoginModal() {
  const ctx = useContext(LoginModalContext);
  if (!ctx) {
    return {
      isOpen: false,
      authMode: 'login' as AuthMode,
      open: (mode: AuthMode = 'login') => {
        if (typeof window !== 'undefined') {
          window.location.href = mode === 'register' ? '/auth/register' : '/auth/login';
        }
      },
      close: () => {},
      setAuthMode: (_m: AuthMode) => {},
    };
  }
  return ctx;
}

// ==================== PROVIDER ====================

export function LoginModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  const open = useCallback((mode: AuthMode = 'login') => {
    setAuthMode(mode);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  // Auto-open when landing on a URL with ?login=1 or ?register=1
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      let shouldOpen = false;
      if (params.get('login') === '1') {
        setAuthMode('login');
        shouldOpen = true;
        params.delete('login');
      } else if (params.get('register') === '1') {
        setAuthMode('register');
        shouldOpen = true;
        params.delete('register');
      }
      if (shouldOpen) {
        setIsOpen(true);
        const newSearch = params.toString();
        const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
        window.history.replaceState({}, '', newUrl);
      }
    } catch {}
  }, []);

  // Close on ESC + lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = original;
    };
  }, [isOpen, close]);

  return (
    <LoginModalContext.Provider value={{ isOpen, authMode, open, close, setAuthMode }}>
      {children}
      {isOpen && <AuthModal onClose={close} authMode={authMode} setAuthMode={setAuthMode} />}
    </LoginModalContext.Provider>
  );
}

// ==================== MODAL ====================

interface AuthModalProps {
  onClose: () => void;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
}

function AuthModal({ onClose, authMode, setAuthMode }: AuthModalProps) {
  const { login, register } = useAuth();
  const [view, setView] = useState<'main' | 'email'>('main');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'worker' | 'business'>('worker');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset state when authMode changes
  useEffect(() => {
    setView('main');
    setErrorMsg('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  }, [authMode]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg('Συμπληρώστε email και κωδικό.');
      return;
    }
    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      const role = loggedInUser?.role;
      if (role === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Λάθος email ή κωδικός.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !password || !confirmPassword) {
      setErrorMsg('Συμπληρώστε όλα τα πεδία.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Ο κωδικός πρέπει να είναι τουλάχιστον 8 χαρακτήρες.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Οι κωδικοί δεν ταιριάζουν.');
      return;
    }
    if (!acceptTerms) {
      setErrorMsg('Πρέπει να αποδεχτείς τους Όρους Χρήσης.');
      return;
    }
    setLoading(true);
    try {
      await register({ email, password, confirmPassword, role, acceptTerms: true });
      toast.success('Ο λογαριασμός δημιουργήθηκε επιτυχώς!');
      window.location.href = '/dashboard';
    } catch (err: any) {
      setErrorMsg(err.message || 'Αποτυχία εγγραφής. Δοκίμασε ξανά.');
    } finally {
      setLoading(false);
    }
  };

  const isLogin = authMode === 'login';
  const googleRole = authMode === 'register' ? role : 'worker';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      {/* Modal wrapper */}
      <div className="relative z-10 my-8 w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-lg hover:bg-gray-50 hover:scale-105 transition-all"
          aria-label="Κλείσιμο"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Logo above card */}
        <div className="mb-5 flex flex-col items-center">
          <img src="/staffnow-logo.png" alt="StaffNow" className="h-16 w-16 rounded-full shadow-2xl" />
          <p className="mt-2 text-base font-extrabold text-white drop-shadow-lg">
            <span>Staff</span>
            <span className="text-blue-300">Now</span>
          </p>
        </div>

        {/* White card */}
        <div className="rounded-3xl bg-white p-8 shadow-2xl">
          {view === 'main' ? (
            <>
              <h1 className="text-center text-2xl font-extrabold text-gray-900 mb-1">
                {isLogin ? 'Ξεκίνησε' : 'Δημιούργησε Λογαριασμό'}
              </h1>
              <p className="text-center text-xs text-gray-500 leading-relaxed mb-6">
                Κάνοντας κλικ στη{' '}
                <span className="font-semibold text-gray-700">
                  {isLogin ? 'Σύνδεση' : 'Εγγραφή'}
                </span>
                , δηλώνεις ότι αποδέχεσαι τους{' '}
                <Link href="/terms" className="font-semibold text-gray-900 underline">
                  Όρους Χρήσης
                </Link>
                . Μάθε πώς επεξεργαζόμαστε τα δεδομένα σου διαβάζοντας την{' '}
                <Link href="/privacy" className="font-semibold text-gray-900 underline">
                  Πολιτική Απορρήτου
                </Link>
                .
              </p>

              {/* Role selector (only in register mode) */}
              {!isLogin && (
                <div className="mb-4">
                  <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Είμαι
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('worker')}
                      className={`rounded-xl border-2 p-3 text-center text-sm font-bold transition-all ${
                        role === 'worker'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      👤 Εργαζόμενος
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('business')}
                      className={`rounded-xl border-2 p-3 text-center text-sm font-bold transition-all ${
                        role === 'business'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      🏢 Επιχείρηση
                    </button>
                  </div>
                </div>
              )}

              {/* Google CTA — proper multi-color G icon on white circle */}
              <a
                href={`https://staffnow-api-production.siteinside53.workers.dev/auth/google?role=${googleRole}`}
                className="mb-3 flex w-full items-center justify-center gap-3 rounded-full border-2 border-gray-200 bg-white py-3.5 text-sm font-bold uppercase tracking-wide text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {isLogin ? 'Συνέχεια με Google' : 'Εγγραφή με Google'}
              </a>

              {/* Email CTA */}
              <button
                onClick={() => setView('email')}
                className="mb-6 flex w-full items-center justify-center gap-3 rounded-full border-2 border-gray-200 bg-white py-3.5 text-sm font-bold uppercase tracking-wide text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all active:scale-[0.98]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {isLogin ? 'Είσοδος με Email' : 'Εγγραφή με Email'}
              </button>

              {isLogin && (
                <div className="text-center">
                  <Link
                    href="/auth/forgot-password"
                    onClick={onClose}
                    className="text-xs font-semibold text-gray-600 hover:text-gray-900 underline underline-offset-2"
                  >
                    Πρόβλημα εισόδου;
                  </Link>
                </div>
              )}

              {/* App download — INSIDE white card */}
              <div className="mt-6 pt-5 border-t border-gray-100">
                <p className="text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Απόκτησε την εφαρμογή
                </p>
                <div className="flex items-center justify-center gap-2">
                  {/* App Store */}
                  <div className="flex items-center gap-2 rounded-xl bg-black px-3.5 py-2 text-left cursor-pointer hover:bg-gray-800 transition-colors">
                    <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                    <div>
                      <p className="text-[8px] text-white/70 leading-none">Διαθέσιμο στο</p>
                      <p className="text-xs font-bold text-white leading-tight">App Store</p>
                    </div>
                  </div>
                  {/* Google Play */}
                  <div className="flex items-center gap-2 rounded-xl bg-black px-3.5 py-2 text-left cursor-pointer hover:bg-gray-800 transition-colors">
                    <svg className="h-6 w-6" viewBox="0 0 24 24">
                      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92z" fill="#4285F4"/>
                      <path d="M14.5 11.293l2.302-2.302-10.937-6.333 8.635 8.635z" fill="#FBBC04"/>
                      <path d="M14.5 12.707l-8.635 8.634 10.937-6.332-2.302-2.302z" fill="#EA4335"/>
                      <path d="M16.798 9l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L14.5 12.707V11.293L16.798 9z" fill="#34A853"/>
                    </svg>
                    <div>
                      <p className="text-[8px] text-white/70 leading-none">Διαθέσιμο στο</p>
                      <p className="text-xs font-bold text-white leading-tight">Google Play</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Back button */}
              <button
                onClick={() => {
                  setView('main');
                  setErrorMsg('');
                }}
                className="mb-4 flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Πίσω
              </button>

              <h1 className="text-center text-2xl font-extrabold text-gray-900 mb-1">
                {isLogin ? 'Είσοδος με Email' : 'Εγγραφή με Email'}
              </h1>
              <p className="text-center text-xs text-gray-500 mb-6">
                {isLogin
                  ? 'Συμπλήρωσε τα στοιχεία σου για να συνεχίσεις'
                  : 'Δημιούργησε δωρεάν λογαριασμό σε 1 λεπτό'}
              </p>

              {errorMsg && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={isLogin ? handleLoginSubmit : handleRegisterSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">
                      Είμαι
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole('worker')}
                        className={`rounded-xl border-2 p-2.5 text-center text-xs font-bold transition-all ${
                          role === 'worker'
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-600'
                        }`}
                      >
                        👤 Εργαζόμενος
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('business')}
                        className={`rounded-xl border-2 p-2.5 text-center text-xs font-bold transition-all ${
                          role === 'business'
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-600'
                        }`}
                      >
                        🏢 Επιχείρηση
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="auth-modal-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">
                    Email
                  </label>
                  <input
                    id="auth-modal-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                    autoFocus
                    className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="auth-modal-password" className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Κωδικός
                    </label>
                    {isLogin && (
                      <Link
                        href="/auth/forgot-password"
                        onClick={onClose}
                        className="text-[11px] font-semibold text-blue-600 hover:underline"
                      >
                        Ξέχασες;
                      </Link>
                    )}
                  </div>
                  <input
                    id="auth-modal-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isLogin ? '••••••••' : 'Τουλάχιστον 8 χαρακτήρες'}
                    required
                    className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>

                {!isLogin && (
                  <>
                    <div>
                      <label htmlFor="auth-modal-confirm" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">
                        Επιβεβαίωση Κωδικού
                      </label>
                      <input
                        id="auth-modal-confirm"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Επανάλαβε τον κωδικό"
                        required
                        className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
                      />
                    </div>

                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-[11px] text-gray-600 leading-snug">
                        Αποδέχομαι τους{' '}
                        <Link href="/terms" target="_blank" className="font-semibold text-blue-600 hover:underline">
                          Όρους Χρήσης
                        </Link>{' '}
                        και την{' '}
                        <Link href="/privacy" target="_blank" className="font-semibold text-blue-600 hover:underline">
                          Πολιτική Απορρήτου
                        </Link>
                      </span>
                    </label>
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (isLogin ? 'Σύνδεση...' : 'Δημιουργία...') : isLogin ? 'Σύνδεση' : 'Δημιουργία λογαριασμού'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer: switch between login and register */}
        <p className="mt-5 text-center text-sm text-white/90 drop-shadow">
          {isLogin ? (
            <>
              Δεν έχεις λογαριασμό;{' '}
              <button
                onClick={() => setAuthMode('register')}
                className="font-bold text-white underline underline-offset-2 hover:text-blue-200"
              >
                Εγγραφή
              </button>
            </>
          ) : (
            <>
              Έχεις ήδη λογαριασμό;{' '}
              <button
                onClick={() => setAuthMode('login')}
                className="font-bold text-white underline underline-offset-2 hover:text-blue-200"
              >
                Σύνδεση
              </button>
            </>
          )}
        </p>

        {/* (App badges moved inside white card above) */}
      </div>
    </div>
  );
}

// Backwards-compat export
export { AuthModal as LoginModal };
