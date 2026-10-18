/**
 * ReviewerDashboard — minimal reviewer interface.
 *
 * In DEMO mode: shows demo milestones with simulated approval/revoke buttons
 * that update local state only, clearly labelled DEMO.
 *
 * In TESTNET mode (contract deployed + wallet connected as reviewer):
 * sends real approveMilestone / revokeApproval transactions.
 *
 * IMPORTANT: The frontend role check (isReviewer) is a UX hint only.
 *            The contract enforces access control. An unauthorized wallet
 *            will receive a NotReviewer revert and the error is displayed.
 */
import { useState } from 'react'
import { ShieldCheck, CheckCircle2, RotateCcw, AlertCircle, Info, Wifi } from 'lucide-react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import DemoBadge from '../components/DemoBadge'
import Badge from '../components/Badge'
import TxStatusBadge from '../components/TxStatusBadge'
import {
  useReviewerActions,
  useReviewerAddress,
  useClearFundMode,
  isContractDeployed,
} from '../hooks/useClearFund'
import { parseOnchainCampaignId, isLocalDemoId } from '../lib/campaignId'
import type { CampaignsStore } from '../hooks/useCampaigns'
import type { Milestone } from '../data/sampleData'

type Page = 'landing' | 'dashboard' | 'create' | 'proof' | 'explorer' | 'campaign' | 'reviewer'

interface ReviewerDashboardProps {
  onNavigate: (page: Page, campaignId?: string) => void
  store: CampaignsStore
}

/** Demo-only local approval state so judges can interact without a wallet */
type DemoApprovalState = Record<string, 'pending' | 'approved' | 'revoked'>

