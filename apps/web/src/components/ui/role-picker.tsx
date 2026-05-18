'use client';

/**
 * <RolePicker /> — compact role/specialty selector with modal + search.
 *
 * Why this exists:
 *   The flat list of 100+ roles dominated forms and was overwhelming. This
 *   component shows only the *selected* roles inline (as removable chips) plus
 *   a single "Add" button that opens a modal. The modal has a search bar that
 *   filters across all roles and a grouped list when no search is active.
 *
 * Used in:
 *   - apps/web/src/app/dashboard/jobs/edit/page.tsx (επιχείρηση → αγγελία)
 *   - apps/web/src/app/dashboard/profile/page.tsx (worker → προφίλ)
 */

import { useEffect, useMemo, useState } from 'react';
import { WORKER_JOB_ROLE_GROUPS, WORKER_JOB_ROLE_LABELS_EL } from '@staffnow/config';

interface RolePickerProps {
  /** Currently selected role IDs */
  value: string[];
  /** Called with the new selection whenever it changes */
  onChange: (next: string[]) => void;
  /** Optional max number of roles allowed (e.g. workers are capped at 5) */
  max?: number;
  /** Trigger button label (changes per use case) */
  triggerLabel?: string;
  /** Show selected count next to trigger */
  showCount?: boolean;
}

export function RolePicker({
  value,
  onChange,
  max,
  triggerLabel = '+ Προσθήκη ειδικοτήτων',
  showCount = true,
}: RolePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  // Auto-expand groups containing already-selected roles whenever the modal opens
  useEffect(() => {
    if (!open) return;
    const next = new Set<string>();
    for (const g of WORKER_JOB_ROLE_GROUPS) {
      if (g.roles.some((r) => value.includes(r))) next.add(g.id);
    }
    setOpenGroups(next);
    setQuery('');
  }, [open, value]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const toggleRole = (r: string) => {
    if (value.includes(r)) {
      onChange(value.filter((x) => x !== r));
    } else {
      if (max && value.length >= max) return;
      onChange([...value, r]);
    }
  };

  const toggleGroup = (id: string) =>
    setOpenGroups((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // Search results: flat list of {id, label, group} matching query
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const out: Array<{ id: string; label: string; groupLabel: string }> = [];
    for (const g of WORKER_JOB_ROLE_GROUPS) {
      for (const r of g.roles) {
        const label = WORKER_JOB_ROLE_LABELS_EL[r] || r;
        if (label.toLowerCase().includes(q) || r.includes(q)) {
          out.push({ id: r, label, groupLabel: g.label });
        }
      }
    }
    return out;
  }, [query]);

  const remaining = max != null ? max - value.length : Infinity;

  return (
    <div>
      {/* Inline selected chips + trigger button */}
      <div className="flex flex-wrap gap-2 items-center">
        {value.map((r) => (
          <span
            key={r}
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
          >
            {WORKER_JOB_ROLE_LABELS_EL[r] || r}
            <button
              type="button"
              onClick={() => toggleRole(r)}
              className="text-blue-500 hover:text-blue-700"
              aria-label="Αφαίρεση"
            >
              ×
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors"
        >
          {triggerLabel}
          {showCount && value.length > 0 && (
            <span className="ml-1 text-xs text-gray-400">
              ({value.length}{max ? `/${max}` : ''})
            </span>
          )}
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Επιλογή ειδικοτήτων</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {value.length} επιλεγμένες{max ? ` · ${remaining} ακόμη` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                aria-label="Κλείσιμο"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                  />
                </svg>
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Αναζήτηση ειδικότητας (π.χ. ηλεκτρολόγος, νοσηλευτής...)"
                  className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Body — search results OR grouped accordion */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {searchResults != null ? (
                searchResults.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-12">
                    Δεν βρέθηκε ειδικότητα για «{query}». Δοκίμασε άλλη λέξη ή πρόσθεσε από Δεξιότητες.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {searchResults.map((r) => {
                      const on = value.includes(r.id);
                      const disabled = !on && remaining <= 0;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => toggleRole(r.id)}
                          disabled={disabled}
                          title={r.groupLabel}
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                            on
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : disabled
                              ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                              : 'border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          {r.label}
                          <span className="ml-1.5 text-[10px] text-gray-400">· {r.groupLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="space-y-2">
                  {WORKER_JOB_ROLE_GROUPS.map((group) => {
                    const isOpen = openGroups.has(group.id);
                    const selectedInGroup = group.roles.filter((r) => value.includes(r)).length;
                    return (
                      <div key={group.id} className="rounded-lg border border-gray-200 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.id)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-800">{group.label}</span>
                            <span className="text-xs text-gray-400">({group.roles.length})</span>
                            {selectedInGroup > 0 && (
                              <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                                {selectedInGroup}
                              </span>
                            )}
                          </span>
                          <svg
                            className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isOpen && (
                          <div className="p-3 bg-white">
                            <div className="flex flex-wrap gap-2">
                              {group.roles.map((r) => {
                                const on = value.includes(r);
                                const disabled = !on && remaining <= 0;
                                return (
                                  <button
                                    key={r}
                                    type="button"
                                    onClick={() => toggleRole(r)}
                                    disabled={disabled}
                                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                                      on
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : disabled
                                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                        : 'border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                                    }`}
                                  >
                                    {WORKER_JOB_ROLE_LABELS_EL[r] || r}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-500">
                {value.length}{max ? `/${max}` : ''} επιλεγμένες
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 transition-colors"
              >
                Έτοιμο
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
