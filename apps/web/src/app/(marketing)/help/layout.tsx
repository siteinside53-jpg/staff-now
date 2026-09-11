import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Κέντρο Βοήθειας',
  description: 'Απαντήσεις στις πιο συχνές ερωτήσεις για το StaffNow: λογαριασμός, προφίλ, αγγελίες, matches, μηνύματα, πληρωμές.',
  alternates: { canonical: '/help' },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
