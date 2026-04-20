'use client';

import { useEffect, useState } from 'react';
import { useBlockInfo } from '@/hooks/useBlockInfo';
import { BSCSCAN, CHAIN_ID, CONTRACT_ADDRESS } from '@/lib/constants';

export function StatusFooter({
  onOpenHelp,
}: {
  onOpenHelp?: () => void;
}) {
  const info = useBlockInfo();
  const [pulse, setPulse] = useState(false);

  // Brief amber pulse whenever a new block arrives.
  useEffect(() => {
    if (info.blockNumber == null) return;
    setPulse(true);
    const id = setTimeout(() => setPulse(false), 400);
    return () => clearTimeout(id);
  }, [info.blockNumber]);

  const latencyColor =
    info.latencyMs == null
      ? 'text-muted'
      : info.latencyMs < 250
        ? 'text-buy'
        : info.latencyMs < 800
          ? 'text-warn'
          : 'text-sell';

  return (
    <div className="flex items-stretch border-t border-border bg-panel text-[10px]">
      <Cell>
        <Dot
          className={
            info.blockNumber != null
              ? pulse
                ? 'bg-accent'
                : 'bg-buy'
              : 'bg-sell'
          }
        />
        <span className="num text-subtext">BSC · chain {CHAIN_ID}</span>
      </Cell>
      <Cell>
        <span className="text-muted">BLOCK</span>
        <span
          className={`num ${pulse ? 'text-accent' : 'text-text'} transition-colors`}
        >
          {info.blockNumber != null ? info.blockNumber.toString() : '—'}
        </span>
      </Cell>
      <Cell>
        <span className="text-muted">RPC</span>
        <span className={`num ${latencyColor}`}>
          {info.latencyMs != null ? `${info.latencyMs}ms` : '—'}
        </span>
      </Cell>
      <Cell>
        <span className="text-muted">CONTRACT</span>
        <a
          href={`${BSCSCAN}/address/${CONTRACT_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
          className="num text-accent hover:underline"
        >
          {CONTRACT_ADDRESS.slice(0, 6)}…{CONTRACT_ADDRESS.slice(-4)}
        </a>
      </Cell>

      <div className="ml-auto flex items-center">
        <FKey k="F1" alt="T" label="TICKET" />
        <FKey k="F2" alt="B" label="BOOK" />
        <FKey k="F3" alt="C" label="CHART" />
        <FKey k="F4" alt="L" label="FILLS" />
        <button
          onClick={onOpenHelp}
          className="flex items-center gap-1 border-l border-border px-3 py-[5px] text-[10px] uppercase tracking-widest text-subtext hover:bg-panel2 hover:text-accent"
          title="How it works (?)"
        >
          <span className="num text-accent">?</span>
          <span>HELP</span>
        </button>
        <div className="flex items-center gap-2 border-l border-border px-3 py-[5px]">
          <span className="text-[9px] uppercase tracking-widest text-muted">
            CHAINDESK v1 · PERMISSIONLESS LIMIT ORDER BOOK
          </span>
        </div>
      </div>
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-r border-border px-3 py-[5px]">
      {children}
    </div>
  );
}

function Dot({ className }: { className: string }) {
  return <span className={`inline-block h-[6px] w-[6px] ${className}`} />;
}

function FKey({ k, alt, label }: { k: string; alt?: string; label: string }) {
  return (
    <div className="flex items-center gap-1 border-l border-border px-3 py-[5px] text-[10px]">
      <span className="num border border-accent/70 bg-accent/10 px-[4px] text-[9px] text-accent">
        {k}
      </span>
      {alt && (
        <span className="num border border-border bg-panel2 px-[4px] text-[9px] text-subtext">
          {alt}
        </span>
      )}
      <span className="uppercase tracking-widest text-subtext">{label}</span>
    </div>
  );
}
