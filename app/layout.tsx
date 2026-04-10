import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import './globals.css';
import { GlobalProvider } from '../components/providers/GlobalProvider';
import { GoogleAnalytics } from '@next/third-parties/google';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-roboto',
});

export const metadata: Metadata = {
  title: 'Crack Origins - Indie Game Development Team',
  description: 'Crack Origins is a small indie game dev team crafting the design and user experience for awesome games.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={roboto.variable}>
      <body style={{ fontFamily: 'var(--font-roboto), sans-serif' }}>
        <GlobalProvider>
          {children}
        </GlobalProvider>
        <GoogleAnalytics gaId="G-NMHZKWEC88" />
      </body>
    </html>
  );
}
