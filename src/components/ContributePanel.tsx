/**
 * ContributePanel — USDC contribution widget for a live campaign.
 *
 * Flow:
 *   1. User enters amount (human-readable USDC string, e.g. "50")
 *   2. "Contribute" button calls useContribute which:
 *      a. Calls USDC.approve(escrow, amount)   — wallet signature 1
 *      b. Calls escrow.contribute(id, amount)  — wallet signature 2
 *   3. TxStatusBadge shows each tx state transition in real time.
 *
 * Shown only when:
 *   - The contract is deployed (testnet mode).
 *   - The campaign is active.
 *   - The user is connected.
 *
 * Never initiates real USDC transfers in DEMO mode.
 * Never shows a confirmation before the tx is mined.
 */

import { useState } from 'react'
import { Wallet, DollarSign } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useContribute, useClearFundMode, txStageLabel, arcTestnetExplorerUrl } from '../hooks/useClearFund'
import TxStatusBadge from './TxStatusBadge'

interface ContributePanelProps {
  campaignId: bigint
  campaignActive: boolean
}

export default function ContributePanel({ campaignId, campaignActive }: ContributePanelProps) {
  const mode = useClearFundMode()
  const { isConnected } = useAccount()
  const { tx, contribute, reset } = useContribute()
  const [amount, setAmount] = useState('')
  const [amountErr, setAmountErr] = useState('')

  if (mode !== 'testnet') return null
  if (!campaignActive) return null

  const busy = tx.stage === 'pendingSignature' || tx.stage === 'pendingConfirmation' || tx.stage === 'preparing'
  const explorerUrl = arcTestnetExplorerUrl(tx.txHash)

  function handleContribute() {
    const n = Number(amount)
    if (!amount || isNaN(n) || n <= 0) {
      setAmountErr('Enter a positive USDC amount.')
      return
    }
    if (n < 1) {
      setAmountErr('Minimum contribution is 1 USDC.')
      return
    }
    setAmountErr('')
    void contribute(campaignId, amount)
  }

  return (
    <div
      className="rounded-2xl p-5 mt-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Wallet size={14} style={{ color: 'var(--accent)' }} />
        <span className="display font-semibold text-sm" style={{ color: 'var(--ink)' }}>
          Contribute USDC
        </span>
        <span
          className="text-xs px-1.5 py-0.5 rounded font-medium ml-auto"
          style={{ background: 'rgba(77,157,224,0.12)', color: 'var(--accent)' }}
        >
          TEST NETWORK
        </span>
      </div>

      {!isConnected ? (
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Connect your wallet to contribute.
        </p>
      ) : tx.stage === 'confirmed' ? (
        <div className="space-y-2">
          <TxStatusBadge tx={tx} confirmedLabel="Contribution confirmed" />
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline"
              style={{ color: 'var(--accent)' }}
            >
              View on Arc Testnet Explorer
            </a>
          )}
          <button
            onClick={() => { reset(); setAmount('') }}
            className="text-xs mt-1"
            style={{ color: 'var(--muted)' }}
          >
            Contribute again
          </button>
        </div>
      ) : tx.stage === 'failed' ? (
        <div className="space-y-2">
          <TxStatusBadge tx={tx} />
          <button
            onClick={() => { reset(); setAmount('') }}
            className="text-xs"
            style={{ color: 'var(--accent)' }}
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label
              htmlFor="contribute-amount"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--muted)' }}
            >
              Amount (USDC)
            </label>
            <div className="relative">
              <DollarSign
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--subtle)' }}
              />
              <input
                id="contribute-amount"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 50"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setAmountErr('') }}
                disabled={busy}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl text-sm outline-none disabled:opacity-50"
                style={{
                  background: 'var(--surface-muted)',
                  border: `1px solid ${amountErr ? 'var(--danger)' : 'var(--border)'}`,
                  color: 'var(--ink)',
                }}
              />
            </div>
          </div>
          {amountErr && (
            <p className="text-xs" style={{ color: 'var(--danger)' }}>{amountErr}</p>
          )}
          {busy && <TxStatusBadge tx={tx} />}
          <button
            onClick={handleContribute}
            disabled={busy}
            className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 transition-all"
            style={{ background: 'var(--accent)', color: '#0d1b2f', minHeight: 40 }}
          >
            {busy ? txStageLabel(tx.stage, 'Contribute') : 'Contribute'}
          </button>
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>
            Two wallet signatures required: USDC approval then contribution.
            Arc Testnet only — no real funds.
          </p>
        </div>
      )}
    </div>
  )
}
