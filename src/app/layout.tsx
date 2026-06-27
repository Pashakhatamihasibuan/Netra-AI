import type { Metadata, Viewport } from 'next';
import { AuthBootstrap } from '@/components/AuthBootstrap';
import { LanguageProvider } from '@/i18n/LanguageContext';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Netra AI — Platform Pembelajaran Cerdas & Sehat',
    template: '%s | Netra AI',
  },
  description: 'Platform pembelajaran berbasis AI untuk siswa SD dengan pemantauan postur, jarak layar, dan kesehatan digital secara real-time. Untuk siswa, guru, dan orang tua.',
  keywords: ['platform belajar AI', 'edukasi SD', 'kesehatan digital anak', 'pembelajaran adaptif', 'monitor postur belajar', 'Netra AI'],
  authors: [{ name: 'Netra AI' }],
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    title: 'Netra AI — Platform Pembelajaran Cerdas & Sehat',
    description: 'Belajar lebih cerdas dan sehat dengan bantuan AI. Platform edukasi SD dengan monitor kesehatan digital real-time.',
    siteName: 'Netra AI',
  },
};

export const viewport: Viewport = {
  themeColor: '#0D2B1E',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="font-sans antialiased">
        <LanguageProvider>
          <AuthBootstrap />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
