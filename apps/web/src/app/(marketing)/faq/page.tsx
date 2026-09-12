import { FaqContent } from './faq-content';

export const metadata = {
  title: 'Συχνές Ερωτήσεις',
  description:
    'Βρες απαντήσεις στις πιο συχνές ερωτήσεις για το StaffNow. Εγγραφή, χρήση, τιμολόγηση και άλλα.',
  alternates: { canonical: '/faq' },
};

export default function FAQPage() {
  return <FaqContent />;
}
