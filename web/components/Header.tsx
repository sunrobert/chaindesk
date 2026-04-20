'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CONTRACT_ADDRESS, BSCSCAN } from '@/lib/constants';
import { shortAddr } from '@/lib/price';

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-panel px-4 py-2">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-accent" />
          <div>
            <div className="text-sm font-bold tracking-wide text-text">
              CHAINDESK
            </div>
            <div className="text-[10px] uppercase tracking-widest text-subtext">
              Onchain limit-order terminal · BSC
            </div>
          </div>
        </div>
        <div className="ml-4 hidden items-center gap-3 text-xs md:flex">
          <Badge tone="accent">BSC Testnet · 97</Badge>
          <Badge tone="muted">
            <span className="text-subtext">Contract</span>{' '}
            <a
              href={`${BSCSCAN}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="text-text underline-offset-2 hover:underline"
            >
              {shortAddr(CONTRACT_ADDRESS)}
            </a>
          </Badge>
          <Badge tone="muted">
            <span className="text-subtext">Ref price</span>{' '}
            <span className="text-text">Binance spot BNBUSDT</span>
          </Badge>
        </div>
      </div>
      <ConnectButton
        accountStatus={{ smallScreen: 'avatar', largeScreen: 'address' }}
        chainStatus="icon"
        showBalance={false}
      />
    </header>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: 'accent' | 'muted';
}) {
  const cls =
    tone === 'accent'
      ? 'border-accent/40 bg-accent/10 text-accent'
      : 'border-border bg-panel2 text-text';
  return (
    <span
      className={`rounded border ${cls} px-2 py-[2px] text-[11px] tab-nums`}
    >
      {children}
    </span>
  );
}
