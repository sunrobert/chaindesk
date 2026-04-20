'use client';

import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { limitOrderBookAbi } from '@/lib/abi';
import { CONTRACT_ADDRESS } from '@/lib/constants';

export type Fill = {
  orderId: bigint;
  executor: `0x${string}`;
  amountOut: bigint;
  executorTip: bigint;
  txHash: `0x${string}`;
  blockNumber: bigint;
  timestamp?: number; // unix seconds, filled in after block lookup
};

const LOOKBACK_BLOCKS = 50_000n; // ~2 days on BSC testnet (3s blocks)
const MAX_FILLS = 25;

export function useRecentFills(): { fills: Fill[]; isLoading: boolean } {
  const client = usePublicClient();
  const [fills, setFills] = useState<Fill[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;
    let stopped = false;

    async function bootstrap() {
      if (!client) return;
      try {
        const latest = await client.getBlockNumber();
        const from =
          latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n;
        const logs = await client.getLogs({
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
        });
        if (stopped) return;
        const parsed: Fill[] = logs
          .map((l) => ({
            orderId: (l.args.orderId ?? 0n) as bigint,
            executor: (l.args.executor ?? '0x0') as `0x${string}`,
            amountOut: (l.args.amountOut ?? 0n) as bigint,
            executorTip: (l.args.executorTip ?? 0n) as bigint,
            txHash: l.transactionHash!,
            blockNumber: l.blockNumber!,
          }))
          .sort((a, b) => Number(b.blockNumber - a.blockNumber))
          .slice(0, MAX_FILLS);

        // Hydrate timestamps in parallel.
        const uniqBlocks = [...new Set(parsed.map((p) => p.blockNumber))];
        const tsMap = new Map<bigint, number>();
        await Promise.all(
          uniqBlocks.map(async (bn) => {
            try {
              const b = await client!.getBlock({ blockNumber: bn });
              tsMap.set(bn, Number(b.timestamp));
            } catch {
              /* ignore */
            }
          }),
        );
        for (const p of parsed) p.timestamp = tsMap.get(p.blockNumber);

        setFills(parsed);
      } catch (e) {
        // Testnet RPCs can be flaky; just stay empty.
        console.warn('fills bootstrap failed', e);
      } finally {
        if (!stopped) setLoading(false);
      }
    }

    bootstrap();

    const unwatch = client.watchContractEvent({
      address: CONTRACT_ADDRESS,
      abi: limitOrderBookAbi,
      eventName: 'OrderExecuted',
      onLogs: (logs) => {
        setFills((prev) => {
          const next: Fill[] = logs.map((l) => ({
            orderId: (l.args.orderId ?? 0n) as bigint,
            executor: (l.args.executor ?? '0x0') as `0x${string}`,
            amountOut: (l.args.amountOut ?? 0n) as bigint,
            executorTip: (l.args.executorTip ?? 0n) as bigint,
            txHash: l.transactionHash!,
            blockNumber: l.blockNumber!,
            timestamp: Math.floor(Date.now() / 1000),
          }));
          const merged = [...next, ...prev];
          // De-dupe on txHash + orderId
          const seen = new Set<string>();
          const out: Fill[] = [];
          for (const f of merged) {
            const key = `${f.txHash}-${f.orderId}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(f);
            if (out.length >= MAX_FILLS) break;
          }
          return out;
        });
      },
    });

    return () => {
      stopped = true;
      unwatch();
    };
  }, [client]);

  return { fills, isLoading };
}
