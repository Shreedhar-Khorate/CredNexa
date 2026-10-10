import React from 'react';
import { Menu, Sun, Moon, LogIn, LogOut } from 'lucide-react';

export default function Navbar({
  activeTab,
  backendStatus,
  user,
  theme = 'dark',
  onToggleTheme,
  onOpenAuth,
  onLogout,
  onOpenMobileSidebar
}) {
  const isAdmin = user?.role === 'admin';

  const tabContextMeta = {
    assess: {
      title: 'Credit Risk Assessment',
      subtitle: 'Calibrated loan eligibility screening & explainability workspace',
    },
    history: {
      title: 'Historical Audit Ledger',
      subtitle: 'Repository of automated evaluations & underwriting decisions',
    },
    dashboard: {
      title: 'Applicant Portfolio',
      subtitle: 'Personal credit evaluations & profile management',
    },
    admin: {
      title: 'Underwriter Operations Center',
      subtitle: 'Portfolio monitoring, queue triage & model performance',
    },
  };

  const currentMeta = tabContextMeta[activeTab] || tabContextMeta.assess;

  const initials = user?.full_name
    ? user.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0] || 'U').toUpperCase();

  const getStatusText = () => {
    if (backendStatus === 'healthy') return 'Cloud API Online';
    if (backendStatus === 'checking') return 'Connecting...';
    return 'Local Fallback';
  };

  return (
    <header className="sticky top-0 z-30 cn-glass-nav transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

        {/* ── Left: Mobile Sidebar Trigger + Contextual Page Title ── */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            aria-label="Open navigation menu"
            className="md:hidden p-2 rounded-xl text-[var(--cn-text-muted)] hover:text-[var(--cn-text-main)] bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)] cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex flex-col min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-[var(--cn-text-main)] truncate tracking-tight flex items-center gap-2">
              <span>{currentMeta.title}</span>
              {activeTab === 'admin' && (
                <span className="hidden sm:inline-flex px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 uppercase">
                  Privileged
                </span>
              )}
            </h1>
            <p className="hidden md:block text-[11px] text-[var(--cn-text-muted)] truncate">
              {currentMeta.subtitle}
            </p>
          </div>
        </div>

        {/* ── Right: Live Health Indicator, Theme Switcher & Auth Pill ── */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">

          {/* API Status Pill */}
          <div
            className="hidden sm:flex items-center gap-2 bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)] px-2.5 py-1 rounded-full text-xs font-mono select-none"
            title={`CredNexa Engine: ${getStatusText()}`}
          >
            <span className="relative flex h-2 w-2">
              {backendStatus === 'healthy' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                backendStatus === 'healthy'
                  ? 'bg-emerald-500'
                  : backendStatus === 'checking'
                  ? 'bg-amber-400'
                  : 'bg-amber-500'
              }`}></span>
            </span>
            <span className="text-[var(--cn-text-muted)] font-medium text-[11px]">{getStatusText()}</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--cn-surface-elevated)] hover:bg-[var(--cn-surface-muted)] text-[var(--cn-text-muted)] hover:text-[var(--cn-text-main)] border border-[var(--cn-border)] transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-[var(--cn-primary)] transition-transform duration-200 hover:-rotate-12" />
            )}
          </button>

          {/* User Profile Pill or Sign-In Button */}
          {user ? (
            <div className="flex items-center gap-2 bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)] pl-1.5 pr-2 py-1 rounded-full shadow-xs">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] text-white select-none ${
                  isAdmin
                    ? 'bg-gradient-to-tr from-indigo-500 to-purple-600'
                    : 'bg-gradient-to-tr from-[var(--cn-primary)] to-[var(--cn-accent-secondary)]'
                }`}
              >
                {initials}
              </div>
              <div className="hidden sm:flex flex-col leading-tight text-left">
                <span className="text-[11px] font-semibold text-[var(--cn-text-main)] max-w-[120px] truncate">
                  {user.full_name || user.email}
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${
                  isAdmin ? 'text-indigo-400' : 'text-[var(--cn-primary)]'
                }`}>
                  {isAdmin ? 'Underwriter' : 'Applicant'}
                </span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                title="Sign Out"
                aria-label="Sign Out"
                className="text-[var(--cn-text-subtle)] hover:text-rose-500 p-1 rounded-full hover:bg-[var(--cn-surface-muted)] transition-colors cursor-pointer ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="cn-btn cn-btn-primary py-1.5 px-3.5 rounded-xl text-xs font-semibold shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
