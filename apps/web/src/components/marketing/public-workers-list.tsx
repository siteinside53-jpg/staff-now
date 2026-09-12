'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AuthGatePopup } from './auth-gate-popup';
import { DetailModal } from './detail-modal';
import { FilteredListLayout, type FilterGroup, type FilterCategory } from './filtered-list-layout';
import { BrowseStatBand } from './browse-hero';
import { WORKER_JOB_ROLE_GROUPS } from '@staffnow/config';
import { buildCityCategories, matchesCitySelection, normText, splitLocation } from '@/lib/location';
import { API_URL } from '@/lib/config';
import { useT, useLocale } from '@/i18n/locale-provider';
import { roleLabelFor } from '@/i18n/labels';
import { translate, type Locale } from '@/i18n';

/** Ίδιο μικρό fallback-lookup με το public-jobs-list.tsx — δες εκεί γιατί. */
function roleGroupLabel(locale: Locale, id: string, fallback: string): string {
  if (locale === 'el') return fallback;
  const key = `roleGroups.${id}`;
  const v = translate(locale, key);
  return v === key ? fallback : v;
}

type Worker = {
  id: string;
  name: string;
  role: string;
  city: string;
  /** Πόλη + περιοχή, όπως τα έγραψε ο χρήστης — μόνο για τα φίλτρα. */
  locationRaw: string;
  region?: string;
  experienceYears: number;
  verified: boolean;
  photo: string | null;
  avatarColor: string;
  initials: string;
  availability?: string;
  /** Ετικέτες ειδικοτήτων στα ελληνικά (για εμφάνιση). */
  roles?: string[];
  /** Τα κλειδιά των ειδικοτήτων (για τα φίλτρα). */
  roleKeys: string[];
};

const AVAILABILITY_KEYS: Record<string, string> = {
  immediate: 'lists.workers.availImmediate',
  within_7_days: 'lists.workers.availWithin7',
  seasonal: 'lists.workers.availSeasonal',
  part_time: 'lists.workers.availPartTime',
  full_time: 'lists.workers.availFullTime',
};

function availabilityLabel(value: string | undefined, t: TFn): string {
  if (!value) return '';
  const key = AVAILABILITY_KEYS[value];
  return key ? t(key) : value;
}

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

type TFn = (key: string, params?: Record<string, string | number>) => string;

function displayName(fullName: string, t: TFn): string {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return t('lists.workers.fallbackRole');
  const first = parts[0] ?? '';
  if (parts.length === 1) return first;
  const last = parts[parts.length - 1] ?? '';
  return `${first} ${last.charAt(0).toUpperCase()}.`;
}

/**
 * Μία και μοναδική πηγή για τα ονόματα των ειδικοτήτων: ο κεντρικός κατάλογος
 * (256 ειδικότητες, μεταφρασμένες μέσω useLabels/roleLabelFor). Παλιότερα
 * υπήρχε εδώ ένα τοπικό λεξικό με 24 μόνο εγγραφές, οπότε 57 από τις 70
 * ειδικότητες που δηλώνουν οι χρήστες εμφανίζονταν αυτούσιες στα αγγλικά.
 */
function roleLabel(roleKey: string | undefined, locale: Locale, t: TFn): string {
  if (!roleKey) return t('lists.workers.fallbackRole');
  return roleLabelFor(locale, roleKey);
}

const norm = normText;

function expLabel(years: number, t: TFn): string {
  if (!years || years <= 0) return t('lists.workers.expNew');
  if (years === 1) return t('lists.workers.expOneYear');
  return t('lists.workers.expYears', { n: years });
}

const EXP_BUCKETS: { value: string; labelKey: string; match: (y: number) => boolean }[] = [
  { value: 'jr', labelKey: 'lists.workers.expBucketJr', match: (y) => y <= 2 },
  { value: 'mid', labelKey: 'lists.workers.expBucketMid', match: (y) => y >= 3 && y <= 5 },
  { value: 'sr', labelKey: 'lists.workers.expBucketSr', match: (y) => y >= 6 },
];

