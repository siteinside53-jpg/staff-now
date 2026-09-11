import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Επικοινωνία',
  description: 'Στείλε μας μήνυμα για οποιαδήποτε απορία σχετικά με το StaffNow — εγγραφή, αγγελίες, συνδρομές, συνεργασίες.',
  alternates: { canonical: '/contact' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
