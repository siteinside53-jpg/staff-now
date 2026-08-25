'use client';

import { useEffect, useState } from 'react';
import { Modal } from './modal';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLoginModal } from '@/components/auth/login-modal';
import { CATEGORY_BY_KEY, REQUIRED_LICENCE, isLicensedCategory } from './data';
import { addOffer, type MockTask } from './mock-store';

/**
 * Η ροή «κάνω προσφορά».
 *
 *  1. Η επαλήθευση κινητού ζητιέται ΤΗ ΣΤΙΓΜΗ της πρώτης προσφοράς, όχι στην
 *     είσοδο.
 *  2. Σε δουλειές που θέλουν άδεια (ηλεκτρολογικά, υδραυλικά, αέριο, ψύξη)
 *     δεν προχωράει προσφορά χωρίς ανέβασμα άδειας. Η άδεια μένει
 *     «δηλωμένη» μέχρι να την ελέγξει άνθρωπος.
 *  3. Η δήλωση νομιμότητας καταγράφεται πριν σταλεί οτιδήποτε.
 *
 * ⚠️ ΤΟ ΒΗΜΑ ΤΟΥ ΚΙΝΗΤΟΥ ΗΤΑΝ ΘΕΑΤΡΟ — ΚΑΙ ΕΛΕΓΕ ΨΕΜΑΤΑ ΣΤΟΝ ΧΡΗΣΤΗ.
 *
 * Δεν ρωτούσε ΠΟΤΕ τον server. Το «Στείλε μου κωδικό» απλώς άλλαζε οθόνη, και
 * η επιβεβαίωση δεχόταν ΟΠΟΙΟΝΔΗΠΟΤΕ τετραψήφιο αριθμό και έγραφε ότι το
 * κινητό επαληθεύτηκε. Ο πραγματικός κωδικός του server είναι ΕΞΑΨΗΦΙΟΣ —
 * ούτε το μήκος δεν συμφωνούσε.
 *
 * Τώρα περνάει από τις ίδιες ακριβώς διαδρομές με τη σελίδα επαλήθευσης του
 * λογαριασμού. Και όταν δεν υπάρχει πάροχος SMS — που είναι η σημερινή
 * κατάσταση στην παραγωγή — ΔΕΝ λέμε ότι στείλαμε κωδικό και ΔΕΝ λέμε ότι
 * επαληθεύτηκε: κρατάμε το νούμερο ως «δηλωμένο», ακριβώς όπως γίνεται ήδη με
 * την άδεια, και το γράφουμε καθαρά στην οθόνη.
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
  /*
    ΧΩΡΙΣ ΛΟΓΑΡΙΑΣΜΟ ΔΕΝ ΖΗΤΑΜΕ ΚΙΝΗΤΟ.

    Η ροή είναι δημόσια: τη βλέπει και όποιος δεν έχει λογαριασμό. Πατούσε
    «Κάνε προσφορά», του ζητούσαμε το κινητό του, εκείνος το έγραφε — και μετά
    έπαιρνε κόκκινο «Δεν είστε συνδεδεμένος». Δηλαδή του ζητούσαμε προσωπικό
    στοιχείο για κάτι που δεν επρόκειτο να γίνει, και τον αφήναμε σε αδιέξοδο.

    Τώρα βλέπει από την αρχή τι χρειάζεται, με το κουμπί εγγραφής μπροστά του.
  */
  const { user, loading: authLoading } = useAuth();
  const loginModal = useLoginModal();
  const [step, setStep] = useState<Step>('phone');

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [licenceFile, setLicenceFile] = useState<string | null>(null);
  const [amount, setAmount] = useState(String(task.budget));
  const [message, setMessage] = useState('');
  const [declared, setDeclared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Όσο μιλάμε με τον server, τα κουμπιά κλειδώνουν — αλλιώς διπλά SMS. */
  const [busy, setBusy] = useState(false);
  /** Ρωτάμε τον server τι ισχύει ήδη, πριν ζητήσουμε οτιδήποτε από τον χρήστη. */
  const [loadingStatus, setLoadingStatus] = useState(true);
  /**
   * `null` όσο δεν ξέρουμε. `false` σημαίνει ότι δεν υπάρχει πάροχος SMS, οπότε
   * το νούμερο μένει «δηλωμένο» και δεν παριστάνουμε καμία επαλήθευση.
   */
  const [smsAvailable, setSmsAvailable] = useState<boolean | null>(null);

  const cat = CATEGORY_BY_KEY[task.category];
  const needsLicence = isLicensedCategory(task.category);
  const licenceLabel = REQUIRED_LICENCE[task.category] ?? 'Επαγγελματική άδεια';

  function afterCode() {
    setStep(needsLicence ? 'licence' : 'offer');
  }

  /*
    ΑΝ ΤΟ ΚΙΝΗΤΟ ΕΙΝΑΙ ΗΔΗ ΕΠΙΒΕΒΑΙΩΜΕΝΟ, ΔΕΝ ΤΟ ΞΑΝΑΖΗΤΑΜΕ.

    Το λέει ρητά η οθόνη: «γίνεται μία φορά». Πριν, το ζητούσε σε κάθε προσφορά,
    επειδή δεν ρωτούσε ποτέ τον server τι ισχύει.
  */
  useEffect(() => {
    // Αποσυνδεδεμένος: δεν έχει νόημα να ρωτήσουμε — γυρίζει 401 και μόνο
    // θόρυβο βάζει στην κονσόλα.
    if (!user) {
      setLoadingStatus(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = (await (api as any).workers.getVerification()) as any;
        const d = res?.data || {};
        if (cancelled) return;
        setSmsAvailable(!!d.smsAvailable);
        if (d.phone) {
          setPhone(String(d.phone));
        }
        if (d.phoneConfirmed) afterCode();
      } catch {
        // Δεν ξέρουμε — δείχνουμε κανονικά το βήμα του κινητού.
      } finally {
        if (!cancelled) setLoadingStatus(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Τρέχει μία φορά, μόλις ξέρουμε ποιος είναι ο χρήστης.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function sendCode() {
    const clean = phone.replace(/\s+/g, '');
    if (!GREEK_MOBILE.test(clean)) {
      setError('Γράψε κινητό που ξεκινάει με 69 και έχει 10 ψηφία.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = (await (api as any).auth.sendPhoneCode({ phone: clean })) as any;
      const d = res?.data || {};
      if (d.smsAvailable === false) {
        /*
          ΔΕΝ ΥΠΑΡΧΕΙ ΠΑΡΟΧΟΣ SMS — ΚΑΙ ΤΟ ΛΕΜΕ.

          Ο server κράτησε το νούμερο και δεν έστειλε τίποτα. Το να δείχναμε εδώ
          οθόνη κωδικού θα ήταν ακριβώς το ψέμα που είχαμε. Προχωράμε με το
          κινητό ΔΗΛΩΜΕΝΟ, όπως ακριβώς προχωράει και η άδεια.
        */
        setSmsAvailable(false);
        afterCode();
        return;
      }
      setSmsAvailable(true);
      setStep('code');
    } catch (err: any) {
      setError(err?.message || 'Δεν στάλθηκε ο κωδικός. Δοκίμασε ξανά.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode() {
    // Ο κωδικός του server είναι ΕΞΑΨΗΦΙΟΣ. Η μακέτα ζητούσε τέσσερα ψηφία.
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Ο κωδικός είναι 6 ψηφία.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await (api as any).auth.confirmPhone({ code: code.trim() });
      afterCode();
    } catch (err: any) {
      // Λάθος κωδικός σημαίνει ΛΑΘΟΣ — δεν προχωράμε.
      setError(err?.message || 'Λάθος κωδικός.');
    } finally {
      setBusy(false);
    }
  }

  function confirmLicence() {
    if (!licenceFile) {
      setError('Χρειάζεται να ανεβάσεις την άδειά σου για να συνεχίσεις.');
      return;
    }
    setError(null);
    setStep('offer');
  }

  async function submitOffer() {
    const value = Number(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      setError('Γράψε πόσα ζητάς, σε ευρώ.');
      return;
    }
    if (value > 100000) {
      setError('Το ποσό μοιάζει λάθος.');
      return;
    }
    /*
      ΤΑ «ΔΥΟ ΛΟΓΙΑ» ΕΙΝΑΙ ΠΡΟΑΙΡΕΤΙΚΑ.

      Ήταν υποχρεωτικά, με ελάχιστο δέκα χαρακτήρες. Ο server όμως ΔΕΝ τα
      απαιτεί ποτέ — μόνο η οθόνη τα επέβαλλε. Κάποιος που θέλει απλώς να πει
      «60€, μπορώ αύριο» κόβεται στη μέση για ένα κείμενο που δεν χρειάζεται
      κανείς. Το ζητούμενο είναι να φτάνουν προσφορές.
    */
    if (!declared) {
      setError('Χρειάζεται να δηλώσεις ότι μπορείς νόμιμα να το αναλάβεις.');
      return;
    }
    setError(null);
    /*
      ΠΕΡΙΜΕΝΟΥΜΕ ΤΟΝ SERVER ΠΡΙΝ ΠΟΥΜΕ «ΣΤΑΛΘΗΚΕ».

      Πριν, το `addOffer` έφευγε χωρίς αναμονή και η οθόνη πήγαινε κατευθείαν
      στο «έτοιμο». Ο server όμως απορρίπτει προσφορές για πραγματικούς λόγους
      — δείγμα, κλειστή δουλειά, δική σου δουλειά, δεύτερη προσφορά, άδεια που
      λείπει. Σε καθεμιά από αυτές ο χρήστης έβλεπε επιβεβαίωση για προσφορά
      που δεν υπήρχε πουθενά, και περίμενε απάντηση που δεν θα ερχόταν ποτέ.
    */
    setBusy(true);
    try {
      await addOffer(task.id, {
        amount: value,
        message: message.trim(),
        licenceFileName: licenceFile ?? undefined,
      });
      setStep('done');
    } catch (err: any) {
      setError(err?.message || 'Η προσφορά δεν στάλθηκε. Δοκίμασε ξανά.');
    } finally {
      setBusy(false);
    }
  }

  if (!authLoading && !user) {
    return (
      <Modal open onClose={onClose} title="Κάνε προσφορά">
        <div className="mt-5 space-y-4">
          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <div className="text-sm font-semibold text-gray-900">{task.title}</div>
            <div className="mt-1 text-xs text-gray-500">
              Προϋπολογισμός {task.budget}€ · {task.area}
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <span aria-hidden="true" className="text-lg leading-none">👋</span>
            <p className="text-xs leading-relaxed text-amber-900">
              Για να στείλεις προσφορά χρειάζεσαι λογαριασμό — <strong>δωρεάν</strong>, σε ένα
              λεπτό. Χωρίς αυτόν δεν μπορεί να σε βρει αυτός που ανέβασε τη δουλειά.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              loginModal.open('register');
            }}
            className="w-full rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            Δωρεάν εγγραφή
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              loginModal.open('login');
            }}
            className="w-full text-center text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            Έχω ήδη λογαριασμό — Σύνδεση
          </button>
        </div>
      </Modal>
    );
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
            disabled={busy || loadingStatus}
            className="w-full rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Στέλνουμε…' : 'Στείλε μου κωδικό'}
          </button>

          {/* Το λέμε ΠΡΙΝ πατήσει, όχι αφού. */}
          {smsAvailable === false && (
            <p className="rounded-xl bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
              Δεν στέλνουμε ακόμη SMS. Το νούμερο κρατιέται στον λογαριασμό σου ως{' '}
              <strong>δηλωμένο</strong> και επιβεβαιώνεται από εμάς πριν κλειδώσει η
              δουλειά. Δεν εμφανίζεται ως επαληθευμένο σε κανέναν.
            </p>
          )}
        </div>
      )}

      {/* Βήμα 2 — κωδικός */}
      {step === 'code' && (
        <div className="mt-5 space-y-4">
          <Field
            label="Ο κωδικός που έλαβες"
            hint={`Στάλθηκε με SMS στο ${phone.replace(/\s+/g, '')}. Ισχύει για 15 λεπτά.`}
          >
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className={inputClass + ' text-center text-lg tracking-[0.4em]'}
            />
          </Field>

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          <button
            type="button"
            onClick={confirmCode}
            disabled={busy}
            className="w-full rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Ελέγχουμε…' : 'Επιβεβαίωση'}
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

          {/* Αυτό εξακολουθεί να ισχύει: το αρχείο δεν αποθηκεύεται ακόμη. Το
              λέμε, αντί να αφήσουμε τον χρήστη να νομίζει ότι το στείλαμε. */}
          <p className="rounded-xl bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
            Προς το παρόν κρατάμε μόνο το <strong>όνομα</strong> του αρχείου, όχι το
            ίδιο το αρχείο. Η άδεια καταγράφεται ως «δηλωμένη» και θα σου τη
            ζητήσουμε ξανά πριν κλειδώσει η δουλειά.
          </p>
        </div>
      )}

      {/* Βήμα 4 — η προσφορά */}
      {step === 'offer' && (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {/*
              ΤΟ ΠΡΑΣΙΝΟ ✓ ΜΠΑΙΝΕΙ ΜΟΝΟ ΟΤΑΝ ΟΝΤΩΣ ΕΓΙΝΕ ΕΠΑΛΗΘΕΥΣΗ.

              Ήταν σταθερά γραμμένο «επαληθεύτηκε», ό,τι κι αν είχε γίνει πριν.
              Χωρίς πάροχο SMS δεν επαληθεύεται τίποτα, οπότε το σήμα λέει την
              αλήθεια: δηλωμένο. Ίδια λογική με την άδεια, δίπλα δίπλα.
            */}
            {smsAvailable ? (
              <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                ✓ Το κινητό σου επαληθεύτηκε
              </span>
            ) : (
              <span className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                Κινητό: δηλωμένο, σε έλεγχο
              </span>
            )}
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

          <Field
            label="Δυο λόγια (προαιρετικά)"
            hint="Γιατί να διαλέξει εσένα; Τι έχεις ξανακάνει; Βοηθάει, αλλά δεν είναι υποχρεωτικό."
          >
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
            disabled={busy}
            className="w-full rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Στέλνουμε…' : 'Στείλε την προσφορά'}
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

          {/* Αυτό ΔΕΝ ισχύει πια: η προσφορά φεύγει κανονικά στον server και τη
              βλέπει ο άνθρωπος που ανέβασε τη δουλειά. Το παλιό κείμενο έλεγε
              στον χρήστη ότι η αληθινή του προσφορά ήταν εικονική. */}
          <p className="rounded-xl bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
            Η προσφορά στάλθηκε και τη βλέπει αυτός που ανέβασε τη δουλειά. Θα σε
            ειδοποιήσουμε αν σε διαλέξει.
          </p>

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
