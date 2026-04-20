# ChainDesk — AI Build Log

A transparent account of how the ChainDesk frontend was built with Claude as a pair-coder, for the BNB Hack: US College Edition (Track 2 — DeFi & Financial Tools).

The smart contract (`src/LimitOrderBook.sol`, deployed at `0x3B933087c131B30a38fF9C85EE665209b7005751` on BSC testnet) was authored separately. This log covers the frontend sprint: a single-screen pro-trader terminal in `web/`.

---

## The pitch in one line

> "Robinhood Legend shows you *your* orders on the chart. ChainDesk shows you *everyone's* — because BSC is public."

The chart overlays every open limit order in the onchain book (`getOpenOrdersByPair`) as a horizontal price line. Green = bids, red = asks. That single feature is impossible on TradFi and trivial on an onchain order book.

---

## Prompt 1 — alignment before code

Before a single file was written, Claude was asked to read `src/LimitOrderBook.sol` and `DEPLOYMENT.md` and restate:

1. what ChainDesk is,
2. what's already deployed,
3. what it's about to build,

and confirm the price-line math before proceeding.

### Price math agreed up front

Both WBNB and BUSD on BSC testnet are 18-decimals, so the ratio is directly in BUSD per WBNB:

- **Sell line** (`tokenIn = WBNB`, `tokenOut = BUSD`): price = `minAmountOut / amountIn` → red
- **Buy line** (`tokenIn = BUSD`, `tokenOut = WBNB`): price = `amountIn / minAmountOut` → green

Codified in `web/lib/price.ts` — single source of truth used by the chart overlay, My Orders panel, and order ticket.

---

## Prompt 2 — file layout proposal

Claude proposed a minimal `web/` layout and got a single "Ack" in response. The structure landed as:

```
web/
├── app/
│   ├── layout.tsx              # server component + metadata
│   ├── providers.tsx           # wagmi + RainbowKit + React Query
│   ├── ClientProviders.tsx     # dynamic-imports Providers with ssr:false
│   ├── page.tsx                # 3-column terminal layout
│   └── globals.css             # tailwind + scrollbar + rk tweaks
├── components/
│   ├── Header.tsx              # title + ConnectButton + testnet/contract badges
│   ├── Panel.tsx               # reusable bordered panel with sticky header
│   ├── Chart.tsx               # lightweight-charts v4 + order-line overlay
│   ├── OrderTicket.tsx         # approve → createOrder flow
│   ├── MyOrders.tsx            # getOrdersByMaker + cancel
│   └── RecentFills.tsx         # OrderExecuted event feed
├── hooks/
│   ├── useOpenOrders.ts        # polls getOpenOrdersByPair (both directions)
│   ├── useMyOrders.ts          # polls getOrdersByMaker
│   ├── useRecentFills.ts       # bootstrap via getLogs + live watchContractEvent
│   └── useAllowance.ts         # ERC20 allowance + balance reads
└── lib/
    ├── constants.ts            # addrs, chainId=97, poll intervals
    ├── abi.ts                  # hand-pruned LimitOrderBook + erc20 ABIs
    ├── price.ts                # order → side/price/size (covered above)
    ├── binance.ts              # klines fetcher for reference candles
    └── wagmi.ts                # getDefaultConfig for BSC testnet
```

---

## Build order (what I actually shipped, in order)

