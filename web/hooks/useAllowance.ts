'use client';

import { useAccount, useReadContract } from 'wagmi';
import { erc20Abi } from '@/lib/abi';
import type { Address } from 'viem';

export function useAllowance(token: Address | undefined, spender: Address) {
  const { address } = useAccount();
  return useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, spender] : undefined,
    query: {
      enabled: Boolean(address && token),
      refetchInterval: 4000,
    },
  });
}

export function useBalance(token: Address | undefined) {
  const { address } = useAccount();
  return useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && token),
      refetchInterval: 5000,
    },
  });
}
