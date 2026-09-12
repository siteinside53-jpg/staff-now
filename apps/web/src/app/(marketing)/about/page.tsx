import { AboutContent } from './about-content';

export const metadata = {
  title: 'Σχετικά με εμάς',
  description:
    'Μάθε για την ομάδα και την αποστολή του StaffNow. Αλλάζουμε τον τρόπο πρόσληψης στην Ελλάδα.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return <AboutContent />;
}
