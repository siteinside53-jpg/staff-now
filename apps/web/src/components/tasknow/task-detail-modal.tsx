'use client';

import { useState } from 'react';
import { Modal, MockNote } from './modal';
import { ShareTask } from './share-task';
import {
  AREA_COORDS,
  CATEGORY_BY_KEY,
  REQUIRED_LICENCE,
  type CenterSource,
  type Coords,
  distanceKm,
  distanceLabel,
  isLicensedCategory,
  levelFor,
  posterLabel,
} from './data';
import {
  cancelTask,
  chooseOffer,
  deleteTask,
  pauseTask,
  resumeTask,
  completeTask,
  declarePaid,
  openDispute,
  sendMessage,
  type MockOffer,
  type MockTask,
} from './mock-store';

/**
 * ΜΑΚΕΤΑ — η καρτέλα μιας μικροδουλειάς.
 *
 * Δύο όψεις από το ίδιο παράθυρο:
 *  · Αν τη δουλειά την ανέβασες εσύ, βλέπεις τις προσφορές και ΔΙΑΛΕΓΕΙΣ.
 *  · Αν όχι, βλέπεις τα στοιχεία και κάνεις προσφορά.
 *
 * Η φράση «με δική σου ευθύνη» εμφανίζεται ΤΗ ΣΤΙΓΜΗ της επιλογής, πάνω από
 * το κουμπί που την οριστικοποιεί — όχι στους όρους, όπως ζητήθηκε ρητά.
 *
 * Μετά την επιλογή ανοίγει συνομιλία. Χωρίς αυτήν η ροή ήταν αδιέξοδο:
 * διάλεγες άνθρωπο και δεν είχες τρόπο να του μιλήσεις.
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
  const lvl = levelFor(offer.completed, offer.rating);
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
            <span className={'rounded-full px-2 py-0.5 text-[11px] font-semibold ' + lvl.className}>
              {lvl.icon} {lvl.label}
            </span>
            <Stars rating={offer.rating} />
            <span className="text-xs text-gray-500">{offer.completed} ολοκληρωμένες</span>
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
            {offer.licence.verified
              ? '✓ ελεγμένη άδεια: '
              : 'δηλωμένη άδεια (δεν έχει ελεγχθεί): '}
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
        <p className="mt-3 text-center text-sm font-semibold text-emerald-700">✓ Την επέλεξες</p>
      )}
    </div>
  );
}

/** Η συνομιλία της δουλειάς. Ανοίγει μόλις γίνει η επιλογή. */
function Chat({ task }: { task: MockTask }) {
  const [text, setText] = useState('');
  const [as, setAs] = useState<'owner' | 'worker'>(task.mine ? 'owner' : 'worker');
  const other = task.offersList.find((o) => o.id === task.chosenOfferId);

  function send() {
    const t = text.trim();
    if (!t) return;
    sendMessage(task.id, as, t);
    setText('');
  }

  return (
    <div className="mt-4 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <p className="text-sm font-semibold text-gray-900">
          Συνομιλία με {task.mine ? (other?.name ?? 'τον εκτελεστή') : 'τον πελάτη'}
        </p>
        {/* Μόνο για τη μακέτα: εδώ είσαι και οι δύο πλευρές. */}
        <label className="flex items-center gap-1.5 text-[11px] text-gray-500">
          γράφω ως
          <select
            value={as}
            onChange={(e) => setAs(e.target.value as 'owner' | 'worker')}
            className="rounded-md border border-gray-300 px-1.5 py-1 text-[11px]"
          >
            <option value="owner">πελάτης</option>
            <option value="worker">εκτελεστής</option>
          </select>
        </label>
      </div>

      <div className="max-h-56 space-y-2 overflow-y-auto p-3">
        {task.messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-400">Κανένα μήνυμα ακόμη.</p>
        ) : (
          task.messages.map((m) => (
            <div key={m.id} className={'flex ' + (m.from === 'owner' ? 'justify-start' : 'justify-end')}>
              <div
                className={
                  'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ' +
                  (m.from === 'owner'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-amber-500 text-white')
                }
              >
                {m.text}
                <span
                  className={
                    'mt-0.5 block text-[10px] ' +
                    (m.from === 'owner' ? 'text-gray-400' : 'text-amber-100')
                  }
                >
                  {m.from === 'owner' ? 'πελάτης' : 'εκτελεστής'} · {m.at}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2 border-t border-gray-100 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Γράψε μήνυμα…"
          className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
        />
        <button
          type="button"
          onClick={send}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
        >
          Στείλε
        </button>
      </div>

      <p className="border-t border-gray-100 px-3 py-2 text-[11px] leading-relaxed text-gray-500">
        Στην πραγματική έκδοση η συνομιλία γίνεται στα μηνύματα του StaffNow, που
        υπάρχουν ήδη — με ειδοποίηση, καμπανάκι και ιστορικό.
      </p>
    </div>
  );
}

/** Μικρό πλαίσιο «γράψε τον λόγο και επιβεβαίωσε». */
function ReasonBox({
  title,
  hint,
  confirmLabel,
  tone,
  onConfirm,
  onCancel,
}: {
  title: string;
  hint: string;
  confirmLabel: string;
  tone: 'red' | 'gray';
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState(false);

  return (
    <div
      className={
        'mt-4 rounded-xl border p-4 ' +
        (tone === 'red' ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50')
      }
    >
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-gray-600">{hint}</p>
      <textarea
        rows={2}
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          if (e.target.value.trim().length >= 10) setError(false);
        }}
        placeholder="Γράψε τι έγινε…"
        className="mt-2 w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
      />
      {error && (
        <p className="mt-1 text-xs font-medium text-red-700">
          Γράψε τουλάχιστον δύο λόγια — αλλιώς δεν μπορεί να κριθεί.
        </p>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row-reverse">
        <button
          type="button"
          onClick={() => {
            if (reason.trim().length < 10) {
              setError(true);
              return;
            }
            onConfirm(reason.trim());
          }}
          className={
            'flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition ' +
            (tone === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-900 hover:bg-gray-800')
          }
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-50"
        >
          Άκυρο
        </button>
      </div>
    </div>
  );
}

export function TaskDetailModal({
  task,
  center,
  centerSource = 'default',
  centerLabel = 'το κέντρο',
  onClose,
  onMakeOffer,
}: {
  task: MockTask;
  center: Coords | null;
  centerSource?: CenterSource;
  centerLabel?: string;
  onClose: () => void;
  onMakeOffer: (task: MockTask) => void;
}) {
  const [confirming, setConfirming] = useState<MockOffer | null>(null);
  const [licenceAck, setLicenceAck] = useState(false);
  const [ackError, setAckError] = useState(false);
  const [asking, setAsking] = useState<'cancel' | 'dispute' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cat = CATEGORY_BY_KEY[task.category];
  const coords = AREA_COORDS[task.area];
  const km = center && coords ? distanceKm(center, coords) : null;
  const alreadyOffered = task.offersList.some((o) => o.mine);
  const needsLicence = isLicensedCategory(task.category);
  const licenceLabel = REQUIRED_LICENCE[task.category] ?? 'Επαγγελματική άδεια';
  const decided = task.status !== 'open';
  const chosen = task.offersList.find((o) => o.id === task.chosenOfferId);
  const bothPaid = task.paidByOwner && task.paidByWorker;

  return (
    <Modal open onClose={onClose} title={task.mine ? 'Η μικροδουλειά σου' : 'Μικροδουλειά'}>
      <div className="rounded-xl bg-gray-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-gray-600">
          <span aria-hidden="true">{cat?.icon}</span>
          {cat?.label} · {task.area}
          {km !== null && (
            <span className="text-gray-400">· {distanceLabel(km, centerSource, centerLabel)}</span>
          )}
          {task.urgent && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
              Επείγον
            </span>
          )}
          {needsLicence && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
              θέλει άδεια
            </span>
          )}
        </div>
        <h3 className="mt-1 text-base font-bold text-gray-900">{task.title}</h3>
        {task.postedByName && (
          <p className="mt-1 flex items-center gap-2 text-xs text-gray-500">
            <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-100 to-orange-100 text-[11px] font-bold text-amber-700">
              {task.postedByPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={task.postedByPhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                task.postedByName.trim().charAt(0).toUpperCase()
              )}
            </span>
            {posterLabel(task.postedByName, task.postedByRole)}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 text-xs text-gray-500">
          <span>🕒 {task.when}</span>
          <span className="font-semibold text-gray-900">
            {task.budget}€ {task.budgetNote ? `(${task.budgetNote})` : ''}
          </span>
          <span>{task.postedAgo}</span>
        </div>

        {task.description && (
          <p className="mt-3 whitespace-pre-line border-t border-gray-200 pt-3 text-sm leading-relaxed text-gray-700">
            {task.description}
          </p>
        )}

        {/* Κοινοποίηση: όσο περισσότεροι τη δουν, τόσο πιο γρήγορα γίνεται. */}
        <div className="mt-3">
          <ShareTask
            taskId={task.id}
            title={task.title}
            budget={task.budget}
            area={task.area}
            compact
          />
        </div>
      </div>

      {/* Καταστάσεις που τερματίζουν τη ροή */}
      {task.status === 'cancelled' && (
        <div className="mt-4 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">Η μικροδουλειά ακυρώθηκε</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">{task.cancelReason}</p>
        </div>
      )}

      {task.status === 'disputed' && (
        <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-900">
            Σε διαφωνία — το κοιτάει το StaffNow
          </p>
          <p className="mt-1 text-xs leading-relaxed text-red-800">
            Δηλώθηκε από {task.disputeBy === 'owner' ? 'τον πελάτη' : 'τον εκτελεστή'}:{' '}
            {task.disputeReason}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-red-700">
            Δεν κρίνουμε ποιος έχει δίκιο και δεν αποζημιώνουμε. Κοιτάμε αν παραβιάστηκαν
            οι όροι και παίρνουμε μέτρα στον λογαριασμό. Η διαφορά σας λύνεται μεταξύ σας.
          </p>
        </div>
      )}

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
            {task.status === 'paused' && (
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                Σε παύση
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

          {/* Τι μπορείς να κάνεις με τη δική σου δουλειά.
              ΤΡΙΑ ΔΙΑΦΟΡΕΤΙΚΑ ΠΡΑΓΜΑΤΑ, επίτηδες ξεχωριστά:
               · Παύση    — προσωρινή, αναστρέψιμη, κρατάει τις προσφορές.
               · Ακύρωση  — τελική, και το μαθαίνουν όσοι έκαναν προσφορά.
               · Διαγραφή — φεύγει εντελώς, δεν γυρίζει πίσω. */}
          {(task.status === 'open' || task.status === 'paused') && !confirming && (
            <div className="mt-4 rounded-xl border border-gray-200 p-3">
              {task.status === 'paused' && (
                <p className="mb-2 rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-600">
                  Σε παύση — δεν τη βλέπει κανείς αυτή τη στιγμή. Οι προσφορές που έχεις
                  ήδη πάρει μένουν στη θέση τους.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {task.status === 'open' ? (
                  <button
                    type="button"
                    onClick={() => pauseTask(task.id)}
                    className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                  >
                    ⏸ Παύση
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => resumeTask(task.id)}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                  >
                    ▶ Ενεργοποίησέ την ξανά
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setAsking(asking === 'cancel' ? null : 'cancel')}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                >
                  Ακύρωση
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="ml-auto rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Διαγραφή
                </button>
              </div>

              {confirmDelete && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-xs leading-relaxed text-red-900">
                    Οριστική διαγραφή. Φεύγει η δουλειά και{' '}
                    <strong>
                      {task.offersList.length}{' '}
                      {task.offersList.length === 1 ? 'προσφορά' : 'προσφορές'}
                    </strong>{' '}
                    μαζί της, χωρίς επιστροφή. Αν απλώς δεν τη θέλεις τώρα, βάλ' την σε
                    παύση.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        deleteTask(task.id);
                        onClose();
                      }}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      Ναι, διάγραψέ την
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-300"
                    >
                      Άκυρο
                    </button>
                  </div>
                </div>
              )}

              {asking === 'cancel' && (
                <ReasonBox
                  title="Ακύρωση της μικροδουλειάς"
                  hint="Θα ενημερωθούν όσοι έκαναν προσφορά. Γράψε γιατί — το βλέπουν."
                  confirmLabel="Ακύρωσέ την"
                  tone="gray"
                  onConfirm={(r) => {
                    cancelTask(task.id, r);
                    setAsking(null);
                  }}
                  onCancel={() => setAsking(null)}
                />
              )}
            </div>
          )}

          {/* Ανατέθηκε: συνομιλία, ολοκλήρωση ή διαφωνία */}
          {task.status === 'assigned' && (
            <>
              <Chat task={task} />

              <button
                type="button"
                onClick={() => completeTask(task.id)}
                className="mt-4 w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Η δουλειά ολοκληρώθηκε
              </button>

              {asking === 'dispute' ? (
                <ReasonBox
                  title="Κάτι πήγε στραβά"
                  hint="Δεν ήρθε, δεν έγινε σωστά, ή κάτι άλλο. Το βλέπει το StaffNow."
                  confirmLabel="Δήλωσε το πρόβλημα"
                  tone="red"
                  onConfirm={(r) => {
                    openDispute(task.id, 'owner', r);
                    setAsking(null);
                  }}
                  onCancel={() => setAsking(null)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAsking('dispute')}
                  className="mt-2 w-full text-xs font-medium text-red-500 underline hover:text-red-700"
                >
                  Κάτι πήγε στραβά
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        /* ── Η όψη αυτού που ψάχνει δουλειά ── */
        <div className="mt-5 space-y-4">
          {task.status === 'open' && (
            <>
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
            </>
          )}

          {task.status === 'assigned' && alreadyOffered && chosen?.mine && (
            <>
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800">
                ✓ Σε διάλεξαν για αυτή τη δουλειά
              </div>
              <Chat task={task} />
              {asking === 'dispute' ? (
                <ReasonBox
                  title="Κάτι πήγε στραβά"
                  hint="Δεν με άφησε να μπω, άλλαξε τη δουλειά, δεν πλήρωσε. Το βλέπει το StaffNow."
                  confirmLabel="Δήλωσε το πρόβλημα"
                  tone="red"
                  onConfirm={(r) => {
                    openDispute(task.id, 'worker', r);
                    setAsking(null);
                  }}
                  onCancel={() => setAsking(null)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAsking('dispute')}
                  className="w-full text-xs font-medium text-red-500 underline hover:text-red-700"
                >
                  Κάτι πήγε στραβά
                </button>
              )}
            </>
          )}

          <p className="text-center text-[11px] leading-relaxed text-gray-500">
            Το StaffNow δεν είναι εργοδότης και δεν κρατά χρήματα. Η συμφωνία είναι
            ανάμεσα σε εσένα και σε αυτόν που ανέβασε τη δουλειά.
          </p>
        </div>
      )}

      {/* ── Ολοκληρώθηκε: πληρωμή και παραστατικό ── */}
      {task.status === 'done' && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-bold text-gray-900">Πληρώθηκε;</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              Το StaffNow δεν κρατάει και δεν στέλνει χρήματα. Η δήλωση εδώ είναι απλώς
              η επιβεβαίωση των δύο πλευρών — χτίζει ιστορικό, ώστε να φαίνεται όποιος
              συστηματικά δεν πληρώνει.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={task.paidByOwner}
                onClick={() => declarePaid(task.id, 'owner')}
                className={
                  'rounded-lg px-4 py-2.5 text-sm font-semibold transition ' +
                  (task.paidByOwner
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800')
                }
              >
                {task.paidByOwner ? '✓ Ο πελάτης δήλωσε πληρωμή' : 'Πλήρωσα (πελάτης)'}
              </button>
              <button
                type="button"
                disabled={task.paidByWorker}
                onClick={() => declarePaid(task.id, 'worker')}
                className={
                  'rounded-lg px-4 py-2.5 text-sm font-semibold transition ' +
                  (task.paidByWorker
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800')
                }
              >
                {task.paidByWorker ? '✓ Ο εκτελεστής επιβεβαίωσε' : 'Πληρώθηκα (εκτελεστής)'}
              </button>
            </div>
            {bothPaid && (
              <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                ✓ Και οι δύο επιβεβαίωσαν την πληρωμή. Η αξιολόγηση ανοίγει τώρα.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-900">
            <strong>Μην ξεχάσετε το παραστατικό.</strong> Στην πραγματική έκδοση εδώ
            ανοίγει και η αμοιβαία αξιολόγηση — δεν βλέπεις τη δική του πριν γράψεις τη
            δική σου.
          </div>
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
