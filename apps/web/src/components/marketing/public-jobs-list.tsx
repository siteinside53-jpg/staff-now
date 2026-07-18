'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AuthGatePopup } from './auth-gate-popup';
import { DetailModal } from './detail-modal';
import { FilteredListLayout, type FilterGroup } from './filtered-list-layout';
import { GREEK_CITIES } from '@/lib/greek-cities';
import { API_URL } from '@/lib/config';

type Job = {
  id: string;
  title: string;
  company: string;
  city: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: string;
  employmentType: string;
  housingProvided: boolean;
  mealsProvided: boolean;
  postedAgo: string;
  createdAtMs: number;
  logo: string | null;
  description?: string;
  roles?: string[];
};

const JOB_ROLE_LABELS: Record<string, string> = {
  waiter: 'Σερβιτόρος/α',
  barista: 'Barista',
  chef: 'Σεφ',
  cook: 'Μάγειρας',
  grill_cook: 'Ψήστης',
  maid: 'Καμαριέρα',
  housekeeper: 'Καμαριέρα',
  receptionist: 'Ρεσεψιονίστ',
  bartender: 'Bartender',
  cleaner: 'Καθαριστής',
  kitchen_assistant: 'Βοηθός Κουζίνας',
  sales: 'Πωλητής',
  warehouse: 'Αποθηκάριος',
};

function jobRoleLabel(key: string): string {
  return JOB_ROLE_LABELS[key] ?? key;
}

function employmentLabel(t: string): string {
  const map: Record<string, string> = {
    full_time: 'Full-time',
    part_time: 'Part-time',
    seasonal: 'Σεζόν',
    freelance: 'Freelance',
  };
  return map[t] ?? t;
}

function salaryStr(j: Job): string {
  const unit = j.salaryType === 'hourly' ? '€/ώρα' : '€/μήνα';
  if (j.salaryMin && j.salaryMax) return `${j.salaryMin}-${j.salaryMax}${unit}`;
  if (j.salaryMin) return `Από ${j.salaryMin}${unit}`;
  if (j.salaryMax) return `Έως ${j.salaryMax}${unit}`;
  return 'Συζητήσιμος';
}

function timeAgoGreek(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (Number.isNaN(diff) || diff < 0) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'μόλις τώρα';
  if (mins < 60) return `πριν ${mins} λεπτ${mins === 1 ? 'ό' : 'ά'}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `πριν ${hours} ώρ${hours === 1 ? 'α' : 'ες'}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `πριν ${days} ημέρ${days === 1 ? 'α' : 'ες'}`;
  const months = Math.floor(days / 30);
  return `πριν ${months} μήν${months === 1 ? 'α' : 'ες'}`;
}

// Κανονικοποίηση κειμένου για αναζήτηση (πεζά + χωρίς τόνους)
function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const EMPTY_SEL: Record<string, string[]> = { city: [], type: [], role: [], perks: [] };

