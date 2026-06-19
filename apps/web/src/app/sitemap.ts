import type { MetadataRoute } from 'next';
import { fetchAllJobs, fetchAllWorkers } from '@/lib/seo-data';

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

  const [jobs, workers] = await Promise.all([fetchAllJobs(), fetchAllWorkers()]);

  const jobEntries: MetadataRoute.Sitemap = jobs.map((j) => ({
    url: `${BASE}/jobs/${j.id}`,
    lastModified: j.created_at ? new Date(j.created_at) : now,
    changeFrequency: 'daily',
    priority: 0.85,
  }));

  const workerEntries: MetadataRoute.Sitemap = workers.map((w) => ({
    url: `${BASE}/workers/${w.user_id}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  return [...staticEntries, ...jobEntries, ...workerEntries];
}
