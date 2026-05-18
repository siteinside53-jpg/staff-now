'use client';

import { toast } from 'sonner';

interface Props {
  order: {
    id: string;
    referenceCode: string;
    amountCents: number;
    currency: string;
    expiresAt: string;
    bank: { beneficiary: string; bank: string; iban: string; bic: string };
    instructionsEl: string[];
  };
  onClose: () => void;
}

export function ManualTransferDialog({ order, onClose }: Props) {
  const copy = (txt: string, label: string) => {
    navigator.clipboard
      .writeText(txt)
      .then(() => toast.success(`Αντιγράφηκε: ${label}`))
      .catch(() => toast.error('Δεν έγινε αντιγραφή'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">🏦 Στοιχεία πληρωμής με κατάθεση</h2>
            <p className="mt-1 text-xs text-gray-500">
              Λήγει στις <strong>{new Date(order.expiresAt).toLocaleDateString('el-GR')}</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            aria-label="Κλείσιμο"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
          <Row label="Δικαιούχος" value={order.bank.beneficiary} />
          <Row label="Τράπεζα" value={order.bank.bank} />
          <Row
            label="IBAN"
            value={order.bank.iban}
            mono
            onCopy={() => copy(order.bank.iban.replace(/\s/g, ''), 'IBAN')}
          />
          <Row label="BIC" value={order.bank.bic} mono />
          <Row label="Ποσό" value={fmtMoney(order.amountCents, order.currency)} bold />
          <Row
            label="Αιτιολογία"
            value={order.referenceCode}
            mono
            bold
            onCopy={() => copy(order.referenceCode, 'Κωδικός')}
            highlight
          />
        </div>

        <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs text-gray-600">
          {order.instructionsEl.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-gray-400">
            Αρ. παραγγελίας: <code className="font-mono">{order.id}</code>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            Έκλεισε
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  bold,
  onCopy,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
  onCopy?: () => void;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-semibold text-gray-500">{label}</span>
      <span
        className={`flex items-center gap-2 ${highlight ? 'rounded-md bg-amber-100 px-2 py-1' : ''}`}
      >
        <span className={`${mono ? 'font-mono' : ''} ${bold ? 'font-bold' : ''}`}>{value}</span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-bold text-gray-700 hover:bg-gray-50"
          >
            Αντιγραφή
          </button>
        )}
      </span>
    </div>
  );
}

function fmtMoney(cents: number, currency = 'EUR'): string {
  const v = (cents / 100).toFixed(2).replace('.', ',');
  return currency === 'EUR' ? `${v} €` : `${v} ${currency}`;
}
