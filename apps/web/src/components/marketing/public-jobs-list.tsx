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
import { ShareJob } from '@/components/share-job';
import { useT, useLocale } from '@/i18n/locale-provider';
import { roleLabelFor, employmentLabelFor } from '@/i18n/labels';
import { translate, type Locale } from '@/i18n';

/**
 * Ετικέτα ομάδας ειδικοτήτων (π.χ. «Τουρισμός - Ξενοδοχεία») στη γλώσσα του
 * επισκέπτη. Δεν υπάρχει έτοιμο helper στο i18n/labels.ts για ομάδες — μόνο
 * για μεμονωμένες ειδικότητες — οπότε το ίδιο μικρό fallback-lookup γίνεται
 * εδώ, πάνω στο namespace `roleGroups` του labels.json.
 */
function roleGroupLabel(locale: Locale, id: string, fallback: string): string {
  if (locale === 'el') return fallback;
  const key = `roleGroups.${id}`;
  const v = translate(locale, key);
  return v === key ? fallback : v;
}

type Job = {
  id: string;
  title: string;
  company: string;
  city: string;
  region?: string;
  /** Πόλη + περιοχή, όπως τα έγραψε η επιχείρηση — μόνο για τα φίλτρα. */
  locationRaw: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: string;
  employmentType: string;
  housingProvided: boolean;
  mealsProvided: boolean;
  postedAgo: string;
  createdAtMs: number;
  /** Πληρωμένη προώθηση σε ισχύ. Ανεβαίνει πάνω και παίρνει ετικέτα. */
  boosted: boolean;
  logo: string | null;
  description?: string;
  /** Ετικέτες ειδικοτήτων στα ελληνικά (για εμφάνιση). */
  roles?: string[];
  /** Τα κλειδιά των ειδικοτήτων (για τα φίλτρα). */
  roleKeys: string[];
};

type TFn = (key: string, params?: Record<string, string | number>) => string;

function salaryStr(j: Job, t: TFn): string {
  // Η μονάδα ακολουθεί το salary_type της αγγελίας (ώρα / ημέρα / μήνα)
  const unit =
    j.salaryType === 'hourly' ? t('lists.jobs.perHour') :
    j.salaryType === 'daily' ? t('lists.jobs.perDay') :
    j.salaryType === 'monthly' ? t('lists.jobs.perMonth') : '€';
  if (j.salaryMin && j.salaryMax) return `${j.salaryMin}-${j.salaryMax}${unit}`;
  if (j.salaryMin) return t('lists.jobs.salaryFrom', { value: `${j.salaryMin}${unit}` });
  if (j.salaryMax) return t('lists.jobs.salaryTo', { value: `${j.salaryMax}${unit}` });
  return '—';
}

// Χρώμα μισθού ανά κλιμάκιο (μόνο για μηνιαίες αγγελίες, ώστε να μη
// συγκρίνουμε €/ώρα με €/μήνα).
/**
 * Πόσο καιρό μετράει μια αγγελία ως «νέα».
 *
 * Η λίστα ήταν ήδη ταξινομημένη με τις νεότερες πρώτες — απλώς δεν φαινόταν.
 * Η ετικέτα το κάνει ορατό: ο επισκέπτης που ξαναμπαίνει βλέπει αμέσως τι
 * άλλαξε από την τελευταία φορά.
 *
 * ΓΙΑΤΙ ΟΧΙ «Ο ΚΑΛΥΤΕΡΟΣ ΜΙΣΘΟΣ» για την κορυφή: οι αγγελίες έχουν ανάμεικτους
 * τύπους αμοιβής (μηνιαίο, ημερήσιο, ωρομίσθιο). Για να τις συγκρίνουμε θα
 * έπρεπε να μαντέψουμε πόσες μέρες και ώρες δουλεύει κανείς — και μια λάθος
 * μαντεψιά θα έβαζε στην κορυφή μέτρια θέση με ταμπέλα «καλύτερα αμειβόμενη».
 * Το «νέο» δεν μαντεύει τίποτα και ανανεώνεται μόνο του.
 */
const NEW_FOR_MS = 48 * 60 * 60 * 1000;

function isNew(j: Job): boolean {
  return j.createdAtMs > 0 && Date.now() - j.createdAtMs < NEW_FOR_MS;
}

