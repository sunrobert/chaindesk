import { formatUnits } from 'viem';
import type { OrderTuple } from './abi';
import { BASE, QUOTE } from './constants';

export type OrderSide = 'buy' | 'sell';

/**
 * Classify an order relative to BASE/QUOTE (WBNB/BUSD).
 * - tokenIn == BASE, tokenOut == QUOTE  → SELL (user giving up base to receive quote)
 * - tokenIn == QUOTE, tokenOut == BASE  → BUY (user spending quote to receive base)
 */
export function orderSide(o: Pick<OrderTuple, 'tokenIn' | 'tokenOut'>): OrderSide | null {
  const ti = o.tokenIn.toLowerCase();
  const to = o.tokenOut.toLowerCase();
  const base = BASE.address.toLowerCase();
  const quote = QUOTE.address.toLowerCase();
  if (ti === base && to === quote) return 'sell';
  if (ti === quote && to === base) return 'buy';
  return null;
}

/**
 * Implied limit price in QUOTE per BASE units (i.e. BUSD per WBNB).
 * Both tokens are 18-decimals on BSC testnet, so the ratio is already correct
 * once we treat the numbers as decimals.
 */
export function orderLimitPrice(o: OrderTuple): number | null {
  const side = orderSide(o);
  if (!side) return null;
  const aIn = Number(formatUnits(o.amountIn, 18));
  const mOut = Number(formatUnits(o.minAmountOut, 18));
  if (!aIn || !mOut) return null;
  // SELL: price = minAmountOut(BUSD) / amountIn(WBNB)
  // BUY:  price = amountIn(BUSD)    / minAmountOut(WBNB)
  return side === 'sell' ? mOut / aIn : aIn / mOut;
}

/** Size displayed on the chart label: always in BASE (WBNB) units. */
export function orderBaseSize(o: OrderTuple): number | null {
  const side = orderSide(o);
  if (!side) return null;
  const aIn = Number(formatUnits(o.amountIn, 18));
  const mOut = Number(formatUnits(o.minAmountOut, 18));
  return side === 'sell' ? aIn : mOut;
}

export function formatPrice(p: number): string {
  if (p >= 1000) return p.toFixed(2);
  if (p >= 1) return p.toFixed(3);
  if (p >= 0.01) return p.toFixed(4);
  return p.toFixed(6);
}

export function formatSize(n: number): string {
  if (n >= 1000) return n.toFixed(2);
  if (n >= 1) return n.toFixed(3);
  return n.toFixed(4);
}

export function shortAddr(a: string): string {
  return a.slice(0, 6) + '…' + a.slice(-4);
}
