'use client';

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useEffect, useState } from 'react';
import { limitOrderBookAbi } from '@/lib/abi';
import { CONTRACT_ADDRESS } from '@/lib/constants';
import { useMyOrders } from '@/hooks/useMyOrders';
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
  const cancel = useWriteContract();
  const [pendingId, setPendingId] = useState<bigint | null>(null);
  const cancelReceipt = useWaitForTransactionReceipt({ hash: cancel.data });

  useEffect(() => {
    if (cancelReceipt.isSuccess) setPendingId(null);
  }, [cancelReceipt.isSuccess]);

  const active = orders.filter((o) => {
    const live =
      o.order.active &&
      Number(o.order.deadline) > Math.floor(Date.now() / 1000);
    return live;
  });
  const history = orders.filter((o) => {
    const live =
      o.order.active &&
      Number(o.order.deadline) > Math.floor(Date.now() / 1000);
    return !live;
  });

  if (!isConnected) {
    return (
      <EmptyState text="Connect wallet to see your orders." />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Section label={`ACTIVE · ${active.length}`}>
        {active.length === 0 ? (
          <EmptyState text="No active orders. Place one on the right." />
        ) : (
          active.map(({ id, order }) => {
            const side = orderSide(order);
            const price = orderLimitPrice(order);
            const size = orderBaseSize(order);
            if (!side || price == null || size == null) return null;
            const pending = pendingId === id && (cancel.isPending || cancelReceipt.isLoading);
            return (
              <Row
                key={String(id)}
                id={id}
                side={side}
                price={price}
                size={size}
                deadline={Number(order.deadline)}
                isActive
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
          <EmptyState text="No history yet." />
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
      <div className="sticky top-0 z-10 border-b border-border bg-panel px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-subtext">
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
  onCancel,
  cancelPending,
}: {
  id: bigint;
  side: 'buy' | 'sell';
  price: number;
  size: number;
  deadline: number;
  isActive: boolean;
  onCancel?: () => void;
  cancelPending?: boolean;
}) {
  const now = Math.floor(Date.now() / 1000);
  const ttl = deadline - now;
  return (
    <div className="flex items-center gap-2 border-b border-border/60 px-3 py-[6px] text-[11px] tab-nums">
      <span
        className={`w-10 font-semibold ${
          side === 'buy' ? 'text-buy' : 'text-sell'
        }`}
      >
        {side.toUpperCase()}
      </span>
      <span className="w-16 text-text">{formatSize(size)}</span>
      <span className="w-16 text-subtext">@</span>
      <span className="w-20 text-text">{formatPrice(price)}</span>
      <span className="flex-1 text-subtext">
        {isActive ? fmtTtl(ttl) : 'closed'}
      </span>
      <span className="w-10 text-subtext">#{String(id)}</span>
      {isActive && onCancel ? (
        <button
          onClick={onCancel}
          disabled={cancelPending}
          className="rounded border border-border bg-panel2 px-2 py-[2px] text-[10px] text-subtext hover:text-text disabled:opacity-40"
        >
          {cancelPending ? '…' : 'cancel'}
        </button>
      ) : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="px-3 py-6 text-center text-[11px] text-subtext">
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
