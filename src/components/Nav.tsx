import { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Layers, PlusCircle, FileSearch, Compass, Menu, X, ShieldCheck } from 'lucide-react';
import DemoBadge from './DemoBadge';

type Page = 'landing' | 'dashboard' | 'create' | 'proof' | 'explorer' | 'campaign' | 'reviewer';

interface NavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems = [
  { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'create' as Page, label: 'New Campaign', icon: PlusCircle },
  { id: 'proof' as Page, label: 'Proof Center', icon: Layers },
  { id: 'reviewer' as Page, label: 'Reviewer', icon: ShieldCheck },
  { id: 'explorer' as Page, label: 'Tx Explorer', icon: FileSearch },
];

export default function Nav({ currentPage, onNavigate }: NavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const handleNav = (page: Page) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  // Close on Escape and restore focus to hamburger
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        hamburgerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  // Trap focus inside the drawer while it is open
  useEffect(() => {
    if (!mobileOpen || !drawerRef.current) return;
    const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [mobileOpen]);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8"
        role="navigation"
        aria-label="Main navigation"
        style={{
          height: 60,
          background: 'rgba(13,27,47,0.85)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {/* Logo */}
        <button
          onClick={() => handleNav('landing')}
          className="flex items-center gap-2 group"
          aria-label="ClearFund home"
        >
          <div
            className="flex items-center justify-center rounded-lg shrink-0"
            style={{ width: 32, height: 32, background: 'var(--accent)', color: '#0d1b2f' }}
          >
            <Compass size={16} strokeWidth={2.5} />
          </div>
          <span className="display font-semibold text-base" style={{ color: 'var(--ink)' }}>
            Clear<span style={{ color: 'var(--accent)' }}>Fund</span>
          </span>
          <DemoBadge className="hidden sm:inline-flex" />
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1" role="menubar">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = currentPage === id;
            return (
              <button
                key={id}
                onClick={() => handleNav(id)}
                role="menuitem"
                aria-current={active ? 'page' : undefined}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  color: active ? 'var(--accent)' : 'var(--muted)',
                  background: active ? 'var(--accent-dim)' : 'transparent',
                  border: active ? '1px solid rgba(77,157,224,0.2)' : '1px solid transparent',
                  minHeight: 36,
                }}
              >
                <Icon size={14} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{ color: '#0d1b2f', background: 'var(--accent)', minHeight: 36 }}
            onClick={() => handleNav('create')}
          >
            <PlusCircle size={14} />
            Start Campaign
          </button>
          {/* Mobile hamburger */}
          <button
            ref={hamburgerRef}
            className="md:hidden p-2 rounded-lg"
            style={{ color: 'var(--muted)', minHeight: 44, minWidth: 44 }}
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer — full-width overlay below nav */}
      {mobileOpen && (
        <div
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-0 z-40 md:hidden"
          style={{ top: 60 }}
          onClick={() => setMobileOpen(false)}
        >
          {/* Scrim */}
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} aria-hidden="true" />
          {/* Panel */}
          <div
            ref={drawerRef}
            className="relative py-3 px-4 flex flex-col gap-1"
            style={{
              background: 'rgba(13,27,47,0.98)',
              borderBottom: '1px solid var(--border)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {navItems.map(({ id, label, icon: Icon }) => {
              const active = currentPage === id;
              return (
                <button
                  key={id}
                  onClick={() => handleNav(id)}
                  aria-current={active ? 'page' : undefined}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left w-full"
                  style={{
                    color: active ? 'var(--accent)' : 'var(--muted)',
                    background: active ? 'var(--accent-dim)' : 'transparent',
                    minHeight: 48,
                  }}
                >
                  <Icon size={18} />
                  {label}
                </button>
              );
            })}
            <button
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold mt-2 w-full"
              style={{ background: 'var(--accent)', color: '#0d1b2f', minHeight: 48 }}
              onClick={() => handleNav('create')}
            >
              <PlusCircle size={16} />
              Start Campaign
            </button>
          </div>
        </div>
      )}
    </>
  );
}
