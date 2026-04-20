'use client';

import { useReadContract } from 'wagmi';
import { limitOrderBookAbi, type OrderTuple } from '@/lib/abi';
import {
  BASE,
  CONTRACT_ADDRESS,
  ORDER_POLL_MS,
  QUOTE,
} from '@/lib/constants';

export type OpenOrder = {
  id: bigint;
  order: OrderTuple;
};

/**
 * Aggregates open orders on both directions of BASE/QUOTE.
 * - (BASE → QUOTE) direction: sell-limit orders
 * - (QUOTE → BASE) direction: buy-limit orders
 * Both are returned in one list and classified downstream via orderSide().
 */
export function useOpenOrders(): { orders: OpenOrder[]; isLoading: boolean } {
  const sells = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: limitOrderBookAbi,
    functionName: 'getOpenOrdersByPair',
    args: [BASE.address, QUOTE.address],
    query: { refetchInterval: ORDER_POLL_MS },
  });

  const buys = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: limitOrderBookAbi,
    functionName: 'getOpenOrdersByPair',
    args: [QUOTE.address, BASE.address],
    query: { refetchInterval: ORDER_POLL_MS },
  });

  const sellIds = sells.data?.[0] ?? [];
  const sellArr = (sells.data?.[1] ?? []) as readonly OrderTuple[];
  const buyIds = buys.data?.[0] ?? [];
  const buyArr = (buys.data?.[1] ?? []) as readonly OrderTuple[];

  const orders: OpenOrder[] = [
    ...sellIds.map((id, i) => ({ id, order: sellArr[i] })),
    ...buyIds.map((id, i) => ({ id, order: buyArr[i] })),
  ];

  return {
    orders,
    isLoading: sells.isLoading || buys.isLoading,
  };
}
