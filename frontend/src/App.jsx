import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import LoanForm from './components/LoanForm';
import ProbabilityGauge from './components/ProbabilityGauge';
import ExplainabilityCard from './components/ExplainabilityCard';
import SuggestionsCard from './components/SuggestionsCard';
import AiExplanationCard from './components/AiExplanationCard';
import AdminDashboard from './components/AdminDashboard';
import HistoryTable from './components/HistoryTable';
import AuthModal from './components/AuthModal';
import { checkHealth, submitApplication, fetchApplications, getMe, logoutUser } from './services/api';
import { ShieldCheck, Sparkles, RefreshCw, UserCheck, Lock } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('assess'); // 'assess', 'history', 'admin'
  const [backendStatus, setBackendStatus] = useState('checking');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    async function init() {
      // 1. Check Backend Health
      const health = await checkHealth();
      setBackendStatus(health.status);

      // 2. Validate current logged-in user from localStorage token
      const me = await getMe();
      if (me) {
        setUser(me);
      } else {
        // Check stored user fallback
        const stored = localStorage.getItem('crednexa_user');
        if (stored) {
          try { setUser(JSON.parse(stored)); } catch (e) {}
        }
      }

      // 3. Load Persistent Applications from SQLite Database
      const pastApps = await fetchApplications();
      setHistory(pastApps);
    }
    init();
  }, []);

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
    reloadHistory();
  };

  const handleAuthSuccess = async (authUser) => {
    setUser(authUser);
    await reloadHistory();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'history') reloadHistory();
        }}
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

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* User Welcome Banner if logged in */}
        {user && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-white text-sm">Authenticated Session</div>
                <div className="text-slate-400">
                  Logged in as <span className="text-sky-400 font-semibold">{user.full_name || user.email}</span> ({user.role} role). All assessments are securely linked to your profile in the database.
                </div>
              </div>
            </div>
            {user.role === 'admin' && (
              <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-mono font-semibold flex-shrink-0">
                ⚡ Admin Privileges Active
              </span>
            )}
          </div>
        )}

        {/* Guest Banner Prompt */}
        {!user && (
          <div className="bg-gradient-to-r from-sky-950/40 via-slate-900 to-indigo-950/40 border border-sky-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-white text-sm">Guest Mode Active</div>
                <div className="text-slate-400">
                  Sign in or create an account to store evaluations permanently under your user profile.
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold transition flex-shrink-0 shadow-md shadow-sky-500/20"
            >
              Sign In / Register
            </button>
          </div>
        )}

        {/* Tab 1: Assessment Portal */}
        {activeTab === 'assess' && (
          <div className="space-y-8">
            
            {/* Top Intro Header */}
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Automated Loan Risk Screening
              </h1>
              <p className="text-sm text-slate-400">
                Powered by CredNexa Calibrated Machine Learning Pipeline (<code className="text-sky-400 font-mono">v1.0</code>).
              </p>
            </div>

            {/* Assessment Input Form */}
            <LoanForm onSubmit={handleFormSubmit} loading={loading} />

            {/* Prediction Output Section */}
            {result && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-sky-400" />
                    <span>Evaluation Report for {result.applicant_name}</span>
                  </h2>
                  <button
                    onClick={() => setResult(null)}
                    className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Clear Report</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Probability & Decision Gauge */}
                  <ProbabilityGauge
                    probability={result.probability}
                    threshold={result.threshold}
                    decision={result.decision}
                    segment={result.segment}
                  />

                  {/* Explainability Feature Contributions */}
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

        {/* Tab 2: History Log */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h1 className="text-2xl font-bold text-white">Assessment Database History</h1>
              <p className="text-xs text-slate-400">
                Persistent database records of evaluated loan application decisions, user profiles, and probabilities.
              </p>
            </div>
            <HistoryTable applications={history} onSelect={(row) => { setResult(row); setActiveTab('assess'); }} />
          </div>
        )}

        {/* Tab 3: Admin Metrics Dashboard */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h1 className="text-2xl font-bold text-white">Admin Model Monitoring & Metrics</h1>
              <p className="text-xs text-slate-400">
                Leakage-free cross-validation statistics, holdout test metrics, feature coefficients, and user management.
              </p>
            </div>
            <AdminDashboard />
          </div>
        )}

      </main>

      {/* Educational Disclaimer Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-sky-500" />
            <span>CredNexa ML & Persistent DB System &copy; 2026</span>
          </div>
          <p>Educational decision-support demo. Not for real lending decisions.</p>
        </div>
      </footer>
    </div>
  );
}
