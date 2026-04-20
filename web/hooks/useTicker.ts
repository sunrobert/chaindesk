'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchTicker24h, type Ticker24h } from '@/lib/binance';

export function useTicker(intervalMs: number = 3000): Ticker24h | null {
  const q = useQuery({
    queryKey: ['binance', 'ticker24h', 'BNBUSDT'],
    queryFn: fetchTicker24h,
    refetchInterval: intervalMs,
    staleTime: intervalMs,
  });
  return q.data ?? null;
}
