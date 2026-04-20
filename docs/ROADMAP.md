# ChainDesk — Post-Hackathon Roadmap

This is what ChainDesk looks like after the BNB Hack submission window closes. The goal is a credible path from "working testnet demo" to "durable DeFi primitive on BSC mainnet."

Each phase has a concrete deliverable and a success metric so progress is legible to contributors and prospective integrators.

---

## Phase 0 — Hackathon submission (now)

**Deliverable:** `LimitOrderBook` deployed to BSC testnet, ChainDesk Terminal running at a public URL, full docs under `/docs`.

**Success metric:** Judges can place, cancel, and execute an order end-to-end without reading the source.

---

## Phase 1 — Harden for mainnet (weeks 1-4)

The contract is intentionally small, but "small" is not the same as "audited." Before a single real dollar touches this book, the code needs external eyes.

- **External security review.** Engage one of: Peckshield, CertiK, or a reputable solo auditor (Pashov, Trust). Scope: `LimitOrderBook.sol` + deployment script. Budget ~$8-15k.
- **Fuzz + invariant test expansion.** Add Foundry invariant tests for: (a) total escrowed balance per token always equals sum of active-order `amountIn`, (b) an executed order always pays the maker ≥ `minAmountOut`, (c) `active` never flips back to true once false.
- **Formal gas profile.** Publish a gas-cost table for create / cancel / execute at representative pair depths so integrators know what to expect.
- **Testnet incentive program.** 2-week public testnet with a small WBNB pool that rewards executors pro-rata by tips earned — surfaces bugs and seeds a real executor set.

**Success metric:** Clean audit report published, 1000+ testnet orders filled by ≥10 distinct executors.

---

## Phase 2 — BSC mainnet launch (weeks 5-8)

- **Mainnet deployment** of the audited contract at a vanity address, with deployment tx permanently linked from the README and `bsc.address`.
- **Subgraph (The Graph).** Today the frontend scans logs client-side with a 200k-block lookback. A subgraph removes that ceiling, lets us render full historical charts of executed tips, and powers cross-device "My Orders" without a wallet connection.
- **Multi-pair support in the UI.** The contract is already pair-agnostic; the terminal currently hard-codes WBNB/BUSD. Ship a pair selector that reads the top-20 PancakeSwap V2 pairs by liquidity.
- **Mobile-responsive terminal.** The Bloomberg layout assumes a desktop viewport. Ship a mobile read-only view of the book + a simplified "create order" sheet.

**Success metric:** $500k cumulative notional volume in the first 30 days post-launch.

---

## Phase 3 — Executor ecosystem (weeks 9-16)

The executor-tip mechanic only works if executors show up. That's a cold-start problem worth solving deliberately rather than hoping.

- **Open-source reference executor bot.** Publish a TypeScript/Rust bot that watches the book, simulates swaps against the PancakeSwap V2 quoter, and submits `executeOrder` when profitable. Include a README with runbook + expected APR at sample volumes.
- **Tip analytics dashboard.** Public page showing total tips paid out, top executors by USD earned, average time-to-fill per pair. This is partially built (`TopExecutors.tsx`); expand to historical charts.
- **Executor SDK.** A small npm package (`@chaindesk/executor`) that abstracts: order fetching, profitability check, path optimization across V2 + V3, and tx submission. Target: a solo developer can have a working executor in <50 lines.

**Success metric:** ≥5 distinct executors earning >$100/week in tips.

---

## Phase 4 — Feature depth (months 4-6)

Now that the base primitive is live and utilized, grow it carefully.

- **Partial fills.** Today an order is all-or-nothing. Partial fills require a schema change (`filledAmount` field) and an execute variant that takes a fill size. This increases executor flexibility when a large order is only partially crossable on one route.
- **Stop-loss orders.** Identical escrow mechanic, but the trigger condition is inverted: execute only if DEX price falls below a threshold. Implementable as a second contract that shares the escrow pattern.
- **PancakeSwap V3 settlement.** Add an `executeOrderV3` that routes through the V3 quoter/router. Concentrated-liquidity pairs are where most BSC volume actually lives now.
- **Gasless order creation (EIP-712 + relayer).** Makers sign an order off-chain; a relayer (or the executor itself) posts it on-chain at fill time. Reduces the gas drag of creating-then-cancelling orders on volatile pairs.

**Success metric:** 25% of new orders use a feature shipped in this phase.

---

## Phase 5 — Composability & governance (months 6-12)

The long-term thesis is that a permissionless limit-order primitive becomes infrastructure other DeFi products compose against.

- **`ILimitOrderHook` interface.** Let integrators register a hook that runs on execute — unlocks use cases like: yield protocols auto-rebalancing via limit orders, vault strategies expressing "sell on rally" rules, DAO treasury programs.
- **Cross-chain deployment.** The contract is chain-agnostic (only depends on a UniswapV2-style router). Deploy to opBNB and Base with the same interface so tooling is reusable.
- **Optional governance-gated protocol fee.** *If and only if* the network effect warrants it — introduce a tiny (e.g. 2-5 bps) fee on executor tips that routes to a minimal DAO treasury funding audits, grants, and executor-bot bounties. This is a "only if the thing works" decision, not day-one scaffolding.

**Success metric:** At least one external protocol composes against `LimitOrderBook` in production.

---

## Non-goals

Calling these out so they don't accumulate as implicit TODOs.

- **A centralized matching engine.** The whole point is that execution is permissionless. We will not add an off-chain orderbook that "helps" matching.
- **A token.** No `$DESK`, no airdrop, no points program. The executor tip *is* the economic loop.
- **Support for fee-on-transfer / rebasing tokens.** The CEI-pattern balance-delta measurement assumes token-amount conservation. Supporting exotic tokens adds attack surface that isn't worth the maker base.
- **Frontend-gated order access.** The book is public onchain state. Any frontend — ours or a fork — can read and write against it. That's a feature.

---

## How to contribute

Post-hackathon, contributions are welcome through GitHub issues + PRs. Good first issues will be tagged once the mainnet audit is scheduled. For anything security-sensitive, email rather than filing publicly.
