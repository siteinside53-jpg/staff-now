import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Τιμές & Πακέτα',
  description:
    'Διαφανείς συνδρομές StaffNow για επιχειρήσεις: Free, Starter 29€, Pro 79€, Elite 149€. Δωρεάν για εργαζόμενους. Χωρίς κρυφές χρεώσεις.',
  alternates: { canonical: '/pricing' },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
