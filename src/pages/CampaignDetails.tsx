import { ArrowLeft, Users, Calendar, ExternalLink, CheckCircle2, Clock, Circle, ShieldCheck, Info } from 'lucide-react';
import { formatUSDC, progressPercent, shortTxRef, Milestone } from '../data/sampleData';
import { CampaignsStore, evidenceStatusMeta } from '../hooks/useCampaigns';
import Badge from '../components/Badge';
import ProgressBar from '../components/ProgressBar';
import DemoBadge from '../components/DemoBadge';
import TxStatusBadge from '../components/TxStatusBadge';
import ContributePanel from '../components/ContributePanel';
import {
  useReleaseMilestone,
  useClaimRefund,
  useContributorBalance,
  useClearFundMode,
  isContractDeployed,
} from '../hooks/useClearFund';
import { tryParseOnchainCampaignId } from '../lib/campaignId';
import { formatUsdc } from '@/onchain-money';
import { useAccount } from 'wagmi';
import { ConnectKitButton } from 'connectkit';

type Page = 'landing' | 'dashboard' | 'create' | 'proof' | 'explorer' | 'campaign';

interface CampaignDetailsProps {
  campaignId: string;
  onNavigate: (page: Page, campaignId?: string) => void;
  store: CampaignsStore;
}

const milestoneStatusVariant = (s: Milestone['status']) => {
  if (s === 'verified') return 'success' as const;
  if (s === 'completed') return 'accent' as const;
  if (s === 'in_progress') return 'warning' as const;
  return 'muted' as const;
};

const milestoneStatusLabel = (s: Milestone['status']) => {
  if (s === 'verified') return 'Verified';
  if (s === 'completed') return 'Completed';
  if (s === 'in_progress') return 'In Progress';
  return 'Pending';
};

const MilestoneIcon = ({ status }: { status: Milestone['status'] }) => {
  if (status === 'verified' || status === 'completed')
    return <CheckCircle2 size={18} style={{ color: status === 'verified' ? 'var(--success)' : 'var(--accent)' }} />;
  if (status === 'in_progress')
    return <Clock size={18} style={{ color: 'var(--warning)' }} />;
  return <Circle size={18} style={{ color: 'var(--subtle)' }} />;
};

