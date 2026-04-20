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

export function MarketRead() {
  const [data, setData] = useState<MarketReadResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  // Tick state exists solely to force a re-render every second so the
  // "updated Xs ago" counter stays fresh.
  const [, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/orderbook-read', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as MarketReadResponse;
        if (cancelled) return;
        setData(json);
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

  // Tick every second to keep the "updated Xs ago" counter fresh.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const ageSec = data
    ? Math.max(0, Math.floor(Date.now() / 1000 - data.updatedAt))
    : null;

  return (
    <section className="flex min-h-0 flex-col border-b border-border bg-bg">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border bg-panel px-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtext">
          Market Read
        </h2>
        <span className="num text-[9px] uppercase tracking-widest text-accent">
          AI · HAIKU
        </span>
      </div>
      <div className="flex flex-col gap-2 px-3 py-2">
        {loading && !data && (
          <div className="space-y-1">
            <div className="h-3 w-full animate-pulse bg-panel2" />
            <div className="h-3 w-[85%] animate-pulse bg-panel2" />
            <div className="h-3 w-[70%] animate-pulse bg-panel2" />
          </div>
        )}
        {err && !data && (
          <p className="text-[11px] text-sell">read unavailable: {err}</p>
        )}
        {data && (
          <p className="text-[11px] leading-snug text-subtext">{data.read}</p>
        )}
        {data && (
          <div className="flex items-center justify-between border-t border-border pt-1">
            <span className="num text-[9px] uppercase tracking-widest text-muted">
              {data.sources.orderbook} onchain · {data.sources.predictionMarkets.length} markets · spot ${data.sources.spotPrice.toFixed(2)}
            </span>
            <span className="num text-[9px] uppercase tracking-widest text-muted">
              {ageSec != null ? `${ageSec}s ago` : ''}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
