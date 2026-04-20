'use client';

import { useEffect, useState } from 'react';
import { useMarketRead } from '@/hooks/useMarketRead';

/**
 * Full-width Bloomberg-style "AI MARKET READ" banner that Claude Haiku
 * generates from onchain orderbook + Binance spot + Polymarket crypto
 * prediction markets. Polls every 30s. Lives right under the SignalsStrip
 * so it's the first narrative element a viewer sees.
 *
 * Also surfaces a "flagged" count — the orderIds Claude has identified as
 * executable right now. BookLadder reads the same hook to badge those rows.
 */
export function MarketRead() {
  const { data, isLoading, error } = useMarketRead();
  // Force a re-render every second so "updated Xs ago" stays fresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const ageSec = data
    ? Math.max(0, Math.floor(Date.now() / 1000 - data.updatedAt))
    : null;
  const flagged = data?.flaggedOrderIds?.length ?? 0;

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
        {isLoading && !data && (
          <div className="flex w-full flex-col gap-1">
            <div className="h-[9px] w-[85%] animate-pulse bg-panel2" />
            <div className="h-[9px] w-[70%] animate-pulse bg-panel2" />
          </div>
        )}
        {error && !data && (
          <span className="text-[11px] text-sell">
            read unavailable: {(error as Error).message}
          </span>
        )}
        {data && (
          <p className="text-[11px] leading-snug text-text">{data.read}</p>
        )}
      </div>

      {/* RIGHT: sources + freshness + flagged count */}
      {data && (
        <div className="hidden shrink-0 flex-col items-end justify-center border-l border-border px-3 py-[6px] leading-tight md:flex">
          <span className="num text-[9px] uppercase tracking-widest text-muted">
            {data.sources.orderbook} onchain · {data.sources.predictionMarkets.length} markets · spot ${data.sources.spotPrice.toFixed(2)}
          </span>
          <span className="num text-[9px] uppercase tracking-widest text-accent">
            {flagged > 0 ? (
              <>★ {flagged} executable · </>
            ) : null}
            {ageSec != null ? `updated ${ageSec}s ago` : ''}
          </span>
        </div>
      )}
    </div>
  );
}
