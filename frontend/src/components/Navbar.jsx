import React from 'react';
import { ShieldCheck, FileSpreadsheet, LayoutDashboard, History, Activity, User, LogOut, LogIn } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, backendStatus, user, onOpenAuth, onLogout }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('assess')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-sky-400">
              CredNexa
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700">
              ML v1.0
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => setActiveTab('assess')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'assess'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Assessment</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'admin'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Admin Metrics</span>
          </button>
        </nav>

        {/* User Auth & Backend Status Badge */}
        <div className="flex items-center space-x-3">
          
          <div className="hidden md:flex items-center space-x-2 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-full text-xs font-mono">
            <Activity className={`w-3.5 h-3.5 ${backendStatus === 'healthy' ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
            <span className="text-slate-300 capitalize">{backendStatus === 'healthy' ? 'API Online' : 'Standalone'}</span>
          </div>

          {user ? (
            <div className="flex items-center space-x-2 bg-slate-800/90 border border-slate-700/80 pl-2 pr-3 py-1 rounded-full text-xs text-slate-200">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 text-white flex items-center justify-center font-bold text-[10px]">
                {user.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col text-left leading-none">
                <span className="font-semibold text-slate-100 max-w-[100px] truncate">{user.full_name || user.email}</span>
                <span className="text-[9px] uppercase font-bold text-sky-400">{user.role || 'user'}</span>
              </div>
              <button
                onClick={onLogout}
                title="Sign Out"
                className="ml-1 text-slate-400 hover:text-rose-400 p-1 rounded-full hover:bg-slate-700 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold transition"
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
