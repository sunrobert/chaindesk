// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {LimitOrderBook} from "../src/LimitOrderBook.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Minimal mock ERC20 for tests
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract LimitOrderBookTest is Test {
    LimitOrderBook internal book;
    MockERC20 internal tokenA;
    MockERC20 internal tokenB;

    address internal constant ROUTER_STUB = address(0xBEEF);
    address internal alice = address(0xA11CE);

    function setUp() public {
        book = new LimitOrderBook(ROUTER_STUB);
        tokenA = new MockERC20("TokenA", "TKA");
        tokenB = new MockERC20("TokenB", "TKB");

        tokenA.mint(alice, 1_000e18);

        vm.prank(alice);
        tokenA.approve(address(book), type(uint256).max);
    }

    function test_CreateOrder_EscrowsTokens() public {
        uint256 amountIn = 100e18;
        uint256 minOut = 50e18;
        uint64 deadline = uint64(block.timestamp + 1 hours);

        vm.prank(alice);
        uint256 orderId = book.createOrder(address(tokenA), address(tokenB), amountIn, minOut, deadline);

        assertEq(orderId, 0, "first order should have id 0");
        assertEq(tokenA.balanceOf(address(book)), amountIn, "contract should hold the escrow");
        assertEq(tokenA.balanceOf(alice), 1_000e18 - amountIn, "maker balance debited");

        (
            address maker,
            uint64 storedDeadline,
            bool active,
            address tokenIn,
            address tokenOut,
            uint256 storedAmountIn,
            uint256 storedMinOut
        ) = book.orders(orderId);

        assertEq(maker, alice);
        assertEq(storedDeadline, deadline);
        assertTrue(active);
        assertEq(tokenIn, address(tokenA));
        assertEq(tokenOut, address(tokenB));
        assertEq(storedAmountIn, amountIn);
        assertEq(storedMinOut, minOut);
    }

    function test_CancelOrder_RefundsMaker() public {
        vm.startPrank(alice);
        uint256 orderId =
            book.createOrder(address(tokenA), address(tokenB), 100e18, 50e18, uint64(block.timestamp + 1 hours));

        uint256 balBefore = tokenA.balanceOf(alice);
        book.cancelOrder(orderId);
        uint256 balAfter = tokenA.balanceOf(alice);
        vm.stopPrank();

        assertEq(balAfter - balBefore, 100e18, "maker fully refunded");

        (,, bool active,,,,) = book.orders(orderId);
        assertFalse(active, "order should be inactive after cancel");
    }

    function test_Cancel_RevertsIfNotMaker() public {
        vm.prank(alice);
        uint256 orderId =
            book.createOrder(address(tokenA), address(tokenB), 100e18, 50e18, uint64(block.timestamp + 1 hours));

        vm.expectRevert(LimitOrderBook.NotMaker.selector);
        book.cancelOrder(orderId);
    }

    function test_Create_RevertsOnZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(LimitOrderBook.InvalidAmount.selector);
        book.createOrder(address(tokenA), address(tokenB), 0, 50e18, uint64(block.timestamp + 1 hours));
    }

    function test_Create_RevertsOnSameToken() public {
        vm.prank(alice);
        vm.expectRevert(LimitOrderBook.InvalidPair.selector);
        book.createOrder(address(tokenA), address(tokenA), 100e18, 50e18, uint64(block.timestamp + 1 hours));
    }

    function test_Create_RevertsOnPastDeadline() public {
        vm.warp(100);
        vm.prank(alice);
        vm.expectRevert(LimitOrderBook.OrderExpired.selector);
        book.createOrder(address(tokenA), address(tokenB), 100e18, 50e18, uint64(50));
    }

    function test_GetOpenOrdersByPair_FiltersInactive() public {
        vm.startPrank(alice);
        uint256 id1 =
            book.createOrder(address(tokenA), address(tokenB), 100e18, 50e18, uint64(block.timestamp + 1 hours));
        uint256 id2 =
            book.createOrder(address(tokenA), address(tokenB), 200e18, 90e18, uint64(block.timestamp + 1 hours));
        book.cancelOrder(id1);
        vm.stopPrank();

        (uint256[] memory ids, LimitOrderBook.Order[] memory open) =
            book.getOpenOrdersByPair(address(tokenA), address(tokenB));

        assertEq(ids.length, 1, "only one active order remains");
        assertEq(ids[0], id2, "should return id2");
        assertEq(open[0].amountIn, 200e18);
    }

    function test_GetOrdersByMaker_ReturnsAll() public {
        vm.startPrank(alice);
        book.createOrder(address(tokenA), address(tokenB), 100e18, 50e18, uint64(block.timestamp + 1 hours));
        book.createOrder(address(tokenA), address(tokenB), 200e18, 90e18, uint64(block.timestamp + 1 hours));
        vm.stopPrank();

        (uint256[] memory ids, LimitOrderBook.Order[] memory makerOrders) = book.getOrdersByMaker(alice);
        assertEq(ids.length, 2);
        assertEq(makerOrders.length, 2);
        assertEq(makerOrders[0].maker, alice);
    }
}
