'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTicker } from '@/hooks/useTicker';
import { BASE, QUOTE, CONTRACT_ADDRESS, BSCSCAN } from '@/lib/constants';
import { shortAddr, formatPrice } from '@/lib/price';

export function Header() {
  const t = useTicker();
  const pctUp = (t?.priceChangePercent ?? 0) >= 0;

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-bg px-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-accent" />
          <div className="text-sm font-bold tracking-[0.2em] text-text">
            CHAINDESK
          </div>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-baseline gap-3">
          <span className="text-sm font-semibold tracking-wide text-text">
            {BASE.symbol}/{QUOTE.symbol}
          </span>
          <span
            className={`num text-xl font-semibold ${
              t == null
                ? 'text-muted'
                : pctUp
                  ? 'text-buy'
                  : 'text-sell'
            }`}
          >
            {t ? formatPrice(t.lastPrice) : '——'}
          </span>
          {t && (
            <span
              className={`num text-xs ${pctUp ? 'text-buy' : 'text-sell'}`}
            >
              {pctUp ? '+' : ''}
              {t.priceChange.toFixed(2)} ({pctUp ? '+' : ''}
              {t.priceChangePercent.toFixed(2)}%)
            </span>
          )}
        </div>

        <div className="hidden items-center gap-5 text-[11px] md:flex">
          <Stat label="24h HIGH" value={t ? formatPrice(t.highPrice) : '——'} />
          <Stat label="24h LOW" value={t ? formatPrice(t.lowPrice) : '——'} />
          <Stat
            label="24h VOL (BNB)"
            value={t ? t.volume.toFixed(0) : '——'}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden flex-col items-end text-[10px] leading-tight text-muted md:flex">
          <span>BSC TESTNET · 97</span>
          <a
            href={`${BSCSCAN}/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="num text-subtext hover:text-text"
          >
            {shortAddr(CONTRACT_ADDRESS)}
          </a>
        </div>
        <ConnectButton
          accountStatus={{ smallScreen: 'avatar', largeScreen: 'address' }}
          chainStatus="icon"
          showBalance={false}
        />
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[9px] uppercase tracking-widest text-muted">
        {label}
      </span>
      <span className="num text-text">{value}</span>
    </div>
  );
}
