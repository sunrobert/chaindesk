// Hand-pruned ABI — only what the frontend calls.
// Matches LimitOrderBook.sol deployed at CONTRACT_ADDRESS.

export const limitOrderBookAbi = [
  {
    type: 'function',
    name: 'createOrder',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'minAmountOut', type: 'uint256' },
      { name: 'deadline', type: 'uint64' },
    ],
    outputs: [{ name: 'orderId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'cancelOrder',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'orderId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'executeOrder',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getOpenOrdersByPair',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
    ],
    outputs: [
      { name: 'activeIds', type: 'uint256[]' },
      {
        name: 'activeOrders',
        type: 'tuple[]',
        components: [
          { name: 'maker', type: 'address' },
          { name: 'deadline', type: 'uint64' },
          { name: 'active', type: 'bool' },
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'minAmountOut', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getOrdersByMaker',
    stateMutability: 'view',
    inputs: [{ name: 'maker', type: 'address' }],
    outputs: [
      { name: 'ids', type: 'uint256[]' },
      {
        name: 'makerOrders',
        type: 'tuple[]',
        components: [
          { name: 'maker', type: 'address' },
          { name: 'deadline', type: 'uint64' },
          { name: 'active', type: 'bool' },
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'minAmountOut', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'event',
    name: 'OrderCreated',
    inputs: [
      { name: 'orderId', type: 'uint256', indexed: true },
      { name: 'maker', type: 'address', indexed: true },
      { name: 'tokenIn', type: 'address', indexed: true },
      { name: 'tokenOut', type: 'address', indexed: false },
      { name: 'amountIn', type: 'uint256', indexed: false },
      { name: 'minAmountOut', type: 'uint256', indexed: false },
      { name: 'deadline', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'OrderCancelled',
    inputs: [
      { name: 'orderId', type: 'uint256', indexed: true },
      { name: 'maker', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'OrderExecuted',
    inputs: [
      { name: 'orderId', type: 'uint256', indexed: true },
      { name: 'executor', type: 'address', indexed: true },
      { name: 'amountOut', type: 'uint256', indexed: false },
      { name: 'executorTip', type: 'uint256', indexed: false },
    ],
  },
] as const;

export const erc20Abi = [
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

export const wbnbAbi = [
  ...erc20Abi,
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'wad', type: 'uint256' }],
    outputs: [],
  },
] as const;

export const pancakeRouterAbi = [
  {
    type: 'function',
    name: 'swapExactETHForTokens',
    stateMutability: 'payable',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getAmountsOut',
    stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
] as const;

export type OrderTuple = {
  maker: `0x${string}`;
  deadline: bigint;
  active: boolean;
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  amountIn: bigint;
  minAmountOut: bigint;
};
