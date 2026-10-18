interface ProgressBarProps {
  percent: number;
  className?: string;
  height?: number;
  color?: string;
}

export default function ProgressBar({
  percent,
  className = '',
  height = 6,
  color = 'var(--accent)',
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div
      className={`w-full rounded-full overflow-hidden ${className}`}
      style={{ height, background: 'var(--border)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${clamped}%`, background: color }}
      />
    </div>
  );
}
