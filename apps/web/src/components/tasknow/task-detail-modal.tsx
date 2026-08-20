'use client';

import { useState } from 'react';
import { Modal, MockNote } from './modal';
import {
  AREA_COORDS,
  CATEGORY_BY_KEY,
  REQUIRED_LICENCE,
  isLicensedCategory,
  type Coords,
  distanceKm,
  formatKm,
  levelFor,
} from './data';
import { chooseOffer, completeTask, type MockOffer, type MockTask } from './mock-store';

/**
 * ΜΑΚΕΤΑ — η καρτέλα μιας μικροδουλειάς.
 *
 * Δύο όψεις από το ίδιο παράθυρο:
 *  · Αν τη δουλειά την ανέβασες εσύ, βλέπεις τις προσφορές και ΔΙΑΛΕΓΕΙΣ.
 *  · Αν όχι, βλέπεις τα στοιχεία και κάνεις προσφορά.
 *
 * Η φράση «με δική σου ευθύνη» εμφανίζεται ΤΗ ΣΤΙΓΜΗ της επιλογής, πάνω από
 * το κουμπί που την οριστικοποιεί — όχι στους όρους, όπως ζητήθηκε ρητά.
 */

function Stars({ rating }: { rating: number | null }) {
  if (rating === null) {
    return <span className="text-xs font-medium text-gray-400">νέος χρήστης</span>;
  }
  return (
    <span className="text-xs font-semibold text-gray-900">
      ★ {rating.toFixed(1).replace('.', ',')}
    </span>
  );
}

