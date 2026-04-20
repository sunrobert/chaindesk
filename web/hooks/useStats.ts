'use client';

import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { BASE, CONTRACT_ADDRESS, QUOTE } from '@/lib/constants';
import { useRefPrice } from './useRefPrice';
import { useOpenOrders } from './useOpenOrders';

const LOOKBACK_BLOCKS = 200_000n; // wider than fills — we want all-time-ish stats

export type Stats = {
  fillCount: number;
  uniqueExecutors: number;
  liveOrders: number;
  volumeUsd: number;
  tipsUsd: number;
  isLoading: boolean;
};

type Fill = {
  orderId: bigint;
  executor: `0x${string}`;
  amountOut: bigint;
  executorTip: bigint;
};

type Created = {
  orderId: bigint;
  tokenOut: `0x${string}`;
};

/**
 * Aggregate stats for the "permissionless public book" strip.
 * Joins OrderExecuted with OrderCreated to know which token each
 * amountOut/tip is denominated in, then converts WBNB → USD via refPrice.
 */
export function useStats(): Stats {
  const client = usePublicClient();
  const { orders } = useOpenOrders();
  const refPrice = useRefPrice();
  const [fills, setFills] = useState<Fill[]>([]);
  const [created, setCreated] = useState<Created[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;
    let stopped = false;

    (async () => {
      try {
        const latest = await client.getBlockNumber();
        const from =
          latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n;

        const [execLogs, createdLogs] = await Promise.all([
          client.getLogs({
            address: CONTRACT_ADDRESS,
            event: {
              type: 'event',
              name: 'OrderExecuted',
              inputs: [
                { name: 'orderId', type: 'uint256', indexed: true },
                { name: 'executor', type: 'address', indexed: true },
                { name: 'amountOut', type: 'uint256', indexed: false },
                { name: 'executorTip', type: 'uint256', indexed: false },
              ],
            },
            fromBlock: from,
            toBlock: 'latest',
          }),
          client.getLogs({
            address: CONTRACT_ADDRESS,
            event: {
              type: 'event',
              name: 'OrderCreated',
              inputs: [
                { name: 'orderId', type: 'uint256', indexed: true },
                { name: 'maker', type: 'address', indexed: true },
                { name: 'tokenIn', type: 'address', indexed: true },
                { name: 'tokenOut', type: 'address', indexed: false },
                { name: 'amountIn', type: 'uint256', indexed: false },
                { name: 'minAmountOut', type: 'uint256', indexed: false },
                { name: 'deadline', type: 'uint64', indexed: false },
              ],
            },
            fromBlock: from,
            toBlock: 'latest',
          }),
        ]);

        if (stopped) return;

        setFills(
          execLogs.map((l) => ({
            orderId: (l.args.orderId ?? 0n) as bigint,
            executor: (l.args.executor ?? '0x0') as `0x${string}`,
            amountOut: (l.args.amountOut ?? 0n) as bigint,
            executorTip: (l.args.executorTip ?? 0n) as bigint,
          })),
        );
        setCreated(
          createdLogs.map((l) => ({
            orderId: (l.args.orderId ?? 0n) as bigint,
            tokenOut: (l.args.tokenOut ?? '0x0') as `0x${string}`,
          })),
        );
      } catch (e) {
        console.warn('stats fetch failed', e);
      } finally {
        if (!stopped) setLoading(false);
      }
    })();

    return () => {
      stopped = true;
    };
  }, [client]);

  // Build orderId → tokenOut map so we can denominate each fill.
  const outByOrder = new Map<string, `0x${string}`>();
  for (const c of created) outByOrder.set(c.orderId.toString(), c.tokenOut);

  const baseAddr = BASE.address.toLowerCase();
  const quoteAddr = QUOTE.address.toLowerCase();

  let volumeUsd = 0;
  let tipsUsd = 0;
  for (const f of fills) {
    const tokenOut = outByOrder.get(f.orderId.toString());
    if (!tokenOut) continue;
    const amtOut = Number(formatUnits(f.amountOut, 18));
    const tip = Number(formatUnits(f.executorTip, 18));
    const t = tokenOut.toLowerCase();
    if (t === quoteAddr) {
      // Already denominated in BUSD (~USD).
      volumeUsd += amtOut;
      tipsUsd += tip;
    } else if (t === baseAddr && refPrice != null && refPrice > 0) {
      // WBNB → USD via ref price.
      volumeUsd += amtOut * refPrice;
      tipsUsd += tip * refPrice;
    }
  }

  const activeNow = orders.filter(
    (o) =>
      o.order.active && Number(o.order.deadline) > Math.floor(Date.now() / 1000),
  ).length;

  return {
    fillCount: fills.length,
    uniqueExecutors: new Set(fills.map((f) => f.executor.toLowerCase())).size,
    liveOrders: activeNow,
    volumeUsd,
    tipsUsd,
    isLoading,
  };
}
