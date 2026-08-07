'use client';

/**
 * Η κάρτα αξιολόγησης — για εργαζόμενο και για επιχείρηση.
 *
 * Δείχνει ΜΟΝΟ αληθινά νούμερα. Αν δεν υπάρχει καμία αξιολόγηση, το γράφει
 * καθαρά αντί να δείχνει αστέρια που δεν αντιστοιχούν σε τίποτα.
 */

interface SubScore {
  label: string;
  value: number | null | undefined;
}

interface RatingCardProps {
  ratingAvg: number | null | undefined;
  ratingCount: number;
  hireCount: number;
  scores: SubScore[];
  /** Το κείμενο του σήματος αλλάζει: «Προσλήφθηκε 3 φορές» / «3 προσλήψεις». */
  hireLabel: (n: number) => string;
}

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span className="text-lg leading-none" aria-label={`${value} στα 5`}>
      <span className="text-yellow-400">{'★'.repeat(full)}</span>
      <span className="text-gray-300">{'★'.repeat(Math.max(0, 5 - full))}</span>
    </span>
  );
}

export function RatingCard({ ratingAvg, ratingCount, hireCount, scores, hireLabel }: RatingCardProps) {
  const hireBadge =
    hireCount > 0 ? (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
        <span className="text-base">✅</span>
        <span className="text-xs font-semibold text-emerald-800">{hireLabel(hireCount)}</span>
      </div>
    ) : null;

  if (!ratingCount || ratingAvg == null) {
    return (
      <div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <p className="text-sm font-semibold text-gray-700">Καμία αξιολόγηση ακόμη</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            Οι αξιολογήσεις γράφονται 15 μέρες μετά από πρόσληψη που επιβεβαίωσαν
            και οι δύο πλευρές μέσω StaffNow.
          </p>
        </div>
        {hireBadge}
      </div>
    );
  }

  const shown = scores.filter((s) => s.value != null);

  return (
    <div>
      <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Stars value={ratingAvg} />
              <span className="text-2xl font-bold text-gray-900">{ratingAvg.toFixed(1)}</span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {ratingCount} {ratingCount === 1 ? 'αξιολόγηση' : 'αξιολογήσεις'}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <span className="text-xl">🏆</span>
          </div>
        </div>
        {shown.length > 0 && (
          <div className="grid grid-cols-3 gap-3 text-center">
            {shown.map((s) => (
              <div key={s.label}>
                <p className="text-[10px] uppercase tracking-wide text-gray-500">{s.label}</p>
                <p className="mt-0.5 text-base font-bold text-gray-900">{Number(s.value).toFixed(1)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      {hireBadge}
    </div>
  );
}
