'use client';

import { useEffect, useMemo, useState } from 'react';

export type FilterOption = { value: string; label: string; count?: number };
export type FilterGroup = {
  key: string;
  title: string;
  options: FilterOption[];
  searchable?: boolean; // εμφανίζει mini-search μέσα στο group (π.χ. πόλεις)
};

type Accent = 'emerald' | 'blue';

type Props = {
  accent: Accent;
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder: string;
  groups: FilterGroup[];
  /** Record<groupKey, επιλεγμένες τιμές[]> */
  selected: Record<string, string[]>;
  onToggle: (groupKey: string, value: string) => void;
  onClear: () => void;
  resultCount: number;
  resultNoun: [string, string]; // [ενικός, πληθυντικός]
  /** Προαιρετικό περιεχόμενο πάνω από τα φίλτρα (desktop sidebar + mobile drawer) — π.χ. tabs */
  sidebarHeader?: React.ReactNode;
  children: React.ReactNode;
};

const ACCENT = {
  emerald: { check: 'accent-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700', text: 'text-emerald-700', ring: 'focus:ring-emerald-100 focus:border-emerald-400' },
  blue: { check: 'accent-blue-600', btn: 'bg-blue-600 hover:bg-blue-700', text: 'text-blue-700', ring: 'focus:ring-blue-100 focus:border-blue-400' },
};

function FilterGroups({
  groups,
  selected,
  onToggle,
  accent,
}: {
  groups: FilterGroup[];
  selected: Record<string, string[]>;
  onToggle: (g: string, v: string) => void;
  accent: Accent;
}) {
  const a = ACCENT[accent];
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.key, true])),
  );
  const [groupSearch, setGroupSearch] = useState<Record<string, string>>({});

  return (
    <div className="space-y-5">
      {groups.map((g) => {
        const isOpen = open[g.key] ?? true;
        const sel = selected[g.key] ?? [];
        const q = (groupSearch[g.key] ?? '').toLowerCase();
        const opts = g.searchable && q
          ? g.options.filter((o) => o.label.toLowerCase().includes(q))
          : g.options;
        return (
          <div key={g.key} className="border-b border-gray-100 pb-4 last:border-0">
            <button
              type="button"
              onClick={() => setOpen((p) => ({ ...p, [g.key]: !isOpen }))}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-sm font-bold text-gray-900">
                {g.title}
                {sel.length > 0 && (
                  <span className={`ml-1.5 ${a.text}`}>({sel.length})</span>
                )}
              </span>
              <svg
                className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isOpen && (
              <div className="mt-3">
                {g.searchable && (
                  <input
                    type="search"
                    value={groupSearch[g.key] ?? ''}
                    onChange={(e) => setGroupSearch((p) => ({ ...p, [g.key]: e.target.value }))}
                    placeholder="Αναζήτηση…"
                    className={`mb-2 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${a.ring}`}
                  />
                )}
                <div className={`space-y-0.5 ${g.options.length > 8 ? 'max-h-60 overflow-y-auto pr-1' : ''}`}>
                  {opts.map((o) => (
                    <label
                      key={o.value}
                      className="flex items-center gap-2.5 py-1 cursor-pointer text-sm text-gray-600 hover:text-gray-900"
                    >
                      <input
                        type="checkbox"
                        checked={sel.includes(o.value)}
                        onChange={() => onToggle(g.key, o.value)}
                        className={`h-4 w-4 rounded border-gray-300 ${a.check}`}
                      />
                      <span className="flex-1 truncate">{o.label}</span>
                      {o.count != null && (
                        <span className="text-xs text-gray-400 tabular-nums">{o.count}</span>
                      )}
                    </label>
                  ))}
                  {opts.length === 0 && (
                    <p className="text-xs text-gray-400 py-1">Κανένα αποτέλεσμα</p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function FilteredListLayout({
  accent,
  search,
  onSearch,
  searchPlaceholder,
  groups,
  selected,
  onToggle,
  onClear,
  resultCount,
  resultNoun,
  sidebarHeader,
  children,
}: Props) {
  const a = ACCENT[accent];
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeCount = useMemo(
    () => Object.values(selected).reduce((n, arr) => n + arr.length, 0),
    [selected],
  );

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label="Αναζήτηση"
          className={`w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 ${a.ring}`}
        />
      </div>

      {/* Count row + mobile filter button */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          <span className="font-bold text-gray-900">{resultCount}</span>{' '}
          {resultCount === 1 ? resultNoun[0] : resultNoun[1]}
        </p>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button type="button" onClick={onClear} className={`text-sm font-medium ${a.text} hover:underline`}>
              Καθαρισμός
            </button>
          )}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18M6 12h12M10.5 19.5h3" />
            </svg>
            Φίλτρα{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            {sidebarHeader && <div className="mb-4">{sidebarHeader}</div>}
            <FilterGroups groups={groups} selected={selected} onToggle={onToggle} accent={accent} />
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-bold text-gray-900">Φίλτρα</h2>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Κλείσιμο" className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {sidebarHeader && <div className="mb-4">{sidebarHeader}</div>}
              <FilterGroups groups={groups} selected={selected} onToggle={onToggle} accent={accent} />
            </div>
            <div className="border-t border-gray-100 p-4 flex gap-2">
              {activeCount > 0 && (
                <button type="button" onClick={onClear} className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700">
                  Καθαρισμός
                </button>
              )}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className={`flex-1 rounded-xl ${a.btn} px-4 py-3 text-sm font-semibold text-white shadow`}
              >
                Δες {resultCount} {resultCount === 1 ? resultNoun[0] : resultNoun[1]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
