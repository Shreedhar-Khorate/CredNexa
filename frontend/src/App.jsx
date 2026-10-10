import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LoanForm from './components/LoanForm';
import ProbabilityGauge from './components/ProbabilityGauge';
import ExplainabilityCard from './components/ExplainabilityCard';
import SuggestionsCard from './components/SuggestionsCard';
import AiExplanationCard from './components/AiExplanationCard';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import HistoryTable from './components/HistoryTable';
import AuthModal from './components/AuthModal';
import {
  checkHealth, submitApplication, fetchApplications, getMe, logoutUser
} from './services/api';
import { ShieldCheck, Sparkles, RefreshCw, UserCheck, Lock } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab]         = useState('assess');
  const [backendStatus, setBackendStatus] = useState('checking');
  const [loading, setLoading]             = useState(false);
  const [result, setResult]               = useState(null);
  const [history, setHistory]             = useState([]);
  const [user, setUser]                   = useState(null);
  const [isAuthOpen, setIsAuthOpen]       = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Theme state: dark mode by default, persisted in localStorage
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('crednexa_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('crednexa_theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    async function init() {
      const health = await checkHealth();
      setBackendStatus(health.status);

      const me = await getMe();
      if (me) {
        setUser(me);
      } else {
        const stored = localStorage.getItem('crednexa_user');
        if (stored) {
          try { setUser(JSON.parse(stored)); } catch {}
        }
      }

      const pastApps = await fetchApplications();
      setHistory(pastApps);
    }
    init();
  }, []);

  // When role changes, navigate to the correct default landing tab
  useEffect(() => {
    if (!user) {
      setActiveTab('assess');
    }
  }, [user]);

  const reloadHistory = async () => {
    const pastApps = await fetchApplications();
    setHistory(pastApps);
  };

  const handleFormSubmit = async (payload) => {
    setLoading(true);
    const res = await submitApplication(payload);
    setResult(res);
    await reloadHistory();
    setLoading(false);
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setActiveTab('assess');
    setResult(null);
    reloadHistory();
  };

  const handleAuthSuccess = async (authUser) => {
    setUser(authUser);
    await reloadHistory();
    // Route to the appropriate dashboard after login
    if (authUser?.role === 'admin') {
      setActiveTab('admin');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'history') reloadHistory();
  };

  return (
    <div
      className="min-h-screen bg-[var(--cn-canvas)] text-[var(--cn-text-main)] flex flex-col relative cn-ambient-canvas transition-colors duration-200"
      style={{ backgroundImage: 'var(--cn-canvas-bg)', backgroundAttachment: 'fixed' }}
    >
      
      {/* ── Soft Ambient Radial Glows (Floating atmospheric depth) ── */}
      <div className="cn-ambient-blob cn-ambient-blob-1 animate-ambientPulse" />
      <div className="cn-ambient-blob cn-ambient-blob-2 animate-ambientPulse" style={{ animationDelay: '-4s' }} />

      {/* ── Desktop & Mobile Navigation Sidebar ── */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        user={user}
        backendStatus={backendStatus}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* ── Main Layout Wrapper (Responsive padding for sidebar) ── */}
      <div className={`flex-1 flex flex-col transition-all duration-200 relative z-10 ${
        sidebarCollapsed ? 'md:pl-16' : 'md:pl-60'
      }`}>
        
        {/* Floating Blurred Top Navigation Bar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          backendStatus={backendStatus}
          user={user}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        {/* Auth Modal */}
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />

        {/* Main Workspace Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-7">

          {/* ── Guest Banner (Frosted Glass Surface) ── */}
          {!user && (
            <div className="cn-card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs border-[var(--cn-primary)]/20 bg-[var(--cn-surface-elevated)] backdrop-blur-xl shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex-shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[var(--cn-text-main)] text-sm tracking-tight">Guest Assessment Mode</div>
                  <div className="text-[var(--cn-text-muted)] text-xs mt-0.5 leading-relaxed">
                    Sign in with demo credentials or register to sync evaluations to Supabase cloud storage.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsAuthOpen(true)}
                className="cn-btn cn-btn-primary flex-shrink-0 text-xs py-2 px-4 shadow-sm"
              >
                Sign In / Register
              </button>
            </div>
          )}

          {/* ── Authenticated Banner ── */}
          {user && (
            <div className={`cn-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
              isAdmin
                ? 'border-indigo-500/25 bg-[var(--cn-surface-elevated)]'
                : 'border-[var(--cn-primary)]/25 bg-[var(--cn-surface-elevated)]'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border flex-shrink-0 ${
                  isAdmin
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    : 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border-[var(--cn-primary)]/20'
                }`}>
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[var(--cn-text-main)] text-sm tracking-tight">
                    {isAdmin ? 'Underwriter Console Active' : 'Verified Applicant Session'}
                  </div>
                  <div className="text-[var(--cn-text-muted)] text-xs mt-0.5">
                    Operating as{' '}
                    <span className={`font-semibold ${isAdmin ? 'text-indigo-400' : 'text-[var(--cn-primary)]'}`}>
                      {user.full_name || user.email}
                    </span>
                    {' '}— audit trail actively recorded.
                  </div>
                </div>
              </div>
              {isAdmin && (
                <span className="px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-bold text-[10px] tracking-wide flex-shrink-0 uppercase">
                  ⚡ Underwriter Authority
                </span>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────
              TAB: Assessment (all users)
          ──────────────────────────────────────────────── */}
          {activeTab === 'assess' && (
            <div className="space-y-7">
              {/* ── Hero Section with Atmospheric Halo ── */}
              <div className="text-center max-w-2xl mx-auto space-y-2.5 py-3 relative">
                {/* Atmospheric halo element behind heading */}
                <div className="absolute inset-0 -top-4 -bottom-4 mx-auto w-3/4 bg-gradient-to-r from-[var(--cn-primary-tint)] via-[var(--cn-supporting-blue)]/10 to-[var(--cn-primary-tint)] rounded-full blur-2xl pointer-events-none -z-10 opacity-70" />
                
                <div>
                  <span className="cn-eyebrow px-3 py-1 rounded-full bg-[var(--cn-primary-tint)] border border-[var(--cn-primary)]/20 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--cn-primary)]" />
                    <span>Calibrated Credit Screening</span>
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[var(--cn-text-main)] drop-shadow-xs">
                  Automated Loan Underwriting
                </h2>
                <p className="text-xs sm:text-sm text-[var(--cn-text-muted)] leading-relaxed max-w-xl mx-auto">
                  Evaluate applicant parameters through the CredNexa calibrated ML pipeline (<span className="text-[var(--cn-primary)] font-mono font-semibold">v1.0</span>) with instant explainability and risk intelligence.
                </p>
              </div>

              <LoanForm onSubmit={handleFormSubmit} loading={loading} />

              {result && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="cn-eyebrow">Decision Dossier</span>
                      <h2 className="text-lg font-bold text-[var(--cn-text-main)] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[var(--cn-primary)]" />
                        <span>Credit Intelligence Output — {result.applicant_name}</span>
                      </h2>
                    </div>
                    <button
                      onClick={() => setResult(null)}
                      className="cn-btn cn-btn-secondary text-xs py-1.5 px-3 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Clear Report</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <ProbabilityGauge
                      probability={result.probability}
                      threshold={result.threshold}
                      decision={result.decision}
                      segment={result.segment}
                    />
                    <div className="lg:col-span-2 space-y-6">
                      <ExplainabilityCard topFactors={result.top_factors} />
                      <SuggestionsCard suggestions={result.suggestions} />
                      <AiExplanationCard assessment={result} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────
              TAB: History (all users)
          ──────────────────────────────────────────────── */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-1.5">
                <span className="cn-eyebrow">Audit & Compliance Ledger</span>
                <h2 className="text-2xl font-bold text-[var(--cn-text-main)]">Assessment History</h2>
                <p className="text-xs text-[var(--cn-text-muted)]">
                  {user
                    ? isAdmin
                      ? 'Enterprise assessment repository across all applicants stored in Supabase Cloud DB.'
                      : 'Your personal loan evaluations and underwriting audit logs.'
                    : 'Sign in to persist your evaluation records across browser sessions.'}
                </p>
              </div>
              <HistoryTable
                applications={history}
                onSelect={(row) => { setResult(row); setActiveTab('assess'); }}
                isAdmin={isAdmin}
                onReload={reloadHistory}
              />
            </div>
          )}

          {/* ────────────────────────────────────────────────
              TAB: User Dashboard (logged-in, non-admin)
          ──────────────────────────────────────────────── */}
          {activeTab === 'dashboard' && user && !isAdmin && (
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-1.5">
                <span className="cn-eyebrow">Applicant Portfolio</span>
                <h2 className="text-2xl font-bold text-[var(--cn-text-main)]">Personal Dashboard</h2>
                <p className="text-xs text-[var(--cn-text-muted)]">
                  Personal assessment analytics, credit risk metrics, and profile synchronized with Supabase.
                </p>
              </div>
              <UserDashboard
                user={user}
                applications={history}
                onSelectApp={(row) => { setResult(row); setActiveTab('assess'); }}
              />
            </div>
          )}

          {/* ────────────────────────────────────────────────
              TAB: Admin Panel (admin only)
          ──────────────────────────────────────────────── */}
          {activeTab === 'admin' && isAdmin && (
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-1.5">
                <span className="cn-eyebrow">Operations & Underwriting</span>
                <h2 className="text-2xl font-bold text-[var(--cn-text-main)]">Underwriter Control Center</h2>
                <p className="text-xs text-[var(--cn-text-muted)]">
                  Real-time underwriter review queue, model performance monitoring, and security audit log.
                </p>
              </div>
              <AdminDashboard user={user} onRefreshParent={reloadHistory} />
            </div>
          )}

          {/* ── Access Denied Guard ── */}
          {activeTab === 'admin' && !isAdmin && (
            <div className="text-center py-20 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7 text-rose-400" />
              </div>
              <h2 className="text-xl font-bold text-[var(--cn-text-main)]">Underwriter Access Required</h2>
              <p className="text-[var(--cn-text-muted)] text-xs max-w-sm mx-auto">
                Administrative privileges are required to inspect the underwriter queue and model metrics.
              </p>
              <button
                onClick={() => setIsAuthOpen(true)}
                className="cn-btn cn-btn-primary"
              >
                Sign In as Underwriter
              </button>
            </div>
          )}

        </main>

        {/* Footer */}
        <footer className="border-t border-[var(--cn-border)] bg-[var(--cn-surface)] py-5 text-center text-xs text-[var(--cn-text-subtle)] font-mono transition-colors duration-200 mt-auto">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--cn-primary)]" />
              <span className="text-[var(--cn-text-muted)] font-sans">CredNexa &bull; Calibrated Risk Intelligence &copy; 2026</span>
            </div>
            <p className="text-[var(--cn-text-subtle)] font-sans">
              Calibrated Machine Learning Underwriting Platform
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
}
