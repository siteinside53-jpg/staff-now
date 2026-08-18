import type { MetadataRoute } from 'next';
import { fetchAllJobs, fetchAllWorkers, fetchAllBlogPosts } from '@/lib/seo-data';

const BASE = 'https://staffnow.gr';

export const dynamic = 'force-static';

const STATIC_PATHS: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '', priority: 1.0, freq: 'daily' },
  { path: '/find-job', priority: 0.95, freq: 'hourly' },
  { path: '/find-staff', priority: 0.95, freq: 'hourly' },
  { path: '/for-businesses', priority: 0.9, freq: 'weekly' },
  { path: '/for-workers', priority: 0.9, freq: 'weekly' },
  { path: '/pricing', priority: 0.85, freq: 'monthly' },
  { path: '/how-it-works', priority: 0.8, freq: 'monthly' },
  { path: '/categories', priority: 0.8, freq: 'weekly' },
  { path: '/about', priority: 0.7, freq: 'monthly' },
  { path: '/faq', priority: 0.7, freq: 'monthly' },
  { path: '/blog', priority: 0.7, freq: 'weekly' },
  { path: '/contact', priority: 0.6, freq: 'monthly' },
  { path: '/help', priority: 0.6, freq: 'monthly' },
  { path: '/careers', priority: 0.5, freq: 'monthly' },
  { path: '/press', priority: 0.4, freq: 'monthly' },
  { path: '/terms', priority: 0.3, freq: 'yearly' },
  { path: '/privacy', priority: 0.3, freq: 'yearly' },
  { path: '/cookies', priority: 0.3, freq: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: `${BASE}${p.path}`,
    lastModified: now,
    changeFrequency: p.freq,
    priority: p.priority,
  }));

  const [jobs, workers, posts] = await Promise.all([
    fetchAllJobs(),
    fetchAllWorkers(),
    fetchAllBlogPosts(),
  ]);

  // Κάθε άρθρο με τη δική του διεύθυνση. Χωρίς αυτό η Google δεν ξέρει καν ότι
  // υπάρχουν — τα έβλεπε μόνο όποιος άνοιγε τη λίστα.
  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: post.updated_at || post.published_at || now,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }));

  const jobEntries: MetadataRoute.Sitemap = jobs.map((j) => ({
    url: `${BASE}/jobs/${j.id}`,
    lastModified: j.created_at ? new Date(j.created_at) : now,
    changeFrequency: 'daily',
    priority: 0.85,
  }));

  /*
    ΟΙ ΕΡΓΑΖΟΜΕΝΟΙ ΔΕΝ ΜΠΑΙΝΟΥΝ ΣΤΟ SITEMAP — ΕΠΙΤΗΔΕΣ.

    Ήταν 105 από τις 136 διευθύνσεις, δηλαδή το 78% του site. Το Search Console
    έδειχνε 20 καταχωρισμένες και 101 «Εντοπίστηκε — μη ευρετηριασμένη»: η
    Google τις βρήκε, είδε ότι είναι σχεδόν πανομοιότυπες και σχεδόν κενές, και
    σταμάτησε να τις διαβάζει. Ζητώντας της να ασχοληθεί με 105 κενές σελίδες,
    της παίρναμε την προσοχή από τις ΑΓΓΕΛΙΕΣ.

    Το `noindex` μπαίνει στην ίδια τη σελίδα (workers/[id]/page.tsx) — εκεί
    εξηγείται και ο δεύτερος λόγος, η ιδιωτικότητα.

    Το `workers` μένει στο Promise.all σκόπιμα: το χρειάζονται οι σελίδες ανά
    ειδικότητα και πόλη, όπου ο αριθμός διαθέσιμων είναι πραγματικό περιεχόμενο.
  */
  void workers;

  return [...staticEntries, ...blogEntries, ...jobEntries];
}
