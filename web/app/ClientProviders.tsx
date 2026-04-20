'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

// WalletConnect's keyvaluestorage touches localStorage at module init, which
// blows up under Next.js SSR. Mounting the whole provider tree client-side
// sidesteps the problem cleanly without giving up React Query / wagmi hooks.
const Providers = dynamic(
  () => import('./providers').then((m) => m.Providers),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen items-center justify-center bg-bg text-subtext">
        <div className="text-xs tracking-widest">LOADING CHAINDESK…</div>
      </div>
    ),
  },
);

export function ClientProviders({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
