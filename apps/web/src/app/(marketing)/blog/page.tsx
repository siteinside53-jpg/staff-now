import { NewsletterForm } from '@/components/marketing/newsletter-form';
import { BlogList } from '@/components/marketing/blog-list';

export const metadata = { title: 'Blog & Νέα', description: 'Άρθρα, συμβουλές και νέα για την εργασία, στελέχωση και το StaffNow.' };

export default function BlogPage() {
  return (
    <>
      <section className="bg-gray-950 text-white py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">Blog</p>
          <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">Blog &amp; Νέα</h1>
          <p className="mt-6 text-lg text-gray-400">Άρθρα, συμβουλές και νέα για την εργασία και τη στελέχωση.</p>
        </div>
      </section>

      <BlogList />

      {/* Newsletter */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Μείνε ενημερωμένος</h2>
          <p className="mt-3 text-gray-600">Γράψου στο newsletter μας για νέα, συμβουλές και ενημερώσεις.</p>
          <NewsletterForm />
          <p className="mt-3 text-xs text-gray-400">Χωρίς spam. Ακύρωση ανά πάσα στιγμή.</p>
        </div>
      </section>
    </>
  );
}