export default function ReviewerDashboard({ onNavigate, store }: ReviewerDashboardProps) {
  const mode = useClearFundMode()
  const { address, isConnected } = useAccount()
  const reviewerAddress = useReviewerAddress()
  const { tx, approve, revoke, reset } = useReviewerActions()

  // Determine if the connected wallet is the reviewer (UX hint only)
  const isReviewer =
    isConnected &&
    !!reviewerAddress &&
    !!address &&
    reviewerAddress.toLowerCase() === address.toLowerCase()

  // Demo approval state (local only, clearly labelled)
  const [demoState, setDemoState] = useState<DemoApprovalState>({})

  // Gather milestones needing review (completed with evidence, not yet approved/paid)
  const reviewable: Array<{
    milestone: Milestone
    campaignTitle: string
    campaignId: string
    milestoneIndex: number
  }> = store.campaigns
    .filter((c) => !c.id.startsWith('__shadow_'))
    .flatMap((c) =>
      c.milestones.map((m, idx) => ({
        milestone: m,
        campaignTitle: c.title,
        campaignId: c.id,
        milestoneIndex: idx,
      }))
    )
    .filter(({ milestone: m }) => m.status === 'completed' && m.evidence.length > 0)

  const approved = store.campaigns
    .filter((c) => !c.id.startsWith('__shadow_'))
    .flatMap((c) =>
      c.milestones.map((m, idx) => ({
        milestone: m,
        campaignTitle: c.title,
        campaignId: c.id,
        milestoneIndex: idx,
      }))
    )
    // Only show milestones that have been fully approved by the reviewer (status: verified)
    .filter(({ milestone: m }) => m.status === 'verified')

  function handleDemoApprove(milestoneId: string) {
    setDemoState((s) => ({ ...s, [milestoneId]: 'approved' }))
  }
  function handleDemoRevoke(milestoneId: string) {
    setDemoState((s) => ({ ...s, [milestoneId]: 'revoked' }))
  }

  const milestoneStatusVariant = (s: Milestone['status']) => {
    if (s === 'verified') return 'success' as const
    if (s === 'completed') return 'accent' as const
    if (s === 'in_progress') return 'warning' as const
    return 'muted' as const
  }

  return (
    <div className="min-h-dvh pt-16 px-4" style={{ background: 'var(--bg-gradient)' }}>
      <div className="max-w-4xl mx-auto py-8">

        {/* Header */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <ShieldCheck size={20} style={{ color: 'var(--accent)' }} />
          <h1 className="display font-semibold text-2xl" style={{ color: 'var(--ink)' }}>
            Reviewer Dashboard
          </h1>
          {mode === 'demo' ? <DemoBadge /> : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(77,157,224,0.15)', color: 'var(--accent)', border: '1px solid rgba(77,157,224,0.3)' }}>
              <Wifi size={10} /> Arc Testnet
            </span>
          )}
        </div>
        <p className="text-sm mb-6" style={{ color: 'var(--subtle)' }}>
          Review milestone evidence and approve or revoke approvals. Only the authorized reviewer address can approve milestones — the contract enforces this independently of any frontend check.
        </p>

        {/* Auth model notice */}
        <div
          className="flex items-start gap-2 p-4 rounded-xl mb-6 text-xs"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
        >
          <Info size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
          <div>
            <strong style={{ color: 'var(--ink)' }}>Authorization model:</strong>{' '}
            A single global reviewer address is set by the contract owner.
            The reviewer calls <code className="mono">approveMilestone</code> or <code className="mono">revokeApproval</code>.
            All other wallets receive a <code className="mono">NotReviewer</code> revert.
            Frontend role checks are UX hints only — the contract is the source of truth.
            {mode !== 'demo' && reviewerAddress && (
              <div className="mt-1 mono" style={{ color: 'var(--subtle)' }}>
                Reviewer: {reviewerAddress}
              </div>
            )}
            <div className="mt-1" style={{ color: 'var(--warning)' }}>
              ⚠ Known limitation: A single reviewer key is a central point of failure.
              Use a multi-sig as the reviewer address for any production deployment.
            </div>
          </div>
        </div>

        {/* Testnet: wallet check */}
        {mode === 'testnet' && !isConnected && (
          <div className="glass rounded-2xl p-6 mb-6 flex flex-col items-center gap-3 text-center">
            <p className="text-sm" style={{ color: 'var(--subtle)' }}>
              Connect a wallet to submit reviewer transactions.
            </p>
            <ConnectKitButton />
          </div>
        )}

        {mode === 'testnet' && isConnected && !isReviewer && (
          <div
            className="flex items-start gap-2 p-4 rounded-xl mb-6 text-xs"
            style={{ background: 'var(--danger-dim)', border: '1px solid rgba(232,109,122,0.25)', color: 'var(--danger)' }}
          >
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <span>
              Connected wallet (<span className="mono">{address?.slice(0, 10)}…</span>) is not the
              reviewer. Any approval attempt will be rejected by the contract with a{' '}
              <code className="mono">NotReviewer</code> error.
            </span>
          </div>
        )}

        {/* Tx status */}
        {tx.stage !== 'idle' && (
          <div className="mb-6">
            <TxStatusBadge tx={tx} confirmedLabel="Reviewer action confirmed on Arc Testnet" />
            {(tx.stage === 'confirmed' || tx.stage === 'failed') && (
              <button onClick={reset} className="mt-2 text-xs" style={{ color: 'var(--accent)' }}>
                Dismiss
              </button>
            )}
          </div>
        )}

        {/* ── Awaiting review ───────────────────────────────────────────── */}
        <h2 className="display font-semibold text-base mb-3" style={{ color: 'var(--ink)' }}>
          Awaiting Review ({reviewable.length})
        </h2>

        {reviewable.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center mb-8">
            <CheckCircle2 size={28} style={{ color: 'var(--subtle)' }} className="mx-auto mb-2" />
            <p className="text-sm" style={{ color: 'var(--subtle)' }}>
              No milestones are waiting for review right now.
            </p>
            {mode === 'demo' && (
              <p className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>
                Mark a milestone complete and attach evidence in the Proof Center to see it here.
              </p>
            )}
          </div>
        )}

        <div className="space-y-4 mb-8">
          {reviewable.map(({ milestone: m, campaignTitle, campaignId, milestoneIndex }) => {
            const demoStatus = demoState[m.id]
            const isDemoApproved = mode === 'demo' && demoStatus === 'approved'
            const isDemoRevoked  = mode === 'demo' && demoStatus === 'revoked'

            return (
              <div key={m.id} className="glass rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: 'var(--subtle)' }}>{campaignTitle}</div>
                    <h3 className="display font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                      {m.title}
                    </h3>
                    {m.description && (
                      <p className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>{m.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {mode === 'demo' && isDemoApproved && <Badge variant="success">Approved (DEMO)</Badge>}
                    {mode === 'demo' && isDemoRevoked  && <Badge variant="muted">Revoked (DEMO)</Badge>}
                    {!isDemoApproved && !isDemoRevoked && (
                      <Badge variant={milestoneStatusVariant(m.status)}>Completed</Badge>
                    )}
                  </div>
                </div>

                {/* Evidence list */}
                {m.evidence.length > 0 && (
                  <div className="mb-4 space-y-1.5">
                    {m.evidence.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
                        style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
                      >
                        <ShieldCheck size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate" style={{ color: 'var(--ink)' }}>{ev.title}</div>
                          {ev.description && (
                            <div className="truncate mt-0.5" style={{ color: 'var(--subtle)' }}>{ev.description}</div>
                          )}
                          {ev.url && (
                            <a
                              href={ev.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate block mt-0.5 mono"
                              style={{ color: 'var(--accent)' }}
                            >
                              {ev.url.length > 60 ? ev.url.slice(0, 57) + '…' : ev.url}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                {mode === 'demo' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDemoApprove(m.id)}
                      disabled={isDemoApproved}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-40 transition-all"
                      style={{ background: 'var(--success-dim)', color: 'var(--success)', border: '1px solid rgba(52,211,153,0.3)', minHeight: 36 }}
                    >
                      <CheckCircle2 size={12} />
                      {isDemoApproved ? 'Approved (DEMO)' : 'Approve (DEMO)'}
                    </button>
                    <button
                      onClick={() => handleDemoRevoke(m.id)}
                      disabled={isDemoRevoked}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-40 transition-all"
                      style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)', minHeight: 36 }}
                    >
                      <RotateCcw size={12} />
                      Revoke (DEMO)
                    </button>
                    <button
                      onClick={() => onNavigate('campaign', campaignId)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
                      style={{ color: 'var(--accent)' }}
                    >
                      View campaign
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {isLocalDemoId(campaignId) && (
                      <p className="text-xs mb-2" style={{ color: 'var(--danger)' }}>
                        This campaign has a local draft ID and cannot be targeted onchain. Deploy the contract and create the campaign via the wizard to get a real onchain ID.
                      </p>
                    )}
                    <button
                      onClick={() => {
                        try { void approve(parseOnchainCampaignId(campaignId), BigInt(milestoneIndex)) }
                        catch (e) { console.error(e) }
                      }}
                      disabled={!isReviewer || isLocalDemoId(campaignId) || tx.stage === 'pendingSignature' || tx.stage === 'pendingConfirmation'}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-40 transition-all"
                      style={{ background: 'var(--success-dim)', color: 'var(--success)', border: '1px solid rgba(52,211,153,0.3)', minHeight: 36 }}
                      title={!isReviewer ? 'Your wallet is not the reviewer' : isLocalDemoId(campaignId) ? 'Local draft — no onchain ID' : ''}
                    >
                      <CheckCircle2 size={12} /> Approve Milestone
                    </button>
                    <button
                      onClick={() => {
                        try { void revoke(parseOnchainCampaignId(campaignId), BigInt(milestoneIndex)) }
                        catch (e) { console.error(e) }
                      }}
                      disabled={!isReviewer || isLocalDemoId(campaignId) || tx.stage === 'pendingSignature' || tx.stage === 'pendingConfirmation'}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-40"
                      style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)', minHeight: 36 }}
                      title={!isReviewer ? 'Your wallet is not the reviewer' : isLocalDemoId(campaignId) ? 'Local draft — no onchain ID' : ''}
                    >
                      <RotateCcw size={12} /> Revoke
                    </button>
                    {!isReviewer && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--danger)' }}>
                        <AlertCircle size={11} /> Not reviewer
                      </span>
                    )}
                  </div>
                )}

                {mode === 'demo' && (
                  <p className="mt-2 text-xs" style={{ color: 'var(--subtle)' }}>
                    DEMO: Approval stored in browser only. No contract transaction is sent.
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Previously reviewed ───────────────────────────────────────── */}
        {approved.length > 0 && (
          <div>
            <h2 className="display font-semibold text-base mb-3" style={{ color: 'var(--ink)' }}>
              Previously Reviewed ({approved.length})
            </h2>
            <div className="space-y-2">
              {approved.map(({ milestone: m, campaignTitle, campaignId }) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 px-5 py-3 rounded-2xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <CheckCircle2 size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs" style={{ color: 'var(--subtle)' }}>{campaignTitle}</div>
                    <div className="text-sm" style={{ color: 'var(--ink)' }}>{m.title}</div>
                  </div>
                  <button
                    onClick={() => onNavigate('campaign', campaignId)}
                    className="text-xs shrink-0"
                    style={{ color: 'var(--accent)' }}
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deployment status note */}
        {!isContractDeployed() && (
          <div
            className="mt-8 p-4 rounded-xl text-xs"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--subtle)' }}
          >
            <strong style={{ color: 'var(--ink)' }}>Contract not yet deployed.</strong>{' '}
            To enable live reviewer transactions on Arc Testnet, deploy <code className="mono">ClearFundEscrow.sol</code> using your own wallet and set{' '}
            <code className="mono">VITE_CLEARFUND_ESCROW_ADDRESS</code> in <code className="mono">.env</code>.
            Once set, this page will send real <code className="mono">approveMilestone</code> /{' '}
            <code className="mono">revokeApproval</code> transactions to the contract.
          </div>
        )}
      </div>
    </div>
  )
}
