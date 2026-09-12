import { Tr } from '@/i18n/locale-provider';

export const metadata = {
  title: 'Πολιτική Cookies',
  description: 'Πληροφορίες σχετικά με τη χρήση cookies στο StaffNow.',
};

export default function CookiesPage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900"><Tr k="legal.cookies.title" /></h1>
        <p className="mt-4 text-sm text-gray-500">
          <Tr k="legal.cookies.updated" />
        </p>

        <div className="prose prose-gray mt-10 max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.cookies.s1.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.cookies.s1.p1" />
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.cookies.s2.title" />
            </h2>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900">
                <Tr k="legal.cookies.s2.s21title" />
              </h3>
              <p className="mt-2 leading-relaxed text-gray-700">
                <Tr k="legal.cookies.s2.s21p" />
              </p>

              <div className="mt-4 overflow-x-auto rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700"><Tr k="legal.cookies.s2.table.cookie" /></th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700"><Tr k="legal.cookies.s2.table.purpose" /></th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700"><Tr k="legal.cookies.s2.table.duration" /></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-3 text-gray-700">staffnow_token</td>
                      <td className="px-4 py-3 text-gray-600"><Tr k="legal.cookies.s2.table.row1purpose" /></td>
                      <td className="px-4 py-3 text-gray-600"><Tr k="legal.cookies.s2.table.row1duration" /></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-700">staffnow_cookie_consent</td>
                      <td className="px-4 py-3 text-gray-600"><Tr k="legal.cookies.s2.table.row2purpose" /></td>
                      <td className="px-4 py-3 text-gray-600"><Tr k="legal.cookies.s2.table.row2duration" /></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-700">staffnow_locale</td>
                      <td className="px-4 py-3 text-gray-600"><Tr k="legal.cookies.s2.table.row3purpose" /></td>
                      <td className="px-4 py-3 text-gray-600"><Tr k="legal.cookies.s2.table.row3duration" /></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-700">staffnow_visitor_id, staffnow_utm</td>
                      <td className="px-4 py-3 text-gray-600"><Tr k="legal.cookies.s2.table.row4purpose" /></td>
                      <td className="px-4 py-3 text-gray-600"><Tr k="legal.cookies.s2.table.row4duration" /></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-700">staffnow_push_optin, staffnow_interests_seen, staffnow_ratings_seen</td>
                      <td className="px-4 py-3 text-gray-600"><Tr k="legal.cookies.s2.table.row5purpose" /></td>
                      <td className="px-4 py-3 text-gray-600"><Tr k="legal.cookies.s2.table.row5duration" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900">
                <Tr k="legal.cookies.s2.s22title" />
              </h3>
              <p className="mt-2 leading-relaxed text-gray-700">
                <Tr k="legal.cookies.s2.s22p" />
              </p>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900">
                <Tr k="legal.cookies.s2.s23title" />
              </h3>
              <p className="mt-2 leading-relaxed text-gray-700">
                <Tr k="legal.cookies.s2.s23p" />
              </p>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900">
                <Tr k="legal.cookies.s2.s24title" />
              </h3>
              <p className="mt-2 leading-relaxed text-gray-700">
                <Tr k="legal.cookies.s2.s24p" />
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.cookies.s3.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.cookies.s3.p1" />
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.cookies.s4.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.cookies.s4.p1" />
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.cookies.s5.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.cookies.s5.p1" />
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              <Tr k="legal.cookies.s6.title" />
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              <Tr k="legal.cookies.s6.p1" />
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
