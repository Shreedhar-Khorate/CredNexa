import React, { useState } from 'react';
import {
  ShieldCheck, FileSpreadsheet, History,
  LogOut, LogIn, User, Shield, Menu, X, Sun, Moon
} from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  backendStatus,
  user,
  theme = 'dark',
  onToggleTheme,
  onOpenAuth,
  onLogout
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  const allTabs = [
    { key: 'assess',    label: 'Assessment',    icon: FileSpreadsheet, showAlways: true },
    { key: 'history',   label: 'History',       icon: History,         showAlways: true },
    { key: 'dashboard', label: 'My Dashboard',  icon: User,            showAlways: false, requireAuth: true, adminHide: true },
    { key: 'admin',     label: 'Admin Panel',   icon: Shield,          showAlways: false, requireAdmin: true },
  ];

  const visibleTabs = allTabs.filter(tab => {
    if (tab.requireAdmin) return isAdmin;
    if (tab.adminHide && isAdmin) return false;
    if (tab.requireAuth) return !!user;
    return tab.showAlways;
  });

  const initials = user?.full_name
    ? user.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0] || 'U').toUpperCase();

  const handleTabClick = (tabKey) => {
    setActiveTab(tabKey);
    setMobileOpen(false);
  };

  const getStatusText = () => {
    if (backendStatus === 'healthy') return 'API Online';
    if (backendStatus === 'checking') return 'Connecting...';
    return 'API Offline';
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--cn-border)] bg-[var(--cn-nav-bg)] backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

        {/* ── LEFT: Brand & ML Badge ── */}
        <div
          className="flex items-center gap-2.5 cursor-pointer flex-shrink-0 group select-none"
          onClick={() => handleTabClick('assess')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTabClick('assess'); }}
          aria-label="CredNexa Home"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0284c7] to-[#4f46e5] flex items-center justify-center shadow-md shadow-[#0284c7]/20 group-hover:scale-105 transition-transform duration-150">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight">
              <span className="cn-brand-cred">Cred</span>
              <span className="cn-brand-nexa">Nexa</span>
            </span>
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[var(--cn-surface-elevated)] text-[var(--cn-accent)] border border-[var(--cn-border)] shadow-xs">
              ML v1.0
            </span>
          </div>
        </div>

        {/* ── CENTER: Desktop Navigation Tabs ── */}
        <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
          {visibleTabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? tab.requireAdmin
                      ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-xs'
                      : 'bg-sky-500/15 text-sky-500 dark:text-sky-400 border border-sky-500/30 shadow-xs'
                    : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-main)] hover:bg-[var(--cn-surface-elevated)] border border-transparent'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <tab.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? (tab.requireAdmin ? 'text-indigo-400' : 'text-sky-500 dark:text-sky-400') : 'text-[var(--cn-text-subtle)]'}`} />
                <span>{tab.label}</span>
                {tab.requireAdmin && (
                  <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase leading-none">
                    Admin
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── RIGHT: API Status, Theme Toggle, Auth / User Profile ── */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">

          {/* API Status Pill (hidden on very small mobile) */}
          <div
            className="hidden sm:flex items-center gap-2 bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)] px-2.5 py-1 rounded-full text-xs font-mono select-none"
            title={`CredNexa Inference & DB API: ${getStatusText()}`}
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
                  : 'bg-rose-500'
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
            className="w-8.5 h-8.5 rounded-xl flex items-center justify-center bg-[var(--cn-surface-elevated)] hover:bg-[var(--cn-surface-muted)] text-[var(--cn-text-muted)] hover:text-[var(--cn-text-main)] border border-[var(--cn-border)] transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-sky-600 transition-transform duration-200 hover:-rotate-12" />
            )}
          </button>

          {/* User Profile or Sign-In Button */}
          {user ? (
            <div className="flex items-center gap-2 bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)] pl-1.5 pr-2.5 py-1 rounded-full shadow-xs">
              <div
                className={`w-6.5 h-6.5 rounded-full flex items-center justify-center font-bold text-[10px] text-white select-none ${
                  isAdmin
                    ? 'bg-gradient-to-tr from-indigo-500 to-purple-600'
                    : 'bg-gradient-to-tr from-sky-500 to-indigo-500'
                }`}
              >
                {initials}
              </div>
              <div className="hidden sm:flex flex-col leading-tight text-left">
                <span className="text-[11px] font-semibold text-[var(--cn-text-main)] max-w-[110px] truncate">
                  {user.full_name || user.email}
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${
                  isAdmin ? 'text-indigo-400' : 'text-sky-500 dark:text-sky-400'
                }`}>
                  {isAdmin ? '⚡ Admin' : 'Applicant'}
                </span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                title="Sign Out"
                aria-label="Sign Out"
                className="text-[var(--cn-text-subtle)] hover:text-rose-500 p-1 rounded-full hover:bg-[var(--cn-surface-muted)] transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="cn-btn cn-btn-primary py-1.5 px-3 rounded-full text-xs shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            className="md:hidden p-1.5 rounded-xl text-[var(--cn-text-muted)] hover:text-[var(--cn-text-main)] bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)] transition cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Navigation Dropdown ── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--cn-border)] bg-[var(--cn-surface)] px-4 py-3 space-y-2 shadow-lg animate-fadeIn">
          <div className="space-y-1">
            {visibleTabs.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabClick(tab.key)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition cursor-pointer ${
                    isActive
                      ? tab.requireAdmin
                        ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                        : 'bg-sky-500/15 text-sky-500 dark:text-sky-400 border border-sky-500/30'
                      : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-main)] hover:bg-[var(--cn-surface-elevated)]'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="flex items-center gap-2.5">
                    <tab.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{tab.label}</span>
                  </div>
                  {tab.requireAdmin && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase leading-none">
                      Admin
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile Status Row */}
          <div className="pt-2 border-t border-[var(--cn-border)] flex items-center justify-between text-xs text-[var(--cn-text-muted)]">
            <div className="flex items-center gap-2">
              <span className={`inline-flex rounded-full h-2 w-2 ${
                backendStatus === 'healthy' ? 'bg-emerald-500' : 'bg-rose-500'
              }`}></span>
              <span>{getStatusText()}</span>
            </div>
            <span className="font-mono text-[10px] text-sky-500 dark:text-sky-400 bg-[var(--cn-surface-elevated)] px-2 py-0.5 rounded-full border border-[var(--cn-border)]">
              CredNexa ML v1.0
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