function OfferRow({
  offer,
  chosen,
  decided,
  onChoose,
}: {
  offer: MockOffer;
  chosen: boolean;
  decided: boolean;
  onChoose: () => void;
}) {
  return (
    <div
      className={
        'rounded-xl border p-4 transition ' +
        (chosen
          ? 'border-emerald-300 bg-emerald-50'
          : decided
            ? 'border-gray-200 bg-gray-50 opacity-60'
            : 'border-gray-200 bg-white')
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {offer.name}
            {offer.mine && (
              <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                η προσφορά σου
              </span>
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {(() => {
              const lvl = levelFor(offer.completed, offer.rating);
              return (
                <span className={'rounded-full px-2 py-0.5 text-[11px] font-semibold ' + lvl.className}>
                  {lvl.icon} {lvl.label}
                </span>
              );
            })()}
            <Stars rating={offer.rating} />
            <span className="text-xs text-gray-500">
              {offer.completed} ολοκληρωμένες
            </span>
            <span className="text-xs text-gray-400">{offer.createdAgo}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-bold text-gray-900">{offer.amount}€</div>
        </div>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-gray-600">«{offer.message}»</p>

      {/* Ό,τι χρειάζεται για να κρίνει ο άνθρωπος που θα διαλέξει */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span
          className={
            'rounded-full px-2 py-0.5 text-[11px] font-medium ' +
            (offer.verifiedPhone ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')
          }
        >
          {offer.verifiedPhone ? '✓ κινητό' : 'κινητό: όχι'}
        </span>
        <span
          className={
            'rounded-full px-2 py-0.5 text-[11px] font-medium ' +
            (offer.verifiedId ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')
          }
        >
          {offer.verifiedId ? '✓ ταυτότητα' : 'ταυτότητα: όχι'}
        </span>
        <span
          className={
            'rounded-full px-2 py-0.5 text-[11px] font-medium ' +
            (offer.invoice ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500')
          }
        >
          {offer.invoice ? 'εκδίδει παραστατικό' : 'δεν δήλωσε παραστατικό'}
        </span>
        {offer.licence && (
          <span
            className={
              'rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
              (offer.licence.verified
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-100 text-amber-900')
            }
          >
            {offer.licence.verified ? '✓ ελεγμένη άδεια: ' : 'δηλωμένη άδεια (δεν έχει ελεγχθεί): '}
            {offer.licence.label}
          </span>
        )}
        {offer.credentials.map((c) => (
          <span
            key={c.label}
            className={
              'rounded-full px-2 py-0.5 text-[11px] font-medium ' +
              (c.verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800')
            }
          >
            {c.verified ? '✓ ελεγμένο: ' : 'δηλωμένο: '}
            {c.label}
          </span>
        ))}
      </div>

      {!decided && (
        <button
          type="button"
          onClick={onChoose}
          className="mt-3 w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
        >
          Διάλεξε αυτή την προσφορά
        </button>
      )}
      {chosen && (
        <p className="mt-3 text-center text-sm font-semibold text-emerald-700">
          ✓ Την επέλεξες
        </p>
      )}
    </div>
  );
}

export function TaskDetailModal({
  task,
  center,
  onClose,
  onMakeOffer,
}: {
  task: MockTask;
  center: Coords | null;
  onClose: () => void;
  onMakeOffer: (task: MockTask) => void;
}) {
  const [confirming, setConfirming] = useState<MockOffer | null>(null);
  const [licenceAck, setLicenceAck] = useState(false);
  const [ackError, setAckError] = useState(false);

  const cat = CATEGORY_BY_KEY[task.category];
  const coords = AREA_COORDS[task.area];
  const km = center && coords ? distanceKm(center, coords) : null;
  const alreadyOffered = task.offersList.some((o) => o.mine);
  const needsLicence = isLicensedCategory(task.category);
  const licenceLabel = REQUIRED_LICENCE[task.category] ?? 'Επαγγελματική άδεια';
  const decided = task.status !== 'open';

  return (
    <Modal open onClose={onClose} title={task.mine ? 'Η μικροδουλειά σου' : 'Μικροδουλειά'}>
      <div className="rounded-xl bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
          <span aria-hidden="true">{cat?.icon}</span>
          {cat?.label} · {task.area}
          {km !== null && <span className="text-gray-400">· {formatKm(km)} από σένα</span>}
        </div>
        <h3 className="mt-1 text-base font-bold text-gray-900">{task.title}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 text-xs text-gray-500">
          <span>🕒 {task.when}</span>
          <span className="font-semibold text-gray-900">
            {task.budget}€ {task.budgetNote ? `(${task.budgetNote})` : ''}
          </span>
          <span>{task.postedAgo}</span>
        </div>
      </div>

      {/* ── Η όψη του ανθρώπου που ανέβασε τη δουλειά ── */}
      {task.mine ? (
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900">
              Προσφορές ({task.offersList.length})
            </h4>
            {task.status === 'assigned' && (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                Ανατέθηκε
              </span>
            )}
            {task.status === 'done' && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                Ολοκληρώθηκε
              </span>
            )}
          </div>

          {task.offersList.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
              Καμία προσφορά ακόμη.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {task.offersList.map((o) => (
                <OfferRow
                  key={o.id}
                  offer={o}
                  chosen={task.chosenOfferId === o.id}
                  decided={decided}
                  onChoose={() => setConfirming(o)}
                />
              ))}
            </div>
          )}

          {/* Η επιβεβαίωση — εδώ γράφεται η ευθύνη, στην οθόνη */}
          {confirming && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-gray-900">
                Επιβεβαιώνεις την επιλογή: {confirming.name} για {confirming.amount}€;
              </p>
              <p className="mt-2 text-xs leading-relaxed text-amber-900">
                Την επιλογή την κάνεις <strong>εσύ, με δική σου ευθύνη</strong>. Το
                StaffNow σου έδειξε βαθμολογία, ιστορικό και τι έχει επαληθευτεί — δεν
                εγγυάται την εκτέλεση, δεν είναι εργοδότης και δεν κρατά χρήματα. Η
                συμφωνία και η πληρωμή είναι ανάμεσα στους δυο σας.
              </p>
              {/* Αδειοδοτούμενη δουλειά: ξεχωριστή, ρητή συναίνεση */}
              {needsLicence && (
                <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-amber-400 bg-white px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={licenceAck}
                    onChange={(e) => {
                      setLicenceAck(e.target.checked);
                      if (e.target.checked) setAckError(false);
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500"
                  />
                  <span className="text-xs leading-relaxed text-gray-800">
                    Η εργασία απαιτεί <strong>{licenceLabel.toLowerCase()}</strong>.
                    {confirming.licence?.verified
                      ? ' Η άδεια έχει ελεγχθεί από το StaffNow.'
                      : ' Η άδεια είναι ΔΗΛΩΜΕΝΗ και δεν έχει ελεγχθεί από το StaffNow.'}{' '}
                    Αναλαμβάνω να ελέγξω ο ίδιος την άδεια και την καταλληλότητα του
                    προσώπου, με <strong>δική μου αποκλειστική ευθύνη</strong>. Το
                    StaffNow δεν φέρει καμία ευθύνη για την εκτέλεση αυτής της εργασίας.
                  </span>
                </label>
              )}

              {ackError && (
                <p className="mt-2 text-xs font-semibold text-red-700">
                  Χρειάζεται να το αποδεχτείς για να προχωρήσεις.
                </p>
              )}

              <div className="mt-3 flex flex-col gap-2 sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => {
                    if (needsLicence && !licenceAck) {
                      setAckError(true);
                      return;
                    }
                    chooseOffer(task.id, confirming.id);
                    setConfirming(null);
                    setLicenceAck(false);
                    setAckError(false);
                  }}
                  className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
                >
                  Ναι, επιβεβαιώνω την επιλογή
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(null);
                    setLicenceAck(false);
                    setAckError(false);
                  }}
                  className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-50"
                >
                  Άκυρο
                </button>
              </div>
            </div>
          )}

          {task.status === 'assigned' && (
            <button
              type="button"
              onClick={() => completeTask(task.id)}
              className="mt-4 w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Η δουλειά ολοκληρώθηκε
            </button>
          )}

          {task.status === 'done' && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-900">
              <strong>Μην ξεχάσετε το παραστατικό.</strong> Στην πραγματική έκδοση εδώ
              ανοίγει και η αμοιβαία αξιολόγηση — δεν βλέπεις τη δική του πριν γράψεις
              τη δική σου.
            </div>
          )}
        </div>
      ) : (
        /* ── Η όψη αυτού που ψάχνει δουλειά ── */
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-600">
            <p>
              <span className="font-semibold text-gray-900">{task.offersList.length}</span>{' '}
              {task.offersList.length === 1 ? 'προσφορά' : 'προσφορές'} μέχρι τώρα. Τα
              ποσά των άλλων δεν φαίνονται — γράφεις το δικό σου.
            </p>
          </div>

          {alreadyOffered ? (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800">
              ✓ Έχεις ήδη στείλει προσφορά για αυτή τη δουλειά
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onMakeOffer(task)}
              className="w-full rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              Κάνε προσφορά
            </button>
          )}

          <p className="text-center text-[11px] leading-relaxed text-gray-500">
            Το StaffNow δεν είναι εργοδότης και δεν κρατά χρήματα. Η συμφωνία είναι
            ανάμεσα σε εσένα και σε αυτόν που ανέβασε τη δουλειά.
          </p>
        </div>
      )}

      <div className="mt-5">
        <MockNote>
          όλα όσα βλέπεις εδώ ζουν μόνο σε αυτόν τον browser και σβήνονται με το
          «καθάρισε τη μακέτα».
        </MockNote>
      </div>
    </Modal>
  );
}
