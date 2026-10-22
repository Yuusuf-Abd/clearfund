import React, { useState } from 'react';
import { Search, SlidersHorizontal, TrendingUp, Users, CheckCircle2, Plus, Wifi, Loader } from 'lucide-react';
import { CATEGORIES, formatUSDC } from '../data/sampleData';
import { CampaignsStore } from '../hooks/useCampaigns';
import CampaignCard from '../components/CampaignCard';
import DemoBadge from '../components/DemoBadge';
import { useContractCampaigns } from '../hooks/useContractCampaigns';
import { isContractDeployed, CLEARFUND_CHAIN } from '../lib/clearfundContract';
import { formatUsdc } from '@/onchain-money';

type Page = 'landing' | 'dashboard' | 'create' | 'proof' | 'explorer' | 'campaign';

interface DashboardProps {
  onNavigate: (page: Page, campaignId?: string) => void;
  store: CampaignsStore;
}

const networkName = CLEARFUND_CHAIN.id === 5042 ? 'Arc Mainnet' : 'Arc Testnet';

export default function Dashboard({ onNavigate, store }: DashboardProps) {
  const { campaigns } = store;
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const contractIndex = useContractCampaigns();

  // Live filtering across all campaigns (sample + user-created)
  const filtered = campaigns.filter((c) => {
    if (c.id.startsWith('__shadow_')) return false; // never show shadows directly
    const q = search.toLowerCase();
    const matchSearch =
      q === '' ||
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.organizer.toLowerCase().includes(q) ||
      c.recipientName.toLowerCase().includes(q);
    const matchCat = category === 'All' || c.category === category;
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  // Dynamic stats from all campaigns
  const totalRaised = campaigns.reduce((s, c) => s + c.raisedAmount, 0);
  const totalTarget = campaigns.reduce((s, c) => s + c.targetAmount, 0);
  const totalContributors = campaigns.reduce((s, c) => s + c.contributorCount, 0);
  const verifiedMilestones = campaigns
    .flatMap((c) => c.milestones)
    .filter((m) => m.status === 'verified').length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
  const completedCampaigns = campaigns.filter((c) => c.status === 'completed').length;

  // Collect all categories present in data (plus "All")
  const presentCategories = ['All', ...Array.from(new Set(campaigns.map((c) => c.category))).sort()];
  // Limit displayed category pills to CATEGORIES list + any user-created ones
  const allCats = CATEGORIES.filter((cat) => presentCategories.includes(cat) || cat === 'All');

  return (
    <div className="min-h-dvh pt-16 px-4" style={{ background: 'var(--bg-gradient)' }}>
      <div className="max-w-5xl mx-auto py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="display font-semibold text-2xl" style={{ color: 'var(--ink)' }}>
                Campaign Dashboard
              </h1>
              <DemoBadge />
            </div>
            <p className="text-sm" style={{ color: 'var(--subtle)' }}>
              {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} — proof-based USDC funding on {networkName}
              {isContractDeployed() && contractIndex.campaigns.length > 0 && (
                <span style={{ color: 'var(--accent)' }}>
                  {' '}· {contractIndex.campaigns.length} verified onchain
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => onNavigate('create')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'var(--accent)', color: '#0d1b2f', minHeight: 40 }}
          >
            <Plus size={14} /> New Campaign
          </button>
        </div>

        {/* Stats row — calculated from live data */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total Pledged', value: formatUSDC(totalRaised), icon: TrendingUp, sub: `target ${formatUSDC(totalTarget)}` },
            { label: 'Contributors', value: totalContributors.toLocaleString(), icon: Users, sub: 'across all campaigns' },
            { label: 'Active Campaigns', value: String(activeCampaigns), icon: SlidersHorizontal, sub: `${completedCampaigns} completed` },
            { label: 'Verified Milestones', value: String(verifiedMilestones), icon: CheckCircle2, sub: 'evidence approved' },
          ].map(({ label, value, icon: Icon, sub }) => (
            <div key={label} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} style={{ color: 'var(--accent)' }} />
                <span className="text-xs" style={{ color: 'var(--subtle)' }}>{label}</span>
              </div>
              <div className="display font-semibold text-xl tabular-nums" style={{ color: 'var(--ink)' }}>
                {value}
              </div>
              <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--subtle)' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--subtle)' }}
            />
            <input
              type="text"
              placeholder="Search campaigns, organizers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}
            />
          </div>

          {/* Category pills — scrollable, hide scrollbar */}
          <div
            className="flex items-center gap-2 overflow-x-auto pb-0.5"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {allCats.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  background: category === cat ? 'var(--accent-dim)' : 'var(--surface)',
                  color: category === cat ? 'var(--accent)' : 'var(--subtle)',
                  border: `1px solid ${category === cat ? 'rgba(77,157,224,0.3)' : 'var(--border)'}`,
                  minHeight: 32,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status toggle */}
          <div className="flex items-center gap-1 flex-wrap">
            {(['all', 'active', 'completed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                style={{
                  background: statusFilter === s ? 'var(--surface-strong)' : 'transparent',
                  color: statusFilter === s ? 'var(--ink-2)' : 'var(--subtle)',
                  minHeight: 32,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* ── Onchain campaigns (Arc Testnet) ───────────────────────────── */}
        {isContractDeployed() && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Wifi size={14} style={{ color: 'var(--accent)' }} />
              <h2 className="display font-semibold text-base" style={{ color: 'var(--ink)' }}>
                {networkName} Campaigns
              </h2>
              {contractIndex.isLoading && <Loader size={13} className="animate-spin" style={{ color: 'var(--subtle)' }} />}
              {contractIndex.chainHead > 0n && (
                <span className="text-xs ml-auto" style={{ color: 'var(--subtle)' }}>
                  block {String(contractIndex.currentBlock)} / {String(contractIndex.chainHead)}
                </span>
              )}
            </div>
            {contractIndex.error && (
              <div className="text-xs px-4 py-3 rounded-xl mb-3"
                style={{ background: 'var(--danger-dim)', color: 'var(--danger)' }}>
                Indexer error: {contractIndex.error}
              </div>
            )}
            {!contractIndex.isLoading && contractIndex.campaigns.length === 0 && !contractIndex.error && (
              <div className="glass rounded-2xl flex flex-col items-center justify-center py-8">
                <p className="text-sm" style={{ color: 'var(--subtle)' }}>
                  No campaigns found on {networkName} yet.
                </p>
                <button onClick={() => onNavigate('create')} className="mt-2 text-xs" style={{ color: 'var(--accent)' }}>
                  Create the first one
                </button>
              </div>
            )}
            {contractIndex.campaigns.length > 0 && (
              <div className="space-y-2">
                {contractIndex.campaigns.map((c) => (
                  <div key={String(c.onchainId)} className="glass rounded-2xl px-5 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: 'rgba(52,211,153,0.12)', color: 'var(--success)' }}
                        >
                          VERIFIED ONCHAIN
                        </span>
                        <span className="text-xs" style={{ color: 'var(--subtle)' }}>
                          ID #{String(c.onchainId)}
                        </span>
                      </div>
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                        {c.metadataURI.startsWith('{')
                          ? (() => { try { return (JSON.parse(c.metadataURI) as { title?: string }).title ?? c.metadataURI } catch { return c.metadataURI } })()
                          : c.metadataURI}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>
                        Target: {formatUsdc(c.target)} USDC ·{' '}
                        Raised: {formatUsdc(c.totalContributed)} USDC ·{' '}
                        {c.milestoneCount.toString()} milestone{c.milestoneCount !== 1n ? 's' : ''} ·{' '}
                        {c.active ? 'Active' : 'Cancelled'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Campaign grid */}
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl flex flex-col items-center justify-center py-16">
            <Search size={32} style={{ color: 'var(--subtle)' }} />
            <p className="mt-3 text-sm" style={{ color: 'var(--subtle)' }}>
              No campaigns match your filters
            </p>
            {search !== '' && (
              <button
                onClick={() => setSearch('')}
                className="mt-2 text-xs"
                style={{ color: 'var(--accent)' }}
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                onClick={(id) => onNavigate('campaign', id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
