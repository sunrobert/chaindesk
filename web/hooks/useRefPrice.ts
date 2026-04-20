'use client';

import { useTicker } from './useTicker';

/** Latest BNBUSDT reference price from Binance. Null until first fetch. */
export function useRefPrice(): number | null {
  const t = useTicker();
  return t?.lastPrice ?? null;
}
