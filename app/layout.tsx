import type { Metadata, Viewport } from 'next';
import { Roboto } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { GlobalProvider } from '../components/providers/GlobalProvider';
import { GoogleAnalytics } from '@next/third-parties/google';
import FloatingControls from '../components/common/FloatingControls';
import LoadingBar from '../components/layout/LoadingBar';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-roboto',
});

export const viewport: Viewport = {
  themeColor: '#feb60c',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'Crack Origins | Indie Game Development & Chronicles',
    template: '%s | Crack Origins'
  },
  description: 'Crack Origins is a premier indie game development studio crafting immersive experiences and high-performance chronicles. Join our community and explore the future of gaming.',
  metadataBase: new URL('https://crackorigins.com'),
  keywords: ['indie game dev', 'gaming blog', 'pc games', 'game development studio', 'crack origins', 'gaming chronicles'],
  authors: [{ name: 'Crack Origins Studio' }],
  creator: 'Crack Origins',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://crackorigins.com',
    siteName: 'Crack Origins',
    title: 'Crack Origins | Premium Indie Game Development',
    description: 'Immersive indie games and high-performance chronicles from the Crack Origins studio.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crack Origins | Indie Game Development',
    description: 'Explore the future of indie gaming and chronicles with Crack Origins.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://crackorigins.com',
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={roboto.variable}>
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1235859654015353"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <Script id="schema-structured-data" type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Crack Origins",
              "url": "https://crackorigins.com",
              "description": "Crack Origins is a premier indie game development studio crafting immersive experiences.",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://crackorigins.com/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            }
          `}
        </Script>
      </head>
      <body style={{ fontFamily: 'var(--font-roboto), sans-serif' }}>
        <LoadingBar />
        <GlobalProvider>
          {children}
          <FloatingControls />
        </GlobalProvider>
        <GoogleAnalytics gaId="G-NMHZKWEC88" />
      </body>
    </html>
  );
}
