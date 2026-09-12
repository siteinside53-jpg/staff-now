'use client';

import { useState } from 'react';
import { Modal, MockNote } from './modal';
import { ShareTask } from './share-task';
import {
  AREA_COORDS,
  CATEGORY_BY_KEY,
  type CenterSource,
  type Coords,
  categoryLabelFor,
  distanceKm,
  distanceLabel,
  formatPostedAgo,
  isLicensedCategory,
  levelFor,
  levelLabelFor,
  licenceLabelFor,
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
import { useT, useLocale } from '@/i18n/locale-provider';

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
  const t = useT();
  if (rating === null) {
    return <span className="text-xs font-medium text-gray-400">{t('tasknow.detail.newUser')}</span>;
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
  const t = useT();
  const { locale } = useLocale();
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
                {t('tasknow.detail.yourOffer')}
              </span>
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={'rounded-full px-2 py-0.5 text-[11px] font-semibold ' + lvl.className}>
              {lvl.icon} {levelLabelFor(locale, lvl)}
            </span>
            <Stars rating={offer.rating} />
            <span className="text-xs text-gray-500">{t('tasknow.detail.completedCount', { n: offer.completed })}</span>
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
          {offer.verifiedPhone ? t('tasknow.detail.phoneYes') : t('tasknow.detail.phoneNo')}
        </span>
        <span
          className={
            'rounded-full px-2 py-0.5 text-[11px] font-medium ' +
            (offer.verifiedId ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')
          }
        >
          {offer.verifiedId ? t('tasknow.detail.idYes') : t('tasknow.detail.idNo')}
        </span>
        <span
          className={
            'rounded-full px-2 py-0.5 text-[11px] font-medium ' +
            (offer.invoice ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500')
          }
        >
          {offer.invoice ? t('tasknow.detail.invoiceYes') : t('tasknow.detail.invoiceNo')}
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
              ? t('tasknow.detail.licenceVerified')
              : t('tasknow.detail.licenceDeclared')}
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
            {c.verified ? t('tasknow.detail.credVerified') : t('tasknow.detail.credDeclared')}
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
          {t('tasknow.detail.chooseOffer')}
        </button>
      )}
      {chosen && (
        <p className="mt-3 text-center text-sm font-semibold text-emerald-700">{t('tasknow.detail.chosen')}</p>
      )}
    </div>
  );
}

