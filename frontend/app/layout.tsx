import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import '@solana/wallet-adapter-react-ui/styles.css';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin', 'cyrillic'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CoCreate — Back what gets created next',
  description: 'A Solana-powered creator funding platform with transparent escrow, participation passes and verifiable support.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="dark"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
