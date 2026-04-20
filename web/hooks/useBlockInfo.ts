'use client';

import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';

export type BlockInfo = {
  blockNumber: bigint | null;
  latencyMs: number | null;
  lastUpdate: number | null; // ms epoch
};

/** Polls the latest block number every 2s and tracks round-trip latency. */
export function useBlockInfo(): BlockInfo {
  const client = usePublicClient();
  const [info, setInfo] = useState<BlockInfo>({
    blockNumber: null,
    latencyMs: null,
    lastUpdate: null,
  });

  useEffect(() => {
    if (!client) return;
    let stopped = false;

    const tick = async () => {
      const t0 = performance.now();
      try {
        const bn = await client.getBlockNumber();
        if (stopped) return;
        setInfo({
          blockNumber: bn,
          latencyMs: Math.round(performance.now() - t0),
          lastUpdate: Date.now(),
        });
      } catch {
        /* ignore */
      }
    };

    tick();
    const id = setInterval(tick, 2000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [client]);

  return info;
}
