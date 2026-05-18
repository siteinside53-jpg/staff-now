'use client';

import { useEffect, useState } from 'react';

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  reasonRequired?: boolean;
  onConfirm: (reason?: string) => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Επιβεβαίωση',
  cancelLabel = 'Ακύρωση',
  tone = 'danger',
  loading,
  reasonRequired,
  onConfirm,
  onClose,
}: Props) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  if (!open) return null;

  const confirmClasses =
    tone === 'danger'
      ? 'bg-red-600 hover:bg-red-700'
      : 'bg-blue-600 hover:bg-blue-700';

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
          <div className="p-6">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {description && <p className="mt-2 text-sm text-gray-600">{description}</p>}
            {reasonRequired && (
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Λόγος (απαιτείται)..."
                className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-3 rounded-b-2xl">
            <button
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => onConfirm(reason || undefined)}
              disabled={loading || (reasonRequired && !reason.trim())}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${confirmClasses}`}
            >
              {loading ? 'Παρακαλώ περιμένετε...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
