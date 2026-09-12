import { NewsletterForm } from '@/components/marketing/newsletter-form';
import { BlogList } from '@/components/marketing/blog-list';
import { Tr } from '@/i18n/locale-provider';

export const metadata = { title: 'Blog & Νέα', description: 'Άρθρα, συμβουλές και νέα για την εργασία, στελέχωση και το StaffNow.' };

export default function BlogPage() {
  return (
    <>
      <section className="bg-gray-950 text-white py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-400"><Tr k="blog.hero.eyebrow" /></p>
          <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl"><Tr k="blog.hero.title" /></h1>
          <p className="mt-6 text-lg text-gray-400"><Tr k="blog.hero.subtitle" /></p>
        </div>
      </section>

      <BlogList />

      {/* Newsletter */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900"><Tr k="blog.newsletter.title" /></h2>
          <p className="mt-3 text-gray-600"><Tr k="blog.newsletter.subtitle" /></p>
          <NewsletterForm />
          <p className="mt-3 text-xs text-gray-400"><Tr k="blog.newsletter.noSpam" /></p>
        </div>
      </section>
    </>
  );
}
