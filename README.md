# ChainDesk — LimitOrderBook contract

The onchain piece of ChainDesk: a permissionless limit order book on BSC that settles through PancakeSwap V2.

## What it does

Makers create a limit order by escrowing `tokenIn` and specifying the minimum `tokenOut` they'll accept. Anyone can call `executeOrder(orderId, path)` when the DEX price has crossed the limit. The maker receives exactly their `minAmountOut`; the executor pockets any positive slippage as a tip, which is the natural incentive that replaces a keeper network for the MVP.

Three core functions:

- `createOrder(tokenIn, tokenOut, amountIn, minAmountOut, deadline)` — escrows tokens, emits `OrderCreated`.
- `cancelOrder(orderId)` — maker-only, refunds escrow.
- `executeOrder(orderId, path)` — public, swaps through PancakeSwap, settles.

Two view helpers the frontend uses:

- `getOpenOrdersByPair(tokenIn, tokenOut)` — powers the live order overlay on the chart.
- `getOrdersByMaker(maker)` — powers the "my orders" panel.

## Setup

You need [Foundry](https://book.getfoundry.sh/getting-started/installation) installed.

```bash
# 1. Initialize a foundry project (skip if you cloned this repo directly)
forge init chaindesk --no-commit
cd chaindesk

# 2. Drop the files from this project into place:
#    src/LimitOrderBook.sol
#    script/Deploy.s.sol
#    test/LimitOrderBook.t.sol
#    foundry.toml
#    remappings.txt
#    .env.example

# 3. Install deps
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit

# 4. Build + test
forge build
forge test -vv
```

If tests pass, you're green to deploy.

## Deploy

```bash
# 1. Configure env
cp .env.example .env
# Fill in PRIVATE_KEY. For testnet, use a throwaway wallet funded from
# https://www.bnbchain.org/en/testnet-faucet

# 2. Load env
source .env

# 3. Deploy to BSC testnet
forge script script/Deploy.s.sol:Deploy \
    --rpc-url $BSC_TESTNET_RPC \
    --broadcast \
    --private-key $PRIVATE_KEY \
    -vvv

# The console will print the deployed address. Save it - the frontend needs it.
```

For **mainnet** (recommended for the demo — real liquidity, real tx hashes, costs ~$0.10 in BNB):

```bash
forge script script/Deploy.s.sol:Deploy \
    --rpc-url $BSC_MAINNET_RPC \
    --broadcast \
    --private-key $PRIVATE_KEY \
    -vvv
```

### Verify on BscScan (optional, adds credibility to the demo)

```bash
forge verify-contract \
    --chain-id 56 \
    --num-of-optimizations 200 \
    --watch \
    --constructor-args $(cast abi-encode "constructor(address)" 0x10ED43C718714eb63d5aA57B78B54704E256024E) \
    --etherscan-api-key $BSCSCAN_API_KEY \
    --compiler-version v0.8.24+commit.e11b9ed9 \
    <DEPLOYED_ADDRESS> \
    src/LimitOrderBook.sol:LimitOrderBook
```

For testnet, swap `--chain-id 56` → `97` and the constructor arg → `0xD99D1c33F9fC3444f8101754aBC46c52416550D1`.

## Hackathon submission checklist

- [x] Contract deployed on BSC (testnet or mainnet) — **save the address**
- [ ] At least one `createOrder` tx hash saved — **save the hash**
- [ ] At least one `executeOrder` tx hash saved (do a real swap!) — **save the hash**
- [ ] Public repo with this code — **add to DoraHacks submission**
- [ ] Demo video showing the terminal in action — **record last**

## Security notes (for the README / pitch)

This is a 4-week hackathon build, not a production protocol. Known limitations:

- No support for fee-on-transfer tokens (would miscount escrow).
- No multi-fill (each order is all-or-nothing).
- No protocol fee.
- Gas-unbounded view functions could OOG at very high order counts per pair.
- Not audited. Don't put life savings in it.

The contract uses `ReentrancyGuard`, OZ `SafeERC20`, and the checks-effects-interactions pattern. It's small enough (~200 lines) to read end-to-end in ten minutes.
