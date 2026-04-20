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

function formatOrder(o: OnchainOrder, id: bigint): {
  id: string;
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
    id: id.toString(),
    price,
    sizeWbnb,
    side: isSell ? 'sell' : 'buy',
    maker: `${o.maker.slice(0, 6)}…${o.maker.slice(-4)}`,
  };
}

function buildDemoRead(
  orders: ReturnType<typeof formatOrder>[],
  spot: number | null,
  markets: PolymarketRow[]
): string {
  if (orders.length === 0) {
    return 'Onchain book thin — no resting limit orders across WBNB/BUSD at print. With spot unanchored by maker depth, flows will run on raw Binance prints. Prediction markets offer no directional crosscheck while book is empty. Bias: neutral, await first resting size.';
  }

  const bids = orders.filter((o) => o.side === 'buy');
  const asks = orders.filter((o) => o.side === 'sell');
  const bidVol = bids.reduce((s, o) => s + o.sizeWbnb, 0);
  const askVol = asks.reduce((s, o) => s + o.sizeWbnb, 0);
  const imbalance = bidVol + askVol > 0
    ? (bidVol - askVol) / (bidVol + askVol)
    : 0;
  const makers = new Set(orders.map((o) => o.maker));

  let sentence1: string;
  if (Math.abs(imbalance) < 0.15) {
    sentence1 = `Onchain book balanced across ${orders.length} resting orders from ${makers.size} makers — ${bidVol.toFixed(2)} WBNB bid vs ${askVol.toFixed(2)} WBNB offer, no side stepping in front.`;
  } else if (imbalance > 0) {
    sentence1 = `Onchain book skewed bid-heavy: ${bidVol.toFixed(2)} WBNB resting on buy vs ${askVol.toFixed(2)} WBNB on offer across ${makers.size} makers, implying accumulation below spot.`;
  } else {
    sentence1 = `Onchain book skewed ask-heavy: ${askVol.toFixed(2)} WBNB sitting on offer vs ${bidVol.toFixed(2)} WBNB bid across ${makers.size} makers, consistent with distribution into strength.`;
  }

  const spotLine = spot
    ? ` Binance spot ${spot.toFixed(2)} prints ${orders[0].price < spot ? 'above' : 'at'} the nearest resting level.`
    : '';

  const topMarket = markets[0];
  const sentence2 = topMarket && topMarket.yesPct != null
    ? ` Polymarket "${topMarket.question.slice(0, 70)}${topMarket.question.length > 70 ? '…' : ''}" trading ${topMarket.yesPct.toFixed(0)}% YES on $${Math.round(topMarket.volume24h).toLocaleString()} 24h — ${topMarket.yesPct > 55 ? 'confirms' : topMarket.yesPct < 45 ? 'cuts against' : 'sits neutral to'} the onchain tone.`
    : '';

  const bias = imbalance > 0.15 ? 'Lean long into bid wall.' : imbalance < -0.15 ? 'Respect offer; fade rips.' : 'Neutral until imbalance breaks.';

  return `${sentence1}${spotLine}${sentence2} ${bias}`;
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

  const rawIds: bigint[] = ordersResult
    ? ((ordersResult as [bigint[], OnchainOrder[]])[0] ?? [])
    : [];
  const rawOrders: OnchainOrder[] = ordersResult
    ? ((ordersResult as [bigint[], OnchainOrder[]])[1] ?? [])
    : [];
  const formatted = rawOrders
    .map((o, i) => formatOrder(o, rawIds[i] ?? 0n))
    .filter((o) => Number.isFinite(o.price) && o.price > 0)
    .sort((a, b) => a.price - b.price)
    .slice(0, 20);

  // Flag up to 3 orders "most likely to execute next" — the ones closest to
  // spot. This is what the AI banner highlights as "executable now."
  const flaggedOrderIds: string[] = spot
    ? [...formatted]
        .sort((a, b) => Math.abs(a.price - spot) - Math.abs(b.price - spot))
        .slice(0, 3)
        .map((o) => o.id)
    : [];

  const read = buildDemoRead(formatted, spot, predictionMarkets);

  return NextResponse.json({
    read,
    updatedAt: Math.floor(Date.now() / 1000),
    flaggedOrderIds,
    sources: {
      orderbook: formatted.length,
      predictionMarkets: predictionMarkets.map((m) => m.question),
      spotPrice: spot ?? 0,
    },
  });
}
