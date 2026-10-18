import { useState, useCallback } from 'react';
import { Plus, Trash2, ArrowRight, Info, AlertCircle, CheckCircle2, Wifi } from 'lucide-react';
import DemoBadge from '../components/DemoBadge';
import Select from '../components/Select';
import TxStatusBadge from '../components/TxStatusBadge';
import { toast } from 'sonner';
import { Campaign, Milestone, COVER_COLORS, CATEGORIES as ALL_CATEGORIES } from '../data/sampleData';
import { CampaignsStore, nameInitials } from '../hooks/useCampaigns';
import { formatUSDC } from '../data/sampleData';
import { useClearFundMode, isContractDeployed, useCreateCampaignWithMilestones, txStageLabel } from '../hooks/useClearFund';

type Page = 'landing' | 'dashboard' | 'create' | 'proof' | 'explorer' | 'campaign';

interface CreateCampaignProps {
  onNavigate: (page: Page, campaignId?: string) => void;
  store: CampaignsStore;
}

interface MilestoneInput {
  id: string;
  title: string;
  description: string;
  targetAmount: string;
  dueDate: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  category?: string;
  targetAmount?: string;
  endsAt?: string;
  recipientName?: string;
  recipientAddress?: string;
}

interface MilestoneErrors {
  [id: string]: { title?: string; targetAmount?: string };
}

// Use the shared CATEGORIES list (without 'All' which is only for filtering)
const CATEGORIES = ALL_CATEGORIES.filter((c) => c !== 'All');

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: 'var(--danger)' }}>
      <AlertCircle size={11} /> {msg}
    </p>
  );
}

