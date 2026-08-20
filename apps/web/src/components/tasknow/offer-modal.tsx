'use client';

import { useState } from 'react';
import { Modal, MockNote } from './modal';
import { CATEGORY_BY_KEY, REQUIRED_LICENCE, isLicensedCategory } from './data';
import { addOffer, type MockTask } from './mock-store';

/**
 * ΜΑΚΕΤΑ — η ροή «κάνω προσφορά».
 *
 * Δείχνει τα πράγματα που ζητήθηκαν ρητά:
 *  1. Η επαλήθευση ζητιέται ΤΗ ΣΤΙΓΜΗ της πρώτης προσφοράς, όχι στην είσοδο.
 *  2. Σε δουλειές που θέλουν άδεια (ηλεκτρολογικά, υδραυλικά, αέριο, ψύξη)
 *     δεν προχωράει προσφορά χωρίς ανέβασμα άδειας. Η άδεια μένει
 *     «δηλωμένη» μέχρι να την ελέγξει άνθρωπος.
 *  3. Η δήλωση νομιμότητας καταγράφεται πριν σταλεί οτιδήποτε.
 *
 * Τίποτα δεν φεύγει από τον browser: καμία κλήση στο API, κανένα αρχείο δεν
 * ανεβαίνει πουθενά — κρατάμε μόνο το όνομα του αρχείου.
 */

type Step = 'phone' | 'code' | 'licence' | 'offer' | 'done';

const GREEK_MOBILE = /^69\d{8}$/;

