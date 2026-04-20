import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { bscTestnet } from 'wagmi/chains';
import { http } from 'viem';
import { BSC_TESTNET_RPC } from './constants';

// Throwaway ID is fine for hack demo — MetaMask/injected wallets don't need it.
// Replace via NEXT_PUBLIC_WC_PROJECT_ID to enable WalletConnect v2 QR.
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'chaindesk-bnb-hack';

export const wagmiConfig = getDefaultConfig({
  appName: 'ChainDesk',
  projectId,
  chains: [bscTestnet],
  ssr: true,
  transports: {
    [bscTestnet.id]: http(BSC_TESTNET_RPC),
  },
});
