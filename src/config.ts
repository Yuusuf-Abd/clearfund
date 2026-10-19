/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 *
 * Supports Arc Testnet (chain ID 5042002) and Arc Mainnet (chain ID 5042).
 * The active chain is determined by VITE_CLEARFUND_CHAIN at build time:
 *   VITE_CLEARFUND_CHAIN=mainnet  → Arc Mainnet
 *   (anything else, or absent)   → Arc Testnet  (default)
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arcTestnet, arc } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])
registerChain(arc.id, arc.rpcUrls.default.http[0])

export const config = createConfig({
  chains: [arcTestnet, arc, mainnet], // mainnet needed for ENS resolution
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http('https://rpc.testnet.arc.io'),
    [arc.id]:        http('https://rpc.mainnet.arc.io'),
    [mainnet.id]:    http(), // ENS resolution uses mainnet
  },
})
