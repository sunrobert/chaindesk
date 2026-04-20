'use client';

import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { BASE, CONTRACT_ADDRESS, QUOTE } from '@/lib/constants';
import { useRefPrice } from './useRefPrice';

const LOOKBACK_BLOCKS = 200_000n;

export type ExecutorRow = {
  address: `0x${string}`;
  fills: number;
  tipsUsd: number;
};

type Fill = {
  orderId: bigint;
  executor: `0x${string}`;
  executorTip: bigint;
};

type Created = {
  orderId: bigint;
  tokenOut: `0x${string}`;
};

/**
 * Leaderboard of executors ranked by cumulative tip value (in USD).
 * Joins OrderExecuted with OrderCreated to denominate each tip in the
 * correct token, then converts WBNB → USD via refPrice.
 */
export function useExecutors(): {
  executors: ExecutorRow[];
  isLoading: boolean;
} {
  const client = usePublicClient();
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
            executorTip: (l.args.executorTip ?? 0n) as bigint,
          })),
        );
        setCreated(
          createdLogs.map((l) => ({
            orderId: (l.args.orderId ?? 0n) as bigint,
            tokenOut: (l.args.tokenOut ?? '0x0') as `0x${string}`,
          })),
        );
      } catch {
        // swallow — panel will just show empty state
      } finally {
        if (!stopped) setLoading(false);
      }
    })();

    return () => {
      stopped = true;
    };
  }, [client]);

  const outByOrder = new Map<string, `0x${string}`>();
  for (const c of created) outByOrder.set(c.orderId.toString(), c.tokenOut);

  const baseAddr = BASE.address.toLowerCase();
  const quoteAddr = QUOTE.address.toLowerCase();

  const rows = new Map<string, ExecutorRow>();
  for (const f of fills) {
    const tokenOut = outByOrder.get(f.orderId.toString());
    if (!tokenOut) continue;
    const tip = Number(formatUnits(f.executorTip, 18));
    const t = tokenOut.toLowerCase();
    let tipUsd = 0;
    if (t === quoteAddr) tipUsd = tip;
    else if (t === baseAddr && refPrice != null && refPrice > 0)
      tipUsd = tip * refPrice;

    const key = f.executor.toLowerCase();
    const existing = rows.get(key) ?? {
      address: f.executor,
      fills: 0,
      tipsUsd: 0,
    };
    existing.fills += 1;
    existing.tipsUsd += tipUsd;
    rows.set(key, existing);
  }

  const executors = Array.from(rows.values()).sort(
    (a, b) => b.tipsUsd - a.tipsUsd,
  );

  return { executors, isLoading };
}
