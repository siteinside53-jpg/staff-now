'use client';

import { useState } from 'react';
import { Modal, MockNote } from './modal';

/**
 * Όροι χρήσης του TaskNow — η «πύλη» πριν την πρώτη χρήση.
 *
 * ΓΙΑΤΙ ΞΕΧΩΡΙΣΤΟΙ ΟΡΟΙ: το TaskNow φέρνει σε επαφή ιδιώτες για αμειβόμενη
 * εργασία. Οι όροι της πλατφόρμας αγγελιών δεν καλύπτουν ούτε τη φορολογική
 * ευθύνη του εκτελεστή, ούτε το ότι δεν είμαστε συμβαλλόμενο μέρος.
 *
 * ΤΙ ΚΡΑΤΑΜΕ (στην πραγματική έκδοση): ποιος αποδέχτηκε, πότε, από ποια
 * διεύθυνση και ΠΟΙΑ ΕΚΔΟΣΗ των όρων. Χωρίς την έκδοση, μια μελλοντική αλλαγή
 * κειμένου κάνει την παλιά αποδοχή άχρηστη ως αποδεικτικό.
 *
 * Σε αυτή τη μακέτα η αποδοχή μένει μόνο στον browser.
 */

export const TASKNOW_TERMS_VERSION = 'v1';
const STORAGE_KEY = 'tasknow_terms_accepted_version';

export function hasAcceptedTaskNowTerms(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === TASKNOW_TERMS_VERSION;
  } catch {
    return false;
  }
}

export function rememberTaskNowTerms() {
  try {
    localStorage.setItem(STORAGE_KEY, TASKNOW_TERMS_VERSION);
  } catch {}
}

export function forgetTaskNowTerms() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

type Section = { title: string; body: string };

export const TASKNOW_TERMS: Section[] = [
  {
    title: '1. Τι είναι το TaskNow',
    body:
      'Το TaskNow είναι υπηρεσία προβολής και επικοινωνίας. Δείχνει μικροδουλειές που ανεβάζουν οι χρήστες και επιτρέπει σε άλλους χρήστες να κάνουν προσφορά. Το StaffNow δεν αναθέτει εργασία, δεν εκτελεί εργασία, δεν επιβλέπει και δεν εγγυάται κανένα αποτέλεσμα.',
  },
  {
    title: '2. Δεν είμαστε συμβαλλόμενο μέρος',
    body:
      'Η συμφωνία για κάθε μικροδουλειά συνάπτεται αποκλειστικά ανάμεσα σε αυτόν που την ανεβάζει και σε αυτόν που την αναλαμβάνει. Αντικείμενο, τιμή, χρόνος, τρόπος πληρωμής και ποιότητα συμφωνούνται μεταξύ τους. Δεν δημιουργείται σχέση εργασίας, εντολής ή αντιπροσώπευσης με το StaffNow.',
  },
  {
    title: '3. Χρήματα',
    body:
      'Το StaffNow δεν εισπράττει, δεν κρατά και δεν αποδίδει αμοιβές για μικροδουλειές. Οι πληρωμές γίνονται απευθείας μεταξύ των χρηστών. Δεν μεσολαβούμε σε διαφορές πληρωμής και δεν κάνουμε επιστροφές χρημάτων.',
  },
  {
    title: '4. Φόροι, ασφάλιση και άδειες',
    body:
      'Όποιος αναλαμβάνει μικροδουλειά δηλώνει ότι έχει τις νόμιμες προϋποθέσεις να παρέχει την υπηρεσία, ότι θα εκδώσει το προβλεπόμενο παραστατικό και ότι είναι αποκλειστικά υπεύθυνος για τις φορολογικές και ασφαλιστικές του υποχρεώσεις. Η δήλωση αυτή καταγράφεται πριν από την πρώτη προσφορά.',
  },
  {
    title: '5. Τι δεν επιτρέπεται',
    body:
      'Απαγορεύονται: παράνομες υπηρεσίες· ερωτικό ή συνοδευτικό περιεχόμενο· εργασίες που απαιτούν επαγγελματική άδεια την οποία δεν ελέγχουμε (ενδεικτικά ηλεκτρολογικά, φυσικό αέριο, ιατρικές, νομικές και οικονομικές υπηρεσίες)· εργασίες με προφανή κίνδυνο για πρόσωπα· και κάθε προσπάθεια παράκαμψης της πλατφόρμας με σκοπό την εξαπάτηση άλλου χρήστη.',
  },
  {
    title: '6. Επαλήθευση και ενδείξεις',
    body:
      'Όσα ανεβάζει ο ίδιος ο χρήστης — άδειες, πιστοποιητικά, ιδιότητες — εμφανίζονται ως «δηλωμένο» και δεν έχουν ελεγχθεί. Σήμα επαλήθευσης παίρνει μόνο ό,τι έχει ελεγχθεί από άνθρωπο. Καμία ένδειξη δεν αποτελεί εγγύηση ικανότητας, ποιότητας ή φερεγγυότητας.',
  },
  {
    title: '7. Η επιλογή είναι δική σου',
    body:
      'Την επιλογή του προσώπου που θα αναλάβει τη μικροδουλειά την κάνεις εσύ, με δική σου ευθύνη, αφού λάβεις υπόψη βαθμολογία, ιστορικό, επαληθεύσεις και ό,τι άλλο κρίνεις. Το ίδιο ισχύει και για την επιλογή να αναλάβεις μια μικροδουλειά.',
  },
  {
    title: '8. Ευθύνη',
    body:
      'Το StaffNow δεν ευθύνεται για ζημιές, τραυματισμούς, απώλειες, καθυστερήσεις, πλημμελή εκτέλεση ή μη πληρωμή που προκύπτουν από μικροδουλειά. Στον βαθμό που επιτρέπει ο νόμος, η συνολική μας ευθύνη περιορίζεται στα ποσά που τυχόν μας έχεις καταβάλει για την υπηρεσία τους τελευταίους δώδεκα μήνες. Ο χρήστης υποχρεούται να μας αποζημιώσει για αξιώσεις τρίτων που οφείλονται σε δικές του πράξεις ή παραλείψεις.',
  },
  {
    title: '9. Έλεγχος περιεχομένου',
    body:
      'Μπορούμε να αφαιρέσουμε μικροδουλειά ή προσφορά, να περιορίσουμε πρόσβαση ή να αναστείλουμε λογαριασμό, χωρίς προηγούμενη ειδοποίηση, όταν υπάρχει παραβίαση των όρων, βάσιμη υπόνοια απάτης ή κίνδυνος για χρήστες.',
  },
  {
    title: '10. Δεδομένα',
    body:
      'Κρατάμε ιστορικό μικροδουλειών, προσφορών, δηλώσεων και αποδοχής όρων — με ημερομηνία και διεύθυνση σύνδεσης — για την τεκμηρίωση των συναλλαγών και τη συμμόρφωση με τη νομοθεσία. Όπου προβλέπεται από τη νομοθεσία για ψηφιακές πλατφόρμες, ενδέχεται να ζητηθούν φορολογικά στοιχεία (π.χ. ΑΦΜ).',
  },
  {
    title: '11. Αλλαγές',
    body:
      'Οι όροι μπορεί να αλλάξουν. Σε ουσιώδη αλλαγή θα ζητηθεί νέα αποδοχή πριν συνεχίσεις να χρησιμοποιείς το TaskNow.',
  },
  {
    title: '12. Δίκαιο και δικαιοδοσία',
    body:
      'Εφαρμόζεται το ελληνικό δίκαιο. Αρμόδια είναι τα δικαστήρια της Θεσσαλονίκης.',
  },
];

