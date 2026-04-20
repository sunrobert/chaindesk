// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Minimal PancakeSwap V2 router interface (only the method we use)
interface IPancakeRouter02 {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

/**
 * @title LimitOrderBook
 * @notice A permissionless limit order book that settles trades through PancakeSwap V2.
 *
 *         Users escrow their input tokens and specify the minimum amount of output
 *         token they'll accept. Anyone can execute an order by calling executeOrder;
 *         the executor keeps positive slippage as a tip, which creates a natural
 *         incentive to execute orders as soon as they're crossable without needing
 *         a dedicated keeper network.
 *
 * @dev    Built for BNB Hack: US College Edition (Track 2 - DeFi & Financial Tools).
 *         Does NOT support fee-on-transfer tokens or native BNB - wrap BNB to WBNB first.
 */
contract LimitOrderBook is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    struct Order {
        address maker; // slot 0: 20 + 8 + 1 = 29 bytes packed
        uint64 deadline;
        bool active;
        address tokenIn; // slot 1
        address tokenOut; // slot 2
        uint256 amountIn; // slot 3
        uint256 minAmountOut; // slot 4
    }

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    IPancakeRouter02 public immutable router;

    uint256 public nextOrderId;
    mapping(uint256 => Order) public orders;

    /// @dev orderIds indexed by maker address (for "my orders" UI panel)
    mapping(address => uint256[]) private _ordersByMaker;

    /// @dev orderIds indexed by keccak256(tokenIn, tokenOut) (for chart overlay)
    mapping(bytes32 => uint256[]) private _ordersByPair;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event OrderCreated(
        uint256 indexed orderId,
        address indexed maker,
        address indexed tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint64 deadline
    );

    event OrderCancelled(uint256 indexed orderId, address indexed maker);

    event OrderExecuted(uint256 indexed orderId, address indexed executor, uint256 amountOut, uint256 executorTip);

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error NotMaker();
    error OrderNotActive();
    error OrderExpired();
    error InvalidAmount();
    error InvalidPair();
    error InvalidPath();
    error InsufficientOutput();

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    /// @param _router PancakeSwap V2 router address.
    ///   BSC mainnet: 0x10ED43C718714eb63d5aA57B78B54704E256024E
    ///   BSC testnet: 0xD99D1c33F9fC3444f8101754aBC46c52416550D1
    constructor(address _router) {
        require(_router != address(0), "router=0");
        router = IPancakeRouter02(_router);
    }

    // ---------------------------------------------------------------------
    // Maker flows
    // ---------------------------------------------------------------------

    /**
     * @notice Create a limit order. Pulls `amountIn` of `tokenIn` from the caller into escrow.
     * @dev Caller must have approved at least `amountIn` of `tokenIn` to this contract.
     *      The implicit limit price is `minAmountOut / amountIn`.
     */
    function createOrder(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint64 deadline)
        external
        nonReentrant
        returns (uint256 orderId)
    {
        if (amountIn == 0 || minAmountOut == 0) revert InvalidAmount();
        if (tokenIn == tokenOut || tokenIn == address(0) || tokenOut == address(0)) revert InvalidPair();
        if (deadline <= block.timestamp) revert OrderExpired();

        orderId = nextOrderId++;

        orders[orderId] = Order({
            maker: msg.sender,
            deadline: deadline,
            active: true,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut
        });

        _ordersByMaker[msg.sender].push(orderId);
        _ordersByPair[_pairKey(tokenIn, tokenOut)].push(orderId);

        // Pull tokens into escrow
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        emit OrderCreated(orderId, msg.sender, tokenIn, tokenOut, amountIn, minAmountOut, deadline);
    }

    /**
     * @notice Cancel an active order and refund the escrowed tokens to the maker.
     */
    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        if (order.maker != msg.sender) revert NotMaker();
        if (!order.active) revert OrderNotActive();

        order.active = false;

        IERC20(order.tokenIn).safeTransfer(order.maker, order.amountIn);

