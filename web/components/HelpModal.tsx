'use client';

import { useEffect } from 'react';
import { BSCSCAN, CONTRACT_ADDRESS } from '@/lib/constants';

export function HelpModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[86vh] w-full max-w-[720px] overflow-auto border border-border bg-bg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-panel px-4 py-[8px]">
          <div className="flex items-center gap-2">
            <span className="num text-[11px] text-accent">?</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-text">
              ChainDesk · How It Works
            </span>
          </div>
          <button
            onClick={onClose}
            className="border border-border px-2 py-[2px] text-[10px] uppercase tracking-widest text-subtext hover:bg-panel2 hover:text-accent"
          >
            ESC
          </button>
        </div>

        <div className="flex flex-col gap-5 p-5 text-[12px] leading-[1.55] text-subtext">
          <Section title="TL;DR">
            <p>
              ChainDesk is a public, permissionless limit order book on BSC.
              Every open order — yours and everyone else&apos;s — is visible
              on the chart, in the ladder, and in the signals strip.
              Orders execute themselves when the DEX price crosses, because
              whoever runs the swap keeps positive slippage as a tip.
              No keeper network. No private orderbook.
            </p>
          </Section>

          <Section title="The Mechanism">
            <Bullet>
              <Strong>Maker</Strong> approves an ERC-20 and calls{' '}
              <Code>createOrder(tokenIn, tokenOut, amountIn, minAmountOut, deadline)</Code>.
              The contract escrows <Code>tokenIn</Code> and pins the implicit
              limit price at <Code>minAmountOut / amountIn</Code>.
            </Bullet>
            <Bullet>
              <Strong>Executor</Strong> (anyone) calls{' '}
              <Code>executeOrder(orderId, path)</Code> when the DEX price
              crosses. The swap is routed through PancakeSwap V2. The maker
              gets exactly their <Code>minAmountOut</Code>; the executor
              pockets everything above it as a tip.
            </Bullet>
            <Bullet>
              <Strong>Why it&apos;s self-healing:</Strong> the tip scales
              with how far past the limit the DEX moved. The deeper the
              cross, the more profitable to execute — so orders fill fast
              without ChainDesk running any bots.
            </Bullet>
          </Section>

          <Section title="Why Public Books Matter">
            <p>
              CEX limit books are private. Robinhood Legend shows{' '}
              <em>your</em> orders. ChainDesk shows{' '}
              <em>everyone&apos;s</em>, because BSC is public. That turns
              the order book into a read-only market-structure tool:
              imbalance, whale orders, tight spreads, and historical
              executor tips are all derivable from pure onchain data, no
              indexer required.
            </p>
          </Section>

          <Section title="Safety">
            <Bullet>
              <Strong>CEI pattern</Strong> — order flipped to inactive
              before any external call.
            </Bullet>
            <Bullet>
              <Strong>ReentrancyGuard</Strong> on every state-mutating
              function.
            </Bullet>
            <Bullet>
              <Strong>Output measured by balance delta</Strong>, not router
              return value — defends against weird ERC-20 behavior.
            </Bullet>
            <Bullet>
              <Strong>No fee-on-transfer, no native BNB</Strong> — wrap to
              WBNB first using the panel on the right.
            </Bullet>
          </Section>

          <Section title="Tech">
            <p className="num text-[11px]">
              Solidity 0.8.20 · Foundry · OpenZeppelin · PancakeSwap V2 ·
              Next.js · wagmi + viem · lightweight-charts · React Query
            </p>
            <p>
              Contract:{' '}
              <a
                href={`${BSCSCAN}/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="num text-accent hover:underline"
              >
                {CONTRACT_ADDRESS}
              </a>
            </p>
          </Section>

          <Section title="Keyboard">
            <Bullet>
              <Code>?</Code> or <Code>H</Code> — open this help
            </Bullet>
            <Bullet>
              <Code>Esc</Code> — close
            </Bullet>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
        {title}
      </div>
      <div className="flex flex-col gap-2 text-text/85">{children}</div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="text-accent">›</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-text">{children}</span>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="num border border-border bg-panel px-[4px] py-[1px] text-[11px] text-accent">
      {children}
    </code>
  );
}
