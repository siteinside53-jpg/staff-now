import Link from 'next/link';
import { fetchAllJobs } from '@/lib/seo-data';

/**
 * Απλή λίστα με ΟΛΕΣ τις ανοιχτές αγγελίες, με πραγματικούς συνδέσμους.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ — ΤΟ ΣΗΜΑΝΤΙΚΟΤΕΡΟ ΓΙΑ ΤΟ SEO ΤΩΝ ΑΓΓΕΛΙΩΝ:
 *
 * Η διαδραστική λίστα από πάνω φορτώνει τις αγγελίες με JavaScript, μετά το
 * άνοιγμα της σελίδας. Ο επισκέπτης τις βλέπει κανονικά — η Google όμως όχι.
 * Στο ζωντανό site μετρήσαμε: /find-job, /categories και η αρχική είχαν
 * ΜΗΔΕΝ συνδέσμους προς αγγελίες σε όλο το HTML.
 *
 * Δηλαδή η Google γνώριζε τις αγγελίες μόνο από το sitemap. Σελίδα που δεν την
 * δείχνει κανένας σύνδεσμος θεωρείται ασήμαντη και μπαίνει τελευταία στην ουρά
 * — γι' αυτό έμεναν «Εντοπίστηκε, μη ευρετηριασμένη».
 *
 * Αυτή η λίστα γράφεται τη στιγμή που χτίζεται το site, οπότε υπάρχει μέσα στο
 * HTML. Δίνει στη Google δρόμο προς κάθε αγγελία, και στον επισκέπτη έναν
 * γρήγορο πίνακα περιεχομένων. Δεν αντικαθιστά τίποτα — προστίθεται.
 */

function loc(j: { city?: string; region?: string }): string {
  return (j.city || j.region || '').trim();
}

function company(j: { display_company_name?: string; company_name?: string }): string {
  return (j.display_company_name || j.company_name || '').trim();
}

export async function AllJobsIndex() {
  const jobs = await fetchAllJobs();
  if (!jobs.length) return null;

  return (
    <section className="border-t border-gray-200 bg-white py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl font-bold text-gray-900">
          Όλες οι ανοιχτές θέσεις ({jobs.length})
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Κάθε αγγελία με τη δική της σελίδα — μισθός, παροχές και στοιχεία επικοινωνίας.
        </p>

        <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {jobs.map((j) => {
            const city = loc(j);
            const biz = company(j);
            return (
              <li key={j.id} className="border-b border-gray-100 pb-3">
                <Link
                  href={`/jobs/${j.id}`}
                  className="text-sm font-semibold text-blue-700 hover:underline"
                >
                  {j.title}
                </Link>
                <span className="block text-xs text-gray-500">
                  {[biz, city].filter(Boolean).join(' · ')}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
