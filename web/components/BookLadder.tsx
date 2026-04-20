'use client';

import { useMemo } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect } from 'react';
import { limitOrderBookAbi } from '@/lib/abi';
import { BASE, QUOTE, CONTRACT_ADDRESS, BSCSCAN } from '@/lib/constants';
import { useOpenOrders } from '@/hooks/useOpenOrders';
import { useRefPrice } from '@/hooks/useRefPrice';
import { useOrderTxHashes } from '@/hooks/useOrderTxHashes';
import { buildBook, isCrossable, type BookLevel } from '@/lib/book';
import { formatPrice, formatSize, shortAddr } from '@/lib/price';

const MAX_LEVELS = 12; // per side

export function BookLadder() {
  const { address } = useAccount();
  const { orders } = useOpenOrders();
  const ref = useRefPrice();
  const txByOrder = useOrderTxHashes();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const { asks, bids } = useMemo(() => buildBook(orders), [orders]);
  const askSlice = asks.slice(0, MAX_LEVELS).reverse(); // best ask at bottom
  const bidSlice = bids.slice(0, MAX_LEVELS);

  // Cumulative depth for bar width visualization
  const maxCum = useMemo(() => {
    let aCum = 0;
    let bCum = 0;
    for (const l of asks.slice(0, MAX_LEVELS)) aCum = Math.max(aCum, (aCum += l.size));
    for (const l of bids.slice(0, MAX_LEVELS)) bCum = Math.max(bCum, (bCum += l.size));
    // recompute properly
    let a = 0, b = 0, m = 0;
    for (const l of asks.slice(0, MAX_LEVELS)) { a += l.size; if (a > m) m = a; }
    for (const l of bids.slice(0, MAX_LEVELS)) { b += l.size; if (b > m) m = b; }
    return m || 1;
  }, [asks, bids]);

  const execute = useWriteContract();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const receipt = useWaitForTransactionReceipt({ hash: execute.data });

  useEffect(() => {
    if (receipt.isSuccess) setPendingKey(null);
  }, [receipt.isSuccess]);

  const onExecute = (level: BookLevel) => {
    // Take the FIRST order at this level. Simple path via direct pair.
    const orderId = level.orderIds[0];
    const tokenIn = level.side === 'sell' ? BASE.address : QUOTE.address;
    const tokenOut = level.side === 'sell' ? QUOTE.address : BASE.address;
    const path = [tokenIn, tokenOut];
    setPendingKey(`${level.side}-${String(orderId)}`);
    execute.writeContract({
      address: CONTRACT_ADDRESS,
      abi: limitOrderBookAbi,
      functionName: 'executeOrder',
      args: [orderId, path],
    });
  };

  // Collect every individual orderId across every crossable level, skipping
  // the user's own orders (can't execute yourself).
  const crossableOrders = useMemo(() => {
    const all = [...asks, ...bids];
    const out: { orderId: bigint; side: 'buy' | 'sell' }[] = [];
    for (const lvl of all) {
      if (!isCrossable(lvl.side, lvl.price, ref)) continue;
      for (let i = 0; i < lvl.orderIds.length; i++) {
        const maker = lvl.makers[i];
        if (
          address &&
          maker &&
          maker.toLowerCase() === address.toLowerCase()
        ) {
          continue;
        }
        out.push({ orderId: lvl.orderIds[i], side: lvl.side });
      }
    }
    return out;
  }, [asks, bids, ref, address]);

  const [batchIdx, setBatchIdx] = useState<number | null>(null);
  const batchActive = batchIdx !== null;
  const batchTotal = crossableOrders.length;

  const runBatch = async () => {
    if (batchTotal === 0 || batchActive) return;
    for (let i = 0; i < crossableOrders.length; i++) {
      const { orderId, side } = crossableOrders[i];
      setBatchIdx(i + 1);
      const tokenIn = side === 'sell' ? BASE.address : QUOTE.address;
      const tokenOut = side === 'sell' ? QUOTE.address : BASE.address;
      try {
        // writeContractAsync returns the tx hash (or throws on user reject).
        // Fire and forget — we don't wait for receipt here, so the next
        // wallet popup appears as soon as the previous is signed.
        await execute.writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: limitOrderBookAbi,
          functionName: 'executeOrder',
          args: [orderId, [tokenIn, tokenOut]],
        });
      } catch {
        // User rejected or tx failed — abort the rest of the batch.
        break;
      }
    }
    setBatchIdx(null);
  };

  const bestAsk = asks[0]?.price;
  const bestBid = bids[0]?.price;
  const spread =
    bestAsk != null && bestBid != null
      ? (bestAsk - bestBid).toFixed(4)
      : '——';
  const spreadPct =
    bestAsk != null && bestBid != null && bestAsk > 0
      ? `${((bestAsk - bestBid) / bestAsk * 100).toFixed(2)}%`
      : '——';

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <Header />

      {/* ASKS (sells) — rendered top→bottom with best ask at the bottom */}
      <div className="flex-1 min-h-0 overflow-auto">
        {askSlice.length === 0 && (
          <Empty text="No sell orders." />
        )}
        {askSlice.map((lvl) => (
          <LevelRow
            key={`sell-${lvl.price}`}
            lvl={lvl}
            maxCum={maxCum}
            myAddress={address}
            refPrice={ref}
            onExecute={onExecute}
            pendingKey={pendingKey}
            isExecuting={execute.isPending || receipt.isLoading}
            txByOrder={txByOrder}
            expanded={expandedKey === `sell-${lvl.price}`}
            onToggle={() =>
              setExpandedKey((k) =>
                k === `sell-${lvl.price}` ? null : `sell-${lvl.price}`,
              )
            }
          />
        ))}
      </div>

      {/* SPREAD row */}
      <div className="flex items-center justify-between border-y border-border bg-panel px-2 py-[5px] text-[10px]">
        <span className="text-muted">REF</span>
        <span className="num text-accent">
          {ref != null ? formatPrice(ref) : '——'}
        </span>
        <span className="text-muted">SPREAD</span>
        <span className="num text-subtext">
          {spread} · {spreadPct}
        </span>
      </div>

      {/* Execute-all row: only visible when there's someone else's crossable order. */}
      {batchTotal > 0 && (
        <button
          onClick={runBatch}
          disabled={batchActive}
          className="border-b border-border bg-accent/10 py-[6px] text-center text-[10px] font-semibold uppercase tracking-widest text-accent hover:bg-accent/20 disabled:opacity-60"
        >
          {batchActive
            ? `Executing ${batchIdx}/${batchTotal}…`
            : `⚡ Execute ${batchTotal} crossable order${batchTotal === 1 ? '' : 's'}`}
        </button>
      )}

      {/* BIDS (buys) */}
      <div className="flex-1 min-h-0 overflow-auto">
        {bidSlice.length === 0 && (
          <Empty text="No buy orders." />
        )}
        {bidSlice.map((lvl) => (
          <LevelRow
            key={`buy-${lvl.price}`}
            lvl={lvl}
            maxCum={maxCum}
            myAddress={address}
            refPrice={ref}
            onExecute={onExecute}
            pendingKey={pendingKey}
            isExecuting={execute.isPending || receipt.isLoading}
            txByOrder={txByOrder}
            expanded={expandedKey === `buy-${lvl.price}`}
            onToggle={() =>
              setExpandedKey((k) =>
                k === `buy-${lvl.price}` ? null : `buy-${lvl.price}`,
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="sticky top-0 z-10 grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-border bg-panel px-2 py-[4px] text-[9px] uppercase tracking-widest text-muted">
      <span>Price</span>
      <span className="text-right">Size</span>
      <span className="text-right">Orders</span>
      <span className="w-[54px] text-right">Exec</span>
    </div>
  );
}

function LevelRow({
  lvl,
  maxCum,
  myAddress,
  refPrice,
  onExecute,
  pendingKey,
  isExecuting,
  txByOrder,
  expanded,
  onToggle,
}: {
  lvl: BookLevel;
  maxCum: number;
  myAddress?: `0x${string}`;
  refPrice: number | null;
  onExecute: (l: BookLevel) => void;
  pendingKey: string | null;
  isExecuting: boolean;
  txByOrder: Map<string, `0x${string}`>;
  expanded: boolean;
  onToggle: () => void;
}) {
  // Width of background bar (simple per-level proportion, not cumulative)
  const barPct = Math.min(100, (lvl.size / maxCum) * 100);
  const crossable = isCrossable(lvl.side, lvl.price, refPrice);
  const isMine =
    myAddress &&
    lvl.makers.some((m) => m.toLowerCase() === myAddress.toLowerCase());
  const key = `${lvl.side}-${String(lvl.orderIds[0])}`;
  const pending = pendingKey === key && isExecuting;
  const color = lvl.side === 'sell' ? 'text-sell' : 'text-buy';
  const bg =
    lvl.side === 'sell'
      ? 'from-sell/20 to-sell/5'
      : 'from-buy/20 to-buy/5';

  return (
    <div className="relative">
      <div
        className={`absolute inset-y-0 right-0 bg-gradient-to-l ${bg}`}
        style={{ width: `${barPct}%` }}
      />
      <button
        onClick={onToggle}
        className="relative grid w-full grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 px-2 py-[3px] text-[11px] text-left hover:bg-panel"
        title={expanded ? 'Hide order details' : 'Show each order + BscScan tx'}
      >
        <span className={`num ${color}`}>{formatPrice(lvl.price)}</span>
        <span className="num text-right text-text">{formatSize(lvl.size)}</span>
        <span className="num text-right text-muted">
          <span className="underline decoration-dotted decoration-muted/60 underline-offset-2">
            {lvl.orderIds.length}
          </span>
          {isMine ? <span className="ml-1 text-accent">●</span> : null}
          <span className="ml-1 text-[8px] text-muted">
            {expanded ? '▾' : '▸'}
          </span>
        </span>
        <div className="w-[54px] text-right">
          {crossable && !isMine ? (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!isExecuting) onExecute(lvl);
              }}
              className="inline-block border border-accent bg-accent/10 px-1 py-[1px] text-[9px] font-semibold uppercase tracking-widest text-accent hover:bg-accent/20"
            >
              {pending ? '…' : 'exec'}
            </span>
          ) : isMine ? (
            <span className="text-[9px] uppercase tracking-widest text-muted">
              yours
            </span>
          ) : (
            <span className="text-[9px] uppercase tracking-widest text-muted">
              —
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="relative border-y border-border/70 bg-panel/60 px-2 py-[4px]">
          {lvl.orderIds.map((id, i) => {
            const txHash = txByOrder.get(id.toString());
            const maker = lvl.makers[i];
            const mine =
              myAddress && maker.toLowerCase() === myAddress.toLowerCase();
            return (
              <div
                key={String(id)}
                className="flex items-center justify-between gap-2 py-[2px] text-[10px]"
              >
                <span className="num text-accent">#{String(id)}</span>
                <a
                  href={`${BSCSCAN}/address/${maker}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`num hover:underline ${mine ? 'text-accent' : 'text-subtext'}`}
                  title={maker}
                >
                  {shortAddr(maker)}
                  {mine ? ' · you' : ''}
                </a>
                {txHash ? (
                  <a
                    href={`${BSCSCAN}/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="num text-[9px] uppercase tracking-widest text-accent hover:underline"
                  >
                    tx ↗
                  </a>
                ) : (
                  <span className="num text-[9px] uppercase tracking-widest text-muted">
                    tx —
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="px-3 py-6 text-center text-[11px] text-muted">{text}</div>
  );
}
