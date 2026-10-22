import {
  ArrowRight,
  ShieldCheck,
  Zap,
  FileCheck,
  Coins,
  CheckCircle2,
  Clock,
  Circle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { formatUSDC, progressPercent, SAMPLE_CAMPAIGNS } from '../data/sampleData';
import { CampaignsStore } from '../hooks/useCampaigns';
import CampaignCard from '../components/CampaignCard';
import DemoBadge from '../components/DemoBadge';
import ProgressBar from '../components/ProgressBar';
import { useClearFundMode } from '../hooks/useClearFund';

type Page = 'landing' | 'dashboard' | 'create' | 'proof' | 'explorer' | 'campaign';

interface LandingProps {
  onNavigate: (page: Page, campaignId?: string) => void;
  store: CampaignsStore;
}

// ─── Workflow stages ───────────────────────────────────────────────────────
const stages = [
  {
    num: '01',
    icon: Coins,
    color: 'var(--accent)',
    colorDim: 'var(--accent-dim)',
    title: 'Create a Campaign',
    body: 'Define your project, set a funding target, and break the work into verifiable milestones — each with a required evidence standard.',
  },
  {
    num: '02',
    icon: Zap,
    color: 'var(--success)',
    colorDim: 'var(--success-dim)',
    title: 'Contribute in USDC',
    body: 'Contributors send USDC directly to the smart contract. Funds are held in escrow — never accessible to the organizer without approval.',
  },
  {
    num: '03',
    icon: FileCheck,
    color: 'var(--warning)',
    colorDim: 'var(--warning-dim)',
    title: 'Submit Evidence',
    body: 'Organizers submit documents, links, or reports for each milestone. An authorized reviewer examines and approves — or rejects.',
  },
  {
    num: '04',
    icon: ShieldCheck,
    color: '#c084fc',
    colorDim: 'rgba(192,132,252,0.12)',
    title: 'Release Approved Funds',
    body: 'Only after the reviewer approves a milestone can the recipient call release. Unapproved milestones and cancelled campaigns allow contributor refunds.',
  },
];

// ─── Transparency timeline items (DEMO data only) ─────────────────────────
const DEMO_TIMELINE = [
  { label: 'Milestone created', sub: 'Procurement & Lab Setup — 5,000 USDC locked', done: true, accent: 'var(--accent)' },
  { label: 'Evidence submitted', sub: 'Invoice + photo documentation uploaded by organizer', done: true, accent: 'var(--accent)' },
  { label: 'Under reviewer review', sub: 'Authorized reviewer examining documentation', done: true, accent: 'var(--warning)' },
  { label: 'Milestone approved', sub: 'Reviewer signed approval transaction onchain', done: true, accent: 'var(--success)' },
  { label: 'Funds released', sub: '5,000 USDC transferred to Delta Water Collective', done: true, accent: 'var(--success)' },
  { label: 'Next milestone active', sub: 'Field Deployment Phase 1 — awaiting evidence', done: false, accent: 'var(--subtle)' },
];

export default function Landing({ onNavigate, store }: LandingProps) {
  const { campaigns } = store;
  const mode = useClearFundMode();

  const visible = campaigns.filter((c) => !c.id.startsWith('__shadow_'));
  const totalRaised = visible.reduce((s, c) => s + c.raisedAmount, 0);
  const totalCampaigns = visible.length;
  const verifiedMilestones = visible.flatMap((c) => c.milestones).filter((m) => m.status === 'verified' || m.status === 'completed').length;
  const totalContributors = visible.reduce((s, c) => s + c.contributorCount, 0);

  const featured = visible.slice(0, 3);
  const heroC = featured[0];
  const supportC = featured.slice(1, 3);

  // Hero preview campaign — always use sample c1 for richness
  const previewCampaign = SAMPLE_CAMPAIGNS[0];
  const previewPct = progressPercent(previewCampaign.raisedAmount, previewCampaign.targetAmount);

  return (
    <div className="min-h-dvh">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="home-hero pt-20 pb-0 px-4 overflow-hidden relative">
        {/* Hero ambient glow — restrained, behind content */}
        <div
          className="absolute inset-x-0 top-0 pointer-events-none"
          aria-hidden="true"
          style={{
            height: 480,
            background: 'radial-gradient(ellipse 60% 55% at 50% 0%, rgba(77,157,224,0.09) 0%, transparent 70%)',
          }}
        />
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center py-14 lg:py-20">

            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full"
                style={{ background: 'var(--accent-dim)', border: '1px solid rgba(77,157,224,0.25)' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                <span className="text-xs font-medium tracking-wide" style={{ color: 'var(--accent)' }}>
                  {mode === 'demo' ? 'DEMO PROTOTYPE — No real funds' : mode === 'testnet' ? 'ARC TESTNET — Test funds only' : 'ARC MAINNET — Verify transactions onchain'}
                </span>
              </div>

              <h1
                className="display font-semibold mb-5 text-balance"
                style={{ fontSize: 'clamp(2rem, 4.5vw, 3.25rem)', color: 'var(--ink)', lineHeight: 1.12, letterSpacing: '-0.03em' }}
              >
                Funding that proves{' '}
                <span style={{ color: 'var(--accent)' }}>every step</span>{' '}
                of the way
              </h1>

              <p className="mb-8 text-pretty" style={{ color: 'var(--muted)', lineHeight: 1.75, fontSize: '1.0625rem', maxWidth: '48ch' }}>
                ClearFund locks USDC contributions behind real milestones and verifiable evidence — so communities, teams, and donors can trust every dollar released.
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-10">
                <button
                  onClick={() => onNavigate('create')}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all"
                  style={{ background: 'var(--accent)', color: '#0d1b2f', minHeight: 44 }}
                  onMouseEnter={(e) => ((e.currentTarget).style.background = 'var(--accent-hover)')}
                  onMouseLeave={(e) => ((e.currentTarget).style.background = 'var(--accent)')}
                >
                  Start a Campaign <ArrowRight size={15} />
                </button>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all"
                  style={{ background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--border)', minHeight: 44 }}
                  onMouseEnter={(e) => ((e.currentTarget).style.borderColor = 'var(--border-strong)')}
                  onMouseLeave={(e) => ((e.currentTarget).style.borderColor = 'var(--border)')}
                >
                  Explore Campaigns
                </button>
              </div>

              {/* Stat trio — horizontal, typographic */}
              <div className="flex items-center gap-0 flex-wrap">
                {[
                  { value: formatUSDC(totalRaised), label: 'Raised' },
                  { value: String(totalCampaigns), label: 'Campaigns' },
                  { value: String(verifiedMilestones), label: 'Milestones done' },
                ].map(({ value, label }, i) => (
                  <div key={label} className="flex items-center">
                    <div className="pr-5 pl-0">
                      <div className="display font-semibold tabular-nums text-xl" style={{ color: 'var(--ink)' }}>{value}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>{label}</div>
                    </div>
                    {i < 2 && <div className="w-px h-8 mr-5 shrink-0" style={{ background: 'var(--border)' }} />}
                  </div>
                ))}
                {mode === 'demo' && (
                  <span className="text-xs ml-1" style={{ color: 'var(--subtle)' }}>
                    <DemoBadge />
                  </span>
                )}
              </div>
            </div>

            {/* Right: product preview card */}
            <div className="relative flex items-start justify-center lg:justify-end">
              {/* Decorative glow behind card */}
              <div
                className="absolute pointer-events-none"
                aria-hidden="true"
                style={{
                  width: 320,
                  height: 320,
                  background: 'radial-gradient(ellipse at center, rgba(77,157,224,0.12) 0%, transparent 70%)',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                }}
              />
              <div
                className="glass rounded-2xl w-full max-w-sm relative overflow-hidden"
                style={{ border: '1px solid var(--border-strong)' }}
                aria-label="Demo campaign preview"
              >
                {/* Card header strip */}
                <div
                  className="px-5 py-4 flex items-center justify-between"
                  style={{ background: previewCampaign.coverColor, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div>
                    <div className="text-xs font-semibold tracking-widest uppercase mb-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {previewCampaign.category}
                    </div>
                    <div className="display font-semibold text-sm leading-snug" style={{ color: '#f9faf3', maxWidth: 220 }}>
                      {previewCampaign.title}
                    </div>
                  </div>
                  <DemoBadge />
                </div>

                <div className="px-5 pt-4 pb-2">
                  {/* Funding progress */}
                  <div className="flex items-end justify-between mb-1.5">
                    <span className="display font-semibold tabular-nums text-lg" style={{ color: 'var(--ink)' }}>
                      {formatUSDC(previewCampaign.raisedAmount)}
                    </span>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--subtle)' }}>
                      {previewPct}% of {formatUSDC(previewCampaign.targetAmount)}
                    </span>
                  </div>
                  <ProgressBar percent={previewPct} height={4} color="var(--accent)" className="mb-4" />

                  {/* Milestone mini-list */}
                  <div className="text-xs font-semibold tracking-widest uppercase mb-2.5" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
                    Milestones
                  </div>
                  <div className="flex flex-col gap-2">
                    {previewCampaign.milestones.slice(0, 4).map((ms) => {
                      const isDone = ms.status === 'completed' || ms.status === 'verified';
                      const isActive = ms.status === 'in_progress';
                      return (
                        <div key={ms.id} className="flex items-center gap-2.5">
                          <div className="shrink-0">
                            {isDone ? (
                              <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
                            ) : isActive ? (
                              <Clock size={14} style={{ color: 'var(--warning)' }} />
                            ) : (
                              <Circle size={14} style={{ color: 'var(--subtle)', opacity: 0.4 }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className="text-xs font-medium truncate"
                              style={{ color: isDone ? 'var(--ink-2)' : isActive ? 'var(--ink)' : 'var(--subtle)' }}
                            >
                              {ms.title}
                            </div>
                          </div>
                          <div
                            className="text-xs tabular-nums shrink-0 font-medium"
                            style={{ color: isDone ? 'var(--success)' : 'var(--subtle)' }}
                          >
                            {formatUSDC(ms.targetAmount)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card footer CTA */}
                <div className="px-5 py-3.5" style={{ borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={() => onNavigate('campaign', previewCampaign.id)}
                    className="flex items-center gap-1.5 text-xs font-medium transition-all"
                    style={{ color: 'var(--accent)' }}
                  >
                    View campaign details <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section className="home-workflow py-20 px-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <span className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--subtle)', letterSpacing: '0.1em' }}>
                Protocol
              </span>
            </div>
            <h2 className="display font-semibold text-balance mb-3"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', color: 'var(--ink)', letterSpacing: '-0.03em' }}>
              How ClearFund works
            </h2>
            <p className="text-sm" style={{ color: 'var(--subtle)', maxWidth: '44ch', margin: '0 auto' }}>
              Every dollar follows a defined path — locked, reviewed, and released transparently.
            </p>
          </div>

          {/* Desktop: horizontal connector track */}
          <div className="hidden lg:block">
            {/* Connector line */}
            <div className="relative mb-6">
              <div className="absolute top-10 left-0 right-0 flex items-center px-16" aria-hidden="true">
                <div className="flex-1" style={{ height: 1, background: 'linear-gradient(90deg, var(--border) 0%, var(--border-strong) 50%, var(--border) 100%)' }} />
              </div>
              <div className="grid grid-cols-4 gap-6 relative">
                {stages.map(({ num, icon: Icon, color, colorDim, title, body }) => (
                  <div key={num} className="flex flex-col items-center text-center">
                    {/* Stage number + icon bubble */}
                    <div className="relative mb-5">
                      <div
                        className="rounded-2xl flex items-center justify-center"
                        style={{ width: 56, height: 56, background: colorDim, border: `1px solid ${color}30` }}
                      >
                        <Icon size={22} style={{ color }} />
                      </div>
                      <div
                        className="absolute -top-2 -right-2 display font-semibold text-xs flex items-center justify-center rounded-full"
                        style={{ width: 20, height: 20, background: 'var(--bg)', border: `1.5px solid ${color}`, color, fontSize: 9, letterSpacing: '-0.01em' }}
                      >
                        {num}
                      </div>
                    </div>
                    <h3 className="display font-semibold text-base mb-2 text-balance" style={{ color: 'var(--ink)' }}>{title}</h3>
                    <p className="text-sm leading-relaxed text-pretty" style={{ color: 'var(--subtle)' }}>{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tablet: 2×2 grid */}
          <div className="hidden sm:grid lg:hidden grid-cols-2 gap-5">
            {stages.map(({ num, icon: Icon, color, colorDim, title, body }) => (
              <div key={num} className="glass rounded-2xl p-6" style={{ border: `1px solid ${color}18` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-xl flex items-center justify-center shrink-0"
                    style={{ width: 44, height: 44, background: colorDim }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                  <span className="display font-semibold text-xs" style={{ color, letterSpacing: '-0.01em' }}>{num}</span>
                </div>
                <h3 className="display font-semibold text-base mb-1.5" style={{ color: 'var(--ink)' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--subtle)' }}>{body}</p>
              </div>
            ))}
          </div>

          {/* Mobile: vertical connected timeline */}
          <div className="sm:hidden flex flex-col">
            {stages.map(({ num, icon: Icon, color, colorDim, title, body }, idx) => (
              <div key={num} className="flex gap-4">
                {/* Left: connector column */}
                <div className="flex flex-col items-center">
                  <div className="rounded-xl flex items-center justify-center shrink-0"
                    style={{ width: 44, height: 44, background: colorDim, border: `1px solid ${color}30`, zIndex: 1 }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                  {idx < stages.length - 1 && (
                    <div className="flex-1 w-px my-1" style={{ background: 'var(--border)' }} />
                  )}
                </div>
                {/* Right: content */}
                <div className="pb-8 flex-1 min-w-0">
                  <div className="text-xs font-semibold mb-1" style={{ color, letterSpacing: '0.04em' }}>{num}</div>
                  <h3 className="display font-semibold text-base mb-1" style={{ color: 'var(--ink)' }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--subtle)' }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED CAMPAIGNS ────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="home-campaigns pb-20 pt-20 px-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--subtle)', letterSpacing: '0.1em' }}>
                  Featured
                </div>
                <h2 className="display font-semibold"
                  style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.875rem)', color: 'var(--ink)', letterSpacing: '-0.03em' }}>
                  Active Campaigns
                </h2>
              </div>
              <button
                onClick={() => onNavigate('dashboard')}
                className="flex items-center gap-1.5 text-sm font-medium transition-all shrink-0"
                style={{ color: 'var(--accent)' }}
                onMouseEnter={(e) => ((e.currentTarget).style.color = 'var(--accent-hover)')}
                onMouseLeave={(e) => ((e.currentTarget).style.color = 'var(--accent)')}
              >
                View all <ArrowRight size={13} />
              </button>
            </div>

            {/* Editorial grid: hero card + two supporting */}
            {heroC && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Hero campaign — spans 3 cols */}
                <button
                  onClick={() => onNavigate('campaign', heroC.id)}
                  className="lg:col-span-3 glass rounded-2xl p-0 overflow-hidden text-left w-full group transition-all"
                  style={{ border: '1px solid var(--border)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--surface-strong)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
                >
                  {/* Hero cover band */}
                  <div className="px-6 pt-5 pb-4 flex items-start justify-between"
                    style={{ background: heroC.coverColor }}>
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold tracking-widest uppercase"
                          style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em' }}>
                          {heroC.category}
                        </span>
                        {heroC.isDemo && <DemoBadge />}
                      </div>
                      <h3 className="display font-semibold text-lg leading-snug text-balance" style={{ color: '#f9faf3' }}>
                        {heroC.title}
                      </h3>
                    </div>
                    <div className="shrink-0">
                      <div className="rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{
                          background: heroC.status === 'completed' ? 'var(--success-dim)' : 'rgba(77,157,224,0.2)',
                          color: heroC.status === 'completed' ? 'var(--success)' : 'var(--accent)',
                          border: `1px solid ${heroC.status === 'completed' ? 'var(--success)' : 'var(--accent)'}30`,
                        }}>
                        {heroC.status === 'active' ? 'Active' : 'Completed'}
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-5">
                    <p className="text-sm leading-relaxed mb-5 text-pretty" style={{ color: 'var(--muted)', maxWidth: '60ch' }}>
                      {heroC.description}
                    </p>

                    {/* Milestone progress list */}
                    <div className="mb-5 flex flex-col gap-2">
                      {heroC.milestones.slice(0, 3).map((ms) => {
                        const isDone = ms.status === 'completed' || ms.status === 'verified';
                        const isActive = ms.status === 'in_progress';
                        const pct = progressPercent(ms.releasedAmount, ms.targetAmount);
                        return (
                          <div key={ms.id}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 min-w-0">
                                {isDone ? (
                                  <CheckCircle2 size={12} style={{ color: 'var(--success)', flexShrink: 0 }} />
                                ) : isActive ? (
                                  <Clock size={12} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                                ) : (
                                  <Circle size={12} style={{ color: 'var(--subtle)', opacity: 0.4, flexShrink: 0 }} />
                                )}
                                <span className="text-xs truncate" style={{ color: isDone ? 'var(--ink-2)' : 'var(--subtle)' }}>
                                  {ms.title}
                                </span>
                              </div>
                              <span className="text-xs tabular-nums ml-3 shrink-0 font-medium"
                                style={{ color: isDone ? 'var(--success)' : 'var(--subtle)' }}>
                                {formatUSDC(ms.targetAmount)}
                              </span>
                            </div>
                            {(isDone || isActive) && (
                              <ProgressBar
                                percent={isDone ? 100 : pct}
                                height={2}
                                color={isDone ? 'var(--success)' : 'var(--warning)'}
                                className="ml-5"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Progress bar + footer */}
                    <div className="mb-2 flex items-end justify-between">
                      <span className="display font-semibold tabular-nums text-xl" style={{ color: 'var(--ink)' }}>
                        {formatUSDC(heroC.raisedAmount)}
                      </span>
                      <span className="text-xs tabular-nums" style={{ color: 'var(--subtle)' }}>
                        {progressPercent(heroC.raisedAmount, heroC.targetAmount)}% of {formatUSDC(heroC.targetAmount)}
                      </span>
                    </div>
                    <ProgressBar
                      percent={progressPercent(heroC.raisedAmount, heroC.targetAmount)}
                      height={5}
                      color={heroC.status === 'completed' ? 'var(--success)' : 'var(--accent)'}
                      className="mb-4"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--subtle)' }}>
                        {heroC.contributorCount} contributors
                      </span>
                      <div className="flex items-center gap-1 text-xs font-medium group-hover:gap-2 transition-all"
                        style={{ color: 'var(--accent)' }}>
                        View campaign <ArrowRight size={12} />
                      </div>
                    </div>
                  </div>
                </button>

                {/* Two supporting campaigns */}
                <div className="lg:col-span-2 flex flex-col gap-5">
                  {supportC.map((c) => (
                    <CampaignCard
                      key={c.id}
                      campaign={c}
                      onClick={(id) => onNavigate('campaign', id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── TRANSPARENCY SHOWCASE ─────────────────────────────────────────── */}
      <section className="home-transparency py-20 px-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">

          {/* Left: editorial copy */}
          <div>
            <div className="inline-flex items-center gap-2 mb-5 px-3 py-1 rounded-full"
              style={{ background: 'var(--success-dim)', border: '1px solid rgba(141,216,159,0.2)' }}>
              <ShieldCheck size={12} style={{ color: 'var(--success)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>
                Evidence-based accountability
              </span>
            </div>

            <h2 className="display font-semibold mb-5 text-balance"
              style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: 'var(--ink)', letterSpacing: '-0.03em' }}>
              Funds move only when evidence is reviewed and approved
            </h2>

            <p className="mb-7 text-pretty" style={{ color: 'var(--muted)', lineHeight: 1.75 }}>
              Every milestone requires the organizer to submit documented proof before funds can be released. An authorized reviewer inspects the evidence and must explicitly approve — funds cannot be released without this step.
            </p>

            <div className="flex flex-col gap-4 mb-8">
              {[
                { icon: FileCheck, color: 'var(--accent)', title: 'Evidence required for every milestone', body: 'Organizers submit documents, links, or reports before any release can be requested.' },
                { icon: ShieldCheck, color: 'var(--success)', title: 'Reviewer authorization enforced by contract', body: 'The smart contract validates reviewer identity — no frontend shortcut can bypass it.' },
                { icon: ExternalLink, color: 'var(--warning)', title: 'Every release is a verifiable transaction', body: 'Fund releases are onchain events visible on the Arc explorer. Nothing is hidden.' },
              ].map(({ icon: Icon, color, title, body }) => (
                <div key={title} className="flex gap-4">
                  <div className="shrink-0 mt-0.5 rounded-lg flex items-center justify-center"
                    style={{ width: 32, height: 32, background: `${color}18` }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold mb-0.5" style={{ color: 'var(--ink)' }}>{title}</div>
                    <div className="text-sm" style={{ color: 'var(--subtle)' }}>{body}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--warning-dim)', border: '1px solid rgba(244,194,106,0.2)', color: 'var(--warning)' }}>
              <strong>Important limitation:</strong> ClearFund currently uses a single authorized reviewer per contract. Reviewer honesty is not enforced programmatically. Partial refunds are possible after earlier milestones were paid.
            </div>
          </div>

          {/* Right: demo milestone timeline widget */}
          <div>
            <div className="glass rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-strong)' }}>
              <div className="flex items-center justify-between px-5 py-4"
                style={{ background: 'var(--surface-strong)', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div className="display font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                    Milestone Lifecycle
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>
                    Procurement &amp; Lab Setup — 5,000 USDC
                  </div>
                </div>
                <DemoBadge />
              </div>

              <div className="px-5 py-5 flex flex-col gap-0">
                {DEMO_TIMELINE.map((step, i) => (
                  <div key={step.label} className="flex gap-4">
                    {/* Timeline spine */}
                    <div className="flex flex-col items-center">
                      <div
                        className="rounded-full shrink-0 flex items-center justify-center"
                        style={{
                          width: 28,
                          height: 28,
                          background: step.done ? `${step.accent}20` : 'var(--surface)',
                          border: `1.5px solid ${step.done ? step.accent : 'var(--border)'}`,
                        }}
                      >
                        {step.done
                          ? <CheckCircle2 size={13} style={{ color: step.accent }} />
                          : <Circle size={11} style={{ color: 'var(--subtle)', opacity: 0.35 }} />}
                      </div>
                      {i < DEMO_TIMELINE.length - 1 && (
                        <div className="w-px flex-1 my-1" style={{ background: 'var(--border)', minHeight: 18 }} />
                      )}
                    </div>
                    {/* Text */}
                    <div className="pb-4 flex-1 min-w-0">
                      <div
                        className="text-sm font-medium"
                        style={{ color: step.done ? 'var(--ink)' : 'var(--subtle)' }}
                      >
                        {step.label}
                      </div>
                      <div className="text-xs mt-0.5 text-pretty" style={{ color: 'var(--subtle)' }}>
                        {step.sub}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 pb-4">
                <div className="rounded-lg px-3 py-2.5 text-xs"
                  style={{ background: 'var(--success-dim)', border: '1px solid rgba(141,216,159,0.18)', color: 'var(--success)' }}>
                  All 5,000 USDC released to Delta Water Collective after reviewer approval.{' '}
                  <span style={{ opacity: 0.65 }}>(DEMO data — no real funds)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── IMPACT STATISTICS ─────────────────────────────────────────────── */}
      <section className="home-impact py-20 px-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="display font-semibold text-balance"
              style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.875rem)', color: 'var(--ink)', letterSpacing: '-0.03em' }}>
              Funding, made verifiable
            </h2>
            {mode === 'demo' && (
              <p className="mt-2 text-xs" style={{ color: 'var(--subtle)' }}>
                All figures below are simulated DEMO data — not verified financial activity.
              </p>
            )}
          </div>

          {/* Large typographic stat row with dividers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0">
            {[
              { value: formatUSDC(totalRaised), label: 'Total USDC committed', accent: 'var(--accent)' },
              { value: String(totalCampaigns), label: 'Campaigns created', accent: 'var(--success)' },
              { value: String(verifiedMilestones), label: 'Milestones completed', accent: 'var(--warning)' },
              { value: String(totalContributors), label: 'Total contributors', accent: '#c084fc' },
            ].map(({ value, label, accent }, i) => (
              <div
                key={label}
                className="flex flex-col items-center justify-center text-center py-8 px-4"
                style={{
                  borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                  borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div
                  className="display font-semibold tabular-nums mb-1"
                  style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', color: accent, letterSpacing: '-0.04em' }}
                >
                  {value}
                </div>
                <div className="text-xs" style={{ color: 'var(--subtle)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="home-cta px-4 py-20" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto">
          {/* Layered navy treatment — dot-grid pattern via CSS */}
          <div
            className="rounded-3xl px-6 py-14 sm:px-12 sm:py-16 text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #0d1e33 0%, #0b1a2e 50%, #091527 100%)',
              border: '1px solid rgba(77,157,224,0.18)',
              boxShadow: '0 0 0 1px rgba(77,157,224,0.06) inset',
            }}
          >
            {/* Dot grid overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              aria-hidden="true"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(77,157,224,0.18) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
                maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)',
              }}
            />
            {/* Subtle accent glow */}
            <div
              className="absolute pointer-events-none"
              aria-hidden="true"
              style={{
                width: 400,
                height: 200,
                background: 'radial-gradient(ellipse at center, rgba(77,157,224,0.10) 0%, transparent 70%)',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            />

            <div className="relative">
              <div className="inline-flex items-center gap-2 mb-5 px-3 py-1 rounded-full"
                style={{ background: 'var(--accent-dim)', border: '1px solid rgba(77,157,224,0.25)' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Built on Arc {mode === 'mainnet' ? 'Mainnet' : mode === 'testnet' ? 'Testnet' : 'Studio'}</span>
              </div>

              <h2 className="display font-semibold mb-4 text-balance"
                style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', color: 'var(--ink)', letterSpacing: '-0.03em' }}>
                Ready to fund with clarity?
              </h2>
              <p className="mb-8 text-pretty mx-auto"
                style={{ color: 'var(--muted)', lineHeight: 1.7, maxWidth: '46ch' }}>
                Create a campaign, define your milestones, and give contributors a reason to believe in your project — backed by verifiable evidence.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => onNavigate('create')}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all w-full sm:w-auto justify-center"
                  style={{ background: 'var(--accent)', color: '#0d1b2f', minHeight: 48 }}
                  onMouseEnter={(e) => ((e.currentTarget).style.background = 'var(--accent-hover)')}
                  onMouseLeave={(e) => ((e.currentTarget).style.background = 'var(--accent)')}
                >
                  Start a Campaign <ArrowRight size={15} />
                </button>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium text-sm transition-all w-full sm:w-auto justify-center"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--ink-2)', border: '1px solid var(--border)', minHeight: 48 }}
                  onMouseEnter={(e) => ((e.currentTarget).style.borderColor = 'var(--border-strong)')}
                  onMouseLeave={(e) => ((e.currentTarget).style.borderColor = 'var(--border)')}
                >
                  Explore Campaigns
                </button>
              </div>

              <p className="mt-6 text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>
                DEMO mode — no real funds or smart contract required to explore.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="home-footer" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            {/* Brand */}
            <div>
              <div className="display font-semibold text-base mb-1" style={{ color: 'var(--ink)' }}>
                Clear<span style={{ color: 'var(--accent)' }}>Fund</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                Fund with clarity. Release with accountability.
              </p>
            </div>

            {/* Nav links */}
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {[
                { label: 'Dashboard', page: 'dashboard' as Page },
                { label: 'New Campaign', page: 'create' as Page },
                { label: 'Proof Center', page: 'proof' as Page },
                { label: 'Tx Explorer', page: 'explorer' as Page },
              ].map(({ label, page }) => (
                <button
                  key={page}
                  onClick={() => onNavigate(page)}
                  className="text-xs transition-colors"
                  style={{ color: 'var(--subtle)' }}
                  onMouseEnter={(e) => ((e.currentTarget).style.color = 'var(--ink-2)')}
                  onMouseLeave={(e) => ((e.currentTarget).style.color = 'var(--subtle)')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'rgba(148,163,184,0.45)' }}>
              {mode === 'demo'
                ? 'DEMO mode — no contract deployed, no real funds. Sample data only.'
                : mode === 'mainnet' ? 'Arc Mainnet configured — verify contract and transaction evidence onchain.' : 'Connected to Arc Testnet — test network only, no real funds.'}
            </p>
            <p className="text-xs" style={{ color: 'rgba(148,163,184,0.35)' }}>
              Built on Arc · USDC native gas · Milestone escrow
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
