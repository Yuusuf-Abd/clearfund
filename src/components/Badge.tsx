type BadgeVariant = 'success' | 'danger' | 'warning' | 'accent' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const styles: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  success: { bg: 'var(--success-dim)', color: 'var(--success)', border: 'rgba(141,216,159,0.25)' },
  danger: { bg: 'var(--danger-dim)', color: 'var(--danger)', border: 'rgba(232,109,122,0.25)' },
  warning: { bg: 'var(--warning-dim)', color: 'var(--warning)', border: 'rgba(244,194,106,0.25)' },
  accent: { bg: 'var(--accent-dim)', color: 'var(--accent)', border: 'rgba(77,157,224,0.25)' },
  muted: { bg: 'rgba(148,163,184,0.1)', color: 'var(--subtle)', border: 'rgba(148,163,184,0.2)' },
};

export default function Badge({ variant = 'muted', children, className = '' }: BadgeProps) {
  const s = styles[variant];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {children}
    </span>
  );
}
