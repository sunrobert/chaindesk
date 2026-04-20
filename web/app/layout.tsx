import './globals.css';
import type { Metadata } from 'next';
import { ClientProviders } from './ClientProviders';

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
    <html lang="en">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
