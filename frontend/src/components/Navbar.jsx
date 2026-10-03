import React, { useState } from 'react';
import {
  ShieldCheck, FileSpreadsheet, LayoutDashboard, History,
  Activity, LogOut, LogIn, User, Shield, Menu, X
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, backendStatus, user, onOpenAuth, onLogout }) {
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

  const TabButton = ({ tab, mobile = false }) => (
    <button
      onClick={() => {
        setActiveTab(tab.key);
        setMobileOpen(false);
        if (tab.key === 'history') {} // triggers reload via parent
      }}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
        mobile ? 'w-full' : ''
      } ${
        activeTab === tab.key
          ? tab.requireAdmin
            ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
            : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
      }`}
    >
      <tab.icon className="w-4 h-4 flex-shrink-0" />
      <span className={mobile ? '' : 'hidden sm:inline'}>{tab.label}</span>
      {tab.requireAdmin && (
        <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 leading-none">
          ADMIN
        </span>
      )}
    </button>
  );

  const initials = user?.full_name
    ? user.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0] || 'U').toUpperCase();

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

        {/* Brand */}
        <div
          className="flex items-center gap-2.5 cursor-pointer flex-shrink-0"
          onClick={() => setActiveTab('assess')}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-sky-400">
              CredNexa
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700">
              ML v1.0
            </span>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {visibleTabs.map(tab => <TabButton key={tab.key} tab={tab} />)}
        </nav>

        {/* Right: Status + Auth */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* API Status */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 px-2.5 py-1.5 rounded-full text-xs font-mono">
            <Activity className={`w-3 h-3 ${backendStatus === 'healthy' ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
            <span className="text-slate-300">{backendStatus === 'healthy' ? 'API Online' : 'Offline'}</span>
          </div>

          {/* User pill / Sign-in */}
          {user ? (
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 pl-1.5 pr-2.5 py-1 rounded-full">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white ${
                isAdmin ? 'bg-gradient-to-tr from-indigo-500 to-purple-600' : 'bg-gradient-to-tr from-sky-500 to-indigo-500'
              }`}>
                {initials}
              </div>
              <div className="flex flex-col leading-none text-left">
                <span className="text-[11px] font-semibold text-slate-100 max-w-[90px] truncate">{user.full_name || user.email}</span>
                <span className={`text-[9px] font-bold uppercase ${isAdmin ? 'text-indigo-400' : 'text-sky-400'}`}>
                  {isAdmin ? '⚡ Admin' : 'User'}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Sign Out"
                className="ml-0.5 text-slate-400 hover:text-rose-400 p-1 rounded-full hover:bg-slate-700 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900/95 backdrop-blur px-4 py-3 space-y-1">
          {visibleTabs.map(tab => <TabButton key={tab.key} tab={tab} mobile />)}
        </div>
      )}
    </header>
  );
}
