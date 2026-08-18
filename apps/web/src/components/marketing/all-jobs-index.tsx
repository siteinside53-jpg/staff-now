import Link from 'next/link';
import { fetchAllJobs } from '@/lib/seo-data';

/**
 * Ανοιχτές θέσεις, γραμμένες μέσα στη σελίδα τη στιγμή του χτισίματος.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ: η διαδραστική λίστα φορτώνει με JavaScript μετά το άνοιγμα.
 * Ο επισκέπτης τη βλέπει — η Google όμως χρειάζεται ΔΕΥΤΕΡΟ πέρασμα για να
 * εκτελέσει τη JavaScript, και αυτό μπαίνει σε ουρά που μπορεί να αργήσει
 * μέρες. Ό,τι είναι ήδη γραμμένο στη σελίδα το διαβάζει αμέσως. Μετρημένο στο
 * ζωντανό site: αρχική και /find-job είχαν ΜΗΔΕΝ συνδέσμους προς αγγελίες.
 *
 * ΓΙΑΤΙ ΕΧΕΙ ΟΡΙΟ: με 12 αγγελίες μια πλήρης λίστα είναι μια χαρά. Με 1.000
 * θα ήταν παράλογη — και για τον επισκέπτη και για τη Google, που δεν θέλει
 * χιλιάδες συνδέσμους στριμωγμένους σε μία σελίδα.
 *
 *   • Αρχική  → οι τελευταίες λίγες, σαν κανονική ενότητα «τι υπάρχει τώρα»
 *   • /find-job → όλες, μέχρι ένα λογικό ταβάνι
 *
 * Όταν οι αγγελίες ξεπεράσουν το ταβάνι, η σωστή συνέχεια είναι σελιδοποίηση
 * (/find-job/2, /3 …) — όπως κάνει κάθε πλατφόρμα αγγελιών.
 */

/** Πάνω από αυτό, μία σελίδα δεν είναι πια χρήσιμη ούτε για άνθρωπο ούτε για μηχανή. */
const MAX_ON_ONE_PAGE = 200;

function loc(j: { city?: string; region?: string }): string {
  return (j.city || j.region || '').trim();
}

function company(j: { display_company_name?: string; company_name?: string }): string {
  return (j.display_company_name || j.company_name || '').trim();
}

export async function AllJobsIndex({
  limit,
  title,
  showAllLink = false,
}: {
  /** Πόσες να δείξει. Χωρίς αυτό, όλες (μέχρι το ταβάνι). */
  limit?: number;
  title?: string;
  /** Κουμπί «δες όλες» — μπαίνει όταν κόβουμε τη λίστα. */
  showAllLink?: boolean;
}) {
  const all = await fetchAllJobs();
  if (!all.length) return null;

  const jobs = all.slice(0, limit ?? MAX_ON_ONE_PAGE);
  const hidden = all.length - jobs.length;

  return (
    <section className="border-t border-gray-100 bg-white py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
              {title || `Ανοιχτές θέσεις (${all.length})`}
            </h2>
            <p className="mt-1.5 text-sm text-gray-600">
              Κάθε αγγελία με τη δική της σελίδα — μισθός, παροχές και στοιχεία επικοινωνίας.
            </p>
          </div>
          {showAllLink && (
            <Link
              href="/find-job"
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              Δες όλες τις θέσεις →
            </Link>
          )}
        </div>

        <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((j) => {
            const city = loc(j);
            const biz = company(j);
            return (
              <li key={j.id}>
                <Link
                  href={`/jobs/${j.id}`}
                  className="flex h-full flex-col rounded-2xl border border-gray-200 p-4 transition hover:border-blue-400 hover:shadow-md"
                >
                  <span className="text-sm font-semibold leading-snug text-gray-900">
                    {j.title}
                  </span>
                  <span className="mt-2 text-xs text-gray-500">
                    {[biz, city].filter(Boolean).join(' · ')}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {hidden > 0 && (
          <p className="mt-6 text-sm text-gray-600">
            <Link href="/find-job" className="font-semibold text-blue-700 hover:underline">
              + {hidden} ακόμη θέσεις
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
