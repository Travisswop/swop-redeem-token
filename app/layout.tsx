import './globals.css';
import { Inter } from 'next/font/google';

import { Toaster } from 'react-hot-toast';
import AppWalletProvider from '@/components/AppWalletProvider';

export const metadata = {
  title: 'Swop Token Redemption',
  description: 'Redeem and claim Solana tokens',
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
