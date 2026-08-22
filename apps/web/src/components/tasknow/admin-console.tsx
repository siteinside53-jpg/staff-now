'use client';

import { useMemo, useState } from 'react';
import {
  ADMIN_CONSENTS,
  ADMIN_REPORTS,
  type AdminReport,
} from './admin-data';
import { CATEGORIES, CATEGORY_BY_KEY, isLicensedCategory, levelFor } from './data';
import {
  allLicences,
  deleteTask,
  isOpen,
  resetMock,
  resolveDispute,
  setBlockedWords,
  setLicenceVerified,
  setTaskHidden,
  useMockTasks,
  type MockTask,
} from './mock-store';

/**
 * ΜΑΚΕΤΑ — το διαχειριστικό του TaskNow.
 *
 * ΤΙ ΕΙΝΑΙ ΑΛΗΘΙΝΟ: οι μικροδουλειές, οι προσφορές και οι άδειες είναι ΟΙ ΙΔΙΕΣ
 * με αυτές της δημόσιας ροής. Ό,τι κρύψεις εδώ εξαφανίζεται από τη ροή· ό,τι
 * άδεια εγκρίνεις εδώ αλλάζει από «δηλωμένη» σε «ελεγμένη» στην καρτέλα του
 * χρήστη. Η επίδειξη είναι πλήρης κύκλος.
 *
 * ΤΙ ΕΙΝΑΙ ΠΑΡΑΔΕΙΓΜΑ: οι αναφορές και οι καταγραφές συναινέσεων — δεν
 * υπάρχει ακόμη σύστημα που να τις παράγει.
 *
 * Καμία κλήση στο API· τίποτα δεν αγγίζει πραγματικά δεδομένα.
 */

type Tab =
  | 'overview'
  | 'tasks'
  | 'offers'
  | 'licences'
  | 'disputes'
  | 'reports'
  | 'consents'
  | 'settings';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Επισκόπηση', icon: '📊' },
  { key: 'tasks', label: 'Μικροδουλειές', icon: '🧾' },
  { key: 'offers', label: 'Προσφορές', icon: '🙋' },
  { key: 'licences', label: 'Άδειες', icon: '📄' },
  { key: 'disputes', label: 'Διαφωνίες', icon: '⚖️' },
  { key: 'reports', label: 'Αναφορές', icon: '🚨' },
  { key: 'consents', label: 'Δηλώσεις & όροι', icon: '🔏' },
  { key: 'settings', label: 'Ρυθμίσεις', icon: '⚙️' },
];

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={'rounded-2xl border border-gray-200 bg-white ' + className}>{children}</div>
  );
}

function Kpi({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'warn' | 'good' }) {
  const toneClass =
    tone === 'warn' ? 'text-red-600' : tone === 'good' ? 'text-emerald-600' : 'text-gray-900';
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={'mt-1 text-2xl font-bold tracking-tight ' + toneClass}>{value}</p>
    </Card>
  );
}

function Pill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={'rounded-full px-2.5 py-1 text-xs font-medium ' + className}>{children}</span>
  );
}

function statusPill(t: MockTask) {
  if (t.hidden) return <Pill className="bg-gray-200 text-gray-700">Κρυμμένη</Pill>;
  if (t.status === 'disputed') return <Pill className="bg-red-50 text-red-700">Σε διαφωνία</Pill>;
  if (t.status === 'cancelled') return <Pill className="bg-gray-100 text-gray-500">Ακυρώθηκε</Pill>;
  if (t.status === 'paused') return <Pill className="bg-gray-100 text-gray-600">Σε παύση</Pill>;
  if (t.status === 'assigned') return <Pill className="bg-blue-50 text-blue-700">Ανατέθηκε</Pill>;
  if (t.status === 'done') return <Pill className="bg-emerald-50 text-emerald-700">Ολοκληρώθηκε</Pill>;
  return <Pill className="bg-amber-50 text-amber-700">Ανοιχτή</Pill>;
}