export function TaskNowTermsGate({
  onAccept,
  onClose,
}: {
  onAccept: () => void;
  onClose: () => void;
}) {
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState(false);

  function accept() {
    if (!checked) {
      setError(true);
      return;
    }
    rememberTaskNowTerms();
    onAccept();
  }

  return (
    <Modal open onClose={onClose} title="Όροι χρήσης TaskNow">
      <p className="text-sm leading-relaxed text-gray-600">
        Πριν χρησιμοποιήσεις το TaskNow, διάβασε τι αναλαμβάνει και τι δεν
        αναλαμβάνει η πλατφόρμα. Χρειάζεται να τους αποδεχτείς μία φορά.
      </p>

      <div className="mt-4 max-h-72 space-y-4 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-4">
        {TASKNOW_TERMS.map((s) => (
          <section key={s.title}>
            <h3 className="text-sm font-semibold text-gray-900">{s.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">{s.body}</p>
          </section>
        ))}
        <p className="border-t border-gray-200 pt-3 text-[11px] text-gray-500">
          Έκδοση όρων {TASKNOW_TERMS_VERSION}
        </p>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 px-4 py-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            setChecked(e.target.checked);
            if (e.target.checked) setError(false);
          }}
          className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500"
        />
        <span className="text-xs leading-relaxed text-gray-700">
          Διάβασα και αποδέχομαι τους όρους του TaskNow. Καταλαβαίνω ότι το
          StaffNow δεν είναι εργοδότης ούτε συμβαλλόμενο μέρος, δεν κρατά χρήματα
          και ότι η επιλογή προσώπου γίνεται με δική μου ευθύνη.
        </span>
      </label>

      {error && (
        <p className="mt-2 text-xs font-medium text-red-600">
          Χρειάζεται να αποδεχτείς τους όρους για να συνεχίσεις.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
        <button
          type="button"
          onClick={accept}
          className="flex-1 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          Αποδέχομαι και συνεχίζω
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
        >
          Όχι τώρα
        </button>
      </div>

      <div className="mt-4">
        <MockNote>
          η αποδοχή μένει μόνο σε αυτόν τον browser. Στην πραγματική έκδοση
          αποθηκεύεται στον λογαριασμό με ημερομηνία, διεύθυνση σύνδεσης και
          έκδοση όρων.
        </MockNote>
      </div>
    </Modal>
  );
}
