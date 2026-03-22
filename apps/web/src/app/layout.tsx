import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { QueryProvider } from '@/lib/query-provider';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin', 'greek'] });

export const metadata: Metadata = {
  title: {
    default: 'StaffNow – Βρες Προσωπικό Τουρισμού & Εστίασης',
    template: '%s | StaffNow',
  },
  description: 'Η πλατφόρμα swipe-style αντιστοίχισης για τον τουρισμό και την εστίαση στην Ελλάδα. Βρες προσωπικό γρήγορα ή βρες δουλειά εύκολα.',
  keywords: ['staffing', 'tourism', 'hospitality', 'Greece', 'jobs', 'hiring', 'τουρισμός', 'εστίαση', 'προσωπικό', 'εργασία'],
  metadataBase: new URL('https://staffnow.gr'),
  openGraph: {
    title: 'StaffNow – Βρες Προσωπικό Τουρισμού Γρήγορα',
    description: 'Swipe-style αντιστοίχιση επιχειρήσεων και εργαζομένων στον τουρισμό.',
    url: 'https://staffnow.gr',
    siteName: 'StaffNow',
    locale: 'el_GR',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}