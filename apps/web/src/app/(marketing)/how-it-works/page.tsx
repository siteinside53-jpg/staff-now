import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Πώς Λειτουργεί - StaffNow',
  description:
    'Μάθε πώς λειτουργεί το StaffNow σε 6 απλά βήματα. Εγγραφή, προφίλ, αναζήτηση, matching, συνομιλία, συνεργασία.',
};

const steps = [
  {
    number: 1,
    title: 'Εγγραφή',
    description:
      'Δημιούργησε δωρεάν λογαριασμό ως επιχείρηση ή εργαζόμενος. Η εγγραφή παίρνει λιγότερο από 1 λεπτό.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
      </svg>
    ),
  },
  {
    number: 2,
    title: 'Συμπλήρωσε το Προφίλ σου',
    description:
      'Πρόσθεσε τις δεξιότητες, την εμπειρία και τις προτιμήσεις σου. Αν είσαι επιχείρηση, περίγραψε τις ανάγκες σου και δημοσίευσε αγγελίες.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
  },
  {
    number: 3,
    title: 'Ανακάλυψε Ταιριάσματα',
    description:
      'Το σύστημα AI αναλύει τα δεδομένα σου και σου προτείνει τα πιο σχετικά ταιριάσματα. Κάνε swipe δεξιά στα προφίλ που σου αρέσουν.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
    ),
  },
  {
    number: 4,
    title: 'Match!',
    description:
      'Όταν και οι δύο πλευρές δείξουν ενδιαφέρον, δημιουργείται match. Λαμβάνεις ειδοποίηση αμέσως στο κινητό και τον υπολογιστή σου.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
  },
  {
    number: 5,
    title: 'Συνομιλία',
    description:
      'Ξεκίνα συνομιλία μέσω του ενσωματωμένου chat. Συζήτησε λεπτομέρειες, ωράρια, μισθό και ό,τι άλλο χρειάζεται.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
      </svg>
    ),
  },
  {
    number: 6,
    title: 'Συνεργασία',
    description:
      'Κλείσε τη συμφωνία και ξεκίνα τη συνεργασία. Αξιολόγησε την εμπειρία σου για να βοηθήσεις και άλλους χρήστες.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75" />
      </svg>
    ),
  },
];

export default function HowItWorksPage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            Πώς Λειτουργεί
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Από την εγγραφή μέχρι τη συνεργασία, σε 6 απλά βήματα
          </p>
        </div>

        {/* Steps */}
        <div className="mt-16 space-y-12">
          {steps.map((step, index) => (
            <div key={step.number} className="relative flex gap-6">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute left-7 top-16 h-full w-0.5 bg-blue-100" />
              )}
              {/* Number circle */}
              <div className="relative z-10 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                {step.icon}
              </div>
              {/* Content */}
              <div className="flex-1 pb-8">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {step.number}
                  </span>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-3 text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Ξεκίνα Τώρα - Είναι Δωρεάν
          </h2>
          <p className="mt-3 text-gray-600">
            Δημιούργησε λογαριασμό και βρες αυτό που ψάχνεις σε λίγα λεπτά.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/auth/register">Εγγραφή Δωρεάν</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/pricing">Δες τα Πλάνα</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
