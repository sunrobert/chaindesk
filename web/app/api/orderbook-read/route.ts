import { NextResponse } from 'next/server';
import { createPublicClient, formatUnits, http } from 'viem';
import { bscTestnet } from 'viem/chains';
import { limitOrderBookAbi } from '@/lib/abi';
import {
  BASE,
  BSC_TESTNET_RPC,
  CONTRACT_ADDRESS,
  QUOTE,
} from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type OnchainOrder = {
  maker: `0x${string}`;
  deadline: bigint;
  active: boolean;
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  amountIn: bigint;
  minAmountOut: bigint;
};

type PolymarketRow = {
  question: string;
  yesPct: number | null;
  noPct: number | null;
  volume24h: number;
};

const SYSTEM_PROMPT = `You are a market analyst for an on-chain trading terminal. You synthesize three data sources into a single brief trader-focused read:

1. The on-chain orderbook for WBNB/BUSD (every open limit order, public)
2. The current spot price reference from Binance
3. Active crypto prediction markets from Polymarket

Produce 3-4 sentences in clipped Bloomberg Terminal voice. Start with the onchain orderbook observation (this is the proprietary data). Then cite one or two relevant prediction market signals and whether they support or contradict the orderbook read. Close with a directional bias. No emojis, no hype, no disclaimers.`;

async function fetchSpot(): Promise<number | null> {
  try {
    const res = await fetch(
      'https://api.binance.com/api/v3/klines?symbol=BNBUSDT&interval=1m&limit=1',
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as unknown[][];
    if (!rows.length) return null;
    const close = Number(rows[0][4]);
    return Number.isFinite(close) ? close : null;
  } catch {
    return null;
  }
}

async function fetchPolymarket(): Promise<PolymarketRow[]> {
  try {
    const url =
      'https://gamma-api.polymarket.com/markets?closed=false&limit=10&order=volume24hr&ascending=false&tag_slug=crypto';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{
      question?: string;
      outcomePrices?: string | string[];
      volume24hr?: number | string;
    }>;
    const out: PolymarketRow[] = [];
    for (const r of rows.slice(0, 5)) {
      if (!r.question) continue;
      let prices: number[] = [];
      if (typeof r.outcomePrices === 'string') {
        try {
          prices = (JSON.parse(r.outcomePrices) as string[]).map((x) =>
            Number(x)
          );
        } catch {
          prices = [];
        }
      } else if (Array.isArray(r.outcomePrices)) {
        prices = r.outcomePrices.map((x) => Number(x));
      }
      out.push({
        question: r.question,
        yesPct: prices[0] != null && Number.isFinite(prices[0]) ? prices[0] * 100 : null,
        noPct: prices[1] != null && Number.isFinite(prices[1]) ? prices[1] * 100 : null,
        volume24h: Number(r.volume24hr ?? 0),
      });
    }
    return out;
  } catch {
    return [];
  }
}

function formatOrder(o: OnchainOrder): {
  price: number;
  sizeWbnb: number;
  side: 'buy' | 'sell';
  maker: string;
} {
  const isSell =
    o.tokenIn.toLowerCase() === BASE.address.toLowerCase();
  const amountIn = Number(formatUnits(o.amountIn, BASE.decimals));
  const minOut = Number(formatUnits(o.minAmountOut, QUOTE.decimals));
  const price = isSell ? minOut / amountIn : amountIn / minOut;
  const sizeWbnb = isSell ? amountIn : minOut;
  return {
    price,
    sizeWbnb,
    side: isSell ? 'sell' : 'buy',
    maker: `${o.maker.slice(0, 6)}…${o.maker.slice(-4)}`,
  };
}

export async function GET() {
  const client = createPublicClient({
    chain: bscTestnet,
    transport: http(BSC_TESTNET_RPC),
  });

  const [ordersResult, spot, predictionMarkets] = await Promise.all([
    client
      .readContract({
        address: CONTRACT_ADDRESS,
        abi: limitOrderBookAbi,
        functionName: 'getOpenOrdersByPair',
        args: [BASE.address, QUOTE.address],
      })
      .catch(() => null),
    fetchSpot(),
    fetchPolymarket(),
  ]);

  const rawOrders = ordersResult
    ? ((ordersResult as [bigint[], OnchainOrder[]])[1] ?? [])
    : [];
  const formatted = rawOrders
    .map(formatOrder)
    .filter((o) => Number.isFinite(o.price) && o.price > 0)
    .sort((a, b) => a.price - b.price)
    .slice(0, 20);

  const orderLines = formatted.length
    ? formatted
        .map(
          (o) =>
            `- $${o.price.toFixed(4)} | ${o.sizeWbnb.toFixed(3)} WBNB | ${o.side} | ${o.maker}`
        )
        .join('\n')
    : '- (no open orders)';

  const pmLines = predictionMarkets.length
    ? predictionMarkets
        .map(
          (m) =>
            `- "${m.question}" — YES: ${m.yesPct?.toFixed(1) ?? '?'}%, NO: ${
              m.noPct?.toFixed(1) ?? '?'
            }%, 24h vol: $${Math.round(m.volume24h).toLocaleString()}`
        )
        .join('\n')
    : '- (no markets returned)';

  const userMessage = `PAIR: WBNB/BUSD
SPOT: $${spot != null ? spot.toFixed(4) : 'unknown'}

ONCHAIN ORDERBOOK (open limit orders):
${orderLines}

PREDICTION MARKETS (top by volume):
${pmLines}

Produce the market read now.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 }
    );
  }

  let read = '';
  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
      cache: 'no-store',
    });
    if (!anthropicRes.ok) {
      const text = await anthropicRes.text();
      return NextResponse.json(
        { error: `anthropic ${anthropicRes.status}: ${text.slice(0, 200)}` },
        { status: 502 }
      );
    }
    const data = (await anthropicRes.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    read = (data.content ?? [])
      .filter((c) => c.type === 'text' && typeof c.text === 'string')
      .map((c) => c.text)
      .join('\n')
      .trim();
  } catch (err) {
    return NextResponse.json(
      { error: `fetch failed: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  return NextResponse.json({
    read,
    updatedAt: Math.floor(Date.now() / 1000),
    sources: {
      orderbook: formatted.length,
      predictionMarkets: predictionMarkets.map((m) => m.question),
      spotPrice: spot ?? 0,
    },
  });
}
