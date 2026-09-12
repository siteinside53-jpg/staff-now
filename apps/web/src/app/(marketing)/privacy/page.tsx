import { Tr } from '@/i18n/locale-provider';

export const metadata = {
  title: 'Πολιτική Απορρήτου',
  description: 'Πολιτική απορρήτου και προστασίας προσωπικών δεδομένων του StaffNow.',
};

export default function PrivacyPage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900">
          <Tr k="legal.privacy.title" />
        </h1>
        <p className="mt-4 text-sm text-gray-500">
          <Tr k="legal.privacy.updated" />
        </p>

        <div className="prose prose-gray mt-10 max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.privacy.s1.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.privacy.s1.p1" />
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.privacy.s2.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.privacy.s2.p1" />
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.privacy.s3.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.privacy.s3.p1" />
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-gray-700">
              <li>
                <strong><Tr k="legal.privacy.s3.li1label" /></strong> <Tr k="legal.privacy.s3.li1" />
              </li>
              <li>
                <strong><Tr k="legal.privacy.s3.li2label" /></strong> <Tr k="legal.privacy.s3.li2" />
              </li>
              <li>
                <strong><Tr k="legal.privacy.s3.li3label" /></strong> <Tr k="legal.privacy.s3.li3" />
              </li>
              <li>
                <strong><Tr k="legal.privacy.s3.li4label" /></strong> <Tr k="legal.privacy.s3.li4" />
              </li>
              <li>
                <strong><Tr k="legal.privacy.s3.li5label" /></strong> <Tr k="legal.privacy.s3.li5" />
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.privacy.s4.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.privacy.s4.p1" />
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-gray-700">
              <li><Tr k="legal.privacy.s4.li1" /></li>
              <li><Tr k="legal.privacy.s4.li2" /></li>
              <li><Tr k="legal.privacy.s4.li3" /></li>
              <li><Tr k="legal.privacy.s4.li4" /></li>
              <li><Tr k="legal.privacy.s4.li5" /></li>
              <li><Tr k="legal.privacy.s4.li6" /></li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.privacy.s5.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.privacy.s5.p1" />
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.privacy.s6.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.privacy.s6.p1" />
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-6 text-gray-700">
              <li><strong><Tr k="legal.privacy.s6.li1label" /></strong><Tr k="legal.privacy.s6.li1" /></li>
              <li><strong><Tr k="legal.privacy.s6.li2label" /></strong><Tr k="legal.privacy.s6.li2" /></li>
              <li><strong><Tr k="legal.privacy.s6.li3label" /></strong><Tr k="legal.privacy.s6.li3" /></li>
              <li><strong><Tr k="legal.privacy.s6.li4label" /></strong><Tr k="legal.privacy.s6.li4" /></li>
              <li><strong><Tr k="legal.privacy.s6.li5label" /></strong><Tr k="legal.privacy.s6.li5" /></li>
            </ul>
            <p className="mt-3 leading-relaxed text-gray-700">
              <Tr k="legal.privacy.s6.p2" />
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.privacy.s7.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.privacy.s7.p1" />
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.privacy.s8.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.privacy.s8.p1" />
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-gray-700">
              <li><Tr k="legal.privacy.s8.li1" /></li>
              <li><Tr k="legal.privacy.s8.li2" /></li>
              <li><Tr k="legal.privacy.s8.li3" /></li>
              <li><Tr k="legal.privacy.s8.li4" /></li>
              <li><Tr k="legal.privacy.s8.li5" /></li>
              <li><Tr k="legal.privacy.s8.li6" /></li>
              <li><Tr k="legal.privacy.s8.li7" /></li>
            </ul>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.privacy.s8.p2" />
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.privacy.s9.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.privacy.s9.p1" />
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.privacy.s10.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.privacy.s10.p1" />
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
