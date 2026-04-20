import type { OpenOrder } from '@/hooks/useOpenOrders';
import { orderBaseSize, orderLimitPrice, orderSide } from './price';

export type BookLevel = {
  price: number;
  size: number;           // aggregate base size at this price level
  orderIds: bigint[];     // individual orders composing this level (for execute)
  makers: string[];       // one maker per orderId, same length
  side: 'buy' | 'sell';
};

/**
 * Aggregate open orders into price levels. Rounds prices to 2 decimals for
 * BNB-scale values so nearby orders visually stack.
 */
export function buildBook(orders: OpenOrder[]): {
  asks: BookLevel[]; // sells, sorted ASCENDING (best ask first = lowest price)
  bids: BookLevel[]; // buys, sorted DESCENDING (best bid first = highest price)
} {
  const byKey = new Map<string, BookLevel>();
  for (const { id, order } of orders) {
    const side = orderSide(order);
    if (!side) continue;
    const price = orderLimitPrice(order);
    const size = orderBaseSize(order);
    if (price == null || size == null) continue;
    const rounded = Math.round(price * 100) / 100;
    const key = `${side}-${rounded}`;
    const lvl = byKey.get(key);
    if (lvl) {
      lvl.size += size;
      lvl.orderIds.push(id);
      lvl.makers.push(order.maker);
    } else {
      byKey.set(key, {
        price: rounded,
        size,
        orderIds: [id],
        makers: [order.maker],
        side,
      });
    }
  }

  const asks = [...byKey.values()]
    .filter((l) => l.side === 'sell')
    .sort((a, b) => a.price - b.price);
  const bids = [...byKey.values()]
    .filter((l) => l.side === 'buy')
    .sort((a, b) => b.price - a.price);

  return { asks, bids };
}

/**
 * Crossable = executor can run the swap profitably vs the DEX reference price.
 * Approximation uses the Binance spot reference; real execution uses PancakeSwap.
 * SELL @ L crosses when market P ≥ L; BUY @ L crosses when market P ≤ L.
 */
export function isCrossable(
  side: 'buy' | 'sell',
  limit: number,
  refPrice: number | null,
): boolean {
  if (refPrice == null || !Number.isFinite(refPrice)) return false;
  return side === 'sell' ? refPrice >= limit : refPrice <= limit;
}