/** Η συνομιλία της δουλειάς. Ανοίγει μόλις γίνει η επιλογή. */
function Chat({ task }: { task: MockTask }) {
  const t = useT();
  const [text, setText] = useState('');
  const [as, setAs] = useState<'owner' | 'worker'>(task.mine ? 'owner' : 'worker');
  const other = task.offersList.find((o) => o.id === task.chosenOfferId);

  function send() {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(task.id, as, trimmed);
    setText('');
  }

  return (
    <div className="mt-4 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <p className="text-sm font-semibold text-gray-900">
          {t('tasknow.detail.chatWith', {
            who: task.mine ? (other?.name ?? t('tasknow.detail.theWorker')) : t('tasknow.detail.theClient'),
          })}
        </p>
        {/* Μόνο για τη μακέτα: εδώ είσαι και οι δύο πλευρές. */}
        <label className="flex items-center gap-1.5 text-[11px] text-gray-500">
          {t('tasknow.detail.writeAs')}
          <select
            value={as}
            onChange={(e) => setAs(e.target.value as 'owner' | 'worker')}
            className="rounded-md border border-gray-300 px-1.5 py-1 text-[11px]"
          >
            <option value="owner">{t('tasknow.detail.client')}</option>
            <option value="worker">{t('tasknow.detail.worker')}</option>
          </select>
        </label>
      </div>

      <div className="max-h-56 space-y-2 overflow-y-auto p-3">
        {task.messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-400">{t('tasknow.detail.noMessages')}</p>
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
                  {m.from === 'owner' ? t('tasknow.detail.client') : t('tasknow.detail.worker')} · {m.at}
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
          placeholder={t('tasknow.detail.msgPlaceholder')}
          className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
        />
        <button
          type="button"
          onClick={send}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
        >
          {t('tasknow.detail.send')}
        </button>
      </div>

      <p className="border-t border-gray-100 px-3 py-2 text-[11px] leading-relaxed text-gray-500">
        {t('tasknow.detail.chatNote')}
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
  const t = useT();
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
        placeholder={t('tasknow.detail.reasonPlaceholder')}
        className="mt-2 w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
      />
      {error && (
        <p className="mt-1 text-xs font-medium text-red-700">
          {t('tasknow.detail.reasonTooShort')}
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
          {t('tasknow.common.cancel')}
        </button>
      </div>
    </div>
  );
}

export function TaskDetailModal({
  task,
  center,
  centerSource = 'default',
  centerLabel,
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
  const t = useT();
  const { locale } = useLocale();
  const resolvedCenterLabel = centerLabel ?? t('tasknow.feed.centerDefault');
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
  const licenceLabel = licenceLabelFor(locale, task.category) || t('tasknow.licence.generic');
  const decided = task.status !== 'open';
  const chosen = task.offersList.find((o) => o.id === task.chosenOfferId);
  const bothPaid = task.paidByOwner && task.paidByWorker;

  return (
    <Modal open onClose={onClose} title={task.mine ? t('tasknow.detail.titleMine') : t('tasknow.detail.title')}>
      <div className="rounded-xl bg-gray-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-gray-600">
          <span aria-hidden="true">{cat?.icon}</span>
          {cat ? categoryLabelFor(locale, cat.key) : ''} · {task.area}
          {km !== null && (
            <span className="text-gray-400">· {distanceLabel(km, centerSource, resolvedCenterLabel, locale)}</span>
          )}
          {task.urgent && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
              {t('tasknow.common.urgent')}
            </span>
          )}
          {needsLicence && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
              {t('tasknow.common.needsLicence')}
            </span>
          )}
        </div>
        <h3 className="mt-1 text-base font-bold text-gray-900">{task.title}</h3>
        {task.postedByName && (
          <p className="mt-1 flex items-center gap-2 text-xs text-gray-500">
            <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-100 to-orange-300 text-[11px] font-bold text-amber-800">
              {task.postedByPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={task.postedByPhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                task.postedByName.trim().charAt(0).toUpperCase()
              )}
            </span>
            {posterLabel(task.postedByName, task.postedByRole, locale)}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 text-xs text-gray-500">
          <span>🕒 {task.when}</span>
          <span className="font-semibold text-gray-900">
            {task.budget}€ {task.budgetNote ? `(${task.budgetNote})` : ''}
          </span>
          <span>{formatPostedAgo(task.postedMinutesAgo, locale)}</span>
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
          <p className="text-sm font-semibold text-gray-900">{t('tasknow.detail.cancelled')}</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">{task.cancelReason}</p>
        </div>
      )}

      {task.status === 'disputed' && (
        <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-900">
            {t('tasknow.detail.disputed')}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-red-800">
            {t('tasknow.detail.disputedBy', {
              who: task.disputeBy === 'owner' ? t('tasknow.detail.client') : t('tasknow.detail.worker'),
              reason: task.disputeReason ?? '',
            })}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-red-700">
            {t('tasknow.detail.disputeNote')}
          </p>
        </div>
      )}

      {/* ── Η όψη του ανθρώπου που ανέβασε τη δουλειά ── */}
      {task.mine ? (
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900">
              {t('tasknow.detail.offersHeading', { n: task.offersList.length })}
            </h4>
            {task.status === 'assigned' && (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                {t('tasknow.detail.assigned')}
              </span>
            )}
            {task.status === 'paused' && (
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                {t('tasknow.detail.paused')}
              </span>
            )}
            {task.status === 'done' && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                {t('tasknow.detail.done')}
              </span>
            )}
          </div>

          {task.offersList.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
              {t('tasknow.detail.noOffers')}
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
                {t('tasknow.detail.confirmChoice', { name: confirming.name, amount: confirming.amount })}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-amber-900">
                {t('tasknow.detail.resp1')}
                <strong>{t('tasknow.detail.respStrong')}</strong>
                {t('tasknow.detail.resp2')}
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
                    {t('tasknow.detail.licenceAck1')}<strong>{licenceLabel.toLowerCase()}</strong>.
                    {confirming.licence?.verified
                      ? t('tasknow.detail.licenceVerifiedNote')
                      : t('tasknow.detail.licenceDeclaredNote')}{' '}
                    {t('tasknow.detail.licenceAck2')}
                    <strong>{t('tasknow.detail.licenceAckStrong')}</strong>
                    {t('tasknow.detail.licenceAck3')}
                  </span>
                </label>
              )}

              {ackError && (
                <p className="mt-2 text-xs font-semibold text-red-700">
                  {t('tasknow.detail.ackError')}
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
                  {t('tasknow.detail.confirmYes')}
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
                  {t('tasknow.common.cancel')}
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
                  {t('tasknow.detail.pausedNote')}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {task.status === 'open' ? (
                  <button
                    type="button"
                    onClick={() => pauseTask(task.id)}
                    className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                  >
                    {t('tasknow.detail.pause')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => resumeTask(task.id)}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                  >
                    {t('tasknow.detail.resume')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setAsking(asking === 'cancel' ? null : 'cancel')}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                >
                  {t('tasknow.detail.cancel')}
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="ml-auto rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  {t('tasknow.detail.delete')}
                </button>
              </div>

              {confirmDelete && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-xs leading-relaxed text-red-900">
                    {t('tasknow.detail.deleteWarn1')}{' '}
                    <strong>
                      {task.offersList.length}{' '}
                      {task.offersList.length === 1 ? t('tasknow.common.offerOne') : t('tasknow.common.offerMany')}
                    </strong>{' '}
                    {t('tasknow.detail.deleteWarn2')}
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
                      {t('tasknow.detail.deleteYes')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-300"
                    >
                      {t('tasknow.common.cancel')}
                    </button>
                  </div>
                </div>
              )}

              {asking === 'cancel' && (
                <ReasonBox
                  title={t('tasknow.detail.cancelTitle')}
                  hint={t('tasknow.detail.cancelHint')}
                  confirmLabel={t('tasknow.detail.cancelConfirm')}
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
                {t('tasknow.detail.completed')}
              </button>

              {asking === 'dispute' ? (
                <ReasonBox
                  title={t('tasknow.detail.wrongTitle')}
                  hint={t('tasknow.detail.wrongHintOwner')}
                  confirmLabel={t('tasknow.detail.wrongConfirm')}
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
                  {t('tasknow.detail.wrong')}
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
                  {t('tasknow.detail.offersSoFar', {
                    noun: task.offersList.length === 1 ? t('tasknow.common.offerOne') : t('tasknow.common.offerMany'),
                  })}
                </p>
              </div>

              {alreadyOffered ? (
                <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800">
                  {t('tasknow.detail.alreadyOffered')}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onMakeOffer(task)}
                  className="w-full rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
                >
                  {t('tasknow.detail.makeOffer')}
                </button>
              )}
            </>
          )}

          {task.status === 'assigned' && alreadyOffered && chosen?.mine && (
            <>
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800">
                {t('tasknow.detail.chosenYou')}
              </div>
              <Chat task={task} />
              {asking === 'dispute' ? (
                <ReasonBox
                  title={t('tasknow.detail.wrongTitle')}
                  hint={t('tasknow.detail.wrongHintWorker')}
                  confirmLabel={t('tasknow.detail.wrongConfirm')}
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
                  {t('tasknow.detail.wrong')}
                </button>
              )}
            </>
          )}

          <p className="text-center text-[11px] leading-relaxed text-gray-500">
            {t('tasknow.detail.notEmployer')}
          </p>
        </div>
      )}

      {/* ── Ολοκληρώθηκε: πληρωμή και παραστατικό ── */}
      {task.status === 'done' && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-bold text-gray-900">{t('tasknow.detail.paidTitle')}</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              {t('tasknow.detail.paidNote')}
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
                {task.paidByOwner ? t('tasknow.detail.paidOwnerDone') : t('tasknow.detail.paidOwner')}
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
                {task.paidByWorker ? t('tasknow.detail.paidWorkerDone') : t('tasknow.detail.paidWorker')}
              </button>
            </div>
            {bothPaid && (
              <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                {t('tasknow.detail.bothPaid')}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-900">
            <strong>{t('tasknow.detail.invoiceStrong')}</strong>
            {t('tasknow.detail.invoiceNote')}
          </div>
        </div>
      )}

      <div className="mt-5">
        <MockNote>
          {t('tasknow.detail.mockNote')}
        </MockNote>
      </div>
    </Modal>
  );
}
