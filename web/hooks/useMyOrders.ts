'use client';

import { useAccount, useReadContract } from 'wagmi';
import { limitOrderBookAbi, type OrderTuple } from '@/lib/abi';
import { CONTRACT_ADDRESS, ORDER_POLL_MS } from '@/lib/constants';

export type MyOrder = {
  id: bigint;
  order: OrderTuple;
};

export function useMyOrders(): { orders: MyOrder[]; isLoading: boolean } {
  const { address } = useAccount();

  const q = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: limitOrderBookAbi,
    functionName: 'getOrdersByMaker',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
      refetchInterval: ORDER_POLL_MS,
    },
  });

  const ids = q.data?.[0] ?? [];
  const arr = (q.data?.[1] ?? []) as readonly OrderTuple[];

  const orders: MyOrder[] = ids.map((id, i) => ({ id, order: arr[i] }));
  // Newest first
  orders.reverse();

  return { orders, isLoading: q.isLoading };
}
