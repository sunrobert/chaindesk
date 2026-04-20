'use client';

import { useSignals } from '@/hooks/useSignals';
import { formatPrice, formatSize } from '@/lib/price';

export function SignalsStrip() {
  const s = useSignals();

  const imbPct = s.imbalance * 100;
  const imbSign = imbPct >= 0 ? '+' : '';
  const imbColor =
    imbPct > 10 ? 'text-buy' : imbPct < -10 ? 'text-sell' : 'text-subtext';
  const barAbs = Math.min(50, Math.abs(imbPct)); // half-bar width in %
  const barSide = imbPct >= 0 ? 'right' : 'left';

  const spreadColor =
    s.spreadPct == null
      ? 'text-muted'
      : s.spreadPct < 0.25
        ? 'text-accent'
        : 'text-subtext';

  return (
    <div className="flex items-stretch border-b border-border bg-panel text-[10px]">
      <Label>SIGNALS</Label>

      {/* IMBALANCE with mini-bar */}
      <div className="flex items-center gap-2 border-l border-border px-3 py-[5px]">
        <span className="text-[9px] uppercase tracking-widest text-muted">
          Imbalance
        </span>
        <span className={`num text-[11px] ${imbColor}`}>
          {imbSign}
          {imbPct.toFixed(1)}%
        </span>
        <div className="relative h-[8px] w-[60px] bg-border">
          <div className="absolute inset-y-0 left-1/2 w-px bg-muted" />
          <div
            className={`absolute top-0 bottom-0 ${imbPct >= 0 ? 'bg-buy' : 'bg-sell'}`}
            style={{
              [barSide === 'right' ? 'left' : 'right']: '50%',
              width: `${barAbs}%`,
            }}
          />
        </div>
      </div>

      {/* SPREAD */}
      <div className="flex items-center gap-2 border-l border-border px-3 py-[5px]">
        <span className="text-[9px] uppercase tracking-widest text-muted">
          Spread
        </span>
        <span className={`num text-[11px] ${spreadColor}`}>
          {s.spreadPct == null ? '——' : `${s.spreadPct.toFixed(3)}%`}
        </span>
        {s.spreadPct != null && s.spreadPct < 0.25 && (
          <span className="num text-[9px] uppercase tracking-widest text-accent">
            TIGHT
          </span>
        )}
      </div>

      {/* WHALE */}
      <div className="flex items-center gap-2 border-l border-border px-3 py-[5px]">
        <span className="text-[9px] uppercase tracking-widest text-muted">
          Whale
        </span>
        {s.whale ? (
          <span className="num text-[11px] text-text">
            <span
              className={
                s.whale.side === 'buy' ? 'text-buy' : 'text-sell'
              }
            >
              {s.whale.side.toUpperCase()}
            </span>{' '}
            {formatSize(s.whale.size)} @ {formatPrice(s.whale.price)}
            <span className="ml-1 text-muted">
              ({(s.whale.pctOfBook * 100).toFixed(0)}%)
            </span>
          </span>
        ) : (
          <span className="num text-[11px] text-muted">none</span>
        )}
      </div>

      {/* BID / ASK volume totals */}
      <div className="flex items-center gap-2 border-l border-border px-3 py-[5px]">
        <span className="text-[9px] uppercase tracking-widest text-muted">
          Bid/Ask Vol
        </span>
        <span className="num text-[11px] text-buy">
          {formatSize(s.bidVol)}
        </span>
        <span className="text-muted">/</span>
        <span className="num text-[11px] text-sell">
          {formatSize(s.askVol)}
        </span>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center px-3 py-[5px] text-[9px] font-semibold uppercase tracking-widest text-accent">
      {children}
    </div>
  );
}
