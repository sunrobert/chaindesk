'use client';

import { useMemo } from 'react';
import { useOpenOrders } from './useOpenOrders';
import { useRefPrice } from './useRefPrice';
import { buildBook } from '@/lib/book';

export type Signals = {
  // Buy pressure in [-1, 1]. +1 = all bids, -1 = all asks.
  imbalance: number;
  bidVol: number;
  askVol: number;
  spreadPct: number | null;
  // Single largest-order level in either book (for a "whale" tag).
  whale: {
    side: 'buy' | 'sell';
    price: number;
    size: number;
    pctOfBook: number;
  } | null;
  bookCount: number;
};

const WHALE_THRESHOLD = 0.15; // ≥15% of total book volume flags as whale

export function useSignals(): Signals {
  const { orders } = useOpenOrders();
  const ref = useRefPrice();

  return useMemo(() => {
    const { asks, bids } = buildBook(orders);

    const bidVol = bids.reduce((s, l) => s + l.size, 0);
    const askVol = asks.reduce((s, l) => s + l.size, 0);
    const total = bidVol + askVol;
    const imbalance = total > 0 ? (bidVol - askVol) / total : 0;

    const bestAsk = asks[0]?.price;
    const bestBid = bids[0]?.price;
    const spreadPct =
      bestAsk != null && bestBid != null && bestAsk > 0
        ? ((bestAsk - bestBid) / bestAsk) * 100
        : null;

    // Whale = largest-size level as a share of total volume.
    let whale: Signals['whale'] = null;
    const all = [...asks, ...bids];
    if (total > 0) {
      const biggest = all.reduce((max, l) =>
        l.size > max.size ? l : max,
      );
      const pct = biggest.size / total;
      if (pct >= WHALE_THRESHOLD) {
        whale = {
          side: biggest.side,
          price: biggest.price,
          size: biggest.size,
          pctOfBook: pct,
        };
      }
    }

    // Touch ref just so HMR doesn't whine — also lets future signals use it.
    void ref;

    return {
      imbalance,
      bidVol,
      askVol,
      spreadPct,
      whale,
      bookCount: orders.length,
    };
  }, [orders, ref]);
}
