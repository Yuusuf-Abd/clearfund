import { useState } from 'react';
import { FileSearch, CheckCircle2, Search, ExternalLink, Copy, Check, Info } from 'lucide-react';
import { formatUSDC, shortTxRef } from '../data/sampleData';
import { CampaignsStore } from '../hooks/useCampaigns';
import Badge from '../components/Badge';
import DemoBadge from '../components/DemoBadge';
import { toast } from 'sonner';
import { useClearFundMode } from '../hooks/useClearFund';
import { CLEARFUND_CHAIN } from '../lib/clearfundContract';

type Page = 'landing' | 'dashboard' | 'create' | 'proof' | 'explorer' | 'campaign' | 'reviewer';

interface TxExplorerProps {
  onNavigate: (page: Page, campaignId?: string) => void;
  store: CampaignsStore;
}

/** Source label distinguishes DEMO sample data from local drafts and real testnet hashes */
type TxSource = 'demo' | 'local' | 'testnet'

interface TxRow {
  txRef: string;
  campaignTitle: string;
  campaignId: string;
  type: 'contribution' | 'release';
  amount: number;
  from?: string;
  timestamp: string;
  note?: string;
  verified: boolean;
  milestoneTitle?: string;
  source: TxSource;
}

export default function TxExplorer({ onNavigate, store }: TxExplorerProps) {
  const { campaigns } = store;
  const mode = useClearFundMode();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'contribution' | 'release'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | TxSource>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  /** Real Arc Testnet tx hashes start with 0x and are 66 chars. Anything else is DEMO data. */
  function detectSource(txRef: string, isDemo: boolean | undefined): TxSource {
    if (isDemo) return 'demo'
    if (txRef.startsWith('0x') && txRef.length === 66) return 'testnet'
    return 'local'
  }

  const allTxs: TxRow[] = [];

  for (const c of campaigns.filter((c) => !c.id.startsWith('__shadow_'))) {
    for (const cn of c.contributions) {
      allTxs.push({
        txRef: cn.txRef,
        campaignTitle: c.title,
        campaignId: c.id,
        type: 'contribution',
        amount: cn.amount,
        from: cn.contributor,
        timestamp: cn.timestamp,
        note: cn.note,
        verified: true,
        source: detectSource(cn.txRef, c.isDemo),
      });
    }
    for (const m of c.milestones) {
      if (m.txRef && m.releasedAmount > 0) {
        allTxs.push({
          txRef: m.txRef,
          campaignTitle: c.title,
          campaignId: c.id,
          type: 'release',
          amount: m.releasedAmount,
          timestamp: m.completedAt ?? m.dueDate,
          verified: m.status === 'verified',
          milestoneTitle: m.title,
          source: detectSource(m.txRef, c.isDemo),
        });
      }
    }
  }

  // Deduplicate by txRef
  const seen = new Set<string>();
  const unique = allTxs.filter((tx) => {
    if (seen.has(tx.txRef + tx.type)) return false;
    seen.add(tx.txRef + tx.type);
    return true;
  });

  const filtered = unique.filter((tx) => {
    const matchSearch =
      search === '' ||
      tx.txRef.toLowerCase().includes(search.toLowerCase()) ||
      tx.campaignTitle.toLowerCase().includes(search.toLowerCase()) ||
      (tx.from && tx.from.toLowerCase().includes(search.toLowerCase()));
    const matchType = typeFilter === 'all' || tx.type === typeFilter;
    const matchSource = sourceFilter === 'all' || tx.source === sourceFilter;
    return matchSearch && matchType && matchSource;
  });

  const copyTx = (ref: string) => {
    navigator.clipboard.writeText(ref).catch(() => {});
    setCopiedId(ref);
    toast.success('Transaction reference copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalVolume = unique.reduce((s, tx) => s + tx.amount, 0);

  return (
    <div className="min-h-dvh pt-16 px-4" style={{ background: 'var(--bg-gradient)' }}>
      <div className="max-w-4xl mx-auto py-8">

        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <FileSearch size={20} style={{ color: 'var(--accent)' }} />
          <h1 className="display font-semibold text-2xl" style={{ color: 'var(--ink)' }}>
            Transaction Explorer
          </h1>
          <DemoBadge />
        </div>
        <p className="text-sm mb-8" style={{ color: 'var(--subtle)' }}>
          All USDC contributions and milestone fund releases — linked to Arc transaction references.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Volume', value: formatUSDC(totalVolume) },
            { label: 'Contributions', value: String(unique.filter((t) => t.type === 'contribution').length) },
            { label: 'Releases', value: String(unique.filter((t) => t.type === 'release').length) },
          ].map(({ label, value }) => (
            <div key={label} className="glass rounded-2xl p-4 text-center">
              <div className="display font-semibold text-xl tabular-nums" style={{ color: 'var(--ink)' }}>
                {value}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--subtle)' }} />
            <input
              type="text"
              placeholder="Search by tx ref, campaign, or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}
            />
          </div>
          <div className="flex items-center gap-1">
            {(['all', 'contribution', 'release'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className="px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all"
                style={{
                  background: typeFilter === f ? 'var(--surface-strong)' : 'transparent',
                  color: typeFilter === f ? 'var(--ink-2)' : 'var(--subtle)',
                  minHeight: 36,
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Source filter */}
        <div className="flex items-center gap-1 mb-4 flex-wrap">
          <span className="text-xs mr-1" style={{ color: 'var(--subtle)' }}>Source:</span>
          {(['all', 'demo', 'local', 'testnet'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
              style={{
                background: sourceFilter === s ? 'var(--surface-strong)' : 'transparent',
                color: sourceFilter === s ? 'var(--ink-2)' : 'var(--subtle)',
                minHeight: 32,
              }}
            >
              {s === 'testnet' ? 'Arc Testnet' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Notice */}
        <div
          className="flex items-start gap-2 p-3 rounded-xl text-xs mb-5"
          style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          <Info size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
          <span>
            <strong style={{ color: 'var(--ink)' }}>DEMO</strong> rows are sample data with fabricated references.{' '}
            <strong style={{ color: 'var(--ink)' }}>LOCAL DRAFT</strong> rows are user-created but not yet confirmed onchain.{' '}
            <strong style={{ color: 'var(--ink)' }}>Arc Testnet</strong> rows ({mode === 'testnet' ? 'active' : 'none yet'}) have real tx hashes linkable to the block explorer.{' '}
            Simulated references are never displayed as confirmed blockchain transactions.
          </span>
        </div>

        {/* Table */}
        <div className="glass rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Search size={28} style={{ color: 'var(--subtle)' }} />
              <p className="mt-3 text-sm" style={{ color: 'var(--subtle)' }}>No transactions match</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 640 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Tx Reference', 'Type', 'Campaign', 'Amount', 'Date', 'Source', 'Status', ''].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium"
                        style={{ color: 'var(--subtle)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx, idx) => (
                    <tr
                      key={tx.txRef + tx.type + idx}
                      style={{ borderBottom: '1px solid var(--border)', opacity: 1 }}
                    >
                      {/* Tx ref */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="mono text-xs" style={{ color: 'var(--muted)' }}>
                            {shortTxRef(tx.txRef)}
                          </span>
                          <button
                            onClick={() => copyTx(tx.txRef)}
                            className="p-1 rounded transition-colors"
                            style={{ color: 'var(--subtle)', minWidth: 28, minHeight: 28 }}
                            title="Copy full reference"
                            aria-label="Copy transaction reference"
                          >
                            {copiedId === tx.txRef ? (
                              <Check size={11} style={{ color: 'var(--success)' }} />
                            ) : (
                              <Copy size={11} />
                            )}
                          </button>
                        </div>
                      </td>
                      {/* Type */}
                      <td className="px-4 py-3">
                        <Badge variant={tx.type === 'contribution' ? 'accent' : 'success'}>
                          {tx.type === 'contribution' ? 'Contribution' : 'Release'}
                        </Badge>
                      </td>
                      {/* Campaign */}
                      <td className="px-4 py-3 max-w-[180px]">
                        <button
                          onClick={() => onNavigate('campaign', tx.campaignId)}
                          className="text-xs font-medium text-left hover:underline line-clamp-2"
                          style={{ color: 'var(--ink-2)' }}
                        >
                          {tx.campaignTitle}
                          {tx.milestoneTitle && (
                            <span className="block font-normal" style={{ color: 'var(--subtle)' }}>
                              {tx.milestoneTitle}
                            </span>
                          )}
                        </button>
                      </td>
                      {/* Amount */}
                      <td className="px-4 py-3">
                        <span className="display font-semibold text-sm tabular-nums" style={{ color: 'var(--ink)' }}>
                          {formatUSDC(tx.amount)}
                        </span>
                      </td>
                      {/* Date */}
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: 'var(--subtle)' }}>
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </span>
                      </td>
                      {/* Source */}
                      <td className="px-4 py-3">
                        {tx.source === 'demo' && <DemoBadge />}
                        {tx.source === 'local' && (
                          <span className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: 'rgba(244,194,106,0.15)', color: 'var(--warning)', border: '1px solid rgba(244,194,106,0.3)' }}>
                            LOCAL
                          </span>
                        )}
                        {tx.source === 'testnet' && (
                          <span className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: 'rgba(77,157,224,0.15)', color: 'var(--accent)', border: '1px solid rgba(77,157,224,0.3)' }}>
                            TESTNET
                          </span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        {tx.source === 'testnet' && tx.verified ? (
                          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--success)' }}>
                            <CheckCircle2 size={12} /> Verified Onchain
                          </div>
                        ) : tx.source === 'demo' ? (
                          <div className="text-xs" style={{ color: 'var(--subtle)' }}>DEMO</div>
                        ) : (
                          <div className="text-xs" style={{ color: 'var(--subtle)' }}>Local Draft</div>
                        )}
                      </td>
                      {/* Link — only for real testnet hashes */}
                      <td className="px-4 py-3">
                        {tx.source === 'testnet' ? (
                          <a
                            href={`${CLEARFUND_CHAIN.blockExplorers?.default?.url}/tx/${tx.txRef}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View on Arc Testnet Explorer"
                            aria-label="View transaction on Arc Testnet Explorer"
                          >
                            <ExternalLink size={12} style={{ color: 'var(--accent)' }} />
                          </a>
                        ) : (
                          <span title="No explorer link for sample data">
                            <ExternalLink size={12} style={{ color: 'var(--subtle)', opacity: 0.35 }} />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs" style={{ color: 'var(--subtle)' }}>
          {filtered.length} of {unique.length} transactions shown
        </p>
      </div>
    </div>
  );
}
