// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LimitOrderBook} from "../src/LimitOrderBook.sol";

/**
 * @title SeedDemo
 * @notice Populates the deployed LimitOrderBook on BSC testnet with a realistic
 *         spread of limit orders so that a judge landing on the terminal sees a
 *         non-empty book. Creates a mix of WBNB→BUSD sells and BUSD→WBNB buys
 *         at varying distances from a provided reference price.
 *
 * @dev    Required env:
 *           CONTRACT           — deployed LimitOrderBook address
 *           WBNB               — BSC testnet WBNB (0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd)
 *           BUSD               — BSC testnet BUSD (0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7)
 *           REF_PRICE_E8       — reference price in BUSD per WBNB scaled by 1e8 (e.g. 600_00000000 for $600)
 *           PRIVATE_KEY        — maker EOA (must hold WBNB and BUSD; use --private-key flag on forge)
 *
 *         Usage:
 *           forge script script/SeedDemo.s.sol:SeedDemo \
 *             --rpc-url https://bsc-testnet.publicnode.com \
 *             --broadcast --private-key $PRIVATE_KEY
 *
 *         Before running, make sure the EOA has approved this script's execution
 *         and holds at least ~1 WBNB + ~600 BUSD for the seeded quantities below.
 */
contract SeedDemo is Script {
    function run() external {
        address bookAddr = vm.envAddress("CONTRACT");
        address wbnb = vm.envAddress("WBNB");
        address busd = vm.envAddress("BUSD");
        uint256 refPriceE8 = vm.envUint("REF_PRICE_E8"); // e.g. 600_00000000 = $600/WBNB

        LimitOrderBook book = LimitOrderBook(bookAddr);

        // Percentage offsets (in basis points of ref price) for a realistic ladder.
        // Sells go ABOVE ref (asks); buys go BELOW ref (bids).
        int256[10] memory bps = [int256(50), 120, 240, 400, 800, -50, -120, -240, -400, -800];

        // Per-order WBNB notional in 1e18 units. Keep small to minimize faucet load.
        uint256[10] memory sizes = [
            uint256(0.05 ether),
            0.08 ether,
            0.1 ether,
            0.15 ether,
            0.2 ether,
            0.05 ether,
            0.08 ether,
            0.1 ether,
            0.15 ether,
            0.2 ether
        ];

        uint64 deadline = uint64(block.timestamp + 7 days);

        vm.startBroadcast();

        // Approve once, generously. LimitOrderBook uses SafeERC20 so an infinite
        // approve here is fine for seeding.
        IERC20(wbnb).approve(bookAddr, type(uint256).max);
        IERC20(busd).approve(bookAddr, type(uint256).max);

        for (uint256 i = 0; i < 10; i++) {
            int256 offsetBps = bps[i];
            uint256 size = sizes[i];
            // priceE8 = refPriceE8 * (10000 + offsetBps) / 10000
            uint256 priceE8 = uint256((int256(refPriceE8) * (int256(10000) + offsetBps)) / int256(10000));

            if (offsetBps > 0) {
                // SELL WBNB → BUSD at priceE8
                // minAmountOut (BUSD, 1e18) = size (WBNB, 1e18) * priceE8 / 1e8
                uint256 minOutBusd = (size * priceE8) / 1e8;
                uint256 orderId = book.createOrder(wbnb, busd, size, minOutBusd, deadline);
                console.log("  SELL order id:", orderId, "size WBNB:", size);
            } else {
                // BUY WBNB with BUSD at priceE8
                // amountIn (BUSD) = size (WBNB) * priceE8 / 1e8
                uint256 amountInBusd = (size * priceE8) / 1e8;
                uint256 orderId = book.createOrder(busd, wbnb, amountInBusd, size, deadline);
                console.log("  BUY order id:", orderId, "size WBNB:", size);
            }
        }

        vm.stopBroadcast();

        console.log("Seed complete. Open the terminal; book should be full.");
    }
}
