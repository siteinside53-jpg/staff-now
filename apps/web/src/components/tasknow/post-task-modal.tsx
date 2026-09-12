'use client';

import { useState } from 'react';
import { Modal, MockNote } from './modal';
import { PointPicker } from './point-picker';
import {
  AREAS,
  CATEGORIES,
  CATEGORY_BY_KEY,
  DEFAULT_AREA,
  DEFAULT_CATEGORY,
  URGENT_HOURS,
  categoryLabelFor,
  findBlockedWord,
  isLicensedCategory,
  licenceLabelFor,
} from './data';
import { addTask, useMockTasks, type MockTask } from './mock-store';
import { useT, useLocale } from '@/i18n/locale-provider';

/**
 * ΜΑΚΕΤΑ — η ροή «ανεβάζω μικροδουλειά».
 *
 * Δείχνει ότι το ανέβασμα θέλει δύο λεπτά και ότι η ευθύνη της επιλογής
 * γράφεται στην οθόνη πριν πατήσει ο χρήστης το κουμπί, όχι στους όρους.
 * Τίποτα δεν στέλνεται πουθενά — δεν υπάρχει κλήση στο API.
 */

const inputClass =
  'w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100';

export type Poster = {
  name?: string;
  photo?: string;
  role?: 'worker' | 'business';
};

