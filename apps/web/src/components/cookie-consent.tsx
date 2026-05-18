'use client';

/**
 * <CookieConsent /> — GDPR-compliant cookie consent modal με granular preferences.
 *
 * UI: Full-screen modal με backdrop overlay (αντί για bottom banner).
 *  • Header: StaffNow logo + τίτλος «Σεβόμαστε την ιδιωτικότητά σας»
 *  • Body:   αναλυτική περιγραφή χρήσης cookies/δεδομένων
 *  • Footer: [Περισσότερες επιλογές] [Διαφωνώ] [Συμφωνώ]
 *
 * Click στο «Περισσότερες επιλογές» → εμφανίζονται 3 toggles:
 *   • Απαραίτητα — locked, πάντα ενεργά
 *   • Στατιστικά / Analytics
 *   • Marketing & Διαφήμιση
 *
 * Storage: localStorage `staffnow_cookie_consent` = JSON
 *   { necessary: true, analytics: bool, marketing: bool, at: ISO }
 *
 * Ελέγχει cookieconsent:saved event για άλλους scripts.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'staffnow_cookie_consent';

interface ConsentState {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  at: string;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) setVisible(true);
      } catch {
        setVisible(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Lock body scroll while modal open
  useEffect(() => {
    if (visible) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [visible]);

  const persist = (state: Omit<ConsentState, 'at'>) => {
    const full: ConsentState = { ...state, at: new Date().toISOString() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    } catch {}
    setVisible(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cookieconsent:saved', { detail: full }));
    }
  };

  const acceptAll = () => persist({ necessary: true, analytics: true, marketing: true });
  const rejectAll = () => persist({ necessary: true, analytics: false, marketing: false });
  const saveCustom = () => persist({ necessary: true, analytics, marketing });

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label="Συγκατάθεση Cookies"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 sm:p-6"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* HEADER — logo + title */}
        <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-4">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 32 32" className="h-9 w-9 block" aria-label="StaffNow">
              <circle cx="16" cy="16" r="16" fill="#3b82f6" />
              <path d="M9 16.5l4.5 4.5L23 11" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-2xl font-extrabold tracking-tight">
              <span className="text-gray-800">Staff</span>
              <span className="text-blue-500">Now</span>
            </span>
          </div>
          <h2 className="text-center text-xl font-bold text-gray-900 sm:text-2xl">
            Σεβόμαστε την ιδιωτικότητά σας
          </h2>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {!expanded ? (
            <div className="text-sm leading-relaxed text-gray-700 space-y-3">
              <p>
                Εμείς και οι συνεργάτες μας αποθηκεύουμε ή/και έχουμε πρόσβαση σε
                πληροφορίες σε μια συσκευή, όπως τα cookies, και επεξεργαζόμαστε
                προσωπικά δεδομένα, όπως μοναδικοί αναγνωριστικοί και προσαρμοσμένες
                πληροφορίες που αποστέλλονται από μια συσκευή για εξατομικευμένες
                διαφημίσεις και περιεχόμενο, μέτρηση διαφήμισης και περιεχομένου,
                έρευνα ακροατηρίου και ανάπτυξη υπηρεσιών.
              </p>
              <p>
                Με την άδειά σας, εμείς και οι συνεργάτες μας ενδέχεται να
                χρησιμοποιήσουμε ακριβή δεδομένα γεωγραφικής τοποθεσίας και
                ταυτοποίησης μέσω σάρωσης συσκευών. Μπορείτε να κάνετε κλικ για να
                συναινέσετε στην επεξεργασία από εμάς και τους συνεργάτες μας όπως
                περιγράφεται παραπάνω.
              </p>
              <p>
                Εναλλακτικά, μπορείτε να κάνετε κλικ για να αρνηθείτε να
                συναινέσετε ή να αποκτήσετε πρόσβαση σε πιο λεπτομερείς πληροφορίες
                και να αλλάξετε τις προτιμήσεις σας πριν συναινέσετε. Λάβετε υπόψη
                ότι κάποια επεξεργασία των προσωπικών σας δεδομένων ενδέχεται να
                μην απαιτεί τη συγκατάθεσή σας, αλλά έχετε το δικαίωμα να αρνηθείτε
                αυτήν την επεξεργασία.
              </p>
              <p>
                Οι προτιμήσεις σας θα ισχύουν μόνο για αυτόν τον ιστότοπο. Μπορείτε
                να αλλάξετε τις προτιμήσεις σας ή να ανακαλέσετε τη συγκατάθεσή σας
                ανά πάσα στιγμή επιστρέφοντας σε αυτόν τον ιστότοπο και κάνοντας
                κλικ στον σύνδεσμο{' '}
                <Link href="/cookies" className="font-medium text-blue-600 underline-offset-2 hover:underline">
                  Πολιτική Cookies
                </Link>{' '}
                ή{' '}
                <Link href="/privacy" className="font-medium text-blue-600 underline-offset-2 hover:underline">
                  Πολιτική Απορρήτου
                </Link>{' '}
                στο κάτω μέρος της ιστοσελίδας.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Διαχείριση επιλογών
              </p>
              <CategoryRow
                title="Απαραίτητα"
                description="Cookies που είναι απολύτως αναγκαία για τη λειτουργία του site (σύνδεση, ασφάλεια, language preference, αποθήκευση επιλογών). Χωρίς αυτά η πλατφόρμα δεν λειτουργεί."
                checked
                disabled
                onChange={() => {}}
              />
              <CategoryRow
                title="Στατιστικά / Analytics"
                description="Μας βοηθούν να καταλάβουμε πώς χρησιμοποιείται η πλατφόρμα (page views, clicks, sessions) ώστε να βελτιώνουμε την εμπειρία. Ανώνυμα δεδομένα — δεν σε ταυτοποιούν."
                checked={analytics}
                onChange={setAnalytics}
              />
              <CategoryRow
                title="Marketing & Διαφήμιση"
                description="Cookies από third-parties (Meta, Google) για στοχευμένες διαφημίσεις και remarketing όταν επισκέπτεσαι άλλα sites. Μπορείς να τα απενεργοποιήσεις χωρίς να επηρεαστεί η λειτουργία."
                checked={marketing}
                onChange={setMarketing}
              />
            </div>
          )}
        </div>

        {/* FOOTER — actions */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
          {!expanded ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="rounded-lg border border-blue-600 bg-white px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Περισσότερες Επιλογές
              </button>
              <button
                type="button"
                onClick={rejectAll}
                className="rounded-lg border border-blue-600 bg-white px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Διαφωνώ
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                Συμφωνώ
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline"
              >
                ← Πίσω
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={rejectAll}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Απόρριψη όλων
                </button>
                <button
                  type="button"
                  onClick={saveCustom}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Αποθήκευση επιλογών
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryRow({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-gray-900">{title}</h4>
            {disabled && (
              <span className="rounded-full bg-emerald-50 ring-1 ring-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                Πάντα ενεργά
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">{description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={title}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors mt-0.5 ${
            checked ? (disabled ? 'bg-emerald-500' : 'bg-blue-600') : 'bg-gray-300'
          } ${disabled ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
