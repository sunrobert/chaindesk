# ChainDesk — web

Pro-trader terminal for PancakeSwap on BNB Chain. Every open limit order in the pool appears as a horizontal line on the chart.

## Setup

```bash
cd web
cp .env.local.example .env.local
npm install
npm run dev
# http://localhost:3000
```

Point MetaMask at BSC Testnet (chainId 97). Get testnet BNB from https://testnet.bnbchain.org/faucet-smart.

## Env

| Var | Default | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | `0x3B933087c131B30a38fF9C85EE665209b7005751` | Deployed `LimitOrderBook` |
| `NEXT_PUBLIC_WC_PROJECT_ID` | (optional) | WalletConnect v2 project id. MetaMask-injected works without it. |

## Commands

| | |
| --- | --- |
| `npm run dev` | dev server on :3000 |
| `npm run build` | production build |
| `npm run typecheck` | `tsc --noEmit` |

## Layout

- **Left (stacked):** My Orders + Recent Fills
- **Center:** BNB/BUSD candles (Binance reference) with live order-book overlay (onchain)
- **Right:** Order ticket — approve → createOrder

## Notes

- Chart candles are Binance spot `BNBUSDT` for price reference only. Trades execute on BSC testnet.
- Price lines on the chart come from `getOpenOrdersByPair(tokenIn, tokenOut)`. Every maker on the book — not just yours.
- `OrderExecuted` events power the Recent Fills feed. No indexer.
