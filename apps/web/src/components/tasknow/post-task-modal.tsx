'use client';

import { useState } from 'react';
import { Modal, MockNote } from './modal';
import {
  AREAS,
  CATEGORIES,
  CATEGORY_BY_KEY,
  DEFAULT_AREA,
  DEFAULT_CATEGORY,
  REQUIRED_LICENCE,
  URGENT_HOURS,
  findBlockedWord,
  isLicensedCategory,
} from './data';
import { addTask, useMockTasks, type MockTask } from './mock-store';

/**
 * ΜΑΚΕΤΑ — η ροή «ανεβάζω μικροδουλειά».
 *
 * Δείχνει ότι το ανέβασμα θέλει δύο λεπτά και ότι η ευθύνη της επιλογής
 * γράφεται στην οθόνη πριν πατήσει ο χρήστης το κουμπί, όχι στους όρους.
 * Τίποτα δεν στέλνεται πουθενά — δεν υπάρχει κλήση στο API.
 */

const inputClass =
  'w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100';

export function PostTaskModal({
  onClose,
  onOpenTask,
}: {
  onClose: () => void;
  onOpenTask?: (task: MockTask) => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [area, setArea] = useState(DEFAULT_AREA);
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [when, setWhen] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<MockTask | null>(null);

  const { blockedWords } = useMockTasks();
  const licensed = isLicensedCategory(category);
  const cat = CATEGORY_BY_KEY[category];
  const budgetNumber = Number(budget.replace(',', '.'));
  const licenceLabel = REQUIRED_LICENCE[category] ?? 'Επαγγελματική άδεια';

  function submit() {
    if (title.trim().length < 10) {
      setError('Γράψε λίγο πιο αναλυτικά τι θέλεις να γίνει (τουλάχιστον 10 χαρακτήρες).');
      return;
    }
    // Ο έλεγχος γίνεται ΕΔΩ, πριν ανέβει τίποτα. Μια αγγελία που μένει ορατή
    // δύο ώρες μέχρι να τη δει διαχειριστής έχει ήδη κάνει τη ζημιά.
    // Ο έλεγχος περνάει ΚΑΙ από την περιγραφή: αλλιώς αρκεί ένας αθώος
    // τίτλος και το απαγορευμένο περιεχόμενο μπαίνει από κάτω.
    const blocked = findBlockedWord(`${title} ${description}`, blockedWords);
    if (blocked) {
      setError(
        `Δεν μπορούμε να ανεβάσουμε αυτή την αγγελία (βρέθηκε «${blocked}»). Το TaskNow ` +
          'είναι μόνο για υπηρεσίες — όχι για ερωτικό ή συνοδευτικό περιεχόμενο, ' +
          'οικονομικές συναλλαγές ή παράνομα. Αν είναι λάθος, άλλαξε τη διατύπωση.',
      );
      return;
    }
    const value = Number(budget.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      setError('Γράψε πόσα δίνεις, σε ευρώ.');
      return;
    }
    if (value > 100000) {
      setError('Το ποσό μοιάζει λάθος.');
      return;
    }
    if (when.trim().length < 3) {
      setError('Πες πότε το θέλεις — έστω χοντρικά.');
      return;
    }
    setError(null);
    setCreated(
      addTask({
        title: title.trim(),
        description: description.trim(),
        category,
        area,
        budget: value,
        when: when.trim(),
        urgent,
      }),
    );
  }

  return (
    <Modal open onClose={onClose} title="Ανέβασε μικροδουλειά">
      {created ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
            ✓
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Έτσι θα ανέβαινε η δουλειά σου
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
              «{title.trim()}» στην περιοχή {area}, για {Number(budget.replace(',', '.'))}€.
              Μπήκε στη ροή και δέχεται προσφορές από επαληθευμένους χρήστες.
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-xs leading-relaxed text-amber-900">
            Όταν διαλέξεις άτομο, την επιλογή την κάνεις <strong>εσύ, με δική σου
            ευθύνη</strong>. Το StaffNow σου δείχνει βαθμολογία, ολοκληρωμένες δουλειές
            και τι έχει επαληθευτεί — δεν εγγυάται την εκτέλεση.
          </div>

          {licensed && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-xs leading-relaxed text-red-900">
              Η κατηγορία θέλει <strong>{licenceLabel.toLowerCase()}</strong>. Προσφορά
              μπορούν να κάνουν μόνο όσοι ανεβάσουν την άδειά τους. Θα τη δεις δίπλα σε
              κάθε προσφορά — και θα σου πούμε αν είναι ελεγμένη ή απλώς δηλωμένη.
            </div>
          )}

          <MockNote>
            η δουλειά κρατήθηκε μόνο σε αυτόν τον browser. Στη μακέτα προστέθηκαν
            τρεις δείγμα-προσφορές, για να δεις πώς γίνεται η επιλογή.
          </MockNote>

          {onOpenTask && (
            <button
              type="button"
              onClick={() => onOpenTask(created)}
              className="w-full rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              Δες τις προσφορές
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-200"
          >
            Κλείσιμο
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-900">Τι θέλεις να γίνει;</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="π.χ. Να βγάλει κάποιος βόλτα τον σκύλο μου κάθε απόγευμα"
              className={inputClass + ' mt-1.5'}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-900">
              Περιγραφή <span className="font-normal text-gray-400">(προαιρετική)</span>
            </span>
            <span className="mt-0.5 block text-xs text-gray-500">
              Λεπτομέρειες που αλλάζουν την προσφορά: όροφος και ασανσέρ, τετραγωνικά,
              αν χρειάζεται όχημα ή εργαλεία, ποιος δίνει τα υλικά.
            </span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="π.χ. Τριθέσιος καναπές, από 2ο όροφο με ασανσέρ σε ισόγειο. Χρειάζονται δύο άτομα και όχημα."
              className={inputClass + ' mt-1.5 resize-none'}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-900">Κατηγορία</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass + ' mt-1.5'}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.icon} {c.label}
                    {c.licensed ? ' (θέλει άδεια)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-900">Περιοχή</span>
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

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-900">Πόσα δίνεις</span>
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
              <span className="text-sm font-medium text-gray-900">Πότε</span>
              <input
                type="text"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                placeholder="π.χ. Σάββατο πρωί"
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
              <strong>Το θέλω επείγον.</strong> Η αγγελία μένει στην κορυφή της ροής για{' '}
              {URGENT_HOURS} ώρες. Χρησιμοποίησέ το μόνο όταν πραγματικά βιάζεσαι — αν
              το βάζουν όλοι, δεν σημαίνει τίποτα.
            </span>
          </label>

          {/* Ζωντανή προεπισκόπηση: βλέπεις ό,τι θα δει ο κόσμος, όσο γράφεις.
              Είναι το φθηνότερο πράγμα που ανεβάζει την ποιότητα των αγγελιών. */}
          <div>
            <p className="text-xs font-medium text-gray-500">Έτσι θα το δει ο κόσμος:</p>
            <div className="mt-1.5 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700">
                  <span aria-hidden="true">{cat?.icon}</span>
                  {cat?.label}
                </span>
                {urgent && (
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-600">
                    Επείγον
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm font-semibold leading-snug text-gray-900">
                {title.trim() || 'Ο τίτλος σου θα φανεί εδώ'}
              </p>
              {description.trim() && (
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-gray-600">
                  {description.trim()}
                </p>
              )}
              <p className="mt-1.5 text-xs text-gray-500">
                📍 {area} · 🕒 {when.trim() || 'πότε;'}
              </p>
              <p className="mt-2 text-xl font-bold text-gray-900">
                {Number.isFinite(budgetNumber) && budgetNumber > 0 ? `${budgetNumber}€` : '—'}
              </p>
            </div>
          </div>

          {licensed && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-900">
              <strong>Προσοχή:</strong> η εργασία θέλει {licenceLabel.toLowerCase()}.
              Θα δεχτείς προσφορές μόνο από όσους ανεβάσουν άδεια, και η τελική επιλογή
              γίνεται με δική σου ευθύνη.
            </div>
          )}

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          <button
            type="button"
            onClick={submit}
            className="w-full rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            Ανέβασέ το
          </button>

          <p className="text-center text-[11px] leading-relaxed text-gray-500">
            Δεν επιτρέπονται παράνομες υπηρεσίες ούτε ερωτικό ή συνοδευτικό
            περιεχόμενο. Οι εργασίες που θέλουν άδεια επιτρέπονται, αλλά μόνο με
            ανέβασμα άδειας από αυτόν που θα την αναλάβει.
          </p>
        </div>
      )}
    </Modal>
  );
}
