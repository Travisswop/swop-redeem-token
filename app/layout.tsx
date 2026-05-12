import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { Toaster } from 'react-hot-toast';
import AppWalletProvider from '@/components/AppWalletProvider';

const title = 'SWOP Redeem';
const description =
  'Claim your token drop securely with Swop. Paste a swop.id or wallet to redeem.';
const url = 'https://redeem.swopme.app';

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title,
  description,
  applicationName: 'SWOP Redeem',
  icons: {
    icon: '/swop-icon.svg',
    shortcut: '/swop-icon.svg',
    apple: '/swop-icon.svg',
  },
  openGraph: {
    title,
    description,
    url,
    siteName: 'SWOP',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'SWOP Redeem token drop',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/opengraph-image'],
  },
};

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <AppWalletProvider>
          <main className="relative flex min-h-screen flex-col items-center justify-center">
            {children}
          </main>
        </AppWalletProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#333',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  );
}
