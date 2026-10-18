/**
 * TxStatusBadge — shows the 5-state transaction pipeline.
 *
 * Used everywhere a contract action is in flight. Hides entirely in idle state.
 * Never marks a tx confirmed without a real txHash from the chain.
 */
import { Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import type { TxState } from '../hooks/useClearFund'
import { arcTestnetExplorerUrl } from '../hooks/useClearFund'

interface Props {
  tx: TxState
  /** Label shown in the confirmed line, e.g. "Campaign created" */
  confirmedLabel?: string
}

export default function TxStatusBadge({ tx, confirmedLabel = 'Confirmed' }: Props) {
  if (tx.stage === 'idle') return null

  const explorerUrl = arcTestnetExplorerUrl(tx.txHash)

  const bg =
    tx.stage === 'confirmed' ? 'var(--success-dim)'
    : tx.stage === 'failed'  ? 'var(--danger-dim)'
    : 'var(--accent-dim)'

  const color =
    tx.stage === 'confirmed' ? 'var(--success)'
    : tx.stage === 'failed'  ? 'var(--danger)'
    : 'var(--accent)'

  const Icon =
    tx.stage === 'confirmed' ? CheckCircle2
    : tx.stage === 'failed'  ? XCircle
    : Loader2

  const spinning = tx.stage === 'preparing' || tx.stage === 'pendingSignature' || tx.stage === 'pendingConfirmation'

  const label =
    tx.stage === 'preparing'           ? 'Preparing transaction…'
    : tx.stage === 'pendingSignature'  ? 'Waiting for wallet confirmation…'
    : tx.stage === 'pendingConfirmation' ? 'Broadcasting to Arc Testnet…'
    : tx.stage === 'confirmed'         ? confirmedLabel
    : tx.error ?? 'Transaction failed'

  return (
    <div
      className="flex items-start gap-2 px-4 py-3 rounded-xl text-xs"
      style={{ background: bg, border: `1px solid ${color}30`, color }}
    >
      <Icon
        size={13}
        className={`mt-0.5 shrink-0 ${spinning ? 'animate-spin' : ''}`}
        style={{ color }}
      />
      <div className="flex-1 min-w-0">
        <span>{label}</span>
        {tx.txHash && (
          <div className="mt-1 flex items-center gap-1 mono" style={{ color: 'var(--accent)', opacity: 0.85 }}>
            <span className="truncate">{tx.txHash.slice(0, 20)}…{tx.txHash.slice(-6)}</span>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-0.5"
                style={{ color: 'var(--accent)' }}
              >
                <ExternalLink size={10} />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
