'use client';

import { useStats } from '@/hooks/useStats';

export function StatsBar() {
  const s = useStats();

  return (
    <div className="flex items-stretch border-b border-border bg-panel text-[10px]">
      <Label>PUBLIC ORDER BOOK · BSC</Label>
      <Stat label="Volume" value={`$${fmtUsd(s.volumeUsd)}`} />
      <Stat label="Tips to Executors" value={`$${fmtUsd(s.tipsUsd)}`} accent />
      <Stat label="Fills" value={String(s.fillCount)} />
      <Stat label="Executors" value={String(s.uniqueExecutors)} />
      <Stat label="Orders Live" value={String(s.liveOrders)} />
      <div className="ml-auto flex items-center px-3 text-[9px] uppercase tracking-widest text-muted">
        {s.isLoading ? 'indexing…' : 'no keeper · self-executing'}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 border-l border-border px-3 py-[5px]">
      <span className="text-[9px] uppercase tracking-widest text-muted">
        {label}
      </span>
      <span className={`num text-[11px] ${accent ? 'text-accent' : 'text-text'}`}>
        {value}
      </span>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center px-3 py-[5px] text-[9px] font-semibold uppercase tracking-widest text-subtext">
      {children}
    </div>
  );
}

function fmtUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0.00';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K';
  return n.toFixed(2);
}
