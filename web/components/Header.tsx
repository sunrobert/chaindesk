'use client';

import { useEffect, useRef, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTicker } from '@/hooks/useTicker';
import { BASE, QUOTE, CONTRACT_ADDRESS, BSCSCAN } from '@/lib/constants';
import { shortAddr, formatPrice } from '@/lib/price';

export function Header() {
  const t = useTicker();
  const pctUp = (t?.priceChangePercent ?? 0) >= 0;

  // Price-flash: amber/cyan briefly when the last trade tick changes.
  const lastRef = useRef<number | null>(null);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  useEffect(() => {
    if (!t) return;
    const prev = lastRef.current;
    if (prev != null && t.lastPrice !== prev) {
      setFlash(t.lastPrice > prev ? 'up' : 'down');
      const id = setTimeout(() => setFlash(null), 600);
      return () => clearTimeout(id);
    }
    lastRef.current = t.lastPrice;
  }, [t]);

  // Session clock (UTC) — refreshes every second.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Synthetic bid/ask from last price + spread estimate (Binance spot doesn't
  // give us book depth for free; this is for the Bloomberg "feel" — it's the
  // same price ±1 tick, and we label it clearly).
  const last = t?.lastPrice ?? null;
  const bid = last != null ? last - 0.01 : null;
  const ask = last != null ? last + 0.01 : null;

  return (
    <header className="flex h-14 items-stretch justify-between border-b border-border bg-bg">
      <div className="flex items-stretch">
        {/* Logo block */}
        <div className="flex items-center gap-2 border-r border-border px-4">
          <div className="h-5 w-5 bg-accent" />
          <div className="text-sm font-bold tracking-[0.2em] text-text">
            CHAINDESK
            <span className="caret ml-0.5 text-accent">▌</span>
          </div>
        </div>

        {/* Symbol + LAST */}
        <div className="flex items-center gap-3 border-r border-border px-4">
          <span className="text-sm font-semibold tracking-wide text-text">
            {BASE.symbol}/{QUOTE.symbol}
          </span>
          <div
            className={`num px-1 text-xl font-semibold ${
              t == null ? 'text-muted' : pctUp ? 'text-buy' : 'text-sell'
            } ${flash === 'up' ? 'flash-up' : flash === 'down' ? 'flash-down' : ''}`}
          >
            {t ? formatPrice(t.lastPrice) : '——'}
          </div>
          {t && (
            <div className="flex flex-col leading-tight">
              <span
                className={`num text-[11px] ${pctUp ? 'text-buy' : 'text-sell'}`}
              >
                {pctUp ? '+' : ''}
                {t.priceChange.toFixed(2)}
              </span>
              <span
                className={`num text-[10px] ${pctUp ? 'text-buy' : 'text-sell'}`}
              >
                {pctUp ? '+' : ''}
                {t.priceChangePercent.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Bid / Ask / Spread cluster */}
        <div className="hidden items-center md:flex">
          <Field label="BID" value={bid != null ? formatPrice(bid) : '——'} tone="buy" />
          <Field label="ASK" value={ask != null ? formatPrice(ask) : '——'} tone="sell" />
          <Field
            label="24H HIGH"
            value={t ? formatPrice(t.highPrice) : '——'}
          />
          <Field
            label="24H LOW"
            value={t ? formatPrice(t.lowPrice) : '——'}
          />
          <Field
            label="24H VOL"
            value={t ? `${t.volume.toFixed(0)} BNB` : '——'}
          />
        </div>
      </div>

      <div className="flex items-stretch">
        {/* Session clock */}
        <div className="hidden flex-col items-end justify-center border-l border-border px-3 leading-tight md:flex">
          <span className="text-[9px] uppercase tracking-widest text-muted">
            SESSION · UTC
          </span>
          <span className="num text-[12px] text-text">
            {now.toISOString().slice(11, 19)}
          </span>
        </div>

        {/* Chain + contract */}
        <div className="hidden flex-col items-end justify-center border-l border-border px-3 leading-tight md:flex">
          <span className="text-[9px] uppercase tracking-widest text-muted">
            BSC TESTNET · 97
          </span>
          <a
            href={`${BSCSCAN}/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="num text-[11px] text-subtext hover:text-accent"
          >
            {shortAddr(CONTRACT_ADDRESS)}
          </a>
        </div>

        {/* Wallet */}
        <div className="flex items-center border-l border-border px-3">
          <ConnectButton
            accountStatus={{ smallScreen: 'avatar', largeScreen: 'address' }}
            chainStatus="icon"
            showBalance={false}
          />
        </div>
      </div>
    </header>
  );
}

function Field({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'buy' | 'sell';
}) {
  const valueColor =
    tone === 'buy' ? 'text-buy' : tone === 'sell' ? 'text-sell' : 'text-text';
  return (
    <div className="flex flex-col justify-center border-l border-border px-3 leading-tight">
      <span className="text-[9px] uppercase tracking-widest text-muted">
        {label}
      </span>
      <span className={`num text-[12px] ${valueColor}`}>{value}</span>
    </div>
  );
}
