import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Συχνές Ερωτήσεις - StaffNow',
  description:
    'Βρες απαντήσεις στις πιο συχνές ερωτήσεις για το StaffNow. Εγγραφή, χρήση, τιμολόγηση και άλλα.',
};

const faqs = [
  {
    question: 'Τι είναι το StaffNow;',
    answer:
      'Το StaffNow είναι η πρώτη swipe-style πλατφόρμα matching στην Ελλάδα ειδικά σχεδιασμένη για τον τουριστικό τομέα. Συνδέει επιχειρήσεις τουρισμού (ξενοδοχεία, εστιατόρια, μπαρ, τουριστικά γραφεία) με αξιόπιστους εργαζόμενους (σερβιτόρους, μάγειρες, ρεσεψιονίστ, bartenders κ.ά.) μέσω ενός γρήγορου και εύχρηστου συστήματος matching.',
  },
  {
    question: 'Πώς λειτουργεί το swipe matching;',
    answer:
      'Αφού δημιουργήσεις προφίλ, η πλατφόρμα σου δείχνει σχετικά προφίλ (θέσεις εργασίας αν είσαι εργαζόμενος, υποψηφίους αν είσαι επιχείρηση). Κάνεις swipe δεξιά (like) αν ένα προφίλ σε ενδιαφέρει ή swipe αριστερά (skip) αν δεν σε ενδιαφέρει. Όταν και οι δύο πλευρές κάνουν like, δημιουργείται match και μπορείτε να ξεκινήσετε συνομιλία.',
  },
  {
    question: 'Είναι δωρεάν η εγγραφή;',
    answer:
      'Ναι! Η εγγραφή και η δημιουργία προφίλ είναι εντελώς δωρεάν τόσο για εργαζόμενους όσο και για επιχειρήσεις. Οι εργαζόμενοι μπορούν να χρησιμοποιούν τη βασική έκδοση δωρεάν με 5 swipes την ημέρα. Για περισσότερες δυνατότητες, υπάρχουν τα premium πλάνα μας.',
  },
  {
    question: 'Ποια πλάνα υπάρχουν και τι κοστίζουν;',
    answer:
      'Προσφέρουμε 4 πλάνα: Worker Free (0\u20AC) για βασική αναζήτηση, Worker Premium (9\u20AC/μήνα) με απεριόριστα swipes, Business Basic (29\u20AC/μήνα) για μικρές επιχειρήσεις, και Business Pro (79\u20AC/μήνα) με απεριόριστες δυνατότητες. Όλα τα πλάνα μπορούν να ακυρωθούν οποιαδήποτε στιγμή.',
  },
  {
    question: 'Πώς προστατεύονται τα δεδομένα μου;',
    answer:
      'Η ασφάλεια των δεδομένων σου είναι προτεραιότητά μας. Χρησιμοποιούμε κρυπτογράφηση τελευταίας γενιάς (TLS/SSL) για όλες τις επικοινωνίες, ακολουθούμε πλήρως τον Κανονισμό GDPR, και δεν μοιραζόμαστε ποτέ τα δεδομένα σου με τρίτους χωρίς τη ρητή συγκατάθεσή σου. Μπορείς να διαγράψεις τον λογαριασμό σου και όλα τα δεδομένα σου οποιαδήποτε στιγμή.',
  },
  {
    question: 'Σε ποιες περιοχές είναι διαθέσιμο;',
    answer:
      'Το StaffNow είναι διαθέσιμο σε όλη την Ελλάδα. Καλύπτουμε νησιά (Σαντορίνη, Μύκονος, Κρήτη, Ρόδος, Κέρκυρα κ.ά.), ηπειρωτική χώρα (Αθήνα, Θεσσαλονίκη, Χαλκιδική κ.ά.) και κάθε τουριστικό προορισμό. Σχεδιάζουμε επέκταση σε περισσότερες χώρες στο μέλλον.',
  },
  {
    question: 'Πώς μπορώ να ακυρώσω τη συνδρομή μου;',
    answer:
      'Μπορείς να ακυρώσεις τη συνδρομή σου οποιαδήποτε στιγμή μέσα από τις ρυθμίσεις του λογαριασμού σου. Η ακύρωση ισχύει από τον επόμενο κύκλο χρέωσης. Δεν υπάρχουν ποινές ακύρωσης ή κρυφές χρεώσεις. Αν ακυρώσεις, ο λογαριασμός σου θα επιστρέψει αυτόματα στη δωρεάν έκδοση.',
  },
];

export default function FAQPage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            Συχνές Ερωτήσεις
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Βρες απαντήσεις στις πιο συνηθισμένες ερωτήσεις για το StaffNow
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="mt-12 space-y-4">
          {faqs.map((faq, index) => (
            <details
              key={index}
              className="group rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-sm"
              open={index === 0}
            >
              <summary className="flex cursor-pointer items-center justify-between px-6 py-5 text-left font-semibold text-gray-900 [&::-webkit-details-marker]:hidden">
                <span className="pr-4">{faq.question}</span>
                <svg
                  className="h-5 w-5 flex-shrink-0 text-gray-500 transition-transform group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <div className="border-t px-6 pb-5 pt-4">
                <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-16 rounded-2xl bg-gray-50 p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Δεν βρήκες αυτό που ψάχνεις;
          </h2>
          <p className="mt-2 text-gray-600">
            Στείλε μας μήνυμα και θα σου απαντήσουμε το συντομότερο.
          </p>
          <Button asChild className="mt-6">
            <Link href="/contact">Επικοινωνία</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
