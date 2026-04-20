'use client';

import { useExecutors } from '@/hooks/useExecutors';
import { BSCSCAN } from '@/lib/constants';
import { shortAddr } from '@/lib/price';

const MEDAL = ['★', '☆', '•'];

export function TopExecutors() {
  const { executors, isLoading } = useExecutors();

  if (isLoading && executors.length === 0) {
    return <Empty text="Loading…" />;
  }
  if (executors.length === 0) {
    return (
      <Empty text="No fills yet. Leaderboard lights up once orders execute." />
    );
  }

  const top = executors.slice(0, 20);
  const maxTips = top[0]?.tipsUsd || 1;

  return (
    <div className="bg-bg">
      <div className="flex items-center justify-between border-b border-border px-3 py-[5px] text-[9px] uppercase tracking-widest text-muted">
        <span>RANK · EXECUTOR</span>
        <span>FILLS · TIPS EARNED</span>
      </div>
      {top.map((row, i) => {
        const pct = Math.max(2, Math.round((row.tipsUsd / maxTips) * 100));
        return (
          <a
            key={row.address}
            href={`${BSCSCAN}/address/${row.address}`}
            target="_blank"
            rel="noreferrer"
            className="relative flex items-center justify-between px-3 py-[6px] text-[11px] hover:bg-panel"
          >
            {/* Tip-value bar (fades out right-to-left) */}
            <span
              className="absolute inset-y-0 left-0 bg-accent/10"
              style={{ width: `${pct}%` }}
            />
            <div className="relative flex items-center gap-2">
              <span
                className={`num w-4 text-center text-[10px] ${
                  i < 3 ? 'text-accent' : 'text-muted'
                }`}
              >
                {i < 3 ? MEDAL[i] : i + 1}
              </span>
              <span className="num text-text">{shortAddr(row.address)}</span>
            </div>
            <div className="relative flex items-center gap-3">
              <span className="num text-[10px] text-subtext">
                {row.fills} {row.fills === 1 ? 'fill' : 'fills'}
              </span>
              <span className="num text-[11px] text-buy">
                ${row.tipsUsd < 0.01 ? '<0.01' : row.tipsUsd.toFixed(2)}
              </span>
            </div>
          </a>
        );
      })}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="px-3 py-6 text-center text-[11px] text-muted">{text}</div>
  );
}