export default function CreateCampaign({ onNavigate, store }: CreateCampaignProps) {
  const mode = useClearFundMode();
  const { result: createResult, createAndAddMilestones, reset: resetCreate } = useCreateCampaignWithMilestones();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    targetAmount: '',
    endsAt: '',
    recipientName: '',
    recipientAddress: '',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { id: '1', title: '', description: '', targetAmount: '', dueDate: '' },
  ]);
  const [milestoneErrors, setMilestoneErrors] = useState<MilestoneErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const setField = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFormErrors((e) => ({ ...e, [key]: undefined }));
  };

  // ── Validation helpers ──────────────────────────────────────────────────────

  function validateStep1(): boolean {
    const errors: FormErrors = {};
    if (!form.title.trim()) errors.title = 'Campaign title is required.';
    else if (form.title.trim().length < 5) errors.title = 'Title must be at least 5 characters.';
    if (!form.description.trim()) errors.description = 'Description is required.';
    else if (form.description.trim().length < 20) errors.description = 'Description must be at least 20 characters.';
    if (!form.category) errors.category = 'Please select a category.';
    const target = Number(form.targetAmount);
    if (!form.targetAmount || isNaN(target) || target <= 0)
      errors.targetAmount = 'Enter a positive target amount.';
    else if (target < 100) errors.targetAmount = 'Minimum target is $100 USDC.';
    if (!form.endsAt) errors.endsAt = 'End date is required.';
    else if (new Date(form.endsAt) <= new Date()) errors.endsAt = 'End date must be in the future.';
    if (!form.recipientName.trim()) errors.recipientName = 'Recipient name is required.';
    if (!form.recipientAddress.trim()) errors.recipientAddress = 'Recipient wallet address is required.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateStep2(): boolean {
    const errors: MilestoneErrors = {};
    for (const ms of milestones) {
      const msErr: { title?: string; targetAmount?: string } = {};
      if (!ms.title.trim()) msErr.title = 'Title required.';
      if (ms.targetAmount !== '') {
        const n = Number(ms.targetAmount);
        if (isNaN(n) || n < 0) msErr.targetAmount = 'Enter a valid amount.';
      }
      if (Object.keys(msErr).length) errors[ms.id] = msErr;
    }
    setMilestoneErrors(errors);
    if (Object.keys(errors).length) return false;

    // Budget guard
    const target = Number(form.targetAmount);
    const allocated = milestones.reduce((s, m) => s + (Number(m.targetAmount) || 0), 0);
    if (allocated > target) {
      toast.error('Milestone budgets exceed campaign target', {
        description: `Allocated ${formatUSDC(allocated)} of ${formatUSDC(target)} target. Reduce milestone amounts.`,
      });
      return false;
    }
    return true;
  }

  // ── Milestone CRUD ──────────────────────────────────────────────────────────

  const addMilestone = () => {
    setMilestones((ms) => [
      ...ms,
      { id: String(Date.now()), title: '', description: '', targetAmount: '', dueDate: '' },
    ]);
  };

  const removeMilestone = (id: string) => {
    setMilestones((ms) => ms.filter((m) => m.id !== id));
    setMilestoneErrors((e) => { const next = { ...e }; delete next[id]; return next; });
  };

  const updateMilestone = (id: string, key: keyof MilestoneInput, value: string) => {
    setMilestones((ms) => ms.map((m) => (m.id === id ? { ...m, [key]: value } : m)));
    setMilestoneErrors((e) => ({ ...e, [id]: { ...e[id], [key]: undefined } }));
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const target = Number(form.targetAmount) || 0;
  const allocated = milestones.reduce((s, m) => s + (Number(m.targetAmount) || 0), 0);
  const unallocated = target - allocated;
  const overBudget = allocated > target;

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    setSubmitted(true);
    const now = new Date().toISOString().slice(0, 10);
    const id = `uc_${now}_${Math.random().toString(36).slice(2, 8)}`;
    const builtMilestones: Milestone[] = milestones.map((ms, i) => ({
      id: `${id}_m${i}`,
      campaignId: id,
      title: ms.title.trim(),
      description: ms.description.trim(),
      targetAmount: Number(ms.targetAmount) || 0,
      releasedAmount: 0,
      status: 'pending',
      dueDate: ms.dueDate || form.endsAt,
      evidence: [],
    }));

    const colorIndex = store.campaigns.length % COVER_COLORS.length;
    const newCampaign: Campaign = {
      id,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      organizer: 'You',
      organizerAvatar: nameInitials(form.recipientName || 'You'),
      recipientName: form.recipientName.trim(),
      recipientAddress: form.recipientAddress.trim(),
      targetAmount: target,
      raisedAmount: 0,
      contributorCount: 0,
      status: 'active',
      createdAt: now,
      endsAt: form.endsAt,
      milestones: builtMilestones,
      contributions: [],
      coverColor: COVER_COLORS[colorIndex],
      isDemo: false,
    };

    // Always save to localStorage (source of truth for DEMO mode + onchain drafts)
    store.addCampaign(newCampaign);

    if (mode === 'testnet') {
      // Full onchain creation: createCampaign → await receipt → decode campaignId → addMilestone × N
      const metadataURI = JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        endsAt: form.endsAt,
        localId: id,
      });
      const onchainId = await createAndAddMilestones(
        form.recipientAddress.trim() as `0x${string}`,
        form.targetAmount,
        metadataURI,
        milestones.map((ms) => ({
          title: ms.title.trim(),
          description: ms.description.trim(),
          targetAmount: ms.targetAmount,
          dueDate: ms.dueDate,
        })),
      );
      if (onchainId !== undefined) {
        toast.success('Campaign created onchain', {
          description: `Campaign #${String(onchainId)} confirmed on Arc Testnet with ${milestones.length} milestone(s).`,
        });
        setTimeout(() => onNavigate('campaign', id), 1200);
      }
      // If onchainId is undefined the flow failed — createResult.error shows why; don't navigate
    } else {
      toast.success('Campaign saved', {
        description: 'Your campaign is now visible on the Dashboard.',
      });
      setTimeout(() => onNavigate('campaign', id), 800);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, milestones, store, onNavigate, mode, createAndAddMilestones]);

  // ── Shared styles ────────────────────────────────────────────────────────────

  const inputCls = 'w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors';
  const inputStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--ink)',
  };
  const inputErrStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--danger)',
    color: 'var(--ink)',
  };
  const labelCls = 'block text-xs font-medium mb-1.5';
  const labelStyle = { color: 'var(--muted)' };
  const steps = ['Campaign Info', 'Milestones', 'Review'];

  return (
    <div className="min-h-dvh pt-16 px-4" style={{ background: 'var(--bg-gradient)' }}>
      <div className="max-w-2xl mx-auto py-8">

        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <h1 className="display font-semibold text-2xl" style={{ color: 'var(--ink)' }}>
            Create Campaign
          </h1>
          <DemoBadge />
        </div>
        <p className="text-sm mb-8" style={{ color: 'var(--subtle)' }}>
          Define your funding target, milestones, and evidence requirements.
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-8">
          {steps.map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className="flex items-center justify-center rounded-full text-xs font-semibold transition-all"
                    style={{
                      width: 28, height: 28,
                      background: done ? 'var(--success)' : active ? 'var(--accent)' : 'var(--surface)',
                      color: done || active ? '#0d1b2f' : 'var(--subtle)',
                      border: `1px solid ${done ? 'var(--success)' : active ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    {done ? <CheckCircle2 size={14} /> : n}
                  </div>
                  <span className="text-xs mt-1 text-center leading-tight" style={{ color: active ? 'var(--ink)' : 'var(--subtle)', maxWidth: 64 }}>
                    {label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex-1 h-px mx-2 mb-4"
                    style={{ background: done ? 'var(--success)' : 'var(--border)' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step 1: Campaign Info ────────────────────────────────────────── */}
        {step === 1 && (
          <div className="glass rounded-2xl p-6 space-y-5">
            <div>
              <label className={labelCls} style={labelStyle}>Campaign Title *</label>
              <input
                className={inputCls}
                style={formErrors.title ? inputErrStyle : inputStyle}
                placeholder="e.g. Community Solar Project"
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
              />
              <FieldError msg={formErrors.title} />
            </div>

            <div>
              <label className={labelCls} style={labelStyle}>Description *</label>
              <textarea
                className={inputCls}
                style={{ ...(formErrors.description ? inputErrStyle : inputStyle), minHeight: 100, resize: 'vertical' }}
                placeholder="Describe what you're funding and why it matters..."
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
              />
              <FieldError msg={formErrors.description} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls} style={labelStyle}>Category *</label>
                <Select
                  options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                  value={form.category}
                  onChange={(v) => { setField('category', v); }}
                  placeholder="Select category"
                  inputClassName={inputCls}
                  inputStyle={formErrors.category ? inputErrStyle : inputStyle}
                />
                <FieldError msg={formErrors.category} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>Target (USDC) *</label>
                <input
                  className={inputCls}
                  style={formErrors.targetAmount ? inputErrStyle : inputStyle}
                  type="number"
                  min="100"
                  placeholder="10000"
                  value={form.targetAmount}
                  onChange={(e) => setField('targetAmount', e.target.value)}
                />
                <FieldError msg={formErrors.targetAmount} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls} style={labelStyle}>Recipient Name *</label>
                <input
                  className={inputCls}
                  style={formErrors.recipientName ? inputErrStyle : inputStyle}
                  placeholder="Organization or individual"
                  value={form.recipientName}
                  onChange={(e) => setField('recipientName', e.target.value)}
                />
                <FieldError msg={formErrors.recipientName} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>End Date *</label>
                <input
                  className={inputCls}
                  style={formErrors.endsAt ? inputErrStyle : inputStyle}
                  type="date"
                  value={form.endsAt}
                  onChange={(e) => setField('endsAt', e.target.value)}
                />
                <FieldError msg={formErrors.endsAt} />
              </div>
            </div>

            <div>
              <label className={labelCls} style={labelStyle}>Recipient Wallet Address *</label>
              <input
                className={inputCls + ' mono'}
                style={formErrors.recipientAddress ? inputErrStyle : inputStyle}
                placeholder="0x..."
                value={form.recipientAddress}
                onChange={(e) => setField('recipientAddress', e.target.value)}
              />
              <FieldError msg={formErrors.recipientAddress} />
            </div>

            <div
              className="flex items-start gap-2 p-3 rounded-xl text-xs"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(77,157,224,0.2)' }}
            >
              <Info size={13} className="mt-0.5 shrink-0" />
              <span>
                {mode === 'testnet'
                  ? 'Arc Testnet mode: campaigns are saved locally AND submitted onchain. No mainnet transactions. No real funds.'
                  : 'DEMO mode: campaigns are saved to your browser\'s localStorage only. No smart contract is deployed and no USDC is transferred.'}
              </span>
            </div>

            <button
              onClick={() => { if (validateStep1()) setStep(2); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: 'var(--accent)', color: '#0d1b2f', minHeight: 44 }}
            >
              Next: Add Milestones <ArrowRight size={15} />
            </button>
          </div>
        )}

        {/* ── Step 2: Milestones ───────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Budget tracker */}
            {target > 0 && (
              <div
                className="glass rounded-2xl px-5 py-4 flex items-center justify-between"
                style={{ borderColor: overBudget ? 'var(--danger)' : 'var(--border)' }}
              >
                <div>
                  <div className="text-xs mb-0.5" style={{ color: 'var(--subtle)' }}>Milestone budget</div>
                  <div className="flex items-baseline gap-1">
                    <span className="display font-semibold tabular-nums" style={{ color: overBudget ? 'var(--danger)' : 'var(--ink)' }}>
                      {formatUSDC(allocated)}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--subtle)' }}>allocated of {formatUSDC(target)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs mb-0.5" style={{ color: 'var(--subtle)' }}>Unallocated</div>
                  <span
                    className="display font-semibold tabular-nums text-base"
                    style={{ color: overBudget ? 'var(--danger)' : unallocated === 0 ? 'var(--success)' : 'var(--ink)' }}
                  >
                    {formatUSDC(Math.max(0, unallocated))}
                  </span>
                </div>
              </div>
            )}

            {overBudget && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs"
                style={{ background: 'var(--danger-dim)', color: 'var(--danger)', border: '1px solid rgba(232,109,122,0.25)' }}>
                <AlertCircle size={13} />
                Milestone budgets exceed campaign target by {formatUSDC(allocated - target)}. Please reduce milestone amounts before continuing.
              </div>
            )}

            {milestones.map((ms, idx) => (
              <div key={ms.id} className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="display font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                    Milestone {idx + 1}
                  </span>
                  {milestones.length > 1 && (
                    <button onClick={() => removeMilestone(ms.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--danger)' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls} style={labelStyle}>Title *</label>
                    <input
                      className={inputCls}
                      style={milestoneErrors[ms.id]?.title ? inputErrStyle : inputStyle}
                      placeholder="e.g. Phase 1 — Equipment Purchase"
                      value={ms.title}
                      onChange={(e) => updateMilestone(ms.id, 'title', e.target.value)}
                    />
                    <FieldError msg={milestoneErrors[ms.id]?.title} />
                  </div>
                  <div>
                    <label className={labelCls} style={labelStyle}>Description</label>
                    <textarea
                      className={inputCls}
                      style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
                      placeholder="What will be accomplished in this milestone?"
                      value={ms.description}
                      onChange={(e) => updateMilestone(ms.id, 'description', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls} style={labelStyle}>Release Amount (USDC)</label>
                      <input
                        className={inputCls}
                        style={milestoneErrors[ms.id]?.targetAmount ? inputErrStyle : inputStyle}
                        type="number"
                        min="0"
                        placeholder="5000"
                        value={ms.targetAmount}
                        onChange={(e) => updateMilestone(ms.id, 'targetAmount', e.target.value)}
                      />
                      <FieldError msg={milestoneErrors[ms.id]?.targetAmount} />
                    </div>
                    <div>
                      <label className={labelCls} style={labelStyle}>Target Date</label>
                      <input
                        className={inputCls}
                        style={inputStyle}
                        type="date"
                        value={ms.dueDate}
                        onChange={(e) => updateMilestone(ms.id, 'dueDate', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addMilestone}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'transparent', border: '1px dashed var(--border-strong)', color: 'var(--muted)', minHeight: 44 }}
            >
              <Plus size={14} /> Add Another Milestone
            </button>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl text-sm font-medium"
                style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)', minHeight: 44 }}
              >
                Back
              </button>
              <button
                onClick={() => { if (validateStep2()) setStep(3); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm"
                style={{ background: 'var(--accent)', color: '#0d1b2f', minHeight: 44 }}
              >
                Review Campaign <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Review & Submit ──────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Campaign summary */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h2 className="display font-semibold text-base" style={{ color: 'var(--ink)' }}>
                  {form.title}
                </h2>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                >
                  {form.category}
                </span>
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>{form.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['Funding Target', formatUSDC(target)],
                  ['Campaign Ends', form.endsAt],
                  ['Recipient', form.recipientName],
                  ['Wallet', form.recipientAddress],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl p-3" style={{ background: 'var(--surface-muted)' }}>
                    <div className="text-xs mb-0.5" style={{ color: 'var(--subtle)' }}>{k}</div>
                    <div className="text-sm font-medium mono" style={{ color: 'var(--ink)', wordBreak: 'break-all' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Milestone summary */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="display font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                  {milestones.length} Milestone{milestones.length !== 1 ? 's' : ''}
                </h3>
                <span className="text-xs tabular-nums" style={{ color: allocated > target ? 'var(--danger)' : 'var(--subtle)' }}>
                  {formatUSDC(allocated)} allocated
                </span>
              </div>
              <div className="space-y-2">
                {milestones.map((ms, i) => (
                  <div key={ms.id} className="flex items-center gap-3 py-2 border-b last:border-0"
                    style={{ borderColor: 'var(--border)' }}>
                    <span
                      className="flex items-center justify-center rounded-full text-xs font-semibold shrink-0"
                      style={{ width: 22, height: 22, background: 'var(--accent-dim)', color: 'var(--accent)' }}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm" style={{ color: 'var(--ink-2)' }}>{ms.title}</span>
                    {ms.targetAmount && (
                      <span className="text-xs tabular-nums" style={{ color: 'var(--subtle)' }}>
                        {formatUSDC(Number(ms.targetAmount))}
                      </span>
                    )}
                    {ms.dueDate && (
                      <span className="text-xs" style={{ color: 'var(--subtle)' }}>by {ms.dueDate}</span>
                    )}
                  </div>
                ))}
              </div>
              {unallocated > 0 && (
                <p className="mt-3 text-xs" style={{ color: 'var(--subtle)' }}>
                  {formatUSDC(unallocated)} of the target has no milestone assigned yet.
                </p>
              )}
            </div>

            {mode === 'demo' ? (
              <div className="p-4 rounded-xl text-xs"
                style={{ background: 'var(--warning-dim)', color: 'var(--warning)', border: '1px solid rgba(244,194,106,0.25)' }}>
                <strong>LOCAL DRAFT:</strong> Saves to browser localStorage only. No contract transaction is sent and no USDC is transferred.
                {isContractDeployed() ? null : (
                  <span> Deploy the contract and set <code className="mono">VITE_CLEARFUND_ESCROW_ADDRESS</code> to enable onchain creation.</span>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-2 p-4 rounded-xl text-xs"
                style={{ background: 'rgba(77,157,224,0.1)', color: 'var(--accent)', border: '1px solid rgba(77,157,224,0.25)' }}>
                <Wifi size={12} className="mt-0.5 shrink-0" />
                <span>
                  <strong>Arc Testnet:</strong> Saving will record this campaign locally. Onchain <code className="mono">createCampaign</code> + <code className="mono">addMilestone</code> transactions will be prepared in Phase 4 (wallet signing step). No mainnet transactions. No real funds.
                </span>
              </div>
            )}

            {/* Onchain tx state — only visible in testnet mode */}
            {mode === 'testnet' && createResult.stage !== 'idle' && (
              <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'var(--surface)' }}>
                <TxStatusBadge tx={{ stage: createResult.stage, txHash: createResult.createTxHash, error: createResult.error }} confirmedLabel="Campaign + milestones confirmed onchain" />
                {createResult.milestonesTotal > 0 && createResult.stage !== 'failed' && (
                  <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                    Milestones: {createResult.milestonesAdded} / {createResult.milestonesTotal} added
                  </p>
                )}
                {createResult.error && (
                  <p className="text-xs" style={{ color: 'var(--danger)' }}>{createResult.error}</p>
                )}
                {createResult.stage === 'failed' && (
                  <button onClick={() => { resetCreate(); setSubmitted(false); }} className="text-xs mt-1" style={{ color: 'var(--accent)' }}>
                    Try again
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-xl text-sm font-medium"
                style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)', minHeight: 44 }}
              >
                Back
              </button>
              <button
                onClick={() => { void handleSubmit(); }}
                disabled={submitted && createResult.stage !== 'failed' && createResult.stage !== 'idle'}
                className="flex-1 py-3 rounded-xl font-semibold text-sm disabled:opacity-60"
                style={{ background: 'var(--accent)', color: '#0d1b2f', minHeight: 44 }}
              >
                {submitted && createResult.stage !== 'failed' && createResult.stage !== 'idle'
                  ? txStageLabel(createResult.stage, 'Save Campaign')
                  : 'Save Campaign'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
