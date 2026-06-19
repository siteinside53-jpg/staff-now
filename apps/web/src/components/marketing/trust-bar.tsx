'use client';

import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/config';

/**
 * Trust bar με ΠΡΑΓΜΑΤΙΚΟΥΣ αριθμούς εγγεγραμμένων.
 *
 *  • Εργαζόμενοι  → πλήθος από /public/workers (ορατά προφίλ)
 *  • Επιχειρήσεις → μοναδικές επιχειρήσεις με ενεργές αγγελίες (/public/jobs)
 *
 * Τραβάει live· αν αποτύχει η API κρατάει το τελευταίο γνωστό fallback.
 */
export function TrustBar() {
  const [workers, setWorkers] = useState<number | null>(null);
  const [businesses, setBusinesses] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    Promise.all([
      fetch(`${API_URL}/public/workers?limit=200`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${API_URL}/public/jobs?limit=200`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([w, j]) => {
        if (!active) return;
        const wData = Array.isArray(w?.data) ? w.data : [];
        if (wData.length) setWorkers(wData.length);

        const jData = Array.isArray(j?.data) ? j.data : [];
        if (jData.length) {
          const uniqueBiz = new Set(
            jData
              .map((row: any) => row.business_user_id || row.company_name)
              .filter(Boolean),
          );
          setBusinesses(uniqueBiz.size);
        }
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const fmt = (n: number | null) => (n == null ? '—' : n.toLocaleString('el-GR'));

  return (
    <section className="bg-gray-900 py-6 border-b border-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 text-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-white tabular-nums">{fmt(workers)}</span>
            <span className="text-sm text-gray-400">Εργαζόμενοι</span>
          </div>
          <div className="hidden sm:block h-8 w-px bg-gray-700" />
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-white tabular-nums">{fmt(businesses)}</span>
            <span className="text-sm text-gray-400">Επιχειρήσεις</span>
          </div>
          <div className="hidden sm:block h-8 w-px bg-gray-700" />
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-lg">&#10003;</span>
            <span className="text-2xl font-extrabold text-white">Δωρεάν</span>
            <span className="text-sm text-gray-400">Εγγραφή &amp; χρήση</span>
          </div>
          <div className="hidden sm:block h-8 w-px bg-gray-700" />
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-blue-400">&lt;24ω</span>
            <span className="text-sm text-gray-400">Μέσος χρόνος πρόσληψης</span>
          </div>
        </div>
      </div>
    </section>
  );
}
