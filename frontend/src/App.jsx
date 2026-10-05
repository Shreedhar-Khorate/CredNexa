import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
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
    <div className="min-h-screen bg-[var(--cn-canvas)] text-[var(--cn-text-main)] flex flex-col transition-colors duration-200 selection:bg-sky-500 selection:text-white">
      
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        backendStatus={backendStatus}
        user={user}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Guest Banner ── */}
        {!user && (
          <div className="cn-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-sky-500/30 bg-gradient-to-r from-sky-500/10 via-transparent to-indigo-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/25">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-[var(--cn-text-main)] text-sm">Guest Mode Active</div>
                <div className="text-[var(--cn-text-muted)]">Sign in to save evaluations and access your personal dashboard.</div>
              </div>
            </div>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="cn-btn cn-btn-primary flex-shrink-0"
            >
              Sign In / Register
            </button>
          </div>
        )}

        {/* ── Authenticated Banner ── */}
        {user && (
          <div className={`cn-card p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
            isAdmin
              ? 'border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 to-transparent'
              : 'border-sky-500/30 bg-gradient-to-r from-sky-500/10 to-transparent'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border ${
                isAdmin
                  ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25'
                  : 'bg-sky-500/15 text-sky-400 border-sky-500/25'
              }`}>
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-[var(--cn-text-main)] text-sm">
                  {isAdmin ? 'Admin Session Active' : 'Authenticated Session'}
                </div>
                <div className="text-[var(--cn-text-muted)]">
                  Signed in as{' '}
                  <span className={`font-semibold ${isAdmin ? 'text-indigo-400' : 'text-sky-500'}`}>
                    {user.full_name || user.email}
                  </span>
                  {' '}— assessments are linked to your Supabase profile.
                </div>
              </div>
            </div>
            {isAdmin && (
              <span className="px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-bold text-[11px] flex-shrink-0">
                ⚡ ADMIN PRIVILEGES ACTIVE
              </span>
            )}
          </div>
        )}

        {/* ────────────────────────────────────────────────
            TAB: Assessment (all users)
        ──────────────────────────────────────────────── */}
        {activeTab === 'assess' && (
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="cn-eyebrow">Credit Risk Intelligence</span>
              <h1 className="text-3xl font-extrabold tracking-tight text-[var(--cn-text-main)] sm:text-4xl">
                Automated Loan Risk Screening
              </h1>
              <p className="text-sm text-[var(--cn-text-muted)]">
                AI-powered decision support using the CredNexa calibrated machine learning pipeline (<code className="text-sky-500 font-mono">v1.0</code>).
              </p>
            </div>

            <LoanForm onSubmit={handleFormSubmit} loading={loading} />

            {result && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="cn-eyebrow">Risk Assessment Output</span>
                    <h2 className="text-xl font-bold text-[var(--cn-text-main)] flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-sky-500" />
                      <span>Evaluation Report — {result.applicant_name}</span>
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
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="cn-eyebrow">Historical Risk Ledger</span>
              <h1 className="text-2xl font-bold text-[var(--cn-text-main)]">Assessment History</h1>
              <p className="text-xs text-[var(--cn-text-muted)]">
                {user
                  ? isAdmin
                    ? 'All historical assessments across all users stored in Supabase Cloud DB.'
                    : 'Your personal assessment history and audit records from Supabase.'
                  : 'Sign in to access and persist your saved evaluation history.'}
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
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="cn-eyebrow">Applicant Intelligence</span>
              <h1 className="text-2xl font-bold text-[var(--cn-text-main)]">My Personal Dashboard</h1>
              <p className="text-xs text-[var(--cn-text-muted)]">
                Personal assessment statistics, evaluations history, and profile linked to your Supabase account.
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
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="cn-eyebrow">Underwriting Operations</span>
              <h1 className="text-2xl font-bold text-[var(--cn-text-main)]">Admin Control Panel</h1>
              <p className="text-xs text-[var(--cn-text-muted)]">
                Model monitoring, underwriter queue review, user management, and security audit trail.
              </p>
            </div>
            <AdminDashboard user={user} onRefreshParent={reloadHistory} />
          </div>
        )}

        {/* ── Access denied guard ── */}
        {activeTab === 'admin' && !isAdmin && (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-rose-400" />
            </div>
            <h2 className="text-xl font-bold text-[var(--cn-text-main)]">Access Restricted</h2>
            <p className="text-[var(--cn-text-muted)] text-sm max-w-sm mx-auto">
              Admin privileges required to view this section. Please sign in with an admin account.
            </p>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="cn-btn cn-btn-primary"
            >
              Sign In as Admin
            </button>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--cn-border)] bg-[var(--cn-surface)] py-6 text-xs text-[var(--cn-text-subtle)] font-mono transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-500" />
            <span className="text-[var(--cn-text-muted)] font-sans font-medium">CredNexa &copy; {new Date().getFullYear()} CredNexa Platform</span>
          </div>
          <div className="flex items-center gap-4 text-[var(--cn-text-muted)] font-sans">
            <span className="hover:text-[var(--cn-text-main)] transition cursor-pointer">Privacy Policy</span>
            <span>·</span>
            <span className="hover:text-[var(--cn-text-main)] transition cursor-pointer">Terms of Service</span>
            <span>·</span>
            <span className="hover:text-[var(--cn-text-main)] transition cursor-pointer">Risk Compliance</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
