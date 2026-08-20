'use client';

import Link from 'next/link';
import { isOpen, useMockTasks } from './mock-store';
import { CATEGORY_BY_KEY } from './data';

/**
 * ΜΑΚΕΤΑ — η λωρίδα του TaskNow μέσα στο υπόλοιπο site.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ: οι μικροδουλειές χρειάζονται ορατότητα εκεί όπου ήδη περνάει
 * κόσμος. Κάποιος που ψάχνει δουλειά και δεν βρίσκει σήμερα, μπορεί να βγάλει
 * 40 ευρώ σήμερα.
 *
 * Τα νούμερα βγαίνουν από τη ροή της μακέτας — δεν είναι επινοημένα «στατιστικά».
 */
export function TaskNowBanner({ variant = 'full' }: { variant?: 'full' | 'strip' }) {
  const { tasks } = useMockTasks();
  // ΠΡΟΣΟΧΗ: κρυμμένες, ακυρωμένες και σε διαφωνία ΔΕΝ μετράνε — το `isOpen`
  // τα κόβει όλα μαζί. Αλλιώς μια αγγελία που κόπηκε για ερωτικό περιεχόμενο
  // θα φούσκωνε δημόσιο μετρητή και το άθροισμα αμοιβών.
  const open = tasks.filter(isOpen);
  const preview = open.slice(0, 3);
  const total = open.reduce((sum, t) => sum + t.budget, 0);

  if (variant === 'strip') {
    return (
      <Link
        href="/tasknow"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white px-5 py-4 transition hover:border-amber-400"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-lg text-white">
            ⚡
          </span>
          <div>
            <p className="text-sm font-bold text-gray-900">
              Δεν βρήκες δουλειά σήμερα; Βγάλε κάτι σήμερα.
            </p>
            <p className="text-xs text-gray-600">
              {open.length} μικροδουλειές ανοιχτές τώρα στη Θεσσαλονίκη
            </p>
          </div>
        </div>
        <span className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white">
          Δες το TaskNow →
        </span>
      </Link>
    );
  }

  return (
    <section className="bg-gradient-to-br from-amber-500 to-orange-500 py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl text-white">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              ⚡ TaskNow
            </span>
            <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Μικροδουλειές που πληρώνονται σήμερα
            </h2>
            <p className="mt-3 text-base leading-relaxed text-white/90">
              Βόλτα με σκύλο, μεταφορά, καθάρισμα, θελήματα, μαστορέματα. Ανέβασε τι
              θέλεις να γίνει και βρες χέρια σε ώρες — ή ανάλαβε μια δουλειά και βγάλε
              χρήματα αυτή τη βδομάδα.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-white/90">
              <span>
                <strong className="text-lg font-bold text-white">{open.length}</strong>{' '}
                ανοιχτές τώρα
              </span>
              <span>
                <strong className="text-lg font-bold text-white">{total}€</strong> συνολικά
                σε αμοιβές
              </span>
              <span>📍 Θεσσαλονίκη</span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/tasknow"
                className="rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-amber-600 shadow-lg transition hover:bg-amber-50"
              >
                Δες τις μικροδουλειές
              </Link>
              <Link
                href="/tasknow#roi"
                className="rounded-xl bg-black/20 px-7 py-3.5 text-sm font-semibold text-white ring-1 ring-white/40 transition hover:bg-black/30"
              >
                Ανέβασε δουλειά
              </Link>
            </div>
          </div>

          {/* Τρεις πραγματικές εγγραφές από τη ροή */}
          <div className="w-full max-w-sm space-y-3">
            {preview.map((t) => {
              const cat = CATEGORY_BY_KEY[t.category];
              return (
                <Link
                  key={t.id}
                  href="/tasknow"
                  className="flex items-center gap-3 rounded-2xl bg-white/95 p-4 shadow-lg transition hover:bg-white"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg">
                    {cat?.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{t.title}</p>
                    <p className="text-xs text-gray-500">
                      {t.area} · {t.when}
                    </p>
                  </div>
                  <span className="shrink-0 text-lg font-bold text-gray-900">{t.budget}€</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
