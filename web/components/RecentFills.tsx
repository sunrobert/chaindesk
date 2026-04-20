'use client';

import { formatUnits } from 'viem';
import { BASE, BSCSCAN } from '@/lib/constants';
import { useRecentFills } from '@/hooks/useRecentFills';
import { shortAddr } from '@/lib/price';

export function RecentFills() {
  const { fills, isLoading } = useRecentFills();

  if (isLoading && fills.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-[11px] text-subtext">
        loading…
      </div>
    );
  }
  if (fills.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-[11px] text-subtext">
        No fills yet. Will light up when anyone executes an order.
      </div>
    );
  }

  return (
    <div>
      {fills.map((f) => (
        <a
          key={`${f.txHash}-${String(f.orderId)}`}
          href={`${BSCSCAN}/tx/${f.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 border-b border-border/60 px-3 py-[6px] text-[11px] tab-nums hover:bg-panel2"
        >
          <span className="w-10 font-semibold text-accent">FILL</span>
          <span className="w-12 text-text">#{String(f.orderId)}</span>
          <span className="w-20 text-text">
            {Number(formatUnits(f.amountOut, BASE.decimals)).toFixed(4)}
          </span>
          <span className="w-20 text-buy">
            +{Number(formatUnits(f.executorTip, BASE.decimals)).toFixed(4)} tip
          </span>
          <span className="flex-1 text-subtext">by {shortAddr(f.executor)}</span>
        </a>
      ))}
    </div>
  );
}
