import './globals.css';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ClientProviders } from './ClientProviders';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

// wagmi/RainbowKit touch localStorage — skip static prerender.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'ChainDesk — Onchain Limit Orders',
  description:
    'Pro-trader terminal for PancakeSwap on BNB Chain. The chart shows every open limit order in the pool — because BSC is public.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