1. **Scaffold** — `package.json`, `tsconfig`, `tailwind.config.ts`, `postcss`, `globals.css`, `.env.local.example`, `.gitignore`. Deps kept small: `next 14.2.15`, `wagmi 2.12`, `viem 2.21`, `@rainbow-me/rainbowkit 2.1`, `@tanstack/react-query 5.59`, `lightweight-charts 4.2`.
2. **Constants + ABI** — hand-pruned the compiled ABI down to the 5 functions and 3 events the UI actually calls. Locked in `CONTRACT_ADDRESS`, `ROUTER`, `WBNB`, `BUSD`.
3. **Wagmi + RainbowKit providers** — BSC testnet only. `ssr: true` in `getDefaultConfig` plus a public RPC (`bsc-testnet.publicnode.com`).
4. **Layout shell + Header** — 3-column grid. Left (320px) = My Orders over Recent Fills. Center (1fr) = chart. Right (340px) = ticket. Header has wallet connect, testnet badge, contract link, and a "Ref price: Binance spot" badge so there's no confusion about what the candles are.
5. **Chart** — lightweight-charts v4 with dark Binance-ish styling. 1m BNBUSDT candles polled every 3s from `api.binance.com/api/v3/klines`. Click-to-prefill price via `coordinateToPrice` on click events.
6. **Order overlay (the money shot)** — `useOpenOrders` polls both directions of the pair every 3s, merges results, then `Chart.tsx` diffs the list against a `Map<orderId, IPriceLine>` so lines animate in and out without full-series redraws. Green/red, sized labels.
7. **Order ticket** — buy/sell toggle, limit price + amount (always in BASE/WBNB units for sane UX), 15m/1h/4h/24h TTL. Computes `(amountIn, minAmountOut)` per side, checks allowance, gates on approve. Fires `createOrder` with an unsigned-integer deadline. All write flows wrapped in `useWaitForTransactionReceipt` so the button state reflects the tx lifecycle.
8. **My Orders + cancel** — splits into ACTIVE and HISTORY (active filter: `order.active && deadline > now`). Cancel button calls `cancelOrder(id)` directly, disabled while pending.
9. **Recent Fills** — bootstraps via `getLogs` over ~50k blocks (~2 days of testnet), then `watchContractEvent` for live append. Dedupes by `txHash-orderId`. Each row links out to BscScan.

Every step ended with a typecheck pass before moving on. No TypeScript errors were ever left lingering.

---

## Bug Claude hit and fixed without being asked

**Symptom:** `next build` exported fine but `next dev` returned HTTP 500 with:

```
TypeError: this.localStorage.getItem is not a function
  at ./node_modules/@walletconnect/core/.../keyvaluestorage/...
```

**Root cause:** WalletConnect's `keyvaluestorage` touches `localStorage` during *module init*, which happens on the Node.js side before Next's "use client" boundary kicks in. `ssr: true` in `getDefaultConfig` isn't enough on its own.

**Fix:** split `Providers` into a second file `ClientProviders.tsx` that wraps it with `next/dynamic(..., { ssr: false })`. The server renders a neutral "LOADING CHAINDESK…" fallback, the client hydrates, and the whole wagmi tree initializes browser-side where `localStorage` actually exists. No downside for this single-page app — we already had `export const dynamic = 'force-dynamic'` in the layout.

---

## What got explicitly cut (from the 5-hour budget)

- No draggable layouts / drawing tools / indicators — not in scope.
- No mobile — desktop-only demo.
- No dark/light toggle — the trading-terminal aesthetic is dark, end of story.
- No watchlist search — pair is hardcoded WBNB/BUSD.
- No multi-hop path UI — the ticket hardcodes a 2-hop path; the contract accepts arbitrary paths on `executeOrder` but makers don't choose them.

These are all listed as OUT of scope in the spec. Sticking to scope was the difference between shipping and not shipping.

---

## Stack summary

- **Framework:** Next.js 14 (App Router), TypeScript strict mode, Tailwind.
- **Wallet / RPC:** wagmi v2 + viem v2 + @rainbow-me/rainbowkit on BSC testnet (chainId 97) via `bsc-testnet.publicnode.com`.
- **Chart:** lightweight-charts v4.
- **Candles:** Binance spot `BNBUSDT` 1m klines, REST-polled every 3s. Clearly badged as reference data.
- **Onchain book:** direct reads against `LimitOrderBook` every 3s. No backend, no indexer, no keeper. The contract's own view helpers are the data API.

---

## Retheme pass — Legend-inspired palette

After the initial functional build, the visual system was reworked to a Legend/Bloomberg-style trading terminal aesthetic:

