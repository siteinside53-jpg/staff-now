import Link from 'next/link';

export const metadata = {
  title: 'Καριέρα - StaffNow',
  description:
    'Δουλειά στο StaffNow. Χτίζουμε το μέλλον της εργασίας στον τουρισμό. Δες τις ανοιχτές θέσεις και κάνε αίτηση.',
};

const perks = [
  {
    title: 'Remote-first',
    description: 'Δούλεψε από όπου θέλεις. Το γραφείο μας στην Αθήνα είναι πάντα ανοιχτό, αλλά δεν είναι υποχρεωτικό.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  },
  {
    title: 'Stock Options',
    description: 'Κάθε μέλος της ομάδας λαμβάνει stock options. Μεγαλώνουμε μαζί, κερδίζουμε μαζί.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
  {
    title: 'Unlimited PTO',
    description: 'Εμπιστευόμαστε την ομάδα μας. Πάρε τις μέρες που χρειάζεσαι, χωρίς όριο.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    title: 'Learning Budget',
    description: 'Ετήσιο budget για conferences, courses και βιβλία. Η μάθηση δεν σταματά ποτέ.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
  },
  {
    title: 'Team Retreats',
    description: 'Δύο φορές τον χρόνο η ομάδα συναντιέται σε ελληνικά νησιά για team building.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
  {
    title: 'Health Insurance',
    description: 'Πλήρης ιδιωτική ασφάλεια υγείας για σένα και την οικογένειά σου.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
];

const positions = [
  {
    title: 'Senior Full-Stack Engineer',
    department: 'Engineering',
    location: 'Αθήνα / Remote',
    type: 'Full-time',
    description:
      'Αναζητούμε έμπειρο full-stack engineer για να βοηθήσει στη δημιουργία και κλιμάκωση της πλατφόρμας μας. Next.js, TypeScript, PostgreSQL.',
  },
  {
    title: 'Product Designer',
    department: 'Design',
    location: 'Αθήνα / Remote',
    type: 'Full-time',
    description:
      'Ψάχνουμε product designer με εμπειρία σε B2B/B2C platforms. Θα σχεδιάσεις το user experience για χιλιάδες χρήστες.',
  },
  {
    title: 'Growth Marketing Manager',
    department: 'Marketing',
    location: 'Αθήνα / Remote',
    type: 'Full-time',
    description:
      'Θέλουμε growth marketer που θα οδηγήσει την επέκτασή μας. Performance marketing, SEO, content strategy και partnerships.',
  },
  {
    title: 'Customer Success Lead',
    department: 'Operations',
    location: 'Αθήνα',
    type: 'Full-time',
    description:
      'Αναζητούμε CS lead που θα διασφαλίσει ότι οι επιχειρήσεις-πελάτες μας παίρνουν τη μέγιστη αξία από την πλατφόρμα.',
  },
];

export default function CareersPage() {
  return (
    <>
      {/* ====== HERO ====== */}
      <section className="relative overflow-hidden bg-gray-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/95 to-gray-950/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-400">
              Καριέρα στο StaffNow
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
              Χτίζουμε το μέλλον της εργασίας στον{' '}
              <span className="text-blue-500">τουρισμό</span>
            </h1>
            <p className="mt-6 text-lg text-gray-400 leading-relaxed">
              Γίνε μέρος μιας ομάδας που αλλάζει τον τρόπο πρόσληψης στην Ελλάδα.
              Remote-first, mission-driven, fast-growing.
            </p>
            <div className="mt-10">
              <a
                href="#positions"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all"
              >
                Δες τις ανοιχτές θέσεις
                <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ====== WHY JOIN US ====== */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Γιατί StaffNow
            </p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
              Τι προσφέρουμε στην ομάδα μας
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-gray-600">
              Πιστεύουμε ότι για να χτίσεις ένα εξαιρετικό προϊόν, χρειάζεσαι μια εξαιρετική ομάδα.
              Και μια εξαιρετική ομάδα χρειάζεται τα κατάλληλα εργαλεία, ελευθερία και υποστήριξη.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {perks.map((perk) => (
              <div
                key={perk.title}
                className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                  {perk.icon}
                </div>
                <h3 className="mt-4 text-lg font-bold text-gray-900">{perk.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{perk.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== CULTURE ====== */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Κουλτούρα
              </p>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
                Πώς δουλεύουμε
              </h2>
              <div className="mt-6 space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Στο StaffNow πιστεύουμε στην αυτονομία, τη διαφάνεια και τον αμοιβαίο σεβασμό.
                  Κάθε μέλος της ομάδας έχει φωνή στις αποφάσεις που επηρεάζουν το προϊόν και την
                  εταιρεία.
                </p>
                <p>
                  Δουλεύουμε σε μικρές, αυτόνομες ομάδες με σαφείς στόχους. Χρησιμοποιούμε
                  asynchronous communication ως default και κάνουμε meetings μόνο όταν χρειάζεται
                  πραγματικά.
                </p>
                <p>
                  Η ποιότητα υπερέχει πάντα της ποσότητας. Προτιμάμε να κάνουμε λίγα πράγματα σωστά
                  παρά πολλά μέτρια. Ship fast, iterate faster.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center gap-3 text-blue-600 mb-3">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  <h3 className="font-bold text-gray-900">Move Fast</h3>
                </div>
                <p className="text-sm text-gray-600">Παίρνουμε αποφάσεις γρήγορα, δοκιμάζουμε ιδέες νωρίς, και μαθαίνουμε από τα λάθη μας.</p>
              </div>
              <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center gap-3 text-blue-600 mb-3">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  <h3 className="font-bold text-gray-900">Own Your Work</h3>
                </div>
                <p className="text-sm text-gray-600">Κάθε μέλος έχει ownership. Δεν περιμένεις εντολές &mdash; παίρνεις πρωτοβουλία.</p>
              </div>
              <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center gap-3 text-blue-600 mb-3">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                  <h3 className="font-bold text-gray-900">Be Transparent</h3>
                </div>
                <p className="text-sm text-gray-600">Μοιραζόμαστε metrics, αποφάσεις και challenges ανοιχτά με όλη την ομάδα.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== OPEN POSITIONS ====== */}
      <section id="positions" className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Ανοιχτές θέσεις
            </p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
              Γίνε μέρος της ομάδας
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-gray-600">
              Αυτές είναι οι τρέχουσες ανοιχτές θέσεις. Αν σε ενδιαφέρει κάποια, στείλε μας.
            </p>
          </div>
          <div className="mt-12 space-y-4">
            {positions.map((position) => (
              <div
                key={position.title}
                className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {position.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                      {position.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        {position.department}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        {position.location}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {position.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Link
                      href={`mailto:careers@staffnow.gr?subject=Application: ${position.title}`}
                      className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-all"
                    >
                      Κάνε αίτηση
                      <svg className="ml-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== OPEN APPLICATION CTA ====== */}
      <section className="bg-gray-950 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Δεν βλέπεις κάτι που σου ταιριάζει;
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Στείλε μας το βιογραφικό σου και θα επικοινωνήσουμε μαζί σου όταν ανοίξει μια θέση που
            ταιριάζει στο προφίλ σου.
          </p>
          <div className="mt-10">
            <Link
              href="mailto:careers@staffnow.gr?subject=Open Application"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all"
            >
              Στείλε το βιογραφικό σου
              <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
