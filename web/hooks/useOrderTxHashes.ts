'use client';

import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { CONTRACT_ADDRESS } from '@/lib/constants';

const LOOKBACK_BLOCKS = 200_000n;

/**
 * Build an orderId → creation txHash map by scanning OrderCreated logs.
 * Used to turn every row in the public book into a clickable BscScan link
 * so a judge (or a trader) can trace any visible order back to the tx that
 * created it.
 */
export function useOrderTxHashes(): Map<string, `0x${string}`> {
  const client = usePublicClient();
  const [map, setMap] = useState<Map<string, `0x${string}`>>(new Map());

  useEffect(() => {
    if (!client) return;
    let stopped = false;

    async function load() {
      if (!client) return;
      try {
        const latest = await client.getBlockNumber();
        const from =
          latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n;
        const logs = await client.getLogs({
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
        });
        if (stopped) return;
        const next = new Map<string, `0x${string}`>();
        for (const l of logs) {
          const id = l.args.orderId;
          if (id != null) next.set(id.toString(), l.transactionHash);
        }
        setMap(next);
      } catch {
        // swallow — rows just won't get tx links
      }
    }

    load();
    // Refresh every 15s so newly-created orders get traced too.
    const id = setInterval(load, 15_000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [client]);

  return map;
}
