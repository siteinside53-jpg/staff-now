'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AuthGatePopup } from './auth-gate-popup';
import { DetailModal } from './detail-modal';
import { FilteredListLayout, type FilterGroup } from './filtered-list-layout';
import { GREEK_CITIES } from '@/lib/greek-cities';
import { API_URL } from '@/lib/config';

type Worker = {
  id: string;
  name: string;
  role: string;
  city: string;
  experienceYears: number;
  verified: boolean;
  photo: string | null;
  avatarColor: string;
  initials: string;
  availability?: string;
  roles?: string[];
};

const AVAILABILITY_LABELS: Record<string, string> = {
  immediate: 'Άμεσα διαθέσιμος/η',
  within_7_days: 'Εντός 7 ημερών',
  seasonal: 'Εποχιακά',
  part_time: 'Μερική απασχόληση',
  full_time: 'Πλήρης απασχόληση',
};

const PALETTE = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-pink-100 text-pink-700',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
  'bg-rose-100 text-rose-700',
];

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % 1000;
  return PALETTE[h % PALETTE.length] ?? PALETTE[0]!;
}

function initialsFrom(name: string): string {
  if (!name) return '?';
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

function displayName(fullName: string): string {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Εργαζόμενος/η';
  const first = parts[0] ?? '';
  if (parts.length === 1) return first;
  const last = parts[parts.length - 1] ?? '';
  return `${first} ${last.charAt(0).toUpperCase()}.`;
}

const ROLE_LABELS: Record<string, string> = {
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
  lifeguard: 'Ναυαγοσώστης',
  tour_guide: 'Ξεναγός',
  driver: 'Οδηγός',
  host: 'Host',
  sommelier: 'Sommelier',
  dj: 'DJ',
  animator: 'Animator',
  sales: 'Πωλητής',
  warehouse: 'Αποθηκάριος',
  back_office_clerk: 'Υπάλληλος Back Office',
  call_center_agent: 'Call Center',
  collections_agent: 'Εισπράξεις',
  telephonist: 'Τηλεφωνητής/τρια',
};

function roleLabel(roleKey: string | undefined): string {
  if (!roleKey) return 'Εργαζόμενος/η';
  return ROLE_LABELS[roleKey] ?? roleKey;
}

function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function expLabel(years: number): string {
  if (!years || years <= 0) return 'Νέος/α';
  if (years === 1) return '1 χρόνος εμπειρία';
  return `${years} χρόνια εμπειρία`;
}

const EXP_BUCKETS: { value: string; label: string; match: (y: number) => boolean }[] = [
  { value: 'jr', label: '0-2 έτη', match: (y) => y <= 2 },
  { value: 'mid', label: '3-5 έτη', match: (y) => y >= 3 && y <= 5 },
  { value: 'sr', label: '6+ έτη', match: (y) => y >= 6 },
];

const EMPTY_SEL: Record<string, string[]> = { city: [], role: [], exp: [], avail: [] };

export function PublicWorkersList() {
  const [items, setItems] = useState<Worker[]>([]);
  const [selected, setSelected] = useState<Worker | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateContext, setGateContext] = useState<{ workerId: string } | null>(null);

  // Filters
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState<Record<string, string[]>>(EMPTY_SEL);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    fetch(`${API_URL}/public/workers?limit=200`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { success: boolean; data: any[] }) => {
        if (!active) return;
        const raw = Array.isArray(d?.data) ? d.data : [];
        if (raw.length === 0) { setItems([]); return; } // κανένα fake — μένει άδειο
        setItems(
          raw.map((w: any, i: number) => {
            const name = displayName(w.full_name || 'Εργαζόμενος');
            return {
              id: String(w.user_id ?? `rw_${i}`),
              name,
              role: roleLabel(w.roles?.[0]),
              city: (w.city || w.region || 'Ελλάδα').trim(),
              experienceYears: Number(w.years_of_experience ?? 0),
              verified: !!w.verified,
              photo: w.photo_url || null,
              avatarColor: colorFor(String(w.user_id ?? i)),
              initials: initialsFrom(name),
              availability: w.availability || undefined,
              roles: Array.isArray(w.roles) && w.roles.length
                ? w.roles.map((rk: string) => roleLabel(rk))
                : undefined,
            };
          }),
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

  // ── Filter groups ──
  const cityOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of GREEK_CITIES) {
      const n = norm(c);
      if (!seen.has(n)) seen.set(n, c);
    }
    for (const w of items) {
      const n = norm(w.city);
      if (n && !seen.has(n)) seen.set(n, w.city);
    }
    return Array.from(seen.entries())
      .map(([n, label]) => ({
        value: label,
        label,
        count: items.filter((w) => {
          const wc = norm(w.city);
          return wc.includes(n) || n.includes(wc);
        }).length,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'el'));
  }, [items]);

  const roleOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of items) if (w.role) counts.set(w.role, (counts.get(w.role) || 0) + 1);
    return Array.from(counts.entries())
      .map(([v, c]) => ({ value: v, label: v, count: c }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'el'));
  }, [items]);

  const expOptions = useMemo(
    () =>
      EXP_BUCKETS.map((b) => ({
        value: b.value,
        label: b.label,
        count: items.filter((w) => b.match(w.experienceYears)).length,
      })),
    [items],
  );

  const availOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of items) if (w.availability) counts.set(w.availability, (counts.get(w.availability) || 0) + 1);
    return Array.from(counts.entries())
      .map(([v, c]) => ({ value: v, label: AVAILABILITY_LABELS[v] ?? v, count: c }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  const groups: FilterGroup[] = useMemo(
    () =>
      [
        { key: 'city', title: 'Πόλεις', options: cityOptions, searchable: true },
        { key: 'role', title: 'Ειδικότητες', options: roleOptions },
        { key: 'exp', title: 'Εμπειρία', options: expOptions },
        { key: 'avail', title: 'Διαθεσιμότητα', options: availOptions },
      ].filter((g) => g.options.length > 0),
    [cityOptions, roleOptions, expOptions, availOptions],
  );

  const filtered = useMemo(() => {
    const q = norm(query);
    const cityNorms = (sel.city ?? []).map(norm);
    let list = items.filter((w) => {
      if (q && !(norm(w.name).includes(q) || norm(w.role).includes(q) || norm(w.city).includes(q))) return false;
      if (cityNorms.length) {
        const wc = norm(w.city);
        if (!cityNorms.some((cn) => wc.includes(cn) || cn.includes(wc))) return false;
      }
      if ((sel.role ?? []).length && !sel.role!.includes(w.role)) return false;
      if ((sel.exp ?? []).length && !sel.exp!.some((b) => EXP_BUCKETS.find((x) => x.value === b)?.match(w.experienceYears))) return false;
      if ((sel.avail ?? []).length && !(w.availability && sel.avail!.includes(w.availability))) return false;
      return true;
    });
    list = [...list].sort((a, b) => (a.verified !== b.verified ? (a.verified ? -1 : 1) : b.experienceYears - a.experienceYears));
    return list;
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
        accent="blue"
        search={query}
        onSearch={setQuery}
        searchPlaceholder="Αναζήτηση ρόλου ή περιοχής…"
        groups={groups}
        selected={sel}
        onToggle={toggle}
        onClear={clearFilters}
        resultCount={filtered.length}
        resultNoun={['διαθέσιμος εργαζόμενος', 'διαθέσιμοι εργαζόμενοι']}
      >
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <p className="text-gray-600 font-medium">Κανένας εργαζόμενος με αυτά τα φίλτρα.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Καθαρισμός φίλτρων
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => setSelected(w)}
                  className="w-full flex items-center gap-4 rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-md transition text-left"
                  aria-label={`Δες προφίλ ${w.name}`}
                >
                  {w.photo ? (
                    <img
                      src={w.photo}
                      alt=""
                      loading="lazy"
                      className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 rounded-full object-cover ring-1 ring-gray-100"
                    />
                  ) : (
                    <div
                      className={`flex h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 items-center justify-center rounded-full font-bold text-lg ${w.avatarColor}`}
                      aria-hidden="true"
                    >
                      {w.initials}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 truncate">{w.name}</p>
                      {w.verified && (
                        <span className="text-blue-600 text-xs font-semibold" title="Επαληθευμένος">
                          ✓ Επαληθευμένος
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 truncate">
                      <span className="font-semibold">{w.role}</span> · {w.city}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{expLabel(w.experienceYears)}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="hidden sm:inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">
                      Δες προφίλ →
                    </span>
                    <span className="sm:hidden text-gray-400 text-2xl leading-none">›</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </FilteredListLayout>

      {/* ── Worker detail (anonymized, no contact info) ── */}
      <DetailModal open={!!selected} onClose={() => setSelected(null)} labelledBy="worker-detail-name">
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
              {selected.photo ? (
                <img src={selected.photo} alt="" className="h-20 w-20 flex-shrink-0 rounded-full object-cover ring-1 ring-gray-100" />
              ) : (
                <div className={`flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full text-2xl font-bold ${selected.avatarColor}`}>
                  {selected.initials}
                </div>
              )}
              <div className="min-w-0">
                <h3 id="worker-detail-name" className="text-xl font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                  {selected.name}
                  {selected.verified && (
                    <span className="text-blue-600 text-xs font-semibold">✓ Επαληθευμένος</span>
                  )}
                </h3>
                <p className="text-sm text-gray-600 mt-0.5">{selected.role} · {selected.city}</p>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">Εμπειρία</dt>
                <dd className="text-sm font-semibold text-gray-900">{expLabel(selected.experienceYears)}</dd>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">Περιοχή</dt>
                <dd className="text-sm font-semibold text-gray-900">{selected.city}</dd>
              </div>
              {selected.availability && (
                <div className="rounded-xl bg-gray-50 p-3">
                  <dt className="text-xs text-gray-500">Διαθεσιμότητα</dt>
                  <dd className="text-sm font-semibold text-gray-900">
                    {AVAILABILITY_LABELS[selected.availability] ?? selected.availability}
                  </dd>
                </div>
              )}
              <div className="rounded-xl bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">Κατάσταση</dt>
                <dd className="text-sm font-semibold text-gray-900">
                  {selected.verified ? 'Επαληθευμένος' : 'Ενεργός'}
                </dd>
              </div>
            </dl>

            {selected.roles && selected.roles.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-1.5">Ειδικότητες</p>
                <div className="flex flex-wrap gap-2">
                  {selected.roles.map((r) => (
                    <span key={r} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{r}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-600">
                🔒 Στοιχεία επικοινωνίας &amp; πλήρες προφίλ διαθέσιμα μετά την εγγραφή
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setGateContext({ workerId: selected.id });
                setGateOpen(true);
              }}
              className="mt-4 w-full rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow transition"
            >
              Σύνδεση / Εγγραφή για επικοινωνία
            </button>

            {!String(selected.id).startsWith('sample-') && (
              <Link
                href={`/workers/${selected.id}`}
                className="mt-2 block text-center text-xs text-gray-500 hover:text-blue-600"
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
        role="business"
        action="profile"
        redirectAfter={
          gateContext
            ? `/dashboard/discover?focus=${encodeURIComponent(gateContext.workerId)}`
            : '/dashboard'
        }
      />
    </>
  );
}
