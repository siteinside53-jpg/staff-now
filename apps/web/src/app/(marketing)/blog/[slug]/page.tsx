import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchAllBlogPosts, type BlogPost } from '@/lib/seo-data';

/**
 * Η σελίδα ΕΝΟΣ άρθρου.
 *
 * ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ: μέχρι τώρα τα άρθρα άνοιγαν σε παράθυρο μέσα στη λίστα
 * /blog και δεν είχαν δική τους διεύθυνση. Η Google δείχνει ΔΙΕΥΘΥΝΣΕΙΣ — αν
 * το άρθρο δεν έχει δική του, δεν μπορεί ούτε να εμφανιστεί στα αποτελέσματα
 * ούτε να μπει στις ειδήσεις, όσο καλό κι αν είναι.
 *
 * Εδώ κάθε άρθρο παίρνει σελίδα στο /blog/<slug>, με:
 *   • τίτλο και περιγραφή για τα αποτελέσματα αναζήτησης
 *   • εικόνα για την προεπισκόπηση σε Facebook/WhatsApp
 *   • δομημένα δεδομένα «NewsArticle» — έτσι το καταλαβαίνει η Google ως είδηση
 *     και όχι ως απλή σελίδα
 */

const BASE = 'https://staffnow.gr';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  const posts = await fetchAllBlogPosts();
  /*
    ΤΟ «_» ΔΕΝ ΕΙΝΑΙ ΑΡΘΡΟ — είναι απαραίτητο τέχνασμα.

    Με στατικό site, το Next αρνείται να χτίσει δυναμική διαδρομή αν η λίστα
    είναι ΕΝΤΕΛΩΣ άδεια: «Page /blog/[slug] is missing generateStaticParams()».
    Όσο δεν έχει γραφτεί κανένα άρθρο, δίνουμε μία εικονική διεύθυνση για να
    περάσει το χτίσιμο. Δεν μπαίνει στο sitemap, δεν τη βρίσκει κανείς, και
    εξαφανίζεται μόνη της με το πρώτο πραγματικό άρθρο.
  */
  if (!posts.length) return [{ slug: '_' }];
  return posts.map((p) => ({ slug: p.slug }));
}

async function getPost(slug: string): Promise<BlogPost | null> {
  const posts = await fetchAllBlogPosts();
  return posts.find((p) => p.slug === slug) || null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Το άρθρο δεν βρέθηκε' };

  const description = post.excerpt || post.content.replace(/<[^>]*>/g, '').slice(0, 155);
  const url = `${BASE}/blog/${post.slug}`;

  return {
    title: post.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url,
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at || undefined,
      images: post.cover_image_url ? [post.cover_image_url] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: post.cover_image_url ? [post.cover_image_url] : undefined,
    },
  };
}

function greekDate(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('el-GR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const url = `${BASE}/blog/${post.slug}`;
  const description = post.excerpt || post.content.replace(/<[^>]*>/g, '').slice(0, 155);

  /**
   * Τα δομημένα δεδομένα που διαβάζει η Google.
   *
   * «NewsArticle» αντί για το γενικό «Article»: είναι το είδος που εξετάζεται
   * για τις ειδήσεις και τα «Top stories». Δεν εγγυάται ότι θα μπει εκεί —
   * αυτό το κρίνει η Google — αλλά χωρίς αυτό δεν εξετάζεται καν.
   */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title.slice(0, 110),
    description,
    image: post.cover_image_url ? [post.cover_image_url] : [`${BASE}/icon-512.png`],
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at || post.published_at || undefined,
    author: { '@type': 'Organization', name: post.author || 'StaffNow', url: BASE },
    publisher: {
      '@type': 'Organization',
      name: 'StaffNow',
      logo: { '@type': 'ImageObject', url: `${BASE}/icon-512.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: 'el',
    articleSection: post.category || undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
        <Link href="/blog" className="text-sm font-medium text-blue-600 hover:underline">
          ← Πίσω στο blog
        </Link>

        <header className="mt-6">
          {post.category && (
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              {post.category}
            </p>
          )}
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-gray-900 sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
            {post.author && <span>{post.author}</span>}
            {post.published_at && (
              <time dateTime={post.published_at}>{greekDate(post.published_at)}</time>
            )}
            {post.read_time && <span>{post.read_time}</span>}
          </p>
        </header>

        {post.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image_url}
            alt=""
            className="mt-8 w-full rounded-2xl object-cover"
          />
        )}

        {post.excerpt && (
          <p className="mt-8 text-lg leading-relaxed text-gray-700">{post.excerpt}</p>
        )}

        <div
          className="prose prose-lg mt-8 max-w-none text-gray-800"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </>
  );
}
