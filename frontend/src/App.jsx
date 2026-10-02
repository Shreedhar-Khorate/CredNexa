import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import LoanForm from './components/LoanForm';
import ProbabilityGauge from './components/ProbabilityGauge';
import ExplainabilityCard from './components/ExplainabilityCard';
import SuggestionsCard from './components/SuggestionsCard';
import AdminDashboard from './components/AdminDashboard';
import HistoryTable from './components/HistoryTable';
import { checkHealth, submitApplication, fetchApplications } from './services/api';
import { ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('assess'); // 'assess', 'history', 'admin'
  const [backendStatus, setBackendStatus] = useState('checking');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    async function init() {
      const health = await checkHealth();
      setBackendStatus(health.status);
      const pastApps = await fetchApplications();
      setHistory(pastApps);
    }
    init();
  }, []);

  const handleFormSubmit = async (payload) => {
    setLoading(true);
    const res = await submitApplication(payload);
    setResult(res);
    setHistory((prev) => [res, ...prev]);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Navigation Bar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} backendStatus={backendStatus} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
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
              <h1 className="text-2xl font-bold text-white">Assessment Audit History</h1>
              <p className="text-xs text-slate-400">
                Historical records of evaluated loan application decisions and probabilities.
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
                Leakage-free cross-validation statistics, holdout test metrics, and feature coefficients.
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
            <span>CredNexa ML System &copy; 2026</span>
          </div>
          <p>Educational decision-support demo. Not for real lending decisions.</p>
        </div>
      </footer>
    </div>
  );
}
