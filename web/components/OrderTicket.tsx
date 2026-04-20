'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, maxUint256 } from 'viem';
import { limitOrderBookAbi, erc20Abi } from '@/lib/abi';
import { BASE, QUOTE, CONTRACT_ADDRESS, BSCSCAN } from '@/lib/constants';
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
  const [amount, setAmount] = useState<string>('');
  const [ttlMin, setTtlMin] = useState<number>(1440);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (prefillPrice != null && Number.isFinite(prefillPrice)) {
      setPrice(formatPrice(prefillPrice));
      clearPrefill();
    }
  }, [prefillPrice, clearPrefill]);

  const tokenIn = side === 'buy' ? QUOTE : BASE;
  const tokenOut = side === 'buy' ? BASE : QUOTE;

  const p = Number(price);
  const a = Number(amount);

  const { amountIn, minAmountOut } = useMemo(() => {
    if (!p || !a || p <= 0 || a <= 0)
      return { amountIn: 0n, minAmountOut: 0n };
    if (side === 'sell') {
      return {
        amountIn: parseUnits(String(a), BASE.decimals),
        minAmountOut: parseUnits((a * p).toFixed(18), QUOTE.decimals),
      };
    }
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
      { onError: (err) => setStatus(`approve failed: ${shortErr(err)}`) },
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
      { onError: (err) => setStatus(`place failed: ${shortErr(err)}`) },
    );
  };

  const total =
    side === 'buy'
      ? `${(a * p || 0).toFixed(4)} ${QUOTE.symbol}`
      : `${(a * p || 0).toFixed(4)} ${QUOTE.symbol}`;

  const disabled =
    !isConnected ||
    !amountIn ||
    !minAmountOut ||
    insufficientBalance ||
    place.isPending ||
    placeReceipt.isLoading;

  const buttonLabel = place.isPending
    ? 'Sending…'
    : placeReceipt.isLoading
      ? 'Confirming…'
      : placeReceipt.isSuccess
        ? 'Placed ✓'
        : insufficientBalance
          ? `Insufficient ${tokenIn.symbol}`
          : !isConnected
            ? 'Connect wallet'
            : `Place ${side.toUpperCase()} order`;

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <div className="grid grid-cols-2 border-b border-border">
        <SideBtn active={side === 'buy'} tone="buy" onClick={() => setSide('buy')}>
          BUY {BASE.symbol}
        </SideBtn>
        <SideBtn active={side === 'sell'} tone="sell" onClick={() => setSide('sell')}>
          SELL {BASE.symbol}
        </SideBtn>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        <Field label={`LIMIT PRICE (${QUOTE.symbol})`}>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className="num w-full bg-transparent text-lg text-text outline-none placeholder:text-muted"
          />
        </Field>

        <Field label={`AMOUNT (${BASE.symbol})`}>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0.0"
            className="num w-full bg-transparent text-lg text-text outline-none placeholder:text-muted"
          />
          <div className="mt-1 grid grid-cols-4 gap-px">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => {
                  if (!isConnected) return;
                  // Max amount in BASE (WBNB).
                  const maxBaseFloat =
                    side === 'sell'
                      ? Number(formatUnits(balance, BASE.decimals))
                      : p > 0
                        ? Number(formatUnits(balance, QUOTE.decimals)) / p
                        : 0;
                  const v = maxBaseFloat * (pct / 100);
                  if (!Number.isFinite(v) || v <= 0) return;
                  // Avoid scientific notation on very small values
                  setAmount(v < 0.0001 ? v.toFixed(6) : String(Number(v.toFixed(6))));
                }}
                className="num py-[2px] text-[9px] uppercase tracking-widest text-subtext hover:bg-accent/10 hover:text-accent"
              >
                {pct === 100 ? 'MAX' : `${pct}%`}
              </button>
            ))}
          </div>
        </Field>

        <Field label="TOTAL">
          <div className="num w-full text-lg text-subtext">{total}</div>
        </Field>

        <div>
          <div className="mb-1 text-[9px] uppercase tracking-widest text-muted">
            EXPIRES IN
          </div>
          <div className="grid grid-cols-4 gap-px border border-border bg-border">
            {[15, 60, 240, 1440].map((m) => (
              <button
                key={m}
                onClick={() => setTtlMin(m)}
                className={`num py-[6px] text-[11px] ${
                  ttlMin === m
                    ? 'bg-accent/15 text-accent'
                    : 'bg-panel text-subtext hover:text-text'
                }`}
              >
                {m < 60 ? `${m}m` : m < 1440 ? `${m / 60}h` : '24h'}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-border bg-panel p-2 text-[11px] leading-5">
          <Row
            label="Balance"
            value={`${fmt(formatUnits(balance, tokenIn.decimals))} ${tokenIn.symbol}`}
          />
          <Row
            label="Allowance"
            value={
              allowance >= maxUint256 / 2n
                ? '∞'
                : `${fmt(formatUnits(allowance, tokenIn.decimals))} ${tokenIn.symbol}`
            }
          />
        </div>

        <div className="flex flex-col gap-2">
          {needsApproval ? (
            <button
              onClick={onApprove}
              disabled={!isConnected || approve.isPending || approveReceipt.isLoading}
              className="bg-accent py-2 text-xs font-semibold uppercase tracking-widest text-bg hover:bg-accent/90 disabled:opacity-40"
            >
              {approve.isPending
                ? 'Sending…'
                : approveReceipt.isLoading
                  ? 'Confirming…'
                  : `Approve ${tokenIn.symbol}`}
            </button>
          ) : null}

          <button
            onClick={onPlace}
            disabled={disabled || needsApproval}
            className={`py-2 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-40 ${
              side === 'buy' ? 'bg-buy hover:bg-buy/90' : 'bg-sell hover:bg-sell/90'
            }`}
          >
            {buttonLabel}
          </button>
        </div>

        {(status || approve.data || place.data) && (
          <div className="border border-border bg-panel p-2 text-[11px] text-subtext">
            {status && <div>{status}</div>}
            {approve.data && (
              <div className="num">
                approve:{' '}
                <a
                  href={`${BSCSCAN}/tx/${approve.data}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  {approve.data.slice(0, 10)}…
                </a>
              </div>
            )}
            {place.data && (
              <div className="num">
                place:{' '}
                <a
                  href={`${BSCSCAN}/tx/${place.data}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  {place.data.slice(0, 10)}…
                </a>
              </div>
            )}
          </div>
        )}

        <div className="mt-auto text-[10px] leading-4 text-muted">
          Orders escrow your {tokenIn.symbol} onchain. Anyone can execute once
          the DEX price crosses the limit — executors pocket positive slippage.
          No keeper required.
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
  const base = 'border-b-2 py-[10px] text-[11px] font-semibold tracking-[0.15em]';
  if (!active)
    return (
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
        tone === 'buy' ? 'border-buy text-buy' : 'border-sell text-sell'
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
    <label className="block border border-border bg-panel px-2 py-[6px]">
      <div className="text-[9px] uppercase tracking-widest text-muted">
        {label}
      </div>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="num text-text">{value}</span>
    </div>
  );
}

function fmt(s: string): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return '0';
  if (n >= 1000) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

function shortErr(err: unknown): string {
  const m =
    (err as { shortMessage?: string })?.shortMessage ||
    (err as { message?: string })?.message ||
    'unknown';
  return m.slice(0, 80);
}
