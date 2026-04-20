import type { Address } from 'viem';

export const CHAIN_ID = 97;

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  '0x3B933087c131B30a38fF9C85EE665209b7005751') as Address;

export const ROUTER: Address = '0xD99D1c33F9fC3444f8101754aBC46c52416550D1';

export const WBNB: Address = '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd';
export const BUSD: Address = '0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7';

export const TOKENS = {
  WBNB: { address: WBNB, symbol: 'WBNB', decimals: 18 },
  BUSD: { address: BUSD, symbol: 'BUSD', decimals: 18 },
} as const;

// Default market: BNB priced in BUSD
export const BASE = TOKENS.WBNB;   // base asset (what's being bought/sold)
export const QUOTE = TOKENS.BUSD;  // quote asset (pricing currency)

// Binance klines symbol used for reference candles
export const BINANCE_SYMBOL = 'BNBUSDT';

// Polling intervals
export const CANDLE_POLL_MS = 3000;
export const ORDER_POLL_MS = 3000;

export const BSC_TESTNET_RPC = 'https://bsc-testnet.publicnode.com';

export const BSCSCAN = 'https://testnet.bscscan.com';
