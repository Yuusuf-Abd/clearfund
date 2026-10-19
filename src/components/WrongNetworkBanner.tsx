/**
 * WrongNetworkBanner — shows a prominent warning when the user's wallet is
 * connected but not on Arc Testnet (chain ID 5042002).
 *
 * Only rendered when:
 *  1. The contract is deployed (testnet mode).
 *  2. A wallet is connected.
 *  3. The connected chain does NOT match CLEARFUND_CHAIN.
 *
 * Offers a one-click switch via useSwitchChain (wagmi v2).
 */

import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { AlertTriangle } from 'lucide-react'
import { isContractDeployed, CLEARFUND_CHAIN, ARC_TESTNET_CHAIN_ID, ARC_MAINNET_CHAIN_ID } from '@/lib/clearfundContract'

export function WrongNetworkBanner() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()

  if (!isContractDeployed()) return null
  if (!isConnected) return null
  // Confirm the configured chain is a known Arc network before offering a switch.
  const isKnownArcChain =
    CLEARFUND_CHAIN.id === ARC_TESTNET_CHAIN_ID ||
    CLEARFUND_CHAIN.id === ARC_MAINNET_CHAIN_ID
  if (!isKnownArcChain) return null
  if (chainId === CLEARFUND_CHAIN.id) return null

  return (
    <div
      role="alert"
      className="w-full bg-amber-500/15 border-b border-amber-500/30 px-4 py-3"
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 text-amber-300 flex-1 min-w-0">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium">
            Wrong network — ClearFund runs on{' '}
            <strong>{CLEARFUND_CHAIN.name}</strong>.
            Your wallet is on chain ID {chainId}.
          </span>
        </div>
        <button
          onClick={() => switchChain({ chainId: CLEARFUND_CHAIN.id })}
          disabled={isPending}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-semibold
                     hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400
                     transition-colors"
          aria-label={`Switch wallet to ${CLEARFUND_CHAIN.name}`}
        >
          {isPending ? 'Switching…' : `Switch to ${CLEARFUND_CHAIN.name}`}
        </button>
      </div>
    </div>
  )
}