export function TaskNowAdminConsole() {
  const state = useMockTasks();
  const [tab, setTab] = useState<Tab>('overview');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'hidden' | 'flagged'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [reports, setReports] = useState<AdminReport[]>(ADMIN_REPORTS);

  // Ρυθμίσεις — τοπική κατάσταση μακέτας
  const [enabled, setEnabled] = useState(true);
  const [city, setCity] = useState('Θεσσαλονίκη');
  const [idThreshold, setIdThreshold] = useState('200');
  const [defaultRadius, setDefaultRadius] = useState('5');

  const [openCategories, setOpenCategories] = useState<string[]>(CATEGORIES.map((c) => c.key));
  const [wordsDraft, setWordsDraft] = useState(state.blockedWords.join(', '));

  const licences = useMemo(() => allLicences(state), [state]);
  const pendingLicences = licences.filter((l) => !l.offer.licence?.verified);
  const openReports = reports.filter((r) => r.open);
  const disputes = state.tasks.filter((t) => t.status === 'disputed');
  const flagged = state.tasks.filter((t) => t.flagReason || t.hidden);

  const allOffers = useMemo(
    () => state.tasks.flatMap((t) => t.offersList.map((o) => ({ task: t, offer: o }))),
    [state],
  );

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.tasks.filter((t) => {
      if (statusFilter === 'open' && (t.hidden || t.status !== 'open')) return false;
      if (statusFilter === 'hidden' && !t.hidden) return false;
      if (statusFilter === 'flagged' && !t.flagReason) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.area.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    });
  }, [state, query, statusFilter]);

  const gmv = state.tasks
    .filter((t) => t.status === 'done')
    .reduce((sum, t) => sum + t.budget, 0);

  function toggleCategory(key: string) {
    setOpenCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3">
        <p className="text-sm text-amber-900">
          <strong className="font-bold">ΜΑΚΕΤΑ.</strong> Οι μικροδουλειές, οι προσφορές
          και οι άδειες είναι κοινές με τη δημόσια ροή της μακέτας — ό,τι αλλάξεις εδώ
          φαίνεται εκεί. Οι αναφορές και οι καταγραφές συναινέσεων είναι παραδείγματα.
          Τίποτα δεν αγγίζει πραγματικά δεδομένα.
        </p>
      </div>

      {/* Καρτέλες */}
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="flex w-max items-center gap-1.5">
          {TABS.map((t) => {
            const badge =
              t.key === 'licences'
                ? pendingLicences.length
                : t.key === 'reports'
                  ? openReports.length
                  : t.key === 'disputes'
                    ? disputes.length
                    : 0;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-pressed={tab === t.key}
                className={
                  'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ' +
                  (tab === t.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:text-gray-900')
                }
              >
                <span aria-hidden="true">{t.icon}</span>
                {t.label}
                {badge > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Επισκόπηση ── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Ανοιχτές μικροδουλειές" value={String(state.tasks.filter(isOpen).length)} />
            <Kpi label="Προσφορές συνολικά" value={String(allOffers.length)} />
            <Kpi label="Ολοκληρωμένες" value={String(state.tasks.filter((t) => t.status === 'done').length)} tone="good" />
            <Kpi label="Αξία ολοκληρωμένων" value={`${gmv}€`} />
          </div>

          <Card className="p-5">
            <h3 className="text-sm font-bold text-gray-900">Θέλουν την προσοχή σου</h3>
            <div className="mt-3 space-y-2">
              {pendingLicences.length === 0 &&
                openReports.length === 0 &&
                disputes.length === 0 &&
                flagged.length === 0 && (
                  <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    ✓ Τίποτα σε εκκρεμότητα.
                  </p>
                )}

              {disputes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTab('disputes')}
                  className="flex w-full items-center justify-between rounded-xl bg-red-50 px-4 py-3 text-left transition hover:bg-red-100"
                >
                  <span className="text-sm text-red-900">
                    <strong>{disputes.length}</strong> δουλειές σε διαφωνία
                  </span>
                  <span className="text-sm font-semibold text-red-700">Δες τες →</span>
                </button>
              )}

              {pendingLicences.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTab('licences')}
                  className="flex w-full items-center justify-between rounded-xl bg-amber-50 px-4 py-3 text-left transition hover:bg-amber-100"
                >
                  <span className="text-sm text-amber-900">
                    <strong>{pendingLicences.length}</strong> άδειες δηλωμένες, χωρίς έλεγχο
                  </span>
                  <span className="text-sm font-semibold text-amber-700">Έλεγξέ τες →</span>
                </button>
              )}

              {openReports.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTab('reports')}
                  className="flex w-full items-center justify-between rounded-xl bg-red-50 px-4 py-3 text-left transition hover:bg-red-100"
                >
                  <span className="text-sm text-red-900">
                    <strong>{openReports.length}</strong> ανοιχτές αναφορές
                  </span>
                  <span className="text-sm font-semibold text-red-700">Δες τες →</span>
                </button>
              )}

              {flagged.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('flagged');
                    setTab('tasks');
                  }}
                  className="flex w-full items-center justify-between rounded-xl bg-gray-100 px-4 py-3 text-left transition hover:bg-gray-200"
                >
                  <span className="text-sm text-gray-800">
                    <strong>{flagged.length}</strong> μικροδουλειές σημαδεμένες ή κρυμμένες
                  </span>
                  <span className="text-sm font-semibold text-gray-700">Δες τες →</span>
                </button>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-bold text-gray-900">Ανά κατηγορία</h3>
            <div className="mt-3 space-y-2">
              {CATEGORIES.map((c) => {
                const count = state.tasks.filter((t) => t.category === c.key && isOpen(t)).length;
                const max = Math.max(
                  1,
                  ...CATEGORIES.map(
                    (x) => state.tasks.filter((t) => t.category === x.key && isOpen(t)).length,
                  ),
                );
                return (
                  <div key={c.key} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 text-xs text-gray-600">
                      {c.icon} {c.label}
                      {c.licensed && <span className="ml-1 text-[10px] text-red-600">άδεια</span>}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-xs font-semibold text-gray-900">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── Μικροδουλειές ── */}
      {tab === 'tasks' && (
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Αναζήτηση σε τίτλο, περιοχή ή κωδικό…"
              className="min-w-[220px] flex-1 rounded-xl border border-gray-300 px-3.5 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
            <div className="flex items-center gap-1.5">
              {(
                [
                  ['all', 'Όλες'],
                  ['open', 'Ανοιχτές'],
                  ['hidden', 'Κρυμμένες'],
                  ['flagged', 'Σημαδεμένες'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  aria-pressed={statusFilter === key}
                  className={
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition ' +
                    (statusFilter === key
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-gray-500">Τίποτα εδώ.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTasks.map((t) => {
                const cat = CATEGORY_BY_KEY[t.category];
                return (
                  <div key={t.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] text-gray-400">{t.id}</span>
                          {statusPill(t)}
                          {isLicensedCategory(t.category) && (
                            <Pill className="bg-red-50 text-red-700">θέλει άδεια</Pill>
                          )}
                          {t.mine && <Pill className="bg-blue-50 text-blue-700">από τη μακέτα σου</Pill>}
                        </div>
                        <p className="mt-1.5 text-sm font-semibold text-gray-900">{t.title}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {cat?.icon} {cat?.label} · {t.area} · {t.budget}€ ·{' '}
                          {t.offersList.length} προσφορές · {t.postedAgo}
                        </p>
                        {t.flagReason && (
                          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
                            ⚠ {t.flagReason}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                          className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                        >
                          {expanded === t.id ? 'Κλείσε' : `Προσφορές (${t.offersList.length})`}
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaskHidden(t.id, !t.hidden)}
                          className={
                            'rounded-lg px-3 py-1.5 text-xs font-semibold transition ' +
                            (t.hidden
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200')
                          }
                        >
                          {t.hidden ? 'Επανάφερε' : 'Κρύψε'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(t.id)}
                          className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          Διαγραφή
                        </button>
                      </div>
                    </div>

                    {confirmDelete === t.id && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                        <p className="text-xs text-red-900">
                          Οριστική διαγραφή του «{t.title}»; Στην πραγματική έκδοση μένει
                          ίχνος στο audit log.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              deleteTask(t.id);
                              setConfirmDelete(null);
                            }}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            Ναι, διάγραψε
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(null)}
                            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-300"
                          >
                            Άκυρο
                          </button>
                        </div>
                      </div>
                    )}

                    {expanded === t.id && (
                      <div className="mt-3 space-y-2 rounded-xl bg-gray-50 p-3">
                        {t.offersList.length === 0 ? (
                          <p className="py-2 text-center text-xs text-gray-500">Καμία προσφορά.</p>
                        ) : (
                          t.offersList.map((o) => {
                            const lvl = levelFor(o.completed, o.rating);
                            return (
                              <div
                                key={o.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2"
                              >
                                <span className="text-xs text-gray-700">
                                  <strong className="text-gray-900">{o.name}</strong> · {lvl.icon}{' '}
                                  {lvl.label} · {o.completed} δουλειές
                                  {o.licence && (
                                    <span
                                      className={
                                        'ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold ' +
                                        (o.licence.verified
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-amber-100 text-amber-900')
                                      }
                                    >
                                      {o.licence.verified ? 'άδεια ελεγμένη' : 'άδεια δηλωμένη'}
                                    </span>
                                  )}
                                </span>
                                <span className="text-xs font-bold text-gray-900">{o.amount}€</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── Προσφορές ── */}
      {tab === 'offers' && (
        <Card>
          {allOffers.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-gray-500">Καμία προσφορά ακόμη.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {allOffers.map(({ task, offer }) => {
                const lvl = levelFor(offer.completed, offer.rating);
                return (
                  <div key={offer.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {offer.name}{' '}
                        <span className={'ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ' + lvl.className}>
                          {lvl.icon} {lvl.label}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        για «{task.title}» · {task.area}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900">{offer.amount}€</span>
                      <Pill
                        className={
                          offer.status === 'accepted'
                            ? 'bg-emerald-50 text-emerald-700'
                            : offer.status === 'rejected'
                              ? 'bg-gray-100 text-gray-500'
                              : 'bg-amber-50 text-amber-700'
                        }
                      >
                        {offer.status === 'accepted'
                          ? 'Δεκτή'
                          : offer.status === 'rejected'
                            ? 'Απορρίφθηκε'
                            : 'Σε αναμονή'}
                      </Pill>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── Άδειες ── */}
      {tab === 'licences' && (
        <Card>
          <div className="border-b border-gray-100 p-4">
            <h3 className="text-sm font-bold text-gray-900">Έλεγχος αδειών</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              Μόνο από εδώ γίνεται μια άδεια «ελεγμένη». Μέχρι τότε φαίνεται στους
              χρήστες ως «δηλωμένη» — ποτέ ως εγγύηση της πλατφόρμας.
            </p>
          </div>

          {licences.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-gray-500">
              Δεν έχει ανέβει καμία άδεια.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {licences.map(({ task, offer }) => (
                <div key={offer.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {offer.name} — {offer.licence?.label}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      αρχείο: {offer.licence?.fileName} · για «{task.title}»
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {offer.licence?.verified ? (
                      <>
                        <Pill className="bg-emerald-50 text-emerald-700">✓ Ελεγμένη</Pill>
                        <button
                          type="button"
                          onClick={() => setLicenceVerified(task.id, offer.id, false)}
                          className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                        >
                          Ανάκληση
                        </button>
                      </>
                    ) : (
                      <>
                        <Pill className="bg-amber-100 text-amber-900">Δηλωμένη</Pill>
                        <button
                          type="button"
                          onClick={() => setLicenceVerified(task.id, offer.id, true)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          Την έλεγξα — έγκριση
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Διαφωνίες ── */}
      {tab === 'disputes' && (
        <Card>
          <div className="border-b border-gray-100 p-4">
            <h3 className="text-sm font-bold text-gray-900">Διαφωνίες</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              Δεν κρίνουμε ποιος έχει δίκιο και δεν αποζημιώνουμε — δεν είμαστε
              συμβαλλόμενο μέρος. Κοιτάμε αν παραβιάστηκαν οι όροι, μιλάμε στις δύο
              πλευρές και, αν χρειαστεί, παίρνουμε μέτρα στον λογαριασμό.
            </p>
          </div>

          {disputes.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-gray-500">
              Καμία διαφωνία. Καλό σημάδι.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {disputes.map((t) => {
                const chosen = t.offersList.find((o) => o.id === t.chosenOfferId);
                return (
                  <div key={t.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-gray-400">{t.id}</span>
                          <Pill className="bg-red-50 text-red-700">Σε διαφωνία</Pill>
                        </div>
                        <p className="mt-1.5 text-sm font-semibold text-gray-900">{t.title}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {t.area} · {t.budget}€ · εκτελεστής: {chosen?.name ?? '—'}
                        </p>
                        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-800">
                          <strong>
                            {t.disputeBy === 'owner' ? 'Ο πελάτης' : 'Ο εκτελεστής'} δήλωσε:
                          </strong>{' '}
                          {t.disputeReason}
                        </p>
                        {t.messages.length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs font-medium text-gray-600">
                              Η συνομιλία τους ({t.messages.length} μηνύματα)
                            </summary>
                            <div className="mt-2 space-y-1 rounded-lg bg-gray-50 p-3">
                              {t.messages.map((m) => (
                                <p key={m.id} className="text-xs text-gray-700">
                                  <strong>
                                    {m.from === 'owner' ? 'πελάτης' : 'εκτελεστής'}:
                                  </strong>{' '}
                                  {m.text}
                                </p>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => resolveDispute(t.id)}
                          className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-800"
                        >
                          Λύθηκε — κλείσ' τη
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaskHidden(t.id, true)}
                          className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-200"
                        >
                          Κρύψε τη δουλειά
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── Αναφορές ── */}
      {tab === 'reports' && (
        <Card>
          <div className="divide-y divide-gray-100">
            {reports.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-gray-400">{r.id}</span>
                    {r.open ? (
                      <Pill className="bg-red-50 text-red-700">Ανοιχτή</Pill>
                    ) : (
                      <Pill className="bg-gray-100 text-gray-500">Έκλεισε</Pill>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{r.reason}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {r.target} {r.targetId} · από {r.reporter} · {r.created}
                  </p>
                </div>
                {r.open && (
                  <button
                    type="button"
                    onClick={() =>
                      setReports((prev) =>
                        prev.map((x) => (x.id === r.id ? { ...x, open: false } : x)),
                      )
                    }
                    className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
                  >
                    Σήμανση ως λυμένη
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Δηλώσεις & όροι ── */}
      {tab === 'consents' && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-gray-900">Γιατί κρατάμε αυτά τα στοιχεία</h3>
            <p className="mt-2 text-xs leading-relaxed text-gray-600">
              Είναι το αποδεικτικό ότι η πλατφόρμα δεν αγνόησε τη νομιμότητα: ποιος
              αποδέχτηκε τους όρους, ποιος δήλωσε ότι μπορεί νόμιμα να παρέχει την
              υπηρεσία, πότε και από ποια διεύθυνση. Μια γραμμή στους όρους δεν αρκεί.
              Κρατάμε και την <strong>έκδοση</strong> των όρων, ώστε μια μελλοντική
              αλλαγή κειμένου να μην ακυρώνει παλιές αποδοχές.
            </p>
            <p className="mt-2 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
              <strong>Εκκρεμεί απόφαση:</strong> επειδή δείχνουμε ποσά προσφορών, πιθανόν
              να εμπίπτουμε στην υποχρέωση αναφοράς εισοδημάτων παρόχων (DAC7). Δεν
              κρίνεται από τον κώδικα — θέλει λογιστή. Ο σχεδιασμός κρατάει ιστορικό από
              την αρχή, ώστε να μη ζητηθούν στοιχεία αναδρομικά.
            </p>
          </Card>

          <Card>
            <div className="divide-y divide-gray-100">
              {ADMIN_CONSENTS.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{c.user}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {c.kind} · έκδοση {c.version} · {c.when} · {c.ip}
                    </p>
                  </div>
                  <Pill className="bg-emerald-50 text-emerald-700">καταγράφηκε</Pill>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Ρυθμίσεις ── */}
      {tab === 'settings' && (
        <div className="space-y-4">
          <Card className="p-5">
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="text-sm font-semibold text-gray-900">TaskNow ενεργό</span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  Αν κλείσει, η ενότητα κρύβεται από το μενού και τη δημόσια ροή. Τίποτα
                  άλλο στο StaffNow δεν επηρεάζεται.
                </span>
              </span>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-5 w-5 shrink-0 accent-amber-500"
              />
            </label>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-bold text-gray-900">Περιοχή και όρια</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-medium text-gray-700">Πόλη λειτουργίας</span>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                >
                  <option>Θεσσαλονίκη</option>
                  <option>Αθήνα</option>
                  <option>Όλη η Ελλάδα</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-700">
                  Ταυτότητα πάνω από (€)
                </span>
                <input
                  value={idThreshold}
                  onChange={(e) => setIdThreshold(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-700">
                  Προεπιλεγμένη ακτίνα (χλμ)
                </span>
                <input
                  value={defaultRadius}
                  onChange={(e) => setDefaultRadius(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-bold text-gray-900">Κατηγορίες</h3>
            <p className="mt-1 text-xs text-gray-500">
              Οι σημειωμένες με «άδεια» δέχονται προσφορά μόνο με ανέβασμα άδειας.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const on = openCategories.includes(c.key);
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => toggleCategory(c.key)}
                    aria-pressed={on}
                    className={
                      'rounded-full px-3 py-1.5 text-xs font-medium transition ' +
                      (on
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200')
                    }
                  >
                    {c.icon} {c.label}
                    {c.licensed && <span className="ml-1 text-[10px] opacity-80">άδεια</span>}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-bold text-gray-900">Λέξεις που μπλοκάρουν ανέβασμα</h3>
            <p className="mt-1 text-xs text-gray-500">
              Χωρισμένες με κόμμα. Πιάνουν το ερωτικό/συνοδευτικό περιεχόμενο και τις
              οικονομικές συναλλαγές που δεν είναι υπηρεσίες.
            </p>
            <textarea
              rows={3}
              value={wordsDraft}
              onChange={(e) => setWordsDraft(e.target.value)}
              className="mt-2 w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setBlockedWords(
                    wordsDraft
                      .split(',')
                      .map((w) => w.trim())
                      .filter(Boolean),
                  )
                }
                className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-800"
              >
                Αποθήκευσε τη λίστα
              </button>
              <span className="text-xs text-gray-500">
                Ενεργές τώρα: {state.blockedWords.length} λέξεις — κόβουν το ανέβασμα τη
                στιγμή που πατιέται το κουμπί.
              </span>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-bold text-gray-900">Εργαλεία μακέτας</h3>
            <button
              type="button"
              onClick={resetMock}
              className="mt-3 rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Καθάρισε τη μακέτα και ξεκίνα από την αρχή
            </button>
          </Card>
        </div>
      )}
    </div>
  );
}
