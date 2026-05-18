'use client';

import type { ReactNode } from 'react';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface Props {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: {
    key: string;
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (v: string) => void;
  }[];
  actions?: ReactNode;
}

export function FilterBar({ search, onSearchChange, searchPlaceholder, filters, actions }: Props) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
      {onSearchChange !== undefined && (
        <div className="relative flex-1 min-w-0">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={search || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder || 'Αναζήτηση...'}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      {filters?.map((f) => (
        <select
          key={f.key}
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">{f.label}: Όλα</option>
          {f.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
              {opt.count != null ? ` (${opt.count})` : ''}
            </option>
          ))}
        </select>
      ))}

      {actions && <div className="flex items-center gap-2 sm:ml-auto">{actions}</div>}
    </div>
  );
}
