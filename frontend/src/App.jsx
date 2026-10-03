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
          try { setUser(JSON.parse(stored)); } catch (e) {}
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        backendStatus={backendStatus}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Main */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Guest Banner ── */}
        {!user && (
          <div className="bg-gradient-to-r from-sky-950/40 via-slate-900 to-indigo-950/40 border border-sky-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-white text-sm">Guest Mode Active</div>
                <div className="text-slate-400">Sign in to save evaluations and access your personal dashboard.</div>
              </div>
            </div>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold transition flex-shrink-0 shadow-md shadow-sky-500/20 text-sm"
            >
              Sign In / Register
            </button>
          </div>
        )}

        {/* ── Authenticated Banner ── */}
        {user && (
          <div className={`border rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
            isAdmin
              ? 'bg-indigo-950/30 border-indigo-500/20'
              : 'bg-slate-900/60 border-slate-800'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border ${
                isAdmin
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
              }`}>
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-white text-sm">
                  {isAdmin ? 'Admin Session Active' : 'Authenticated Session'}
                </div>
                <div className="text-slate-400">
                  Signed in as{' '}
                  <span className={`font-semibold ${isAdmin ? 'text-indigo-400' : 'text-sky-400'}`}>
                    {user.full_name || user.email}
                  </span>
                  {' '}— assessments are linked to your Supabase profile.
                </div>
              </div>
            </div>
            {isAdmin && (
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-bold text-[11px] flex-shrink-0">
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
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Automated Loan Risk Screening
              </h1>
              <p className="text-sm text-slate-400">
                Powered by CredNexa Calibrated ML Pipeline (<code className="text-sky-400 font-mono">v1.0</code>).
              </p>
            </div>

            <LoanForm onSubmit={handleFormSubmit} loading={loading} />

            {result && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-sky-400" />
                    Evaluation Report — {result.applicant_name}
                  </h2>
                  <button
                    onClick={() => setResult(null)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Clear
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
              <h1 className="text-2xl font-bold text-white">Assessment History</h1>
              <p className="text-xs text-slate-400">
                {user
                  ? isAdmin
                    ? 'All assessments across all users stored in Supabase.'
                    : 'Your personal assessment history from Supabase.'
                  : 'Sign in to see your saved assessments.'}
              </p>
            </div>
            <HistoryTable
              applications={history}
              onSelect={(row) => { setResult(row); setActiveTab('assess'); }}
            />
          </div>
        )}

        {/* ────────────────────────────────────────────────
            TAB: User Dashboard (logged-in, non-admin)
        ──────────────────────────────────────────────── */}
        {activeTab === 'dashboard' && user && !isAdmin && (
          <div className="space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h1 className="text-2xl font-bold text-white">My Dashboard</h1>
              <p className="text-xs text-slate-400">
                Personal assessment stats, history, and profile linked to your Supabase account.
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
              <h1 className="text-2xl font-bold text-white">Admin Control Panel</h1>
              <p className="text-xs text-slate-400">
                Model monitoring, user management, audit trail, and system analytics.
              </p>
            </div>
            <AdminDashboard user={user} />
          </div>
        )}

        {/* ── Access denied guard ── */}
        {activeTab === 'admin' && !isAdmin && (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-rose-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Access Restricted</h2>
            <p className="text-slate-400 text-sm max-w-sm mx-auto">
              Admin privileges required to view this section. Please sign in with an admin account.
            </p>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-sky-500/20"
            >
              Sign In as Admin
            </button>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-500" />
            <span>CredNexa ML + Supabase Cloud DB &copy; 2026</span>
          </div>
          <p>Educational decision-support demo. Not for real lending decisions.</p>
        </div>
      </footer>
    </div>
  );
}
