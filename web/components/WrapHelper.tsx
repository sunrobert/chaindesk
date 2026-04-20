'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { wbnbAbi } from '@/lib/abi';
import { WBNB } from '@/lib/constants';
import { useBalance as useErc20Balance } from '@/hooks/useAllowance';

type Mode = 'wrap' | 'unwrap';

export function WrapHelper() {
  const { address, isConnected } = useAccount();
  const [mode, setMode] = useState<Mode>('wrap');
  const [amount, setAmount] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  // Native BNB balance
  const nativeQ = useBalance({ address });
  const native = nativeQ.data?.value ?? 0n;

  // WBNB (ERC20) balance
  const wbnbQ = useErc20Balance(WBNB);
  const wbnb = (wbnbQ.data ?? 0n) as bigint;

  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });

  useEffect(() => {
    if (receipt.isSuccess) {
      setStatus(`${mode} confirmed`);
      setAmount('');
      nativeQ.refetch();
      wbnbQ.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isSuccess]);

  const onSubmit = () => {
    const a = Number(amount);
    if (!a || a <= 0) return;
    setStatus('');
    const wad = parseEther(String(a));
    if (mode === 'wrap') {
      write.writeContract(
        {
          address: WBNB,
          abi: wbnbAbi,
          functionName: 'deposit',
          value: wad,
          args: [],
        },
        { onError: (err) => setStatus(`wrap failed: ${shortErr(err)}`) },
      );
    } else {
      write.writeContract(
        {
          address: WBNB,
          abi: wbnbAbi,
          functionName: 'withdraw',
          args: [wad],
        },
        { onError: (err) => setStatus(`unwrap failed: ${shortErr(err)}`) },
      );
    }
  };

  const busy = write.isPending || receipt.isLoading;
  const maxAvail = mode === 'wrap' ? native : wbnb;
  const fmtBal = (v: bigint) => Number(formatEther(v)).toFixed(4);

  return (
    <div className="border-t border-border bg-panel">
      <div className="flex items-center justify-between px-3 py-[6px]">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-muted">
          {mode === 'wrap' ? 'WRAP tBNB → WBNB' : 'UNWRAP WBNB → tBNB'}
        </span>
        <button
          onClick={() => setMode(mode === 'wrap' ? 'unwrap' : 'wrap')}
          className="text-[9px] uppercase tracking-widest text-subtext hover:text-accent"
        >
          ⇄ swap
        </button>
      </div>
      <div className="flex items-center gap-2 px-3 pb-2">
        <div className="flex flex-1 items-center gap-2 border border-border bg-bg px-2 py-[4px]">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0.0"
            className="num w-full bg-transparent text-sm text-text outline-none placeholder:text-muted"
          />
          <button
            onClick={() => setAmount(formatEther(maxAvail))}
            className="text-[9px] uppercase tracking-widest text-accent hover:underline"
          >
            max
          </button>
        </div>
        <button
          onClick={onSubmit}
          disabled={!isConnected || busy || !amount}
          className="bg-accent px-3 py-[6px] text-[11px] font-semibold uppercase tracking-widest text-bg hover:bg-accent/90 disabled:opacity-40"
        >
          {busy ? '…' : mode}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-border px-3 py-1 text-[10px]">
        <div className="flex justify-between">
          <span className="text-muted">tBNB</span>
          <span className="num text-text">{fmtBal(native)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">WBNB</span>
          <span className="num text-text">{fmtBal(wbnb)}</span>
        </div>
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
