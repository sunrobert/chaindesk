'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, maxUint256 } from 'viem';
import { limitOrderBookAbi, erc20Abi } from '@/lib/abi';
import {
  BASE,
  QUOTE,
  CONTRACT_ADDRESS,
  BSCSCAN,
} from '@/lib/constants';
import { useAllowance, useBalance } from '@/hooks/useAllowance';
import { formatPrice } from '@/lib/price';

type Side = 'buy' | 'sell';

export function OrderTicket({
  prefillPrice,
  clearPrefill,
}: {
  prefillPrice: number | null;
  clearPrefill: () => void;
}) {
  const { address, isConnected } = useAccount();

  const [side, setSide] = useState<Side>('buy');
  const [price, setPrice] = useState<string>('');
  const [amount, setAmount] = useState<string>(''); // always in BASE (WBNB) units
  const [ttlMin, setTtlMin] = useState<number>(60);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (prefillPrice != null && Number.isFinite(prefillPrice)) {
      setPrice(formatPrice(prefillPrice));
      clearPrefill();
    }
  }, [prefillPrice, clearPrefill]);

  // Which token is spent depends on side.
  const tokenIn = side === 'buy' ? QUOTE : BASE;
  const tokenOut = side === 'buy' ? BASE : QUOTE;

  const p = Number(price);
  const a = Number(amount);

  // Compute (amountIn, minAmountOut) in token-native units for the selected side.
  const { amountIn, minAmountOut } = useMemo(() => {
    if (!p || !a || p <= 0 || a <= 0)
      return { amountIn: 0n, minAmountOut: 0n };
    if (side === 'sell') {
      // Sell `a` BASE for `a*p` QUOTE
      return {
        amountIn: parseUnits(String(a), BASE.decimals),
        minAmountOut: parseUnits((a * p).toFixed(18), QUOTE.decimals),
      };
    }
    // Buy `a` BASE by paying `a*p` QUOTE
    return {
      amountIn: parseUnits((a * p).toFixed(18), QUOTE.decimals),
      minAmountOut: parseUnits(String(a), BASE.decimals),
    };
  }, [side, p, a]);

  const allowanceQ = useAllowance(tokenIn.address, CONTRACT_ADDRESS);
  const balanceQ = useBalance(tokenIn.address);
  const allowance = (allowanceQ.data ?? 0n) as bigint;
  const balance = (balanceQ.data ?? 0n) as bigint;

  const needsApproval = amountIn > 0n && allowance < amountIn;
  const insufficientBalance = amountIn > 0n && balance < amountIn;

  const approve = useWriteContract();
  const approveReceipt = useWaitForTransactionReceipt({ hash: approve.data });

  const place = useWriteContract();
  const placeReceipt = useWaitForTransactionReceipt({ hash: place.data });

  useEffect(() => {
    if (approveReceipt.isSuccess) {
      setStatus('approval confirmed');
      allowanceQ.refetch();
    }
  }, [approveReceipt.isSuccess, allowanceQ]);

  useEffect(() => {
    if (placeReceipt.isSuccess) {
      setStatus('order placed ✓');
      setAmount('');
    }
  }, [placeReceipt.isSuccess]);

  const onApprove = () => {
    setStatus('');
    approve.writeContract(
      {
        address: tokenIn.address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, maxUint256],
      },
      {
        onError: (err) => setStatus(`approve failed: ${shortErr(err)}`),
      },
    );
  };

  const onPlace = () => {
    if (!amountIn || !minAmountOut) return;
    setStatus('');
    const deadline = BigInt(Math.floor(Date.now() / 1000) + ttlMin * 60);
    place.writeContract(
      {
        address: CONTRACT_ADDRESS,
        abi: limitOrderBookAbi,
        functionName: 'createOrder',
        args: [
          tokenIn.address,
          tokenOut.address,
          amountIn,
          minAmountOut,
          deadline,
        ],
      },
      {
        onError: (err) => setStatus(`place failed: ${shortErr(err)}`),
      },
    );
  };

  const spending =
    side === 'buy'
      ? `${(a * p || 0).toFixed(4)} ${QUOTE.symbol}`
      : `${a || 0} ${BASE.symbol}`;
  const receiving =
    side === 'buy'
      ? `${a || 0} ${BASE.symbol}`
      : `${(a * p || 0).toFixed(4)} ${QUOTE.symbol}`;

  const disabled =
    !isConnected ||
    !amountIn ||
    !minAmountOut ||
    insufficientBalance ||
    place.isPending ||
    placeReceipt.isLoading;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex">
        <SideBtn active={side === 'buy'} tone="buy" onClick={() => setSide('buy')}>
          BUY {BASE.symbol}
        </SideBtn>
        <SideBtn active={side === 'sell'} tone="sell" onClick={() => setSide('sell')}>
          SELL {BASE.symbol}
        </SideBtn>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        <Field label={`Limit price (${QUOTE.symbol} per ${BASE.symbol})`}>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder="tap chart or type"
            className="w-full bg-transparent text-lg text-text outline-none tab-nums"
          />
        </Field>

        <Field label={`Amount (${BASE.symbol})`}>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0.0"
            className="w-full bg-transparent text-lg text-text outline-none tab-nums"
          />
        </Field>

        <Field label="Expires in">
          <div className="flex gap-1">
            {[15, 60, 240, 1440].map((m) => (
              <button
                key={m}
                onClick={() => setTtlMin(m)}
                className={`flex-1 rounded border px-2 py-1 text-xs tab-nums ${
                  ttlMin === m
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-panel2 text-subtext hover:text-text'
                }`}
              >
                {m < 60 ? `${m}m` : m < 1440 ? `${m / 60}h` : '24h'}
              </button>
            ))}
          </div>
        </Field>

        <div className="rounded border border-border bg-panel2 p-2 text-[11px] leading-5 tab-nums">
          <Row label="Spending" value={spending} />
          <Row label="Receiving" value={receiving} />
          <Row
            label="Wallet balance"
            value={`${formatUnits(balance, tokenIn.decimals).slice(0, 10)} ${tokenIn.symbol}`}
            muted
          />
          <Row
            label="Allowance"
            value={
              allowance >= maxUint256 / 2n
                ? '∞'
                : `${formatUnits(allowance, tokenIn.decimals).slice(0, 10)} ${tokenIn.symbol}`
            }
            muted
          />
        </div>

        <div className="flex flex-col gap-2">
          {needsApproval ? (
            <button
              onClick={onApprove}
              disabled={!isConnected || approve.isPending || approveReceipt.isLoading}
              className="rounded bg-accent px-3 py-2 text-sm font-semibold text-bg disabled:opacity-40"
            >
              {approve.isPending || approveReceipt.isLoading
                ? 'approving…'
                : `Approve ${tokenIn.symbol}`}
            </button>
          ) : null}

          <button
            onClick={onPlace}
            disabled={disabled || needsApproval}
            className={`rounded px-3 py-2 text-sm font-semibold text-white disabled:opacity-40 ${
              side === 'buy' ? 'bg-buy hover:bg-buy/90' : 'bg-sell hover:bg-sell/90'
            }`}
          >
            {place.isPending || placeReceipt.isLoading
              ? 'placing…'
              : insufficientBalance
                ? `insufficient ${tokenIn.symbol}`
                : !isConnected
                  ? 'connect wallet'
                  : `Place ${side.toUpperCase()} order`}
          </button>
        </div>

        {(status || approve.data || place.data) && (
          <div className="rounded border border-border bg-panel2 p-2 text-[11px] text-subtext">
            {status && <div>{status}</div>}
            {approve.data && (
              <div>
                approve tx:{' '}
                <a
                  href={`${BSCSCAN}/tx/${approve.data}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline-offset-2 hover:underline"
                >
                  {approve.data.slice(0, 10)}…
                </a>
              </div>
            )}
            {place.data && (
              <div>
                place tx:{' '}
                <a
                  href={`${BSCSCAN}/tx/${place.data}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline-offset-2 hover:underline"
                >
                  {place.data.slice(0, 10)}…
                </a>
              </div>
            )}
          </div>
        )}

        <div className="mt-auto text-[10px] leading-4 text-subtext">
          Limit orders escrow your {tokenIn.symbol} onchain. Anyone can execute
          when the DEX price crosses your limit — executors pocket positive
          slippage as a tip. No keeper required.
        </div>
      </div>
    </div>
  );
}

function SideBtn({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone: 'buy' | 'sell';
  onClick: () => void;
  children: React.ReactNode;
}) {
  const base = 'flex-1 border-b-2 py-2 text-xs font-semibold tracking-widest';
  if (!active) return (
    <button
      onClick={onClick}
      className={`${base} border-transparent text-subtext hover:text-text`}
    >
      {children}
    </button>
  );
  return (
    <button
      onClick={onClick}
      className={`${base} ${
        tone === 'buy'
          ? 'border-buy text-buy'
          : 'border-sell text-sell'
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block rounded border border-border bg-panel2 px-2 py-1">
      <div className="text-[10px] uppercase tracking-widest text-subtext">
        {label}
      </div>
      {children}
    </label>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-subtext">{label}</span>
      <span className={muted ? 'text-subtext' : 'text-text'}>{value}</span>
    </div>
  );
}

function shortErr(err: unknown): string {
  const m = (err as { shortMessage?: string; message?: string })?.shortMessage
    || (err as { message?: string })?.message
    || 'unknown';
  return m.slice(0, 80);
}