        emit OrderCancelled(orderId, msg.sender);
    }

    // ---------------------------------------------------------------------
    // Executor flow
    // ---------------------------------------------------------------------

    /**
     * @notice Execute a crossable order via PancakeSwap V2.
     * @param orderId The order to execute.
     * @param path The swap path. Must start with order.tokenIn and end with order.tokenOut.
     *             Executors are free to pick multi-hop routes for better prices.
     *
     * @dev Maker receives exactly `minAmountOut`. Any positive slippage (actual output
     *      minus minAmountOut) is paid to the executor as a tip. This makes executing
     *      profitable as soon as the DEX price crosses the maker's limit price.
     */
    function executeOrder(uint256 orderId, address[] calldata path) external nonReentrant {
        Order storage order = orders[orderId];
        if (!order.active) revert OrderNotActive();
        if (order.deadline <= block.timestamp) revert OrderExpired();

        // Validate path
        if (path.length < 2) revert InvalidPath();
        if (path[0] != order.tokenIn || path[path.length - 1] != order.tokenOut) revert InvalidPath();

        // Cache fields before deactivating (saves gas vs repeated storage reads)
        address tokenIn = order.tokenIn;
        address tokenOut = order.tokenOut;
        uint256 amountIn = order.amountIn;
        uint256 minAmountOut = order.minAmountOut;
        address maker = order.maker;

        // Deactivate BEFORE any external calls (CEI pattern)
        order.active = false;

        // Approve router for this exact amount
        IERC20(tokenIn).forceApprove(address(router), amountIn);

        // Measure output by balance delta (defensive against weird tokens)
        uint256 balanceBefore = IERC20(tokenOut).balanceOf(address(this));

        router.swapExactTokensForTokens(amountIn, minAmountOut, path, address(this), block.timestamp + 60);

        uint256 amountOut = IERC20(tokenOut).balanceOf(address(this)) - balanceBefore;
        if (amountOut < minAmountOut) revert InsufficientOutput();

        // Maker gets the price they asked for; executor pockets any positive slippage
        uint256 executorTip = amountOut - minAmountOut;

        IERC20(tokenOut).safeTransfer(maker, minAmountOut);
        if (executorTip > 0) {
            IERC20(tokenOut).safeTransfer(msg.sender, executorTip);
        }

        emit OrderExecuted(orderId, msg.sender, amountOut, executorTip);
    }

    // ---------------------------------------------------------------------
    // View helpers (for the frontend)
    // ---------------------------------------------------------------------

    /**
     * @notice Fetch all currently active orders for a given (tokenIn, tokenOut) pair.
     *         This is what the chart overlay calls to render horizontal order lines.
     */
    function getOpenOrdersByPair(address tokenIn, address tokenOut)
        external
        view
        returns (uint256[] memory activeIds, Order[] memory activeOrders)
    {
        uint256[] storage ids = _ordersByPair[_pairKey(tokenIn, tokenOut)];
        uint256 len = ids.length;

        // First pass: count still-active orders
        uint256 count;
        for (uint256 i; i < len; ++i) {
            Order storage o = orders[ids[i]];
            if (o.active && o.deadline > block.timestamp) {
                unchecked {
                    ++count;
                }
            }
        }

        // Second pass: populate
        activeIds = new uint256[](count);
        activeOrders = new Order[](count);
        uint256 j;
        for (uint256 i; i < len; ++i) {
            Order storage o = orders[ids[i]];
            if (o.active && o.deadline > block.timestamp) {
                activeIds[j] = ids[i];
                activeOrders[j] = o;
                unchecked {
                    ++j;
                }
            }
        }
    }

    /**
     * @notice Fetch all orders (active + historical) created by a maker.
     *         Used by the "My Orders" UI panel.
     */
    function getOrdersByMaker(address maker) external view returns (uint256[] memory ids, Order[] memory makerOrders) {
        ids = _ordersByMaker[maker];
        uint256 len = ids.length;
        makerOrders = new Order[](len);
        for (uint256 i; i < len; ++i) {
            makerOrders[i] = orders[ids[i]];
        }
    }

    function _pairKey(address tokenIn, address tokenOut) private pure returns (bytes32) {
        return keccak256(abi.encode(tokenIn, tokenOut));
    }
}
