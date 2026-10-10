import React from 'react';
import {
  ClipboardCheck, History, UserRound, Settings2, ShieldCheck,
  ChevronLeft, ChevronRight, X, Cpu
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  user,
  backendStatus,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen
}) {
  const isAdmin = user?.role === 'admin';

  const allTabs = [
    { key: 'assess',    label: 'Risk Assessment',    badge: 'Core',   icon: ClipboardCheck, showAlways: true },
    { key: 'history',   label: 'Audit History',      icon: History,         showAlways: true },
    { key: 'dashboard', label: 'My Dashboard',       icon: UserRound,       showAlways: false, requireAuth: true, adminHide: true },
    { key: 'admin',     label: 'Underwriter Console', badge: 'Admin',  icon: Settings2,       showAlways: false, requireAdmin: true },
  ];

  const visibleTabs = allTabs.filter(tab => {
    if (tab.requireAdmin) return isAdmin;
    if (tab.adminHide && isAdmin) return false;
    if (tab.requireAuth) return !!user;
    return tab.showAlways;
  });

  const handleSelectTab = (key) => {
    setActiveTab(key);
    if (setMobileOpen) setMobileOpen(false);
  };

  const content = (
    <div className="flex flex-col h-full select-none">
      
      {/* ── Brand Logo Header ── */}
      <div className={`flex items-center justify-between border-b border-[var(--cn-border)] px-4 h-16 ${collapsed ? 'justify-center px-2' : ''}`}>
        <div
          onClick={() => handleSelectTab('assess')}
          className="flex items-center gap-3 cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSelectTab('assess'); }}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--cn-primary)] to-[var(--cn-accent-secondary)] flex items-center justify-center text-white shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.2} />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight">
                  <span className="cn-brand-cred">Cred</span>
                  <span className="cn-brand-nexa">Nexa</span>
                </span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[var(--cn-surface-muted)] text-[var(--cn-primary)] border border-[var(--cn-border)]">
                  v1.0
                </span>
              </div>
              <span className="text-[10px] text-[var(--cn-text-subtle)] truncate">
                Credit Intelligence Platform
              </span>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        {setMobileOpen && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
            className="md:hidden p-1.5 rounded-lg text-[var(--cn-text-muted)] hover:text-[var(--cn-text-main)] hover:bg-[var(--cn-surface-elevated)]"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Navigation Items ── */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        {!collapsed && (
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--cn-text-subtle)]">
            Navigation
          </div>
        )}

        {visibleTabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleSelectTab(tab.key)}
              title={collapsed ? tab.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer text-left relative group ${
                isActive
                  ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border border-[var(--cn-primary)]/20 shadow-xs'
                  : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-main)] hover:bg-[var(--cn-surface-elevated)] border border-transparent'
              } ${collapsed ? 'justify-center px-2' : ''}`}
            >
              {/* Active accent pill indicator */}
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[var(--cn-primary)]" />
              )}
              <tab.icon className={`w-4 h-4 flex-shrink-0 transition-colors ${
                isActive ? 'text-[var(--cn-primary)]' : 'text-[var(--cn-text-subtle)] group-hover:text-[var(--cn-text-main)]'
              }`} strokeWidth={1.8} />

              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate">{tab.label}</span>
                  {tab.badge && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                      tab.badge === 'Admin'
                        ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25'
                        : 'bg-[var(--cn-surface-muted)] text-[var(--cn-text-subtle)]'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── System Status & Model Card ── */}
      {!collapsed && (
        <div className="p-3 mx-3 mb-3 rounded-xl bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)] space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--cn-text-muted)] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[var(--cn-primary)]" />
              <span>Inference Pipeline</span>
            </span>
            <span className="font-mono text-[10px] text-[var(--cn-primary)] font-semibold">
              Ready
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[var(--cn-text-subtle)] pt-1 border-t border-[var(--cn-border)]">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${backendStatus === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>{backendStatus === 'healthy' ? 'Cloud API Connected' : 'Local Fallback'}</span>
            </span>
            <span className="font-mono">99.8%</span>
          </div>
        </div>
      )}

      {/* ── Collapse Toggle Bar (Desktop only) ── */}
      <div className="hidden md:flex items-center justify-between border-t border-[var(--cn-border)] p-3">
        {!collapsed && (
          <span className="text-[11px] text-[var(--cn-text-subtle)] font-mono">
            CredNexa &copy; 2026
          </span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-lg text-[var(--cn-text-muted)] hover:text-[var(--cn-text-main)] hover:bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)] ml-auto cursor-pointer transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block fixed top-0 bottom-0 left-0 z-40 transition-all duration-200 cn-glass-sidebar ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {content}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-[var(--cn-modal-overlay)] backdrop-blur-sm animate-fadeIn"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`md:hidden fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] bg-[var(--cn-surface-solid)] border-r border-[var(--cn-border)] shadow-2xl transition-transform duration-200 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {content}
      </aside>
    </>
  );
}