function salaryColor(j: Job): string {
  if (j.salaryType !== 'monthly') return 'text-gray-900';
  const v = j.salaryMax ?? j.salaryMin ?? 0;
  if (v >= 3000) return 'text-orange-600';
  if (v >= 1500) return 'text-emerald-600';
  return 'text-gray-900';
}

function timeAgoLabel(dateStr: string | null, locale: Locale): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (Number.isNaN(diff) || diff < 0) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return translate(locale, 'lists.jobs.justNow');
  if (mins < 60) return translate(locale, 'lists.jobs.minutesAgo', { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return translate(locale, 'lists.jobs.hoursAgo', { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return translate(locale, 'lists.jobs.daysAgo', { n: days });
  const months = Math.floor(days / 30);
  return translate(locale, 'lists.jobs.monthsAgo', { n: months });
}

// Κανονικοποίηση κειμένου για αναζήτηση (πεζά + χωρίς τόνους) — κοινή με τα φίλτρα
const norm = normText;

const EMPTY_SEL: Record<string, string[]> = { city: [], type: [], role: [], perks: [] };

export function PublicJobsList() {
  const t = useT();
  const { locale } = useLocale();
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
    fetch(`${API_URL}/public/jobs?limit=200`, { signal: controller.signal, headers: { 'X-Locale': locale } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { success: boolean; data: any[] }) => {
        if (!active) return;
        const raw = Array.isArray(d?.data) ? d.data : [];
        if (raw.length === 0) { setItems([]); return; } // κανένα fake — μένει άδειο
        setItems(
          raw.map((j: any, i: number) => {
            const roleKeys: string[] = Array.isArray(j.roles) ? j.roles.filter(Boolean) : [];
            return {
            id: String(j.id ?? `rj_${i}`),
            title: j.title || t('lists.jobs.fallbackTitle'),
            company: j.display_company_name || j.company_name || t('lists.jobs.fallbackCompany'),
            // Χωρίς δηλωμένη περιοχή μένει κενό — δεν βάζουμε «Ελλάδα», που
            // θα εμφανιζόταν στα φίλτρα σαν πόλη και θα χάλαγε τις μετρήσεις.
            city: (j.city || j.region || '').trim(),
            region: (j.region || '').trim() || undefined,
            locationRaw: [j.city, j.region].filter(Boolean).map((s: string) => s.trim()).join(', '),
            salaryMin: j.salary_min ?? null,
            salaryMax: j.salary_max ?? null,
            salaryType: j.salary_type || 'monthly',
            employmentType: j.employment_type || 'full_time',
            housingProvided: !!j.housing_provided,
            mealsProvided: !!j.meals_provided,
            postedAgo: timeAgoLabel(j.created_at ?? null, locale),
            createdAtMs: j.created_at ? new Date(j.created_at).getTime() : 0,
            boosted: !!j.is_boosted,
            logo: j.company_logo || null,
            description: typeof j.description === 'string' && j.description.trim() ? j.description.trim() : undefined,
            roleKeys,
            roles: roleKeys.length ? roleKeys.map((rk) => roleLabelFor(locale, rk)) : undefined,
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
  // Πόλη → περιοχές, με κανονικοποίηση: «Θεσσαλονίκη», «θεσσαλονικη» και
  // «Thessaloniki» γίνονται ΜΙΑ επιλογή, οι διευθύνσεις και το «Greece» φεύγουν.
  const cityCategories = useMemo<FilterCategory[]>(
    () => buildCityCategories(items.map((j) => ({ location: j.locationRaw, region: j.region }))),
    [items],
  );

  const typeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const j of items) counts.set(j.employmentType, (counts.get(j.employmentType) || 0) + 1);
    return Array.from(counts.entries())
      .map(([v, c]) => ({ value: v, label: employmentLabelFor(locale, v), count: c }))
      .sort((a, b) => b.count - a.count);
  }, [items, locale]);

  // Ειδικότητες στις 24 κατηγορίες του κεντρικού καταλόγου (ίδια σειρά με το
  // /categories), όλες γραμμένες στα ελληνικά.
  const roleCategories = useMemo<FilterCategory[]>(() => {
    const counts = new Map<string, number>();
    for (const j of items) for (const k of j.roleKeys) counts.set(k, (counts.get(k) || 0) + 1);
    return WORKER_JOB_ROLE_GROUPS.map((g) => {
      const roleSet = new Set(g.roles);
      return {
        id: g.id,
        label: roleGroupLabel(locale, g.id, g.label),
        count: items.filter((j) => j.roleKeys.some((k) => roleSet.has(k))).length,
        options: g.roles.map((role) => ({
          value: role,
          label: roleLabelFor(locale, role),
          count: counts.get(role) || 0,
        })),
      };
    });
  }, [items, locale]);

  const perksOptions = useMemo(
    () => [
      { value: 'housing', label: `🏠 ${t('lists.jobs.housing')}`, count: items.filter((j) => j.housingProvided).length },
      { value: 'meals', label: `🍽️ ${t('lists.jobs.meals')}`, count: items.filter((j) => j.mealsProvided).length },
    ],
    [items, t],
  );

  const groups: FilterGroup[] = useMemo(
    () =>
      [
        { key: 'role', title: t('lists.jobs.specialties'), options: [], categorized: roleCategories },
        {
          key: 'city',
          title: t('lists.cities'),
          options: [],
          categorized: cityCategories,
          categorizedSearchPlaceholder: t('lists.citySearchPlaceholder'),
          categorizedSelectAllLabel: t('lists.wholeCity'),
        },
        { key: 'type', title: t('lists.jobs.employmentType'), options: typeOptions },
        { key: 'perks', title: t('lists.jobs.perks'), options: perksOptions },
      ].filter((g) => g.options.length > 0 || (g.categorized?.length ?? 0) > 0),
    [cityCategories, typeOptions, roleCategories, perksOptions, t],
  );

  const filtered = useMemo(() => {
    const q = norm(query);
    return items
      .filter((j) => {
        if (q) {
          const hay = `${j.title} ${j.company} ${j.locationRaw} ${(j.roles ?? []).join(' ')}`;
          if (!norm(hay).includes(q)) return false;
        }
        // Οι τιμές του φίλτρου πόλης είναι κανονικά ονόματα πόλης ή περιοχής.
        if (!matchesCitySelection({ location: j.locationRaw, region: j.region }, sel.city ?? [])) return false;
        if ((sel.type ?? []).length && !sel.type!.includes(j.employmentType)) return false;
        // Οι τιμές του φίλτρου ειδικότητας είναι κλειδιά καταλόγου («waiter»).
        if ((sel.role ?? []).length && !j.roleKeys.some((k) => sel.role!.includes(k))) return false;
        if ((sel.perks ?? []).includes('housing') && !j.housingProvided) return false;
        if ((sel.perks ?? []).includes('meals') && !j.mealsProvided) return false;
        return true;
      })
      /*
        Η ΠΡΟΩΘΗΜΕΝΗ ΠΡΩΤΗ — ΑΛΛΙΩΣ Η ΠΛΗΡΩΜΗ ΔΕΝ ΑΓΟΡΑΖΕΙ ΤΙΠΟΤΑ.

        Εδώ ήταν σκέτη ταξινόμηση κατά ημερομηνία, που έσβηνε ΚΑΙ τη σειρά που
        έστελνε ο server. Η επιχείρηση πλήρωνε για 7 μέρες προβολής και η
        αγγελία της καθόταν στη θέση της ημερομηνίας της, σε αυτή ακριβώς τη
        σελίδα που τη βλέπουν όλοι οι επισκέπτες χωρίς λογαριασμό.

        Μέσα στην ίδια ομάδα κρατάμε την ημερομηνία, ώστε μια παλιά πληρωμένη
        αγγελία να μη σκεπάζει μόνιμα τις καινούριες.
      */
      .sort((a, b) =>
        a.boosted === b.boosted
          ? b.createdAtMs - a.createdAtMs
          : (b.boosted ? 1 : 0) - (a.boosted ? 1 : 0)
      );
  }, [items, query, sel]);

  // Όλα από τις ΠΡΑΓΜΑΤΙΚΕΣ αγγελίες. Ο μέσος μισθός υπολογίζεται μόνο από
  // μηνιαίες αγγελίες — αλλιώς θα ανακατεύαμε €/ώρα με €/μήνα και το νούμερο
  // θα ήταν ψέμα.
  const bandStats = useMemo(() => {
    const out: { label: string; value: string; color: string }[] = [];
    const dayAgo = Date.now() - 86_400_000;
    const fresh = items.filter((j) => j.createdAtMs > dayAgo).length;
    const monthly = items.filter((j) => j.salaryType === 'monthly' && (j.salaryMin || j.salaryMax));
    // Μετράει ΠΟΛΕΙΣ, όχι γραφές: «Αθήνα», «Αθηνα» και «Athens » είναι μία.
    const cities = new Set(
      items.map((j) => norm(splitLocation(j.locationRaw).city)).filter(Boolean),
    ).size;
    if (fresh > 0) out.push({ label: t('lists.jobs.newToday'), value: String(fresh), color: 'text-emerald-600' });
    if (monthly.length > 0) {
      const avg =
        monthly.reduce((s, j) => s + (j.salaryMin && j.salaryMax ? (j.salaryMin + j.salaryMax) / 2 : (j.salaryMin ?? j.salaryMax ?? 0)), 0) /
        monthly.length;
      out.push({
        label: t('lists.jobs.avgMonthly'),
        value: `${Math.round(avg).toLocaleString(locale === 'en' ? 'en-GB' : 'el-GR')}€`,
        color: 'text-orange-600',
      });
    }
    if (cities > 0) out.push({ label: t('lists.jobs.areas'), value: String(cities), color: 'text-cyan-600' });
    return out;
  }, [items, t, locale]);

  // Στοίβα λογοτύπων: πραγματικές επιχειρήσεις από τα πρώτα αποτελέσματα.
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
        accent="emerald"
        search={query}
        onSearch={setQuery}
        searchPlaceholder={t('lists.jobs.searchPlaceholder')}
        groups={groups}
        selected={sel}
        onToggle={toggle}
        onToggleMany={toggleMany}
        onClear={clearFilters}
        resultCount={filtered.length}
        resultNoun={[t('lists.jobs.resultOne'), t('lists.jobs.resultMany')]}
      >
        {/* Ίδια δομή με το δείγμα, τίμιο κείμενο: μετράμε τις πραγματικές αγγελίες. */}
        {stack.length > 0 && (
          <div className="mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 p-5 text-white shadow-lg">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-white/90">
              🆕 {t('lists.jobs.openPositions')}
            </p>
            <p className="mt-1 text-lg font-black leading-tight">{t('lists.jobs.businessesLooking')}</p>
            <p className="mt-0.5 text-sm text-white/80">
              {filtered.length === 1
                ? t('lists.jobs.activeOne')
                : t('lists.jobs.activeMany', { n: filtered.length })}
            </p>
            <div className="mt-3 flex -space-x-3">
              {stack.map((j) =>
                j.logo ? (
                  <img
                    key={j.id}
                    src={j.logo}
                    alt=""
                    loading="lazy"
                    className="h-10 w-10 rounded-full border-2 border-white/90 object-cover"
                  />
                ) : (
                  <div
                    key={j.id}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/90 bg-white/20 text-xs font-bold backdrop-blur"
                    aria-hidden="true"
                  >
                    {(j.company[0] ?? '?').toUpperCase()}
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
            <p className="text-gray-600 font-medium">{t('lists.jobs.noResults')}</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              {t('lists.clearFilters')}
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((j) => (
              <li key={j.id}>
                {/*
                  ΟΨΗ ΚΑΡΤΑΣ — από τη μακέτα app2/version4/browse/jobs.
                  Άλλαξε ΜΟΝΟ η εμφάνιση. Το άνοιγμα της αγγελίας, τα φίλτρα,
                  η αναζήτηση και τα δεδομένα μένουν ακριβώς όπως ήταν.
                */}
                <button
                  type="button"
                  onClick={() => setSelected(j)}
                  className={`w-full rounded-2xl bg-white p-4 text-left transition hover:border-emerald-300 hover:shadow-md active:scale-[0.99] ${
                    isNew(j)
                      ? 'border-2 border-emerald-500/60 shadow-md'
                      : 'border border-gray-100 shadow-sm'
                  }`}
                  aria-label={t('lists.jobs.ariaSeeJob', { title: j.title, company: j.company })}
                >
                  <div className="flex gap-3">
                    {j.logo ? (
                      <img
                        src={j.logo}
                        alt=""
                        loading="lazy"
                        className="h-14 w-14 flex-shrink-0 rounded-xl object-cover ring-1 ring-gray-100"
                      />
                    ) : (
                      <div
                        className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 text-xl font-bold text-blue-700"
                        aria-hidden="true"
                      >
                        {j.company?.[0]?.toUpperCase() || '💼'}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p className="min-w-0 flex-1 truncate font-bold text-gray-900">{j.title}</p>
                        {j.boosted && (
                          <span className="mt-0.5 flex-shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            {t('lists.jobs.boosted')}
                          </span>
                        )}
                        {isNew(j) && (
                          <span className="mt-0.5 flex-shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            {t('lists.jobs.new')}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-gray-500">{j.company}</p>

                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        {j.city && <span>📍 {j.city}</span>}
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold">
                          {employmentLabelFor(locale, j.employmentType)}
                        </span>
                        <span className="text-gray-400">{j.postedAgo}</span>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className={`text-base font-extrabold ${salaryColor(j)}`}>
                          💰 {salaryStr(j, t)}
                        </span>
                        <span className="flex-shrink-0 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white">
                          {t('lists.jobs.seeJob')}
                        </span>
                      </div>

                      {(j.housingProvided || j.mealsProvided) && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {j.housingProvided && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              🏠 {t('lists.jobs.housing')}
                            </span>
                          )}
                          {j.mealsProvided && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              🍽️ {t('lists.jobs.meals')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
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
              aria-label={t('lists.close')}
              className="float-right -mt-1 text-gray-400 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>

            <div className="flex items-center gap-4">
              {selected.logo ? (
                <img src={selected.logo} alt="" className="h-20 w-20 flex-shrink-0 rounded-2xl object-cover ring-1 ring-gray-100" />
              ) : (
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xs text-center px-1 leading-tight">
                  {employmentLabelFor(locale, selected.employmentType)}
                </div>
              )}
              <div className="min-w-0">
                <h3 id="job-detail-title" className="text-xl font-bold text-gray-900">{selected.title}</h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  {selected.company}
                  {selected.city && <> · {selected.city}</>}
                </p>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">{t('lists.jobs.salaryLabel')}</dt>
                <dd className="text-sm font-semibold text-gray-900">{salaryStr(selected, t)}</dd>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">{t('lists.jobs.typeLabel')}</dt>
                <dd className="text-sm font-semibold text-gray-900">{employmentLabelFor(locale, selected.employmentType)}</dd>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">{t('lists.jobs.housing')}</dt>
                <dd className="text-sm font-semibold text-gray-900">{selected.housingProvided ? `🏠 ${t('lists.jobs.yes')}` : '—'}</dd>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">{t('lists.jobs.meals')}</dt>
                <dd className="text-sm font-semibold text-gray-900">{selected.mealsProvided ? `🍽️ ${t('lists.jobs.yes')}` : '—'}</dd>
              </div>
            </dl>

            {selected.roles && selected.roles.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-1.5">{t('lists.jobs.specialties')}</p>
                <div className="flex flex-wrap gap-2">
                  {selected.roles.map((r) => (
                    <span key={r} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{r}</span>
                  ))}
                </div>
              </div>
            )}

            {selected.description && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-1.5">{t('lists.jobs.descriptionLabel')}</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{selected.description}</p>
              </div>
            )}

            <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-600">🔒 {t('lists.jobs.contactLocked')}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setGateContext({ jobId: selected.id });
                setGateOpen(true);
              }}
              className="mt-4 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow transition"
            >
              {t('lists.jobs.loginToApply')}
            </button>

            {/*
              Η κοινοποίηση δεν απαιτεί λογαριασμό: ο επισκέπτης μπορεί να στείλει
              την αγγελία σε φίλο ή στο Facebook χωρίς να κάνει εγγραφή. Δεν
              εμφανίζεται στα δείγματα, γιατί αυτά δεν έχουν δημόσια σελίδα.
            */}
            {!String(selected.id).startsWith('sample-') && (
              <>
                <div className="mt-3">
                  <ShareJob
                    jobId={selected.id}
                    jobTitle={selected.title}
                    dropUp
                    fullWidth
                  />
                </div>

                <Link
                  href={`/jobs/${selected.id}`}
                  className="mt-2 block text-center text-xs text-gray-500 hover:text-emerald-600"
                >
                  {t('lists.jobs.openSeparatePage')}
                </Link>
              </>
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
