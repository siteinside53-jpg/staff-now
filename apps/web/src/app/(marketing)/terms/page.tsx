import { Tr } from '@/i18n/locale-provider';

export const metadata = {
  title: 'Όροι Χρήσης',
  description: 'Όροι χρήσης της πλατφόρμας StaffNow.',
};

export default function TermsPage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900"><Tr k="legal.terms.title" /></h1>
        <p className="mt-4 text-sm text-gray-500">
          <Tr k="legal.terms.updated" />
        </p>

        <div className="prose prose-gray mt-10 max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.terms.s1.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.terms.s1.p1" />
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.terms.s2.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.terms.s2.p1" />
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.terms.s3.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.terms.s3.p1" />
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.terms.s4.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.terms.s4.p1" />
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.terms.s5.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.terms.s5.p1" />
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.terms.s6.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.terms.s6.p1" />
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.terms.s7.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.terms.s7.p1" />
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.terms.s8.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.terms.s8.p1" />
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.terms.s9.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.terms.s9.p1" />
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.terms.s10.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.terms.s10.p1" />
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
