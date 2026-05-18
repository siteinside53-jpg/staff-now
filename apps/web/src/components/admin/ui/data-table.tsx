'use client';

import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Tailwind classes for the TH / TD (e.g. w-32 hidden md:table-cell) */
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  emptyLabel?: string;
  onRowClick?: (row: T) => void;
  rowKey?: (row: T) => string;
}

export function DataTable<T>({ columns, rows, loading, emptyLabel = 'Δεν υπάρχουν εγγραφές', onRowClick, rowKey }: Props<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={`sk-${i}`} className="border-b border-gray-100">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-4 ${col.className || ''}`}>
                    <div className="h-4 w-full max-w-[160px] animate-pulse rounded bg-gray-100" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-16 text-center text-sm text-gray-400">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={rowKey ? rowKey(row) : i}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-gray-100 last:border-b-0 transition-colors hover:bg-gray-50/80 ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3.5 text-sm text-gray-700 ${col.className || ''}`}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