export function PublicJobsList() {
  const [items, setItems] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Job | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateContext, setGateContext] = useState<{ jobId: string } | null>(null);

  // Filters
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState<Record<string, string[]>>(EMPTY_SEL);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    fetch(`${API_URL}/public/jobs?limit=200`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { success: boolean; data: any[] }) => {
        if (!active) return;
        const raw = Array.isArray(d?.data) ? d.data : [];
        if (raw.length === 0) { setItems([]); return; } // κανένα fake — μένει άδειο
        setItems(
          raw.map((j: any, i: number) => ({
            id: String(j.id ?? `rj_${i}`),
            title: j.title || 'Θέση εργασίας',
            company: j.display_company_name || j.company_name || 'Επιχείρηση',
            city: (j.city || j.region || 'Ελλάδα').trim(),
            salaryMin: j.salary_min ?? null,
            salaryMax: j.salary_max ?? null,
            salaryType: j.salary_type || 'monthly',
            employmentType: j.employment_type || 'full_time',
            housingProvided: !!j.housing_provided,
            mealsProvided: !!j.meals_provided,
            postedAgo: timeAgoGreek(j.created_at ?? null),
            createdAtMs: j.created_at ? new Date(j.created_at).getTime() : 0,
            logo: j.company_logo || null,
            description: typeof j.description === 'string' && j.description.trim() ? j.description.trim() : undefined,
            roles: Array.isArray(j.roles) && j.roles.length
              ? j.roles.map((rk: string) => jobRoleLabel(rk))
              : undefined,
          })),
        );
      })
      .catch(() => {
        /* κανένα fake — μένει άδειο σε σφάλμα/timeout */
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  // ── Filter groups (από όλη τη λίστα πόλεων + δεδομένα) ──
  const cityOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of GREEK_CITIES) {
      const n = norm(c);
      if (!seen.has(n)) seen.set(n, c);
    }
    for (const j of items) {
      const n = norm(j.city);
      if (n && !seen.has(n)) seen.set(n, j.city);
    }
    return Array.from(seen.entries())
      .map(([n, label]) => ({
        value: label,
        label,
        count: items.filter((j) => {
          const jc = norm(j.city);
          return jc.includes(n) || n.includes(jc);
        }).length,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'el'));
  }, [items]);

  const typeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const j of items) counts.set(j.employmentType, (counts.get(j.employmentType) || 0) + 1);
    return Array.from(counts.entries())
      .map(([v, c]) => ({ value: v, label: employmentLabel(v), count: c }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  const roleOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const j of items) for (const r of j.roles ?? []) counts.set(r, (counts.get(r) || 0) + 1);
    return Array.from(counts.entries())
      .map(([v, c]) => ({ value: v, label: v, count: c }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'el'));
  }, [items]);

  const perksOptions = useMemo(
    () => [
      { value: 'housing', label: '🏠 Στέγη', count: items.filter((j) => j.housingProvided).length },
      { value: 'meals', label: '🍽️ Φαγητό', count: items.filter((j) => j.mealsProvided).length },
    ],
    [items],
  );

  const groups: FilterGroup[] = useMemo(
    () =>
      [
        { key: 'city', title: 'Πόλεις', options: cityOptions, searchable: true },
        { key: 'type', title: 'Τύπος απασχόλησης', options: typeOptions },
        { key: 'role', title: 'Ειδικότητες', options: roleOptions },
        { key: 'perks', title: 'Παροχές', options: perksOptions },
      ].filter((g) => g.options.length > 0),
    [cityOptions, typeOptions, roleOptions, perksOptions],
  );

  const filtered = useMemo(() => {
    const q = norm(query);
    const cityNorms = (sel.city ?? []).map(norm);
    return items
      .filter((j) => {
        if (q && !(norm(j.title).includes(q) || norm(j.company).includes(q) || norm(j.city).includes(q))) return false;
        if (cityNorms.length) {
          const jc = norm(j.city);
          if (!cityNorms.some((cn) => jc.includes(cn) || cn.includes(jc))) return false;
        }
        if ((sel.type ?? []).length && !sel.type!.includes(j.employmentType)) return false;
        if ((sel.role ?? []).length && !(j.roles ?? []).some((r) => sel.role!.includes(r))) return false;
        if ((sel.perks ?? []).includes('housing') && !j.housingProvided) return false;
        if ((sel.perks ?? []).includes('meals') && !j.mealsProvided) return false;
        return true;
      })
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [items, query, sel]);

  function toggle(group: string, value: string) {
    setSel((prev) => {
      const cur = prev[group] ?? [];
      return { ...prev, [group]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] };
    });
  }

  function clearFilters() {
    setQuery('');
    setSel(EMPTY_SEL);
  }

  // Κρύβεται τελείως όσο δεν υπάρχουν πραγματικά δεδομένα (κανένα fake fallback)
  if (items.length === 0) return null;

  return (
    <>
      <FilteredListLayout
        accent="emerald"
        search={query}
        onSearch={setQuery}
        searchPlaceholder="Αναζήτηση ρόλου, εταιρείας ή περιοχής…"
        groups={groups}
        selected={sel}
        onToggle={toggle}
        onClear={clearFilters}
        resultCount={filtered.length}
        resultNoun={['διαθέσιμη θέση', 'διαθέσιμες θέσεις']}
      >
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <p className="text-gray-600 font-medium">Καμία θέση με αυτά τα φίλτρα.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Καθαρισμός φίλτρων
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => setSelected(j)}
                  className="w-full flex items-center gap-4 rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-gray-100 hover:border-emerald-300 hover:shadow-md transition text-left"
                  aria-label={`Δες αγγελία ${j.title} στην εταιρεία ${j.company}`}
                >
                  {j.logo ? (
                    <img
                      src={j.logo}
                      alt=""
                      loading="lazy"
                      className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 rounded-2xl object-cover ring-1 ring-gray-100"
                    />
                  ) : (
                    <div
                      className="flex h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-[11px] sm:text-xs text-center px-1 leading-tight"
                      aria-hidden="true"
                    >
                      {employmentLabel(j.employmentType)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{j.title}</p>
                    <p className="text-sm text-gray-700 truncate">
                      {j.company} · {j.city}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {j.postedAgo}
                      {j.housingProvided ? ' · 🏠 Στέγη' : ''}
                      {j.mealsProvided ? ' · 🍽️ Φαγητό' : ''}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="font-bold text-gray-900 text-sm sm:text-base whitespace-nowrap">
                      {salaryStr(j)}
                    </span>
                    <span className="hidden sm:inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                      Δες αγγελία →
                    </span>
                    <span className="sm:hidden text-gray-400 text-2xl leading-none">›</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </FilteredListLayout>

      {/* ── Job detail (company name allowed, no contact info) ── */}
      <DetailModal open={!!selected} onClose={() => setSelected(null)} labelledBy="job-detail-title">
        {selected && (
          <div className="p-6 sm:p-7">
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Κλείσιμο"
              className="float-right -mt-1 text-gray-400 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>

            <div className="flex items-center gap-4">
              {selected.logo ? (
                <img src={selected.logo} alt="" className="h-20 w-20 flex-shrink-0 rounded-2xl object-cover ring-1 ring-gray-100" />
              ) : (
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xs text-center px-1 leading-tight">
                  {employmentLabel(selected.employmentType)}
                </div>
              )}
              <div className="min-w-0">
                <h3 id="job-detail-title" className="text-xl font-bold text-gray-900">{selected.title}</h3>
                <p className="text-sm text-gray-600 mt-0.5">{selected.company} · {selected.city}</p>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">Μισθός</dt>
                <dd className="text-sm font-semibold text-gray-900">{salaryStr(selected)}</dd>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">Τύπος</dt>
                <dd className="text-sm font-semibold text-gray-900">{employmentLabel(selected.employmentType)}</dd>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">Στέγη</dt>
                <dd className="text-sm font-semibold text-gray-900">{selected.housingProvided ? '🏠 Ναι' : '—'}</dd>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">Φαγητό</dt>
                <dd className="text-sm font-semibold text-gray-900">{selected.mealsProvided ? '🍽️ Ναι' : '—'}</dd>
              </div>
            </dl>

            {selected.roles && selected.roles.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-1.5">Ειδικότητες</p>
                <div className="flex flex-wrap gap-2">
                  {selected.roles.map((r) => (
                    <span key={r} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{r}</span>
                  ))}
                </div>
              </div>
            )}

            {selected.description && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-1.5">Περιγραφή</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{selected.description}</p>
              </div>
            )}

            <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-600">🔒 Στοιχεία επικοινωνίας διαθέσιμα μετά την εγγραφή</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setGateContext({ jobId: selected.id });
                setGateOpen(true);
              }}
              className="mt-4 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow transition"
            >
              Σύνδεση / Εγγραφή για αίτηση
            </button>

            {!String(selected.id).startsWith('sample-') && (
              <Link
                href={`/jobs/${selected.id}`}
                className="mt-2 block text-center text-xs text-gray-500 hover:text-emerald-600"
              >
                Άνοιξε ως ξεχωριστή σελίδα ↗
              </Link>
            )}
          </div>
        )}
      </DetailModal>

      <AuthGatePopup
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        role="worker"
        action="apply"
        redirectAfter={
          gateContext
            ? `/dashboard/discover?focus=${encodeURIComponent(gateContext.jobId)}`
            : '/dashboard'
        }
      />
    </>
  );
}
