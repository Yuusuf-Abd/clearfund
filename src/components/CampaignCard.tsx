import { Users, Calendar, ArrowRight } from 'lucide-react';
import { Campaign, formatUSDC, progressPercent } from '../data/sampleData';
import Badge from './Badge';
import DemoBadge from './DemoBadge';
import ProgressBar from './ProgressBar';

interface CampaignCardProps {
  campaign: Campaign;
  onClick: (id: string) => void;
}

const statusVariant = (s: Campaign['status']) => {
  if (s === 'active') return 'accent';
  if (s === 'completed') return 'success';
  return 'muted';
};

const statusLabel = (s: Campaign['status']) => {
  if (s === 'active') return 'Active';
  if (s === 'completed') return 'Completed';
  return 'Draft';
};

export default function CampaignCard({ campaign, onClick }: CampaignCardProps) {
  const pct = progressPercent(campaign.raisedAmount, campaign.targetAmount);
  const completedMs = campaign.milestones.filter((m) => m.status === 'completed' || m.status === 'verified').length;

  return (
    <button
      onClick={() => onClick(campaign.id)}
      className="glass rounded-2xl p-5 text-left w-full group transition-all hover:shadow-lg"
      style={{
        borderColor: 'var(--border)',
        transition: 'border-color 0.2s, background 0.2s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
        (e.currentTarget as HTMLElement).style.background = 'var(--surface-strong)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
      }}
    >
      {/* Header strip */}
      <div
        className="rounded-xl mb-4 flex items-center justify-between px-4"
        style={{ background: campaign.coverColor, height: 52 }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.65)', letterSpacing: '0.08em' }}
          >
            {campaign.category}
          </span>
          {campaign.isDemo && <DemoBadge />}
        </div>
        <Badge variant={statusVariant(campaign.status)}>{statusLabel(campaign.status)}</Badge>
      </div>

      {/* Title */}
      <h3
        className="display font-semibold text-base leading-snug mb-1"
        style={{ color: 'var(--ink)' }}
      >
        {campaign.title}
      </h3>
      <p className="text-sm line-clamp-2 mb-4" style={{ color: 'var(--subtle)' }}>
        {campaign.description}
      </p>

      {/* Progress */}
      <div className="mb-1 flex items-end justify-between">
        <span className="display font-semibold text-lg tabular-nums" style={{ color: 'var(--ink)' }}>
          {formatUSDC(campaign.raisedAmount)}
        </span>
        <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--subtle)' }}>
          {pct}% of {formatUSDC(campaign.targetAmount)}
        </span>
      </div>
      <ProgressBar
        percent={pct}
        height={5}
        color={campaign.status === 'completed' ? 'var(--success)' : 'var(--accent)'}
        className="mb-4"
      />

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--subtle)' }}>
            <Users size={12} />
            <span className="tabular-nums">{campaign.contributorCount}</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--subtle)' }}>
            <Calendar size={12} />
            {completedMs}/{campaign.milestones.length} milestones
          </span>
        </div>
        <div
          className="flex items-center gap-1 text-xs font-medium group-hover:gap-2 transition-all"
          style={{ color: 'var(--accent)' }}
        >
          View <ArrowRight size={12} />
        </div>
      </div>
    </button>
  );
}
