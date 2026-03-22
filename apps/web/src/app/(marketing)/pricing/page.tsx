import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'Τιμολόγηση - StaffNow',
  description: 'Δες τα πλάνα και τις τιμές του StaffNow. Ξεκίνα δωρεάν.',
};

const plans = [
  {
    name: 'Worker Free',
    nameEl: 'Εργαζόμενος Δωρεάν',
    price: 0,
    period: '',
    description: 'Ιδανικό για να ξεκινήσεις την αναζήτηση εργασίας.',
    badge: null,
    features: [
      'Δημιουργία προφίλ',
      'Αναζήτηση θέσεων εργασίας',
      '5 swipes ανά ημέρα',
      'Βασικό matching',
      'Ειδοποιήσεις email',
    ],
    cta: 'Ξεκίνα Δωρεάν',
    ctaLink: '/auth/register?role=worker',
    variant: 'outline' as const,
    highlighted: false,
  },
  {
    name: 'Worker Premium',
    nameEl: 'Εργαζόμενος Premium',
    price: 9,
    period: '/μήνα',
    description: 'Για σοβαρή αναζήτηση εργασίας με περισσότερες δυνατότητες.',
    badge: null,
    features: [
      'Απεριόριστα swipes',
      'Προτεραιότητα στα αποτελέσματα',
      'Δες ποιοι είδαν το προφίλ σου',
      'Προηγμένα φίλτρα αναζήτησης',
      'Ειδοποιήσεις push',
      'Σήμα Premium στο προφίλ',
    ],
    cta: 'Ξεκίνα Premium',
    ctaLink: '/auth/register?role=worker&plan=premium',
    variant: 'default' as const,
    highlighted: false,
  },
  {
    name: 'Business Basic',
    nameEl: 'Επιχείρηση Basic',
    price: 29,
    period: '/μήνα',
    description: 'Για μικρές επιχειρήσεις με βασικές ανάγκες προσλήψεων.',
    badge: null,
    features: [
      'Δημοσίευση έως 3 αγγελίες',
      '50 swipes ανά ημέρα',
      'Βασικό matching',
      'Μηνύματα με υποψηφίους',
      'Διαχείριση αιτήσεων',
      'Email υποστήριξη',
    ],
    cta: 'Ξεκίνα Basic',
    ctaLink: '/auth/register?role=business&plan=basic',
    variant: 'outline' as const,
    highlighted: false,
  },
  {
    name: 'Business Pro',
    nameEl: 'Επιχείρηση Pro',
    price: 79,
    period: '/μήνα',
    description: 'Για επιχειρήσεις που θέλουν τα μέγιστα από την πλατφόρμα.',
    badge: 'Δημοφιλές',
    features: [
      'Απεριόριστες αγγελίες',
      'Απεριόριστα swipes',
      'Προηγμένο AI matching',
      'Προτεραιότητα στα αποτελέσματα',
      'Αναλυτικά στατιστικά',
      'Ομαδική διαχείριση υποψηφίων',
      'Τηλεφωνική υποστήριξη',
      'Εξαγωγή δεδομένων',
    ],
    cta: 'Ξεκίνα Pro',
    ctaLink: '/auth/register?role=business&plan=pro',
    variant: 'default' as const,
    highlighted: true,
  },
];

export default function PricingPage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            Απλή Τιμολόγηση
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Επέλεξε το πλάνο που ταιριάζει στις ανάγκες σου. Χωρίς κρυφές
            χρεώσεις.
          </p>
        </div>

        {/* Plans */}
        <div className="mt-16 grid gap-8 lg:grid-cols-4">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative flex flex-col ${
                plan.highlighted
                  ? 'border-2 border-blue-600 shadow-lg ring-1 ring-blue-600'
                  : ''
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white px-3 py-1">
                    {plan.badge}
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-2 pt-6">
                <p className="text-sm font-medium text-gray-500">
                  {plan.nameEl}
                </p>
                <div className="mt-2 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}&euro;
                  </span>
                  {plan.period && (
                    <span className="ml-1 text-gray-500">{plan.period}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {plan.description}
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col pt-4">
                <ul className="flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <svg
                        className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  variant={plan.variant}
                  className={`mt-8 w-full ${
                    plan.highlighted
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : ''
                  }`}
                  size="lg"
                >
                  <Link href={plan.ctaLink}>{plan.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Teaser */}
        <div className="mt-20 text-center">
          <p className="text-gray-600">
            Έχεις ερωτήσεις;{' '}
            <Link
              href="/faq"
              className="font-medium text-blue-600 hover:text-blue-700 underline"
            >
              Δες τις Συχνές Ερωτήσεις
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
