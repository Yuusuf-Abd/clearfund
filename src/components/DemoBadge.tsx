export default function DemoBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold tracking-widest uppercase ${className}`}
      style={{
        background: 'var(--warning-dim)',
        color: 'var(--warning)',
        border: '1px solid rgba(244,194,106,0.3)',
        letterSpacing: '0.08em',
      }}
    >
      DEMO
    </span>
  );
}