const EMPTY_SEL: Record<string, string[]> = { city: [], role: [], exp: [], avail: [] };

export function PublicWorkersList() {
  const t = useT();
  const { locale } = useLocale();
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
            const name = displayName(w.full_name || t('lists.workers.fallbackRole'), t);
            const roleKeys: string[] = Array.isArray(w.roles) ? w.roles.filter(Boolean) : [];
            return {
              id: String(w.user_id ?? `rw_${i}`),
              name,
              role: roleLabel(roleKeys[0], locale, t),
              // Όποιος δεν έχει δηλώσει περιοχή μένει κενός. Παλιότερα έμπαινε
              // «Ελλάδα», που εμφανιζόταν στα φίλτρα σαν να ήταν πόλη και
              // φούσκωνε τον μετρητή «Περιοχές».
              city: (w.city || w.region || '').trim(),
              region: (w.region || '').trim() || undefined,
              locationRaw: [w.city, w.region].filter(Boolean).map((s: string) => s.trim()).join(', '),
              experienceYears: Number(w.years_of_experience ?? 0),
              verified: !!w.verified,
              photo: w.photo_url || null,
              avatarColor: colorFor(String(w.user_id ?? i)),
              initials: initialsFrom(name),
              availability: w.availability || undefined,
              roleKeys,
              roles: roleKeys.length ? roleKeys.map((rk) => roleLabel(rk, locale, t)) : undefined,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  // ── Filter groups ──
  // Πόλη → περιοχές, με κανονικοποίηση: «Αθήνα», «Αθήνα », «Αθηνα» και «Athens»
  // γίνονται ΜΙΑ επιλογή, οι διευθύνσεις και το «Greece» πετιούνται.
  const cityCategories = useMemo<FilterCategory[]>(
    () => buildCityCategories(items.map((w) => ({ location: w.locationRaw, region: w.region }))),
    [items],
  );

  // Ειδικότητες στις 24 κατηγορίες του κεντρικού καταλόγου (ίδια σειρά με το
  // /categories), με ΟΛΕΣ τις ειδικότητες — όχι μόνο την πρώτη κάθε προφίλ.
  const roleCategories = useMemo<FilterCategory[]>(() => {
    const counts = new Map<string, number>();
    for (const w of items) for (const k of w.roleKeys) counts.set(k, (counts.get(k) || 0) + 1);
    return WORKER_JOB_ROLE_GROUPS.map((g) => {
      const roleSet = new Set(g.roles);
      return {
        id: g.id,
        label: roleGroupLabel(locale, g.id, g.label),
        count: items.filter((w) => w.roleKeys.some((k) => roleSet.has(k))).length,
        options: g.roles.map((role) => ({
          value: role,
          label: roleLabel(role, locale, t),
          count: counts.get(role) || 0,
        })),
      };
    });
  }, [items, locale, t]);

  const expOptions = useMemo(
    () =>
      EXP_BUCKETS.map((b) => ({
        value: b.value,
        label: t(b.labelKey),
        count: items.filter((w) => b.match(w.experienceYears)).length,
      })),
    [items, t],
  );

  const availOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of items) if (w.availability) counts.set(w.availability, (counts.get(w.availability) || 0) + 1);
    return Array.from(counts.entries())
      .map(([v, c]) => ({ value: v, label: availabilityLabel(v, t), count: c }))
      .sort((a, b) => b.count - a.count);
  }, [items, t]);

  const groups: FilterGroup[] = useMemo(
    () =>
      [
        { key: 'role', title: t('lists.workers.specialties'), options: [], categorized: roleCategories },
        {
          key: 'city',
          title: t('lists.cities'),
          options: [],
          categorized: cityCategories,
          categorizedSearchPlaceholder: t('lists.citySearchPlaceholder'),
          categorizedSelectAllLabel: t('lists.wholeCity'),
        },
        { key: 'exp', title: t('lists.workers.experienceTitle'), options: expOptions },
        { key: 'avail', title: t('lists.workers.availabilityTitle'), options: availOptions },
      ].filter((g) => g.options.length > 0 || (g.categorized?.length ?? 0) > 0),
    [cityCategories, roleCategories, expOptions, availOptions, t],
  );

  const filtered = useMemo(() => {
    const q = norm(query);
    let list = items.filter((w) => {
      if (q) {
        const hay = `${w.name} ${(w.roles ?? [w.role]).join(' ')} ${w.locationRaw}`;
        if (!norm(hay).includes(q)) return false;
      }
      // Οι τιμές του φίλτρου πόλης είναι κανονικά ονόματα πόλης ή περιοχής,
      // οπότε συγκρίνονται με την κανονικοποιημένη τοποθεσία του προφίλ.
      if (!matchesCitySelection({ location: w.locationRaw, region: w.region }, sel.city ?? [])) return false;
      // Οι τιμές του φίλτρου ειδικότητας είναι κλειδιά καταλόγου (π.χ. «waiter»),
      // και ελέγχονται σε ΟΛΕΣ τις ειδικότητες του προφίλ — όχι μόνο στην πρώτη.
      if ((sel.role ?? []).length && !w.roleKeys.some((k) => sel.role!.includes(k))) return false;
      if ((sel.exp ?? []).length && !sel.exp!.some((b) => EXP_BUCKETS.find((x) => x.value === b)?.match(w.experienceYears))) return false;
      if ((sel.avail ?? []).length && !(w.availability && sel.avail!.includes(w.availability))) return false;
      return true;
    });
    list = [...list].sort((a, b) => (a.verified !== b.verified ? (a.verified ? -1 : 1) : b.experienceYears - a.experienceYears));
    return list;
  }, [items, query, sel]);

  // Όλα τα νούμερα βγαίνουν από τα ΠΡΑΓΜΑΤΙΚΑ προφίλ που μόλις κατέβηκαν.
  // Δεν φουσκώνουμε τίποτα και δεν δείχνουμε νούμερο που δεν υπάρχει.
  const bandStats = useMemo(() => {
    const out: { label: string; value: string; color: string }[] = [];
    const now = items.filter((w) => w.availability === 'immediate').length;
    const ver = items.filter((w) => w.verified).length;
    // Μετράει ΠΟΛΕΙΣ, όχι γραφές: «Αθήνα», «Αθηνα» και «Athens » είναι μία.
    const cities = new Set(
      items.map((w) => norm(splitLocation(w.locationRaw).city)).filter(Boolean),
    ).size;
    if (now > 0) out.push({ label: t('lists.workers.availableNowStat'), value: String(now), color: 'text-emerald-600' });
    if (ver > 0) out.push({ label: t('lists.workers.verifiedStat'), value: String(ver), color: 'text-blue-600' });
    if (cities > 0) out.push({ label: t('lists.workers.areasStat'), value: String(cities), color: 'text-purple-600' });
    return out;
  }, [items, t]);

  // Στοίβα avatar: πραγματικές φωτογραφίες από τα πρώτα αποτελέσματα.
  const stack = useMemo(() => filtered.slice(0, 5), [filtered]);

  function toggle(group: string, value: string) {
    setSel((prev) => {
      const cur = prev[group] ?? [];
      return { ...prev, [group]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] };
    });
  }

  // Επιλογή/αποεπιλογή ολόκληρης κατηγορίας (π.χ. «όλη η Εστίαση»).
  function toggleMany(group: string, values: string[], select: boolean) {
    setSel((prev) => {
      const cur = new Set(prev[group] ?? []);
      if (select) values.forEach((v) => cur.add(v));
      else values.forEach((v) => cur.delete(v));
      return { ...prev, [group]: Array.from(cur) };
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
        searchPlaceholder={t('lists.workers.searchPlaceholder')}
        groups={groups}
        selected={sel}
        onToggle={toggle}
        onToggleMany={toggleMany}
        onClear={clearFilters}
        resultCount={filtered.length}
        resultNoun={[t('lists.workers.resultOne'), t('lists.workers.resultMany')]}
      >
        {/*
          Ίδια δομή με το δείγμα (χρώμα, τίτλος, υπότιτλος, στοίβα avatar) αλλά
          ΤΙΜΙΟ κείμενο: ο επισκέπτης δεν έχει προφίλ, άρα δεν υπάρχουν «matches»
          ούτε «AI». Λέμε απλώς πόσα πραγματικά προφίλ βλέπει.
        */}
        {stack.length > 0 && (
          <div className="mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 p-5 text-white shadow-lg">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-white/90">
              ⚡ {t('lists.workers.availableNowBadge')}
            </p>
            <p className="mt-1 text-lg font-black leading-tight">{t('lists.workers.tagline')}</p>
            <p className="mt-0.5 text-sm text-white/80">
              {filtered.length === 1
                ? t('lists.workers.activeOne')
                : t('lists.workers.activeMany', { n: filtered.length })}
            </p>
            <div className="mt-3 flex -space-x-3">
              {stack.map((w) =>
                w.photo ? (
                  <img
                    key={w.id}
                    src={w.photo}
                    alt=""
                    loading="lazy"
                    className="h-10 w-10 rounded-full border-2 border-white/90 object-cover"
                  />
                ) : (
                  <div
                    key={w.id}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/90 text-xs font-bold ${w.avatarColor}`}
                    aria-hidden="true"
                  >
                    {w.initials}
                  </div>
                ),
              )}
              {filtered.length > stack.length && (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/90 bg-white/20 text-[11px] font-bold backdrop-blur">
                  +{filtered.length - stack.length}
                </div>
              )}
            </div>
          </div>
        )}

        <BrowseStatBand stats={bandStats} />

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <p className="text-gray-600 font-medium">{t('lists.workers.noResults')}</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {t('lists.clearFilters')}
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
                  aria-label={t('lists.workers.ariaSeeProfile', { name: w.name })}
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
                        <span className="text-blue-600 text-xs font-semibold" title={t('lists.workers.verified')}>
                          ✓ {t('lists.workers.verified')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 truncate">
                      <span className="font-semibold">{w.role}</span>
                      {w.city && <> · {w.city}</>}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{expLabel(w.experienceYears, t)}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="hidden sm:inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">
                      {t('lists.workers.seeProfile')}
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
              aria-label={t('lists.close')}
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
                    <span className="text-blue-600 text-xs font-semibold">✓ {t('lists.workers.verified')}</span>
                  )}
                </h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  {selected.role}
                  {selected.city && <> · {selected.city}</>}
                </p>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">{t('lists.workers.experienceTitle')}</dt>
                <dd className="text-sm font-semibold text-gray-900">{expLabel(selected.experienceYears, t)}</dd>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">{t('lists.workers.areaLabel')}</dt>
                <dd className="text-sm font-semibold text-gray-900">
                  {selected.city || <span className="text-gray-400">{t('lists.workers.notDeclared')}</span>}
                </dd>
              </div>
              {selected.availability && (
                <div className="rounded-xl bg-gray-50 p-3">
                  <dt className="text-xs text-gray-500">{t('lists.workers.availabilityTitle')}</dt>
                  <dd className="text-sm font-semibold text-gray-900">
                    {availabilityLabel(selected.availability, t)}
                  </dd>
                </div>
              )}
              <div className="rounded-xl bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">{t('lists.workers.statusLabel')}</dt>
                <dd className="text-sm font-semibold text-gray-900">
                  {selected.verified ? t('lists.workers.verified') : t('lists.workers.active')}
                </dd>
              </div>
            </dl>

            {selected.roles && selected.roles.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-1.5">{t('lists.workers.specialties')}</p>
                <div className="flex flex-wrap gap-2">
                  {selected.roles.map((r) => (
                    <span key={r} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{r}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-600">
                🔒 {t('lists.workers.contactLocked')}
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
              {t('lists.workers.loginToContact')}
            </button>

            {!String(selected.id).startsWith('sample-') && (
              <Link
                href={`/workers/${selected.id}`}
                className="mt-2 block text-center text-xs text-gray-500 hover:text-blue-600"
              >
                {t('lists.jobs.openSeparatePage')}
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
