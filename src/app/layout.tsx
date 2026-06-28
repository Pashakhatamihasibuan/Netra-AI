import type { Metadata, Viewport } from 'next';
import { AuthBootstrap } from '@/components/AuthBootstrap';
import { LanguageProvider } from '@/i18n/LanguageContext';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://netra-ai.vercel.app'),
  title: {
    default: 'Netra AI — Platform Pembelajaran Cerdas & Sehat',
    template: '%s | Netra AI',
  },
  description:
    'Platform pembelajaran berbasis AI untuk siswa SD Indonesia dengan pemantauan postur, jarak layar, dan kesehatan digital secara real-time. Dirancang untuk siswa, guru, orang tua, dan kepala sekolah.',
  keywords: [
    'platform belajar AI', 'edukasi SD Indonesia', 'kesehatan digital anak',
    'pembelajaran adaptif', 'monitor postur belajar', 'kuis online SD',
    'Netra AI', 'platform pendidikan sekolah dasar',
  ],
  authors: [{ name: 'Netra AI' }],
  creator: 'Netra AI',
  publisher: 'Netra AI',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    alternateLocale: 'en_US',
    url: '/',
    title: 'Netra AI — Platform Pembelajaran Cerdas & Sehat',
    description: 'Belajar lebih cerdas dan sehat dengan bantuan AI. Platform edukasi SD dengan monitor kesehatan digital real-time untuk siswa, guru, dan orang tua.',
    siteName: 'Netra AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Netra AI — Platform Pembelajaran Cerdas & Sehat',
    description: 'Belajar lebih cerdas dan sehat dengan bantuan AI.',
    creator: '@netraai',
  },
  category: 'education',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0D2B1E' },
    { media: '(prefers-color-scheme: dark)',  color: '#0D2B1E' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />
      </head>
      <body className="font-sans antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-white focus:text-[#1B8A5A] focus:font-semibold focus:rounded-lg focus:shadow-lg">
          Skip to main content
        </a>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-white focus:text-[#1B8A5A] focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:font-semibold"
        >
          Lewati ke konten utama
        </a>
        <LanguageProvider>
          <AuthBootstrap />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