export default function CampaignDetails({ campaignId, onNavigate, store }: CampaignDetailsProps) {
  const campaign = store.getCampaign(campaignId);
  const mode = useClearFundMode();
  const { isConnected } = useAccount();
  const { tx: releaseTx, release, reset: resetRelease } = useReleaseMilestone();
  const { tx: refundTx, claim, reset: resetRefund } = useClaimRefund();

  // Parse the onchain campaign ID if this is a real testnet campaign.
  // tryParseOnchainCampaignId returns undefined for local demo IDs (e.g. "c1")
  // so hooks remain disabled and we never target the wrong campaign on the contract.
  const onchainId = tryParseOnchainCampaignId(campaignId);

  const { contributed } = useContributorBalance(mode === 'testnet' ? onchainId : undefined);

  if (!campaign) {
    return (
      <div className="min-h-dvh pt-16 flex items-center justify-center" style={{ background: 'var(--bg-gradient)' }}>
        <div className="text-center">
          <p style={{ color: 'var(--subtle)' }}>Campaign not found.</p>
          <button onClick={() => onNavigate('dashboard')} className="mt-4 text-sm" style={{ color: 'var(--accent)' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const pct = progressPercent(campaign.raisedAmount, campaign.targetAmount);
  const completedMs = campaign.milestones.filter(
    (m) => m.status === 'completed' || m.status === 'verified'
  ).length;

  return (
    <div className="min-h-dvh pt-16 px-4" style={{ background: 'var(--bg-gradient)' }}>
      <div className="max-w-4xl mx-auto py-8">

        {/* Back */}
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-1.5 text-sm mb-6 transition-colors"
          style={{ color: 'var(--muted)' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--ink)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--muted)')}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        {/* Hero */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: campaign.coverColor, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-semibold tracking-widest uppercase"
                  style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em' }}>
                  {campaign.category}
                </span>
                {campaign.isDemo && <DemoBadge />}
                {!campaign.isDemo && (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(77,157,224,0.2)', color: 'var(--accent-hover)', border: '1px solid rgba(77,157,224,0.3)' }}
                  >
                    Your Campaign
                  </span>
                )}
              </div>
              <h1 className="display font-semibold text-xl leading-snug" style={{ color: 'var(--ink)' }}>
                {campaign.title}
              </h1>
            </div>
            <Badge variant={campaign.status === 'active' ? 'accent' : campaign.status === 'completed' ? 'success' : 'muted'}>
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </Badge>
          </div>

          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
            {campaign.description}
          </p>

          <div className="mb-2 flex items-end justify-between">
            <span className="display font-semibold text-2xl tabular-nums" style={{ color: 'var(--ink)' }}>
              {formatUSDC(campaign.raisedAmount)}
            </span>
            <span className="text-sm tabular-nums" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {pct}% of {formatUSDC(campaign.targetAmount)}
            </span>
          </div>
          <ProgressBar percent={pct} height={6} color={campaign.status === 'completed' ? 'var(--success)' : 'var(--accent)'} />

          <div className="mt-4 flex items-center gap-5 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
              <Users size={13} />
              <span className="tabular-nums">{campaign.contributorCount} contributors</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
              <CheckCircle2 size={13} />
              {completedMs}/{campaign.milestones.length} milestones done
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
              <Calendar size={13} />
              Ends {campaign.endsAt}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Milestone timeline */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="display font-semibold text-base" style={{ color: 'var(--ink)' }}>
              Milestone Timeline
            </h2>
            <div className="relative space-y-0">
              {campaign.milestones.map((ms, idx) => (
                <div key={ms.id} className="relative flex gap-4">
                  {idx < campaign.milestones.length - 1 && (
                    <div className="absolute left-[8px] top-7 bottom-0 w-px" style={{ background: 'var(--border)' }} />
                  )}
                  <div className="shrink-0 mt-4 relative z-10">
                    <MilestoneIcon status={ms.status} />
                  </div>
                  <div className="flex-1 glass rounded-2xl p-5 mb-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="display font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                        {ms.title}
                      </h3>
                      <Badge variant={milestoneStatusVariant(ms.status)}>
                        {milestoneStatusLabel(ms.status)}
                      </Badge>
                    </div>
                    {ms.description && (
                      <p className="text-xs mb-3" style={{ color: 'var(--subtle)', lineHeight: 1.5 }}>
                        {ms.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 flex-wrap">
                      {ms.targetAmount > 0 && (
                        <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                          {formatUSDC(ms.targetAmount)} USDC release
                        </span>
                      )}
                      {ms.dueDate && (
                        <span className="text-xs" style={{ color: 'var(--subtle)' }}>Due {ms.dueDate}</span>
                      )}
                      {ms.txRef && (
                        <button
                          onClick={() => onNavigate('explorer')}
                          className="flex items-center gap-1 text-xs mono"
                          style={{ color: 'var(--accent)' }}
                        >
                          {shortTxRef(ms.txRef)} <ExternalLink size={10} />
                        </button>
                      )}
                    </div>

                    {/* Evidence list */}
                    {ms.evidence.length > 0 && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                        <p className="text-xs font-medium mb-2" style={{ color: 'var(--subtle)' }}>
                          Evidence ({ms.evidence.length})
                        </p>
                        <div className="space-y-1.5">
                          {ms.evidence.map((ev) => {
                            const status = ev.evidenceStatus ?? (ev.verified ? 'approved' : 'submitted');
                            const meta = evidenceStatusMeta(status);
                            return (
                              <div
                                key={ev.id}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                                style={{ background: meta.dim }}
                              >
                                <ShieldCheck size={12} style={{ color: meta.color }} />
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs truncate block" style={{ color: 'var(--ink-2)' }}>
                                    {ev.title}
                                  </span>
                                  {ev.description && (
                                    <span className="text-xs truncate block mt-0.5" style={{ color: 'var(--subtle)' }}>
                                      {ev.description}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs shrink-0 font-medium" style={{ color: meta.color }}>
                                  {meta.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Organizer */}
            <div className="glass rounded-2xl p-5">
              <h3 className="display font-semibold text-sm mb-3" style={{ color: 'var(--ink)' }}>Organizer</h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded-full text-sm font-semibold shrink-0"
                  style={{ width: 36, height: 36, background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                  {campaign.organizerAvatar}
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{campaign.organizer}</div>
                  <div className="text-xs" style={{ color: 'var(--subtle)' }}>Campaign creator</div>
                </div>
              </div>
            </div>

            {/* Recipient */}
            <div className="glass rounded-2xl p-5">
              <h3 className="display font-semibold text-sm mb-3" style={{ color: 'var(--ink)' }}>Recipient</h3>
              <div className="text-sm mb-1" style={{ color: 'var(--ink)' }}>{campaign.recipientName}</div>
              <div className="mono text-xs break-all overflow-wrap-anywhere" style={{ color: 'var(--subtle)', wordBreak: 'break-all' }}>
                {campaign.recipientAddress}
              </div>
            </div>

            {/* Submit evidence CTA */}
            {campaign.milestones.some((m) => m.status === 'in_progress') && (
              <button
                onClick={() => onNavigate('proof', campaignId)}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(77,157,224,0.25)', minHeight: 44 }}
              >
                Submit Evidence
              </button>
            )}

            {/* Contribute panel (testnet only — active campaigns, known onchain ID) */}
            {onchainId !== undefined && (
              <ContributePanel
                campaignId={onchainId}
                campaignActive={campaign.status === 'active'}
              />
            )}

            {/* Recent contributions */}
            {campaign.contributions.length > 0 && (
              <div className="glass rounded-2xl p-5">
                <h3 className="display font-semibold text-sm mb-3" style={{ color: 'var(--ink)' }}>
                  Recent Contributions
                </h3>
                <div className="space-y-2">
                  {campaign.contributions.slice(0, 5).map((cn) => (
                    <div key={cn.id} className="flex items-center justify-between py-2 border-b last:border-0"
                      style={{ borderColor: 'var(--border)' }}>
                      <div>
                        <div className="mono text-xs" style={{ color: 'var(--muted)' }}>{cn.contributor}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>
                          {new Date(cn.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="display font-semibold text-sm tabular-nums" style={{ color: 'var(--ink)' }}>
                        {formatUSDC(cn.amount)}
                      </span>
                    </div>
                  ))}
                </div>
                <button onClick={() => onNavigate('explorer')} className="mt-3 w-full text-center text-xs font-medium"
                  style={{ color: 'var(--accent)' }}>
                  View all transactions
                </button>
              </div>
            )}

            {/* No contributions yet */}
            {campaign.contributions.length === 0 && (
              <div className="glass rounded-2xl p-5 text-center">
                <p className="text-xs" style={{ color: 'var(--subtle)' }}>No contributions recorded yet (DEMO).</p>
              </div>
            )}

            {/* ── Payout panel (testnet only) ──────────────────────────── */}
            {mode === 'testnet' && isContractDeployed() && (
              <div className="glass rounded-2xl p-5">
                <h3 className="display font-semibold text-sm mb-3" style={{ color: 'var(--ink)' }}>
                  Release Milestone
                </h3>
                {!isConnected ? (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs text-center" style={{ color: 'var(--subtle)' }}>
                      Connect wallet to release approved milestones.
                    </p>
                    <ConnectKitButton />
                  </div>
                ) : (
                  <div className="w-full">
                    <p className="text-xs mb-3" style={{ color: 'var(--subtle)' }}>
                      After a milestone is approved by the reviewer, the organizer calls <code className="mono">releaseMilestone</code> to transfer USDC to the recipient. A milestone approval is not a completed payout — both steps are required.
                    </p>
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs mb-3"
                      style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(77,157,224,0.2)' }}>
                      <Info size={12} className="mt-0.5 shrink-0" />
                      <span>Select an approved milestone from the timeline and call release. Only the campaign organizer can release funds.</span>
                    </div>
                    {releaseTx.stage !== 'idle' && (
                      <div className="mb-2">
                        <TxStatusBadge tx={releaseTx} confirmedLabel="Milestone payout confirmed on Arc Testnet" />
                        {(releaseTx.stage === 'confirmed' || releaseTx.stage === 'failed') && (
                          <button onClick={resetRelease} className="mt-1.5 text-xs" style={{ color: 'var(--accent)' }}>Dismiss</button>
                        )}
                      </div>
                    )}
                    {/* Release buttons rendered per approved-but-unpaid milestone.
                        Only enabled when we have a confirmed onchain ID — never
                        target campaign 0 on the contract for a local draft. */}
                    {onchainId === undefined && (
                      <p className="text-xs mb-2" style={{ color: 'var(--warning)' }}>
                        This campaign has a local draft ID. Deploy the contract and create it onchain to enable releases.
                      </p>
                    )}
                    {campaign.milestones.map((ms, idx) =>
                      ms.status === 'verified' && !ms.txRef ? (
                        <button
                          key={ms.id}
                          onClick={() => {
                            if (onchainId !== undefined) void release(onchainId, BigInt(idx))
                          }}
                          disabled={onchainId === undefined || releaseTx.stage === 'pendingSignature' || releaseTx.stage === 'pendingConfirmation'}
                          className="w-full py-2.5 rounded-xl text-xs font-semibold mb-1.5 disabled:opacity-40"
                          style={{ background: 'var(--success-dim)', color: 'var(--success)', border: '1px solid rgba(52,211,153,0.3)', minHeight: 36 }}
                        >
                          Release: {ms.title}
                        </button>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Refund panel (testnet only, inactive campaign) ──────── */}
            {mode === 'testnet' && isContractDeployed() && campaign.status !== 'active' && (
              <div className="glass rounded-2xl p-5">
                <h3 className="display font-semibold text-sm mb-3" style={{ color: 'var(--ink)' }}>
                  Claim Refund
                </h3>
                <p className="text-xs mb-3" style={{ color: 'var(--subtle)' }}>
                  This campaign is no longer active. If you contributed USDC and the full amount is still available, you can reclaim it. Refunds may be incomplete if milestone payouts were released before cancellation.
                </p>
                {contributed > 0n && (
                  <p className="text-xs mb-3 mono" style={{ color: 'var(--ink)' }}>
                    Your contribution on record: {formatUsdc(contributed)} USDC
                  </p>
                )}
                {!isConnected ? (
                  <ConnectKitButton />
                ) : (
                  <>
                    {refundTx.stage !== 'idle' && (
                      <div className="mb-2">
                        <TxStatusBadge tx={refundTx} confirmedLabel="Refund confirmed on Arc Testnet" />
                        {(refundTx.stage === 'confirmed' || refundTx.stage === 'failed') && (
                          <button onClick={resetRefund} className="mt-1.5 text-xs" style={{ color: 'var(--accent)' }}>Dismiss</button>
                        )}
                      </div>
                    )}
                    {onchainId === undefined && (
                      <p className="text-xs mb-2" style={{ color: 'var(--warning)' }}>
                        This campaign has a local draft ID. A real onchain ID is required to claim a refund.
                      </p>
                    )}
                    <button
                      onClick={() => { if (onchainId !== undefined) void claim(onchainId) }}
                      disabled={onchainId === undefined || refundTx.stage === 'pendingSignature' || refundTx.stage === 'pendingConfirmation' || contributed === 0n}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold disabled:opacity-40"
                      style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(77,157,224,0.25)', minHeight: 36 }}
                    >
                      Claim Refund
                    </button>
                    {contributed === 0n && (
                      <p className="mt-1.5 text-xs" style={{ color: 'var(--subtle)' }}>
                        No contribution found for this wallet on this campaign.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
