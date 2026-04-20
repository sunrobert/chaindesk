// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {LimitOrderBook} from "../src/LimitOrderBook.sol";

contract Deploy is Script {
    address constant PANCAKE_V2_ROUTER_MAINNET = 0x10ED43C718714eb63d5aA57B78B54704E256024E;
    address constant PANCAKE_V2_ROUTER_TESTNET = 0xD99D1c33F9fC3444f8101754aBC46c52416550D1;

    function run() external returns (LimitOrderBook book) {
        address router;
        if (block.chainid == 56) {
            router = PANCAKE_V2_ROUTER_MAINNET;
            console.log("Deploying to BSC mainnet, router:", router);
        } else if (block.chainid == 97) {
            router = PANCAKE_V2_ROUTER_TESTNET;
            console.log("Deploying to BSC testnet, router:", router);
        } else {
            revert("Unsupported chain. Use BSC mainnet (56) or testnet (97).");
        }

        vm.startBroadcast();
        book = new LimitOrderBook(router);
        vm.stopBroadcast();

        console.log("LimitOrderBook deployed at:", address(book));
    }
}
