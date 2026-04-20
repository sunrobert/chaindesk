'use client';

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useEffect, useState } from 'react';
import { limitOrderBookAbi } from '@/lib/abi';
import { CONTRACT_ADDRESS } from '@/lib/constants';
import { useMyOrders } from '@/hooks/useMyOrders';
import { useRefPrice } from '@/hooks/useRefPrice';
import {
  formatPrice,
  formatSize,
  orderBaseSize,
  orderLimitPrice,
  orderSide,
} from '@/lib/price';

export function MyOrders() {
  const { isConnected } = useAccount();
  const { orders } = useMyOrders();
  const ref = useRefPrice();
  const cancel = useWriteContract();
  const [pendingId, setPendingId] = useState<bigint | null>(null);
  const cancelReceipt = useWaitForTransactionReceipt({ hash: cancel.data });

  useEffect(() => {
    if (cancelReceipt.isSuccess) setPendingId(null);
  }, [cancelReceipt.isSuccess]);

  const active = orders.filter(
    (o) => o.order.active && Number(o.order.deadline) > Math.floor(Date.now() / 1000),
  );
  const history = orders.filter(
    (o) =>
      !(o.order.active && Number(o.order.deadline) > Math.floor(Date.now() / 1000)),
  );

  if (!isConnected) {
    return (
      <Empty text="Connect wallet to see your orders." />
    );
  }

  return (
    <div className="flex h-full flex-col bg-bg">
      <Section label={`ACTIVE · ${active.length}`}>
        {active.length === 0 ? (
          <Empty text="No active orders." />
        ) : (
          active.map(({ id, order }) => {
            const side = orderSide(order);
            const price = orderLimitPrice(order);
            const size = orderBaseSize(order);
            if (!side || price == null || size == null) return null;
            const pending =
              pendingId === id &&
              (cancel.isPending || cancelReceipt.isLoading);
            return (
              <Row
                key={String(id)}
                id={id}
                side={side}
                price={price}
                size={size}
                deadline={Number(order.deadline)}
                isActive
                refPrice={ref}
                onCancel={() => {
                  setPendingId(id);
                  cancel.writeContract({
                    address: CONTRACT_ADDRESS,
                    abi: limitOrderBookAbi,
                    functionName: 'cancelOrder',
                    args: [id],
                  });
                }}
                cancelPending={pending}
              />
            );
          })
        )}
      </Section>

      <Section label={`HISTORY · ${history.length}`}>
        {history.length === 0 ? (
          <Empty text="No history." />
        ) : (
          history.map(({ id, order }) => {
            const side = orderSide(order);
            const price = orderLimitPrice(order);
            const size = orderBaseSize(order);
            if (!side || price == null || size == null) return null;
            return (
              <Row
                key={String(id)}
                id={id}
                side={side}
                price={price}
                size={size}
                deadline={Number(order.deadline)}
                isActive={false}
              />
            );
          })
        )}
      </Section>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-border bg-panel px-2 py-[4px] text-[9px] font-semibold uppercase tracking-widest text-muted">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Row({
  id,
  side,
  price,
  size,
  deadline,
  isActive,
  refPrice,
  onCancel,
  cancelPending,
}: {
  id: bigint;
  side: 'buy' | 'sell';
  price: number;
  size: number;
  deadline: number;
  isActive: boolean;
  refPrice?: number | null;
  onCancel?: () => void;
  cancelPending?: boolean;
}) {
  const now = Math.floor(Date.now() / 1000);
  const ttl = deadline - now;
  // Distance-to-fill: positive = needs to move in maker's favor to cross.
  //   SELL crosses when market >= limit: distance = (limit - ref)/ref (>0 = above market)
  //   BUY  crosses when market <= limit: distance = (ref - limit)/ref (>0 = below market)
  let distPct: number | null = null;
  if (isActive && refPrice != null && refPrice > 0) {
    distPct =
      side === 'sell'
        ? ((price - refPrice) / refPrice) * 100
        : ((refPrice - price) / refPrice) * 100;
  }
  return (
    <div className="group flex items-center gap-2 border-b border-border/60 px-2 py-[6px] text-[11px] hover:bg-panel">
      <span
        className={`w-1 self-stretch ${side === 'buy' ? 'bg-buy' : 'bg-sell'}`}
      />
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] font-semibold tracking-widest ${side === 'buy' ? 'text-buy' : 'text-sell'}`}
          >
            {side.toUpperCase()}
          </span>
          <span className="num text-text">{formatPrice(price)}</span>
        </div>
        <div className="flex items-center justify-between text-muted">
          <span className="num text-[10px]">
            {formatSize(size)} · #{String(id)}
          </span>
          <span className="num text-[10px]">
            {isActive ? fmtTtl(ttl) : 'closed'}
          </span>
        </div>
        {distPct != null && (
          <div className="flex justify-end">
            <span
              className={`num text-[9px] ${
                distPct <= 0 ? 'text-accent' : 'text-muted'
              }`}
            >
              {distPct <= 0 ? 'CROSSABLE · ' : ''}
              {distPct >= 0 ? '+' : ''}
              {distPct.toFixed(2)}% to fill
            </span>
          </div>
        )}
      </div>
      {isActive && onCancel ? (
        <button
          onClick={onCancel}
          disabled={cancelPending}
          className="hidden border border-border bg-panel2 px-2 py-[2px] text-[10px] uppercase tracking-widest text-subtext hover:text-sell group-hover:block disabled:opacity-40"
        >
          {cancelPending ? '…' : 'cancel'}
        </button>
      ) : null}
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

function fmtTtl(seconds: number): string {
  if (seconds <= 0) return 'expired';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
