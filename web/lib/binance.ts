import type { UTCTimestamp, CandlestickData } from 'lightweight-charts';
import { BINANCE_SYMBOL } from './constants';

/** Binance kline tuple: [openTime, open, high, low, close, volume, closeTime, ...] */
type RawKline = [number, string, string, string, string, string, number, ...unknown[]];

const KLINES_URL = 'https://api.binance.com/api/v3/klines';

export async function fetchCandles(
  interval: string = '1m',
  limit: number = 500,
): Promise<CandlestickData[]> {
  const url = `${KLINES_URL}?symbol=${BINANCE_SYMBOL}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Binance klines ${res.status}`);
  const raw = (await res.json()) as RawKline[];
  return raw.map((k) => ({
    time: Math.floor(k[0] / 1000) as UTCTimestamp,
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
  }));
}
