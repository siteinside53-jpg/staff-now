import { fetchAllBlogPosts } from '@/lib/seo-data';

/**
 * Το ΞΕΧΩΡΙΣΤΟ sitemap ειδήσεων της Google.
 *
 * Δεν είναι το ίδιο με το κανονικό sitemap. Η Google το διαβάζει πολύ πιο συχνά
 * και το χρησιμοποιεί για να βρει ΦΡΕΣΚΑ άρθρα γρήγορα — μέσα σε λεπτά, όχι
 * μέρες. Είναι η μόνη τεχνική οδός για να μπει ένα άρθρο στις ειδήσεις όσο
 * είναι ακόμη επίκαιρο.
 *
 * ΚΑΝΟΝΑΣ ΤΗΣ GOOGLE: μπαίνουν μόνο άρθρα των τελευταίων 2 ημερών. Παλιότερα
 * τα αγνοεί — δεν είναι λάθος δικό μας, είναι η προδιαγραφή. Τα παλιά άρθρα
 * μένουν κανονικά στο βασικό sitemap.
 */

export const dynamic = 'force-static';

const BASE = 'https://staffnow.gr';
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const posts = await fetchAllBlogPosts();
  const cutoff = Date.now() - TWO_DAYS_MS;

  const fresh = posts.filter((p) => {
    if (!p.published_at) return false;
    const t = Date.parse(p.published_at);
    return Number.isFinite(t) && t >= cutoff;
  });

  const entries = fresh
    .map(
      (p) => `  <url>
    <loc>${BASE}/blog/${esc(p.slug)}</loc>
    <news:news>
      <news:publication>
        <news:name>StaffNow</news:name>
        <news:language>el</news:language>
      </news:publication>
      <news:publication_date>${esc(p.published_at!)}</news:publication_date>
      <news:title>${esc(p.title)}</news:title>
    </news:news>
  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${entries}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Μικρή διάρκεια: το νόημα είναι να το ξαναδιαβάζει συχνά.
      'Cache-Control': 'public, max-age=300',
    },
  });
}
