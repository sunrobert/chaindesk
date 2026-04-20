'use client';

import { useEffect, useState } from 'react';
import {
  useAccount,
  useBalance,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { parseEther, formatUnits } from 'viem';
import { pancakeRouterAbi } from '@/lib/abi';
import { BUSD, ROUTER, WBNB } from '@/lib/constants';

/**
 * One-click helper that swaps native tBNB → BUSD through the PancakeSwap V2
 * testnet router. Saves the judge (and me) from hunting for a BUSD faucet.
 */
export function GetBusd() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState<string>('0.05');
  const [status, setStatus] = useState<string>('');

  const nativeQ = useBalance({ address });
  const native = nativeQ.data?.value ?? 0n;

  const amountIn = (() => {
    try {
      const n = Number(amount);
      if (!n || n <= 0) return 0n;
      return parseEther(String(n));
    } catch {
      return 0n;
    }
  })();

  // Quote for UX: estimated BUSD out from router.getAmountsOut
  const quoteQ = useReadContract({
    address: ROUTER,
    abi: pancakeRouterAbi,
    functionName: 'getAmountsOut',
    args: amountIn > 0n ? [amountIn, [WBNB, BUSD]] : undefined,
    query: { enabled: amountIn > 0n, refetchInterval: 8000 },
  });
  const amountOut =
    quoteQ.data && quoteQ.data.length >= 2 ? (quoteQ.data[1] as bigint) : 0n;

  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });

  useEffect(() => {
    if (receipt.isSuccess) {
      setStatus('BUSD received ✓');
      nativeQ.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isSuccess]);

  const onSwap = () => {
    if (!amountIn || amountIn <= 0n) return;
    setStatus('');
    // 3% slippage floor — keeps us from reverting on a thin testnet pool
    // but still rejects a fully broken quote.
    const minOut = (amountOut * 97n) / 100n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
    write.writeContract(
      {
        address: ROUTER,
        abi: pancakeRouterAbi,
        functionName: 'swapExactETHForTokens',
        args: [minOut, [WBNB, BUSD], address!, deadline],
        value: amountIn,
      },
      { onError: (err) => setStatus(`swap failed: ${shortErr(err)}`) },
    );
  };

  const busy = write.isPending || receipt.isLoading;
  const quote =
    amountOut > 0n ? Number(formatUnits(amountOut, 18)).toFixed(2) : '——';

  return (
    <div className="border-t border-border bg-panel">
      <div className="flex items-center justify-between px-3 py-[6px]">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-muted">
          GET BUSD · SWAP tBNB → BUSD
        </span>
        <span className="num text-[9px] text-muted">
          via PancakeSwap V2
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 pb-2">
        <div className="flex flex-1 items-center gap-2 border border-border bg-bg px-2 py-[4px]">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0.05"
            className="num w-full bg-transparent text-sm text-text outline-none placeholder:text-muted"
          />
          <span className="text-[10px] uppercase tracking-widest text-muted">
            tBNB
          </span>
        </div>
        <button
          onClick={onSwap}
          disabled={!isConnected || busy || !amountIn || amountIn > native}
          className="bg-accent px-3 py-[6px] text-[11px] font-semibold uppercase tracking-widest text-bg hover:bg-accent/90 disabled:opacity-40"
        >
          {busy ? '…' : 'GET'}
        </button>
      </div>
      <div className="flex items-center justify-between border-t border-border px-3 py-1 text-[10px]">
        <span className="text-muted">Estimated out</span>
        <span className="num text-text">≈ {quote} BUSD</span>
      </div>
      {status && (
        <div className="border-t border-border px-3 py-1 text-[10px] text-subtext">
          {status}
        </div>
      )}
    </div>
  );
}

function shortErr(err: unknown): string {
  const m =
    (err as { shortMessage?: string })?.shortMessage ||
    (err as { message?: string })?.message ||
    'unknown';
  return m.slice(0, 80);
}