- **Palette:** `#0a0a0a` background, `#111` panels, `#1f1f1f` borders, `#22c55e`/`#ef4444` for buy/sell, `#eab308` yellow for CTAs and the chart crosshair. No rounded corners greater than 2px.
- **Typography:** Inter for UI, JetBrains Mono for all numbers (via `next/font/google` with CSS variables). `.num` utility class + `tabular-nums` ensures prices line up in columns.
- **Top bar:** 56px, shows pair label, live Binance `BNBUSDT` last price (color-coded by 24h change), 24h absolute + percent change, 24h high/low/volume, and BscScan contract link. New `useTicker` hook polls `api.binance.com/api/v3/ticker/24hr` every 3s alongside the existing kline poll.
- **Layout ratios:** 20% / 60% / 20% three-column grid, edge-to-edge `border-r` separators instead of individual rounded panels.
- **Chart overlay:** price lines switched from solid to `LineStyle.Dashed` to match Legend-style order overlays. Size labels trimmed to base-asset units (e.g. "BUY 0.5 WBNB").
- **My Orders:** compact two-line rows with a colored side-bar (green/red), cancel button revealed on hover only. Active/History split preserved.
- **Recent Fills:** same two-line compact row format, yellow accent bar, tip highlighted in green.

Typecheck stayed clean throughout. Dev server hot-reloaded the whole retheme in place without a restart.

---

## Feature bundle — post-retheme

Six features added in a single sprint to make the demo stand up on testnet and better show off what the contract can actually do.

### 1. Onchain order book ladder (new left column, `components/BookLadder.tsx`)

Aggregates `getOpenOrdersByPair` across both directions into a classic bid/ask ladder — asks ascending (best ask at bottom), a middle spread row that shows the Binance reference price + absolute/percent spread, then bids descending. Each row has a gradient depth bar sized by per-level volume.

Logic in `lib/book.ts`:
- Price rounding to 2 decimals for visual stacking.
- `isCrossable(side, limit, ref)` — sell crosses when market ≥ limit, buy crosses when market ≤ limit.

This reinforces the "public onchain book" story in a second form factor alongside the chart overlay.

### 2. Inline Execute button (same component)

Any row that is crossable and NOT owned by the connected wallet gets a yellow `EXEC` button that calls `executeOrder(orderId, [tokenIn, tokenOut])` directly. Hitting it runs the PancakeSwap swap, delivers `minAmountOut` to the maker, and credits the positive slippage tip to the executor — visualizing the "anyone can execute, positive slippage is the tip" property the contract was designed around. Your own orders show a "yours" label.

### 3. Fill markers on the chart

`useRecentFills` now hydrates block timestamps (parallel `getBlock` calls for each unique block from the bootstrap logs; live events get `Date.now()`). `Chart.tsx` threads the timestamped fills into `series.setMarkers` with yellow circles above the bar + a "fill #N" label. Legend badge gains a "● N fills" counter.

### 4. Wrap / unwrap helper (`components/WrapHelper.tsx`)

Pinned to the bottom of the ticket column. Toggles between **Wrap tBNB → WBNB** (calls `WBNB.deposit()` with msg.value) and **Unwrap WBNB → tBNB** (calls `withdraw(wad)`). Shows both live balances inline, has a MAX chip, and a single big yellow action button. Without this, a judge on a clean wallet literally couldn't trade on testnet.

### 5. Amount % chips (25/50/75/MAX) on the ticket

Computed off whichever token is being spent for the current side:
- SELL side: % of WBNB balance in BASE units
- BUY side: % of (BUSD balance / limit price) in BASE units

The MAX always targets the BASE-denominated amount input, so the dollar math stays consistent across sides.

### 6. Distance-to-fill on active orders

Every active row in My Orders gets a third sub-line showing "+0.42% to fill" vs the Binance reference price. If the value is ≤ 0, it flips to a yellow "CROSSABLE" label — matching the condition an executor would see. Directionally signed per side (SELL measures how far above market; BUY measures how far below).

### 7. Chart timeframe selector

`1m / 5m / 15m / 1h / 4h` toggle in the chart header. `Chart` takes a `timeframe` prop; `fetchCandles` forwards it to Binance's `interval` query param. Poll interval stays at 3s because Binance serves the full window cheaply.

### Plumbing changes

- `useTicker` moved from a standalone polling loop to React Query, so `Header`, `BookLadder`, and `MyOrders` share one source of truth instead of each one firing its own `/ticker/24hr` request.
- New `lib/book.ts` + `lib/abi.ts` additions (`wbnbAbi` with `deposit()` payable + `withdraw(uint)`).

Typecheck clean. Production build passes. No bundle bloat beyond the new components.
