'use client';

import { useEffect, useState } from 'react';

type MarketReadResponse = {
  read: string;
  updatedAt: number;
  sources: {
    orderbook: number;
    predictionMarkets: string[];
    spotPrice: number;
  };
};

/**
 * Full-width Bloomberg-style "AI MARKET READ" banner that Claude Haiku
 * generates from onchain orderbook + Binance spot + Polymarket crypto
 * prediction markets. Polls every 30s. Lives right under the SignalsStrip
 * so it's the first narrative element a viewer sees.
 */
export function MarketRead() {
  const [data, setData] = useState<MarketReadResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  // Force a re-render every second so "updated Xs ago" stays fresh.
  const [, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/orderbook-read', { cache: 'no-store' });
        const raw = await res.json();
        if (!res.ok) {
          const msg =
            typeof raw?.error === 'string' ? raw.error : `HTTP ${res.status}`;
          throw new Error(msg);
        }
        if (cancelled) return;
        setData(raw as MarketReadResponse);
        setErr(null);
      } catch (e) {
        if (cancelled) return;
        setErr((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const ageSec = data
    ? Math.max(0, Math.floor(Date.now() / 1000 - data.updatedAt))
    : null;

  return (
    <div className="flex items-stretch border-b border-border bg-panel">
      {/* LEFT: AI badge */}
      <div className="flex shrink-0 items-center gap-2 border-r border-border bg-bg px-3 py-[6px]">
        <span className="h-[6px] w-[6px] animate-pulse bg-accent" />
        <div className="flex flex-col leading-tight">
          <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-accent">
            AI · Market Read
          </span>
          <span className="num text-[9px] uppercase tracking-widest text-muted">
            Claude Haiku 4.5
          </span>
        </div>
      </div>

      {/* MIDDLE: the read text */}
      <div className="flex min-w-0 flex-1 items-center px-3 py-[6px]">
        {loading && !data && (
          <div className="flex w-full flex-col gap-1">
            <div className="h-[9px] w-[85%] animate-pulse bg-panel2" />
            <div className="h-[9px] w-[70%] animate-pulse bg-panel2" />
          </div>
        )}
        {err && !data && (
          <span className="text-[11px] text-sell">
            read unavailable: {err}
          </span>
        )}
        {data && (
          <p className="text-[11px] leading-snug text-text">{data.read}</p>
        )}
      </div>

      {/* RIGHT: sources + freshness */}
      {data && (
        <div className="hidden shrink-0 flex-col items-end justify-center border-l border-border px-3 py-[6px] leading-tight md:flex">
          <span className="num text-[9px] uppercase tracking-widest text-muted">
            {data.sources.orderbook} onchain · {data.sources.predictionMarkets.length} markets · spot ${data.sources.spotPrice.toFixed(2)}
          </span>
          <span className="num text-[9px] uppercase tracking-widest text-accent">
            {ageSec != null ? `updated ${ageSec}s ago` : ''}
          </span>
        </div>
      )}
    </div>
  );
}
