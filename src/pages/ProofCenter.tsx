import { useState, useCallback } from 'react';
import { ShieldCheck, Plus, Link2, FileText, Image, BarChart2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Evidence, Milestone } from '../data/sampleData';
import { CampaignsStore, evidenceStatusMeta } from '../hooks/useCampaigns';
import Badge from '../components/Badge';
import DemoBadge from '../components/DemoBadge';
import TxStatusBadge from '../components/TxStatusBadge';
import Select from '../components/Select';
import { toast } from 'sonner';
import { useClearFundMode, useSubmitEvidence } from '../hooks/useClearFund'
import { tryParseOnchainCampaignId } from '../lib/campaignId';

type Page = 'landing' | 'dashboard' | 'create' | 'proof' | 'explorer' | 'campaign';

interface ProofCenterProps {
  onNavigate: (page: Page, campaignId?: string) => void;
  store: CampaignsStore;
  /** Pre-scroll/highlight a specific campaign's milestones when arriving from CampaignDetails */
  focusCampaignId?: string;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: 'var(--danger)' }}>
      <AlertCircle size={11} /> {msg}
    </p>
  );
}

const evidenceTypeIcon = (type: Evidence['type']) => {
  if (type === 'link') return <Link2 size={13} />;
  if (type === 'document') return <FileText size={13} />;
  if (type === 'image') return <Image size={13} />;
  return <BarChart2 size={13} />;
};

const EVIDENCE_TYPES = [
  { value: 'link', label: 'Link' },
  { value: 'document', label: 'Document' },
  { value: 'image', label: 'Image' },
  { value: 'report', label: 'Report' },
];

interface FormState {
  title: string;
  description: string;
  type: Evidence['type'];
  url: string;
}

interface FormErrors {
  title?: string;
  url?: string;
}