export function PostTaskModal({
  onClose,
  onOpenTask,
  poster,
}: {
  onClose: () => void;
  onOpenTask?: (task: MockTask) => void;
  /** Ποιος ανεβάζει — γεμάτο μέσα στον λογαριασμό, κενό απ' έξω. */
  poster?: Poster;
}) {
  const t = useT();
  const { locale } = useLocale();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [area, setArea] = useState(DEFAULT_AREA);
  /** Το σημείο στον χάρτη. Προαιρετικό — δεν κλειδώνει το ανέβασμα. */
  const [point, setPoint] = useState<{ lat: number; lon: number } | null>(null);
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [when, setWhen] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<MockTask | null>(null);
  /** Όσο μιλάει με τον server, το κουμπί κλειδώνει — αλλιώς ανεβαίνει δύο φορές. */
  const [saving, setSaving] = useState(false);

  const { blockedWords } = useMockTasks();
  const licensed = isLicensedCategory(category);
  const cat = CATEGORY_BY_KEY[category];
  const budgetNumber = Number(budget.replace(',', '.'));
  const licenceLabel = licenceLabelFor(locale, category) || t('tasknow.licence.generic');

  async function submit() {
    if (title.trim().length < 10) {
      setError(t('tasknow.post.titleTooShort'));
      return;
    }
    // Ο έλεγχος γίνεται ΕΔΩ, πριν ανέβει τίποτα. Μια αγγελία που μένει ορατή
    // δύο ώρες μέχρι να τη δει διαχειριστής έχει ήδη κάνει τη ζημιά.
    // Ο έλεγχος περνάει ΚΑΙ από την περιγραφή: αλλιώς αρκεί ένας αθώος
    // τίτλος και το απαγορευμένο περιεχόμενο μπαίνει από κάτω.
    const blocked = findBlockedWord(`${title} ${description}`, blockedWords);
    if (blocked) {
      setError(t('tasknow.post.blocked', { word: blocked }));
      return;
    }
    const value = Number(budget.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      setError(t('tasknow.post.budgetInvalid'));
      return;
    }
    if (value > 100000) {
      setError(t('tasknow.post.budgetTooBig'));
      return;
    }
    if (when.trim().length < 3) {
      setError(t('tasknow.post.whenMissing'));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const saved = await addTask({
        title: title.trim(),
        description: description.trim(),
        category,
        area,
        budget: value,
        when: when.trim(),
        urgent,
        postedByName: poster?.name,
        postedByPhoto: poster?.photo,
        postedByRole: poster?.role,
        lat: point?.lat,
        lon: point?.lon,
      });
      // Δείχνουμε ό,τι ΠΡΑΓΜΑΤΙΚΑ αποθηκεύτηκε, όχι ό,τι νομίζαμε ότι στείλαμε.
      if (saved) setCreated(saved);
      else setError(t('tasknow.post.notSaved'));
    } catch (err: any) {
      setError(err?.message || t('tasknow.post.notSaved'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={t('tasknow.post.title')}>
      {created ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
            ✓
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {t('tasknow.post.createdTitle')}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
              {t('tasknow.post.createdText', {
                title: title.trim(),
                area,
                budget: Number(budget.replace(',', '.')),
              })}
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-xs leading-relaxed text-amber-900">
            {t('tasknow.post.resp1')}
            <strong>{t('tasknow.post.respStrong')}</strong>
            {t('tasknow.post.resp2')}
          </div>

          {licensed && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-xs leading-relaxed text-red-900">
              {t('tasknow.post.licensedNote1')}
              <strong>{licenceLabel.toLowerCase()}</strong>
              {t('tasknow.post.licensedNote2')}
            </div>
          )}

          <MockNote>
            {t('tasknow.post.mockNote')}
          </MockNote>

          {onOpenTask && (
            <button
              type="button"
              onClick={() => onOpenTask(created)}
              className="w-full rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              {t('tasknow.post.seeOffers')}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-200"
          >
            {t('tasknow.post.close')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-900">{t('tasknow.post.whatLabel')}</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('tasknow.post.whatPlaceholder')}
              className={inputClass + ' mt-1.5'}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-900">
              {t('tasknow.post.descLabel')}{' '}
              <span className="font-normal text-gray-400">{t('tasknow.post.optional')}</span>
            </span>
            <span className="mt-0.5 block text-xs text-gray-500">
              {t('tasknow.post.descHint')}
            </span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('tasknow.post.descPlaceholder')}
              className={inputClass + ' mt-1.5 resize-none'}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-900">{t('tasknow.post.categoryLabel')}</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass + ' mt-1.5'}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.icon} {categoryLabelFor(locale, c.key)}
                    {c.licensed ? t('tasknow.post.licensedOption') : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-900">{t('tasknow.post.areaLabel')}</span>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className={inputClass + ' mt-1.5'}
              >
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Η γειτονιά λέει «Καλαμαριά». Ο χάρτης λέει «εδώ». Η διαφορά είναι
              που θα σε βρει κάποιος που ψάχνει «τι υπάρχει κοντά μου». */}
          <div>
            <span className="text-sm font-medium text-gray-900">
              {t('tasknow.post.whereLabel')}{' '}
              <span className="font-normal text-gray-400">{t('tasknow.post.optionalM')}</span>
            </span>
            <div className="mt-1.5">
              <PointPicker area={area} value={point} onChange={setPoint} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-900">{t('tasknow.post.budgetLabel')}</span>
              <div className="relative mt-1.5">
                <input
                  type="text"
                  inputMode="decimal"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="30"
                  className={inputClass + ' pr-9'}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  €
                </span>
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-900">{t('tasknow.post.whenLabel')}</span>
              <input
                type="text"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                placeholder={t('tasknow.post.whenPlaceholder')}
                className={inputClass + ' mt-1.5'}
              />
            </label>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <input
              type="checkbox"
              checked={urgent}
              onChange={(e) => setUrgent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-orange-500"
            />
            <span className="text-xs leading-relaxed text-gray-700">
              <strong>{t('tasknow.post.urgentStrong')}</strong>
              {t('tasknow.post.urgentText', { hours: URGENT_HOURS })}
            </span>
          </label>

          {/* Ζωντανή προεπισκόπηση: βλέπεις ό,τι θα δει ο κόσμος, όσο γράφεις.
              Είναι το φθηνότερο πράγμα που ανεβάζει την ποιότητα των αγγελιών. */}
          <div>
            <p className="text-xs font-medium text-gray-500">{t('tasknow.post.previewTitle')}</p>
            <div className="mt-1.5 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700">
                  <span aria-hidden="true">{cat?.icon}</span>
                  {cat ? categoryLabelFor(locale, cat.key) : ''}
                </span>
                {urgent && (
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-600">
                    {t('tasknow.common.urgent')}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm font-semibold leading-snug text-gray-900">
                {title.trim() || t('tasknow.post.titlePreview')}
              </p>
              {description.trim() && (
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-gray-600">
                  {description.trim()}
                </p>
              )}
              <p className="mt-1.5 text-xs text-gray-500">
                📍 {area} · 🕒 {when.trim() || t('tasknow.post.whenPreview')}
              </p>
              <p className="mt-2 text-xl font-bold text-gray-900">
                {Number.isFinite(budgetNumber) && budgetNumber > 0 ? `${budgetNumber}€` : '—'}
              </p>
            </div>
          </div>

          {licensed && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-900">
              <strong>{t('tasknow.post.warnStrong')}</strong>
              {t('tasknow.post.warnText', { licence: licenceLabel.toLowerCase() })}
            </div>
          )}

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="w-full rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
          >
            {saving ? t('tasknow.post.uploading') : t('tasknow.post.submit')}
          </button>

          <p className="text-center text-[11px] leading-relaxed text-gray-500">
            {t('tasknow.post.footer')}
          </p>
        </div>
      )}
    </Modal>
  );
}