const inputClass =
  'w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-900">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-gray-500">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function OfferModal({ task, onClose }: { task: MockTask; onClose: () => void }) {
  const [step, setStep] = useState<Step>('phone');

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [licenceFile, setLicenceFile] = useState<string | null>(null);
  const [amount, setAmount] = useState(String(task.budget));
  const [message, setMessage] = useState('');
  const [declared, setDeclared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cat = CATEGORY_BY_KEY[task.category];
  const needsLicence = isLicensedCategory(task.category);
  const licenceLabel = REQUIRED_LICENCE[task.category] ?? 'Επαγγελματική άδεια';

  function afterCode() {
    setStep(needsLicence ? 'licence' : 'offer');
  }

  function sendCode() {
    if (!GREEK_MOBILE.test(phone.replace(/\s+/g, ''))) {
      setError('Γράψε κινητό που ξεκινάει με 69 και έχει 10 ψηφία.');
      return;
    }
    setError(null);
    setStep('code');
  }

  function confirmCode() {
    if (!/^\d{4}$/.test(code.trim())) {
      setError('Ο κωδικός είναι 4 ψηφία.');
      return;
    }
    setError(null);
    afterCode();
  }

  function confirmLicence() {
    if (!licenceFile) {
      setError('Χρειάζεται να ανεβάσεις την άδειά σου για να συνεχίσεις.');
      return;
    }
    setError(null);
    setStep('offer');
  }

  function submitOffer() {
    const value = Number(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      setError('Γράψε πόσα ζητάς, σε ευρώ.');
      return;
    }
    if (value > 100000) {
      setError('Το ποσό μοιάζει λάθος.');
      return;
    }
    if (message.trim().length < 10) {
      setError('Γράψε δυο λόγια για το γιατί να σε διαλέξει (τουλάχιστον 10 χαρακτήρες).');
      return;
    }
    if (!declared) {
      setError('Χρειάζεται να δηλώσεις ότι μπορείς νόμιμα να το αναλάβεις.');
      return;
    }
    setError(null);
    addOffer(task.id, {
      amount: value,
      message: message.trim(),
      licenceFileName: licenceFile ?? undefined,
    });
    setStep('done');
  }

  return (
    <Modal open onClose={onClose} title="Κάνε προσφορά">
      <div className="rounded-xl bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
          <span aria-hidden="true">{cat?.icon}</span>
          {cat?.label} · {task.area}
          {needsLicence && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
              θέλει άδεια
            </span>
          )}
        </div>
        <div className="mt-1 text-sm font-semibold text-gray-900">{task.title}</div>
        <div className="mt-1 text-xs text-gray-500">
          Προϋπολογισμός {task.budget}€ · {task.when}
        </div>
        {/* Η περιγραφή φαίνεται ΚΑΙ εδώ: χωρίς αυτήν η προσφορά γίνεται στα
            τυφλά και αλλάζει μετά — που είναι η βασική αιτία διαφωνίας. */}
        {task.description && (
          <p className="mt-2 line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-gray-600">
            {task.description}
          </p>
        )}
      </div>

      {/* Βήμα 1 — κινητό */}
      {step === 'phone' && (
        <div className="mt-5 space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <span aria-hidden="true" className="text-lg leading-none">🔒</span>
            <p className="text-xs leading-relaxed text-amber-900">
              Πριν από την <strong>πρώτη σου προσφορά</strong> επαληθεύουμε το κινητό
              σου. Γίνεται μία φορά. Για δουλειές πάνω από 200€ ζητάμε και ταυτότητα.
            </p>
          </div>

          <Field label="Κινητό τηλέφωνο" hint="Θα σου στείλουμε έναν κωδικό με SMS.">
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="69XXXXXXXX"
              className={inputClass}
            />
          </Field>

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          <button
            type="button"
            onClick={sendCode}
            className="w-full rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            Στείλε μου κωδικό
          </button>

          <MockNote>
            εδώ θα έφευγε αληθινό SMS. Δεν στέλνεται τίποτα και δεκτός είναι
            οποιοσδήποτε τετραψήφιος κωδικός.
          </MockNote>
        </div>
      )}

      {/* Βήμα 2 — κωδικός */}
      {step === 'code' && (
        <div className="mt-5 space-y-4">
          <Field label="Ο κωδικός που έλαβες" hint={`Στάλθηκε στο ${phone.replace(/\s+/g, '')}.`}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="1234"
              className={inputClass + ' text-center text-lg tracking-[0.5em]'}
            />
          </Field>

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          <button
            type="button"
            onClick={confirmCode}
            className="w-full rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            Επιβεβαίωση
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setCode('');
              setStep('phone');
            }}
            className="w-full text-xs font-medium text-gray-500 hover:text-gray-900"
          >
            Άλλαξε αριθμό
          </button>
        </div>
      )}

      {/* Βήμα 3 — η άδεια, μόνο όπου χρειάζεται */}
      {step === 'licence' && (
        <div className="mt-5 space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <span aria-hidden="true" className="text-lg leading-none">⚡</span>
            <p className="text-xs leading-relaxed text-red-900">
              Η δουλειά ανήκει σε κατηγορία που θέλει <strong>επαγγελματική άδεια</strong>.
              Χωρίς άδεια δεν μπορείς να κάνεις προσφορά.
            </p>
          </div>

          <Field
            label={licenceLabel}
            hint="Φωτογραφία ή PDF. Θα φαίνεται ως «δηλωμένη» μέχρι να την ελέγξει άνθρωπος."
          >
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setLicenceFile(f ? f.name : null);
                if (f) setError(null);
              }}
              className="w-full rounded-xl border border-dashed border-gray-300 px-3.5 py-3 text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            />
          </Field>

          {licenceFile && (
            <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800">
              ✓ Επιλέχθηκε: {licenceFile}
            </p>
          )}

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          <button
            type="button"
            onClick={confirmLicence}
            className="w-full rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            Συνέχεια
          </button>

          <MockNote>
            το αρχείο ΔΕΝ ανεβαίνει πουθενά. Κρατάμε μόνο το όνομά του, για να
            φανεί η ροή.
          </MockNote>
        </div>
      )}

      {/* Βήμα 4 — η προσφορά */}
      {step === 'offer' && (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
              ✓ Το κινητό σου επαληθεύτηκε
            </span>
            {licenceFile && (
              <span className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                Άδεια: δηλωμένη, σε έλεγχο
              </span>
            )}
          </div>

          <Field label="Πόσα ζητάς" hint="Μπορείς να προτείνεις διαφορετικό ποσό από τον προϋπολογισμό.">
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass + ' pr-9'}
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                €
              </span>
            </div>
          </Field>

          <Field label="Δυο λόγια" hint="Γιατί να διαλέξει εσένα; Τι έχεις ξανακάνει;">
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="π.χ. Μένω δίπλα, έχω κάνει το ίδιο σε 4 σπίτια, μπορώ και σήμερα."
              className={inputClass + ' resize-none'}
            />
          </Field>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <input
              type="checkbox"
              checked={declared}
              onChange={(e) => setDeclared(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500"
            />
            <span className="text-xs leading-relaxed text-gray-700">
              Δηλώνω ότι έχω τις νόμιμες προϋποθέσεις να παρέχω αυτή την υπηρεσία
              {needsLicence && ' — συμπεριλαμβανομένης της άδειας που ανέβασα —'} και ότι
              θα εκδώσω το προβλεπόμενο παραστατικό. Καταλαβαίνω ότι το StaffNow δεν
              είναι εργοδότης μου και δεν είναι μέρος της συμφωνίας.
            </span>
          </label>

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          <button
            type="button"
            onClick={submitOffer}
            className="w-full rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500"
          >
            Στείλε την προσφορά
          </button>
        </div>
      )}

      {/* Βήμα 5 — έφυγε */}
      {step === 'done' && (
        <div className="mt-5 space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
            ✓
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Η προσφορά σου στάλθηκε</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
              {Number(amount.replace(',', '.'))}€ για «{task.title}». Θα τη δει δίπλα στις
              άλλες, με τη βαθμολογία σου και το τι έχει επαληθευτεί.
            </p>
          </div>

          <MockNote>
            η προσφορά κρατήθηκε μόνο σε αυτόν τον browser, ώστε να δεις τη
            συνέχεια. Στην πραγματική έκδοση θα κρατούσαμε και τη δήλωσή σου με
            ημερομηνία και διεύθυνση σύνδεσης.
          </MockNote>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-200"
          >
            Κλείσιμο
          </button>
        </div>
      )}
    </Modal>
  );
}