export default function ProofCenter({ onNavigate, store, focusCampaignId }: ProofCenterProps) {
  const { campaigns } = store;
  const mode = useClearFundMode();
  const { tx: evidenceTx, submit: submitOnchain, reset: resetEvidence } = useSubmitEvidence();

  // Collect all milestones with their campaign context
  const allMilestones: Array<{ milestone: Milestone; campaignTitle: string; campaignId: string }> =
    campaigns
      .filter((c) => !c.id.startsWith('__shadow_'))
      .flatMap((c) =>
        c.milestones.map((m) => ({ milestone: m, campaignTitle: c.title, campaignId: c.id }))
      );

  const pendingProof = allMilestones.filter(
    ({ milestone: m }) => m.status === 'in_progress' && m.evidence.length === 0
  );
  const withEvidence = allMilestones.filter(({ milestone: m }) => m.evidence.length > 0);

  const totalEvidence = campaigns
    .filter((c) => !c.id.startsWith('__shadow_'))
    .flatMap((c) => c.milestones.flatMap((m) => m.evidence))
    .length;

  // If we arrived from CampaignDetails for a specific campaign, pre-open the first in-progress milestone
  const initialFocus = focusCampaignId
    ? (campaigns.find((c) => c.id === focusCampaignId)?.milestones.find(
        (m) => m.status === 'in_progress' && m.evidence.length === 0
      )?.id ?? null)
    : null;
  const [addingTo, setAddingTo] = useState<string | null>(initialFocus);
  const [form, setForm] = useState<FormState>({ title: '', description: '', type: 'link', url: '' });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const inputCls = 'w-full px-4 py-2.5 rounded-xl text-sm outline-none';
  const inputStyle = { background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--ink)' };
  const inputErrStyle = { background: 'var(--surface-muted)', border: '1px solid var(--danger)', color: 'var(--ink)' };

  function validate(): boolean {
    const errors: FormErrors = {};
    if (!form.title.trim()) errors.title = 'Title is required.';
    if (form.url.trim() && !/^https?:\/\//i.test(form.url.trim()))
      errors.url = 'URL must start with https:// or http://';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const handleSubmit = useCallback(async (
    campaignId: string,
    milestoneId: string,
    onchainCampaignId?: bigint,
    milestoneIndex?: bigint,
  ) => {
    if (!validate()) return;
    setSubmitting(true);
    const now = new Date().toISOString().slice(0, 10);
    const ev: Evidence = {
      id: `ev_${now}_${Math.random().toString(36).slice(2, 8)}`,
      milestoneId,
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      url: form.url.trim(),
      submittedAt: now,
      submittedBy: 'You',
      verified: false,
      evidenceStatus: 'submitted',
    };
    store.addEvidence(campaignId, milestoneId, ev);

    // When deployed, also record evidence URI on-chain.
    // evidenceURI is a JSON-encoded compact ref (title + offchain URL).
    // Never treats this as "approved" — reviewer must call approveMilestone separately.
    if (mode === 'testnet' && onchainCampaignId !== undefined && milestoneIndex !== undefined) {
      const evidenceURI = JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim(),
        url: form.url.trim(),
        submittedAt: now,
      });
      await submitOnchain(onchainCampaignId, milestoneIndex, evidenceURI);
    }

    toast.success('Evidence submitted', {
      description: mode === 'testnet'
        ? 'Saved locally and onchain tx sent — status: Submitted. Reviewer must approve separately.'
        : 'Status: Submitted. A reviewer will move it to Under Review.',
    });
    setAddingTo(null);
    setForm({ title: '', description: '', type: 'link', url: '' });
    setFormErrors({});
    setSubmitting(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, store, mode, submitOnchain]);

  return (
    <div className="min-h-dvh pt-16 px-4" style={{ background: 'var(--bg-gradient)' }}>
      <div className="max-w-4xl mx-auto py-8">

        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={20} style={{ color: 'var(--accent)' }} />
          <h1 className="display font-semibold text-2xl" style={{ color: 'var(--ink)' }}>
            Proof Center
          </h1>
          <DemoBadge />
        </div>
        <p className="text-sm mb-8" style={{ color: 'var(--subtle)' }}>
          Organizers attach evidence to milestones. New submissions start as <strong style={{ color: 'var(--accent)' }}>Submitted</strong> and progress to <strong style={{ color: 'var(--warning)' }}>Under Review</strong> then <strong style={{ color: 'var(--success)' }}>Approved</strong>.
        </p>

        {/* Summary row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Milestones with Evidence', value: String(withEvidence.length), color: 'var(--success)' },
            { label: 'Awaiting Evidence', value: String(pendingProof.length), color: 'var(--warning)' },
            { label: 'Evidence Items', value: String(totalEvidence), color: 'var(--accent)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass rounded-2xl p-4 text-center">
              <div className="display font-semibold text-2xl tabular-nums" style={{ color }}>{value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Awaiting evidence */}
        {pendingProof.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} style={{ color: 'var(--warning)' }} />
              <h2 className="display font-semibold text-base" style={{ color: 'var(--ink)' }}>
                Awaiting Evidence ({pendingProof.length})
              </h2>
            </div>
            <div className="space-y-3">
              {pendingProof.map(({ milestone: m, campaignTitle, campaignId }) => {
                const onchainCampaignId = tryParseOnchainCampaignId(campaignId)
                // milestoneIndex: find the position of this milestone within its campaign
                const owningCampaign = campaigns.find((c) => c.id === campaignId)
                const milestoneIndex = owningCampaign
                  ? BigInt(owningCampaign.milestones.findIndex((mx) => mx.id === m.id))
                  : undefined
                return (
                <div key={m.id} className="glass rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs mb-1" style={{ color: 'var(--subtle)' }}>{campaignTitle}</div>
                      <h3 className="display font-semibold text-sm" style={{ color: 'var(--ink)' }}>{m.title}</h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>{m.description}</p>
                    </div>
                    <Badge variant="warning">In Progress</Badge>
                  </div>

                  {addingTo === m.id ? (
                    <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
                            Title *
                          </label>
                          <input
                            className={inputCls}
                            style={formErrors.title ? inputErrStyle : inputStyle}
                            placeholder="Evidence title"
                            value={form.title}
                            onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setFormErrors((fe) => ({ ...fe, title: undefined })); }}
                          />
                          <FieldError msg={formErrors.title} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
                            Type
                          </label>
                          <Select
                            options={EVIDENCE_TYPES}
                            value={form.type}
                            onChange={(v) => setForm((f) => ({ ...f, type: v as Evidence['type'] }))}
                            inputClassName={inputCls}
                            inputStyle={inputStyle}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
                          Description
                        </label>
                        <input
                          className={inputCls}
                          style={inputStyle}
                          placeholder="Brief description of this evidence"
                          value={form.description}
                          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
                          URL / Reference
                        </label>
                        <input
                          className={inputCls}
                          style={formErrors.url ? inputErrStyle : inputStyle}
                          placeholder="https://"
                          value={form.url}
                          onChange={(e) => { setForm((f) => ({ ...f, url: e.target.value })); setFormErrors((fe) => ({ ...fe, url: undefined })); }}
                        />
                        <FieldError msg={formErrors.url} />
                      </div>

                      <div
                        className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
                        style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(77,157,224,0.2)' }}
                      >
                        <AlertCircle size={12} className="mt-0.5 shrink-0" />
                        Evidence starts as <strong>Submitted</strong>. It will not be automatically approved.
                      </div>

                      {mode === 'testnet' && evidenceTx.stage !== 'idle' && (
                        <div className="rounded-xl p-2.5" style={{ background: 'var(--surface-muted)' }}>
                          <TxStatusBadge tx={evidenceTx} confirmedLabel="Evidence recorded onchain" />
                          {evidenceTx.error && (
                            <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{evidenceTx.error}</p>
                          )}
                          {evidenceTx.stage === 'failed' && (
                            <button onClick={() => resetEvidence()} className="text-xs mt-1" style={{ color: 'var(--accent)' }}>Retry</button>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setAddingTo(null); setFormErrors({}); resetEvidence(); }}
                          className="flex-1 py-2.5 rounded-xl text-sm"
                          style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)', minHeight: 40 }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => { void handleSubmit(campaignId, m.id, onchainCampaignId, milestoneIndex); }}
                          disabled={submitting}
                          className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
                          style={{ background: 'var(--accent)', color: '#0d1b2f', minHeight: 40 }}
                        >
                          {submitting ? 'Saving...' : 'Submit Evidence'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingTo(m.id); setForm({ title: '', description: '', type: 'link', url: '' }); setFormErrors({}); }}
                      className="mt-4 flex items-center gap-1.5 text-sm font-medium"
                      style={{ color: 'var(--accent)' }}
                    >
                      <Plus size={13} /> Attach Evidence
                    </button>
                  )}
                </div>
                )
              })}
            </div>
          </div>
        )}

        {pendingProof.length === 0 && withEvidence.length === 0 && (
          <div className="glass rounded-2xl flex flex-col items-center justify-center py-16 text-center px-6">
            <ShieldCheck size={32} style={{ color: 'var(--subtle)' }} />
            <p className="mt-3 text-sm" style={{ color: 'var(--subtle)' }}>
              No milestones need evidence right now.
            </p>
            <p className="mt-2 text-xs max-w-sm" style={{ color: 'var(--subtle)' }}>
              Evidence can be submitted when a milestone is marked <strong style={{ color: 'var(--warning)' }}>In Progress</strong>.
              To start: open a campaign, find a pending milestone, and mark it in progress — then return here to attach evidence.
            </p>
            <button
              onClick={() => onNavigate('dashboard')}
              className="mt-4 text-xs font-medium"
              style={{ color: 'var(--accent)' }}
            >
              Browse campaigns
            </button>
          </div>
        )}

        {/* Evidence submitted */}
        {withEvidence.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
              <h2 className="display font-semibold text-base" style={{ color: 'var(--ink)' }}>
                Evidence Submitted ({withEvidence.length})
              </h2>
            </div>
            <div className="space-y-4">
              {withEvidence.map(({ milestone: m, campaignTitle, campaignId }) => (
                <div key={m.id} className="glass rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs mb-0.5" style={{ color: 'var(--subtle)' }}>{campaignTitle}</div>
                      <h3 className="display font-semibold text-sm" style={{ color: 'var(--ink)' }}>{m.title}</h3>
                    </div>
                    <button
                      onClick={() => onNavigate('campaign', campaignId)}
                      className="text-xs font-medium"
                      style={{ color: 'var(--accent)' }}
                    >
                      View Campaign
                    </button>
                  </div>
                  <div className="space-y-2">
                    {m.evidence.map((ev) => {
                      const status = ev.evidenceStatus ?? (ev.verified ? 'approved' : 'submitted');
                      const meta = evidenceStatusMeta(status);
                      return (
                        <div
                          key={ev.id}
                          className="flex items-center gap-3 p-3 rounded-xl"
                          style={{ background: meta.dim }}
                        >
                          <div style={{ color: 'var(--subtle)' }}>{evidenceTypeIcon(ev.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate" style={{ color: 'var(--ink-2)' }}>
                              {ev.title}
                            </div>
                            {ev.description && (
                              <div className="text-xs truncate mt-0.5" style={{ color: 'var(--subtle)' }}>
                                {ev.description}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 flex items-center gap-1 text-xs font-medium" style={{ color: meta.color }}>
                            <ShieldCheck size={12} />
                            {meta.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
