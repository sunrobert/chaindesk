'use client';

import { formatUnits } from 'viem';
import { BASE, BSCSCAN } from '@/lib/constants';
import { useRecentFills } from '@/hooks/useRecentFills';
import { shortAddr } from '@/lib/price';

export function RecentFills() {
  const { fills, isLoading } = useRecentFills();

  if (isLoading && fills.length === 0) {
    return <Empty text="Loading…" />;
  }
  if (fills.length === 0) {
    return <Empty text="No fills yet. Lights up when anyone executes." />;
  }

  return (
    <div className="bg-bg">
      {fills.map((f) => (
        <a
          key={`${f.txHash}-${String(f.orderId)}`}
          href={`${BSCSCAN}/tx/${f.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 border-b border-border/60 px-2 py-[6px] text-[11px] hover:bg-panel"
        >
          <span className="w-1 self-stretch bg-accent" />
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-widest text-accent">
                FILL #{String(f.orderId)}
              </span>
              <span className="num text-text">
                {Number(formatUnits(f.amountOut, BASE.decimals)).toFixed(4)}
              </span>
            </div>
            <div className="flex items-center justify-between text-muted">
              <span className="num text-[10px]">by {shortAddr(f.executor)}</span>
              <span className="num text-[10px] text-buy">
                +{Number(formatUnits(f.executorTip, BASE.decimals)).toFixed(4)} tip
              </span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="px-3 py-6 text-center text-[11px] text-muted">
      {text}
    </div>
  );
}
