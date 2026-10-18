/**
 * ContractModeBanner — shows a dismissible top-of-page banner describing
 * whether the app is in DEMO mode or connected to Arc Testnet.
 */
import { useState } from 'react'
import { Info, X, Wifi } from 'lucide-react'
import { useClearFundMode } from '../hooks/useClearFund'

export default function ContractModeBanner() {
  const mode = useClearFundMode()
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  if (mode === 'testnet') {
    return (
      <div
        className="flex items-center gap-2 px-4 py-2.5 text-xs"
        style={{
          background: 'rgba(77,157,224,0.12)',
          borderBottom: '1px solid rgba(77,157,224,0.25)',
          color: 'var(--accent)',
        }}
      >
        <Wifi size={12} className="shrink-0" />
        <span className="flex-1">
          <strong>Arc Testnet</strong> — connected to the ClearFundEscrow contract. All transactions are on the test network. No real funds.
        </span>
        <button onClick={() => setDismissed(true)} aria-label="Dismiss banner" style={{ color: 'var(--accent)', opacity: 0.7 }}>
          <X size={12} />
        </button>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 text-xs"
      style={{
        background: 'rgba(244,194,106,0.10)',
        borderBottom: '1px solid rgba(244,194,106,0.2)',
        color: 'var(--warning)',
      }}
    >
      <Info size={12} className="shrink-0" aria-hidden="true" />
      <span className="flex-1 min-w-0">
        <strong>DEMO mode</strong> — no contract deployed. All data is stored in your browser only. No USDC is transferred.
      </span>
      <button onClick={() => setDismissed(true)} aria-label="Dismiss banner" style={{ color: 'var(--warning)', opacity: 0.7 }}>
        <X size={12} />
      </button>
    </div>
  )
}
