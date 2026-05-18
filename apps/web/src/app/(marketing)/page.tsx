import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata = {
  title: 'StaffNow - Βρες Προσωπικό Τουρισμού Γρήγορα',
  description:
    'Η πιο γρήγορη πλατφόρμα εύρεσης προσωπικού στον τουρισμό. Swipe-style matching για επιχειρήσεις και εργαζόμενους.',
};

const steps = [
  {
    number: '01',
    title: 'Δημιούργησε Προφίλ',
    description:
      'Συμπλήρωσε τα στοιχεία σου ως επιχείρηση ή εργαζόμενος σε λιγότερο από 2 λεπτά.',
  },
  {
    number: '02',
    title: 'Ανακάλυψε Ταιριάσματα',
    description:
      'Το σύστημα AI σου προτείνει τα καλύτερα ταιριάσματα. Κάνε swipe δεξιά για να δείξεις ενδιαφέρον.',
  },
  {
    number: '03',
    title: 'Συνδέσου & Συνεργάσου',
    description:
      'Όταν υπάρξει αμοιβαίο ενδιαφέρον, ξεκινήστε συνομιλία και κλείστε τη συνεργασία.',
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 py-20 sm:py-28 lg:py-36">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Βρες Προσωπικό Τουρισμού Γρήγορα
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-blue-100 sm:text-xl">
              Η πρώτη swipe-style πλατφόρμα matching στην Ελλάδα για τον
              τουρισμό. Επιχειρήσεις και εργαζόμενοι βρίσκονται σε δευτερόλεπτα,
              όχι εβδομάδες.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto bg-white text-blue-700 hover:bg-blue-50 font-semibold px-8 py-3 text-base">
                <Link href="/auth/register?role=business">
                  Είμαι Επιχείρηση
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-white text-white hover:bg-white/10 font-semibold px-8 py-3 text-base"
              >
                <Link href="/auth/register?role=worker">
                  Ψάχνω Δουλειά
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Πώς Λειτουργεί
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Τρία απλά βήματα για να βρεις αυτό που ψάχνεις
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                  {step.number}
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900">
                  {step.title}
                </h3>
                <p className="mt-3 text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Whom */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Για Ποιους Είναι το StaffNow
            </h2>
          </div>
          <div className="mt-16 grid gap-8 lg:grid-cols-2">
            {/* Business Card */}
            <Card className="border-2 border-blue-100 transition-shadow hover:shadow-lg">
              <CardContent className="p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Για Επιχειρήσεις
                </h3>
                <p className="mt-3 text-gray-600">
                  Ξενοδοχεία, εστιατόρια, μπαρ, τουριστικά γραφεία και κάθε
                  επιχείρηση τουρισμού που χρειάζεται αξιόπιστο προσωπικό
                  γρήγορα.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    'Δημοσίευσε αγγελίες σε δευτερόλεπτα',
                    'Βρες προεπιλεγμένους υποψηφίους',
                    'Επικοινώνησε άμεσα μέσω chat',
                    'Διαχειρίσου πολλαπλές θέσεις εργασίας',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-8 w-full" size="lg">
                  <Link href="/auth/register?role=business">
                    Ξεκίνα ως Επιχείρηση
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Worker Card */}
            <Card className="border-2 border-emerald-100 transition-shadow hover:shadow-lg">
              <CardContent className="p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
                  <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Για Εργαζόμενους
                </h3>
                <p className="mt-3 text-gray-600">
                  Σερβιτόροι, μάγειρες, ρεσεψιονίστ, bartenders, καμαριέρες
                  και κάθε επαγγελματίας τουρισμού που ψάχνει εργασία.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    'Δημιούργησε προφίλ δωρεάν',
                    'Λάβε προτάσεις από επιχειρήσεις',
                    'Κάνε swipe για να βρεις τη θέση σου',
                    'Επικοινώνησε απευθείας με εργοδότες',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" className="mt-8 w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50" size="lg">
                  <Link href="/auth/register?role=worker">
                    Ξεκίνα ως Εργαζόμενος
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Τι Λένε οι Χρήστες μας
            </h2>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                name: 'Μαρία Κ.',
                role: 'Ξενοδόχος, Σαντορίνη',
                quote:
                  'Βρήκα 3 σερβιτόρους σε μια εβδομάδα. Η διαδικασία ήταν πολύ πιο γρήγορη από τα παραδοσιακά sites αγγελιών.',
              },
              {
                name: 'Γιώργος Π.',
                role: 'Bartender, Μύκονος',
                quote:
                  'Το swipe matching είναι τέλειο. Βλέπω μόνο θέσεις που με ενδιαφέρουν και μπορώ να επικοινωνήσω αμέσως.',
              },
              {
                name: 'Ελένη Μ.',
                role: 'Εστιατόριο, Κρήτη',
                quote:
                  'Εξαιρετική πλατφόρμα! Η ποιότητα των υποψηφίων είναι πολύ υψηλή και η διαδικασία απλή.',
              },
            ].map((testimonial) => (
              <Card key={testimonial.name} className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="mb-4 flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-700 italic">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="mt-4 border-t pt-4">
                    <p className="font-semibold text-gray-900">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {testimonial.role}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-blue-600 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Έτοιμος να Ξεκινήσεις;
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Εγγράψου δωρεάν σε λιγότερο από 2 λεπτά και βρες τον ιδανικό
            υποψήφιο ή τη θέση εργασίας που ψάχνεις.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto bg-white text-blue-700 hover:bg-blue-50 font-semibold px-8">
              <Link href="/auth/register">Δημιούργησε Λογαριασμό</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-white text-white hover:bg-white/10 font-semibold px-8"
            >
              <Link href="/pricing">Δες τα Πλάνα</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
