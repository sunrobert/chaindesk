# ChainDesk

**A permissionless public limit order book for BSC — with a Bloomberg-style terminal UI and a Claude-powered market read.**

Submitted for BNB Hack: US College Edition (Track 2 · DeFi & Financial Tools).

- **Deployed contract (BSC Testnet):** [`0x3B933087c131B30a38fF9C85EE665209b7005751`](https://testnet.bscscan.com/address/0x3B933087c131B30a38fF9C85EE665209b7005751)
- **Deployment tx:** [`0x00ed…1adc`](https://testnet.bscscan.com/tx/0x00ed0de341b85a25702f2ece4b1f511bb2a05cf38cba699415391a8b77521adc)
- **Machine-readable deployment record:** [`bsc.address`](./bsc.address)

---

## What it is

A single ~200-line Solidity contract that lets anyone create, cancel, or execute a limit order against PancakeSwap V2. The maker gets exactly the price they asked for. The executor keeps any positive slippage as a tip. That tip is the whole incentive — there is no private keeper network, no admin key, no protocol fee.

On top of the contract, ChainDesk Terminal is a Next.js frontend that presents the public book as a professional trading interface: live ladder, chart with resting-order overlays, one-click "Execute All Crossable," an AI Market Read strip that synthesizes the onchain book + Binance spot + Polymarket crypto prediction markets via Claude Haiku, a Top Executors leaderboard, and the usual Bloomberg-terminal polish (F-key navigation, live block pulse, scrolling news ticker).

## Why this structure

This repository follows the [BNBChain hackathon project template](https://github.com/0xlucasliao/hackathon-starter-kit) so judges can evaluate quickly:

| File / directory | What's inside |
|---|---|
| [`docs/PROJECT.md`](./docs/PROJECT.md) | Problem, solution, ecosystem impact, limitations, roadmap |
| [`docs/TECHNICAL.md`](./docs/TECHNICAL.md) | Architecture diagrams, component breakdown, setup & run, demo guide |
| [`docs/EXTRAS.md`](./docs/EXTRAS.md) | Optional demo video and presentation links |
| [`bsc.address`](./bsc.address) | Machine-readable deployment record (JSON) |
| [`src/`](./src) | Contract source (`LimitOrderBook.sol`) |
| [`test/`](./test) | Foundry tests |
| [`script/`](./script) | Foundry deploy script |
| [`web/`](./web) | Next.js 14 terminal frontend + Claude Market Read route |

## Quick start

```bash
# 1. Clone
git clone https://github.com/sunrobert/chaindesk
cd chaindesk

# 2. (Optional) Rebuild & test the contract
forge install
forge build
forge test -vv

# 3. Run the terminal locally
cd web
npm install
cp .env.local.example .env.local   # optional: add ANTHROPIC_API_KEY for live MARKET READ
npm run dev
# open http://localhost:3000
```

Full setup, deploy, and demo-run instructions are in [`docs/TECHNICAL.md`](./docs/TECHNICAL.md).

## Judging rubric cross-reference

| Criterion | Weight | Where to verify |
|---|---|---|
| Technical execution — "is the onchain piece real?" | 30% | [Deployed contract](https://testnet.bscscan.com/address/0x3B933087c131B30a38fF9C85EE665209b7005751) · [`src/LimitOrderBook.sol`](./src/LimitOrderBook.sol) · [`test/LimitOrderBook.t.sol`](./test) |
| Originality | 25% | Permissionless book as public good + executor-tip incentive (no private keepers). AI Market Read synthesizing onchain + Binance + Polymarket. See [`docs/PROJECT.md §2`](./docs/PROJECT.md) |
| Real-world relevance | 25% | BSC has no native on-AMM limit orders. Target users and adoption path in [`docs/PROJECT.md §3`](./docs/PROJECT.md) |
| Demo & presentation | 10% | [`docs/TECHNICAL.md §3`](./docs/TECHNICAL.md) demo guide; terminal runs locally |
| Builder profile | 10% | Commit history on the repo's main branch |

## License

MIT — do whatever you want. Don't put life savings in testnet contracts.
