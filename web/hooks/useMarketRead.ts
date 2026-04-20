'use client';

import { useQuery } from '@tanstack/react-query';

export type MarketReadResponse = {
  read: string;
  updatedAt: number;
  flaggedOrderIds: string[];
  sources: {
    orderbook: number;
    predictionMarkets: string[];
    spotPrice: number;
  };
};

/**
 * Shared fetcher for /api/orderbook-read. Both MarketRead (the banner) and
 * BookLadder (the book) consume this so the "Claude flagged these orderIds
 * as executable" set is consistent across the UI without a second network
 * round trip — React Query dedups by key.
 */
export function useMarketRead() {
  return useQuery<MarketReadResponse>({
    queryKey: ['marketRead'],
    queryFn: async () => {
      const res = await fetch('/api/orderbook-read', { cache: 'no-store' });
      const raw = await res.json();
      if (!res.ok) {
        const msg =
          typeof raw?.error === 'string' ? raw.error : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      return raw as MarketReadResponse;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });
}
