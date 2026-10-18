import { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Mirrors the inputCls pattern used in forms */
  inputClassName?: string;
  inputStyle?: React.CSSProperties;
  disabled?: boolean;
}

export default function Select({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  className = '',
  inputClassName = '',
  inputStyle = {},
  disabled = false,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Keyboard navigation inside list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen((o) => !o);
    }
    if (e.key === 'ArrowDown' && open) {
      e.preventDefault();
      const idx = options.findIndex((o) => o.value === value);
      const next = options[Math.min(idx + 1, options.length - 1)];
      if (next) onChange(next.value);
    }
    if (e.key === 'ArrowUp' && open) {
      e.preventDefault();
      const idx = options.findIndex((o) => o.value === value);
      const prev = options[Math.max(idx - 1, 0)];
      if (prev) onChange(prev.value);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button — matches the look of the other form inputs */}
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between text-left ${inputClassName}`}
        style={{
          ...inputStyle,
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{ color: selected ? 'var(--ink)' : 'var(--subtle)' }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: 'var(--subtle)',
            flexShrink: 0,
            transition: 'transform 0.15s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 rounded-xl py-1 overflow-auto"
          style={{
            background: '#1e293b',
            border: '1px solid rgba(77,157,224,0.25)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            maxHeight: 220,
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors"
                style={{
                  color: isSelected ? 'var(--accent)' : '#f8fafc',
                  background: isSelected ? 'rgba(77,157,224,0.15)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected)
                    (e.currentTarget as HTMLElement).style.background = 'rgba(77,157,224,0.10)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected)
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                {opt.label}
                {isSelected && <Check size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
