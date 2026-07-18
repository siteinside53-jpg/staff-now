import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { QueryProvider } from '@/lib/query-provider';
import { Toaster } from 'sonner';
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';
import { InstallPrompt } from '@/components/pwa/install-prompt';
import { TrackPageView } from '@/components/track-page-view';
import { CookieConsent } from '@/components/cookie-consent';
import { PushOptIn } from '@/components/push-optin';

const inter = Inter({ subsets: ['latin', 'greek'] });

export const viewport: Viewport = {
  themeColor: '#3B82F6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: {
    default: 'StaffNow – Βρες Προσωπικό & Δουλειά σε Κάθε Κλάδο | Match σε 24 Ώρες',
    template: '%s | StaffNow',
  },
  description:
    'Πλατφόρμα swipe-style που συνδέει εργοδότες & εργαζόμενους σε όλους τους κλάδους. Δες τον μισθό πριν κάνεις αίτηση. Πρόσληψη σε λιγότερο από 24 ώρες.',
  keywords: [
    // Greek primary
    'εύρεση προσωπικού',
    'εύρεση προσωπικού για σεζόν',
    'αναζήτηση προσωπικού',
    'πρόσληψη προσωπικού',
    'αναζήτηση εργασίας',
    'εύρεση εργασίας',
    'βρες δουλειά',
    'εποχιακή εργασία',
    'σεζόν εργασία',
    'αγγελίες εργασίας ελλάδα',
    'πλατφόρμα προσλήψεων',
    'εργαζόμενοι σεζόν',
    'πρόσληψη προσωπικού ξενοδοχείου',
    'πρόσληψη προσωπικού εστιατορίου',
    'εργασία τουρισμός',
    'εργασία εστίαση',
    'εργασία λιανικό εμπόριο',
    'εργασία logistics',
    // English secondary
    'find staff Greece',
    'find seasonal job Greece',
    'hospitality jobs Greece',
    'hire staff Greece',
    'job search Greece',
    'StaffNow',
  ],
  metadataBase: new URL('https://staffnow.gr'),
  manifest: '/manifest.webmanifest',
  applicationName: 'StaffNow',
  alternates: {
    canonical: '/',
    languages: {
      'el-GR': 'https://staffnow.gr',
      'en-US': 'https://staffnow.gr',
    },
  },
  appleWebApp: {
    capable: true,
    title: 'StaffNow',
    statusBarStyle: 'black-translucent',
    startupImage: ['/apple-touch-icon.png'],
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon-32.png',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'StaffNow – Βρες Προσωπικό & Δουλειά σε Κάθε Κλάδο',
    description: 'Swipe-style αντιστοίχιση εργοδοτών & εργαζομένων σε όλους τους κλάδους. Διαφάνεια μισθού & πρόσληψη σε λιγότερο από 24 ώρες.',
    url: 'https://staffnow.gr',
    siteName: 'StaffNow',
    locale: 'el_GR',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'StaffNow',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StaffNow – Βρες Προσωπικό & Δουλειά σε Κάθε Κλάδο',
    description: 'Swipe-style αντιστοίχιση εργοδοτών & εργαζομένων σε κάθε κλάδο στην Ελλάδα. Δες τον μισθό πριν την αίτηση.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

// JSON-LD structured data — Organization + WebSite (with Sitelinks Search Box)
// Helps Google build rich snippets και βελτιώνει το CTR απο Search.
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'StaffNow',
  alternateName: ['Staff Now', 'staffnow.gr'],
  url: 'https://staffnow.gr',
  logo: 'https://staffnow.gr/icon-512.png',
  description:
    'Η Νο.1 πλατφόρμα στην Ελλάδα για εύρεση προσωπικού και αναζήτηση εργασίας με AI swipe-based matching.',
  foundingDate: '2024',
  foundingLocation: {
    '@type': 'Place',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Θεσσαλονίκη',
      addressCountry: 'GR',
    },
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'support@staffnow.gr',
    availableLanguage: ['Greek', 'English'],
  },
  sameAs: ['https://staffnow.gr'],
  areaServed: {
    '@type': 'Country',
    name: 'Greece',
  },
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'StaffNow',
  url: 'https://staffnow.gr',
  inLanguage: 'el-GR',
  description:
    'Εύρεση προσωπικού & αναζήτηση εργασίας στην Ελλάδα. Πρόσληψη για σεζόν, εστίαση, φιλοξενία, λιανικό εμπόριο, logistics και άλλους κλάδους.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://staffnow.gr/dashboard/discover?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
  publisher: { '@type': 'Organization', name: 'StaffNow' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <head>
        {/* JSON-LD: Organization + WebSite (Sitelinks Search Box) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            <TrackPageView />
            {children}
            <Toaster position="top-right" richColors />
            <ServiceWorkerRegister />
            <InstallPrompt />
            <CookieConsent />
            <PushOptIn />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}