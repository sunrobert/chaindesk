import type { UTCTimestamp, CandlestickData } from 'lightweight-charts';
import { BINANCE_SYMBOL } from './constants';

type RawKline = [number, string, string, string, string, string, number, ...unknown[]];

const KLINES_URL = 'https://api.binance.com/api/v3/klines';
const TICKER_URL = 'https://api.binance.com/api/v3/ticker/24hr';

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

export type Ticker24h = {
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
};

export async function fetchTicker24h(): Promise<Ticker24h> {
  const url = `${TICKER_URL}?symbol=${BINANCE_SYMBOL}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Binance ticker ${res.status}`);
  const j = await res.json();
  return {
    lastPrice: Number(j.lastPrice),
    priceChange: Number(j.priceChange),
    priceChangePercent: Number(j.priceChangePercent),
    highPrice: Number(j.highPrice),
    lowPrice: Number(j.lowPrice),
    volume: Number(j.volume),
  };
}
