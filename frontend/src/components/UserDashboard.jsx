import React, { useState, useMemo } from 'react';
import {
  User, TrendingUp, TrendingDown, FileText, CheckCircle2,
  XCircle, Clock, ChevronRight, BarChart3, Target, Award, Calendar
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = 'sky' }) {
  const colors = {
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  };
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl border ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-white font-mono">{value}</div>
        <div className="text-xs text-slate-400 mt-0.5">{label}</div>
        {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function UserDashboard({ user, applications, onSelectApp }) {
  const [filter, setFilter] = useState('all');

  const stats = useMemo(() => {
    const total = applications.length;
    const approved = applications.filter(a => (a.decision || a.predicted_decision) === 'Approved').length;
    const rejected = total - approved;
    const avgProb = total > 0
      ? (applications.reduce((s, a) => s + (a.probability ?? a.predicted_prob ?? 0), 0) / total * 100).toFixed(1)
      : '—';
    return { total, approved, rejected, avgProb };
  }, [applications]);

  const filtered = useMemo(() => {
    if (filter === 'approved') return applications.filter(a => (a.decision || a.predicted_decision) === 'Approved');
    if (filter === 'rejected') return applications.filter(a => (a.decision || a.predicted_decision) === 'Rejected');
    return applications;
  }, [applications, filter]);

  const initials = user?.full_name
    ? user.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0] || 'U').toUpperCase();

  return (
    <div className="space-y-6">

      {/* Profile Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/30 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-sky-500/20">
            {initials}
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white truncate">{user?.full_name || 'CredNexa User'}</h2>
          <p className="text-sm text-slate-400 mt-0.5 truncate">{user?.email}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/30">
              {user?.role || 'user'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
              ID: {user?.id?.slice(0, 8)}...
            </span>
          </div>
        </div>
        <div className="flex-shrink-0 text-right hidden sm:block">
          <div className="text-xs text-slate-500 font-mono">Member since</div>
          <div className="text-sm text-slate-300 font-semibold mt-0.5">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' }) : '—'}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Assessments" value={stats.total} color="sky" />
        <StatCard icon={CheckCircle2} label="Approved" value={stats.approved} sub={stats.total ? `${((stats.approved/stats.total)*100).toFixed(0)}% approval rate` : ''} color="emerald" />
        <StatCard icon={XCircle} label="Rejected" value={stats.rejected} color="rose" />
        <StatCard icon={Target} label="Avg Probability" value={stats.avgProb !== '—' ? `${stats.avgProb}%` : '—'} sub="Across all assessments" color="indigo" />
      </div>

      {/* Assessment History */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <h3 className="text-base font-bold text-white">Your Assessment History</h3>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {applications.length} records
            </span>
          </div>
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-800/60 rounded-xl p-1">
            {[['all', 'All'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  filter === key
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-slate-400 text-sm font-medium">No assessments found</p>
            <p className="text-slate-500 text-xs mt-1">Submit a loan assessment to see your history here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filtered.map((app, idx) => {
              const decision = app.decision || app.predicted_decision || 'Unknown';
              const prob = app.probability ?? app.predicted_prob ?? 0;
              const isApproved = decision === 'Approved';
              const income = app.ApplicantIncome || app.applicant_income || 0;
              const loan = app.LoanAmount || app.loan_amount || 0;
              const date = app.created_at ? new Date(app.created_at) : null;

              return (
                <button
                  key={app.id || idx}
                  onClick={() => onSelectApp && onSelectApp(app)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-slate-800/40 transition text-left group"
                >
                  {/* Decision icon */}
                  <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                    isApproved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {isApproved ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-100 text-sm truncate">
                        {app.applicant_name || 'Applicant'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isApproved
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {decision}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 font-mono">
                      Income: ₹{income.toLocaleString('en-IN')} · Loan: ₹{loan.toLocaleString('en-IN')}L
                    </div>
                  </div>

                  {/* Probability */}
                  <div className="flex-shrink-0 text-right hidden sm:block">
                    <div className={`text-lg font-bold font-mono ${isApproved ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {(prob * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">probability</div>
                  </div>

                  {/* Date */}
                  <div className="flex-shrink-0 text-right hidden md:block">
                    <div className="text-xs text-slate-400 font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {date ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Probability Distribution Visual */}
      {applications.length > 0 && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Approval Probability Distribution</h3>
          </div>
          <div className="space-y-2">
            {applications.slice(0, 8).map((app, idx) => {
              const prob = app.probability ?? app.predicted_prob ?? 0;
              const decision = app.decision || app.predicted_decision || 'Unknown';
              const isApproved = decision === 'Approved';
              return (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-slate-400 truncate font-mono">{(app.applicant_name || 'App').split(' ')[0]}</div>
                  <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isApproved ? 'bg-gradient-to-r from-emerald-500 to-sky-500' : 'bg-gradient-to-r from-rose-600 to-amber-500'}`}
                      style={{ width: `${Math.min(prob * 100, 100)}%` }}
                    />
                  </div>
                  <div className={`w-10 text-xs font-bold font-mono text-right ${isApproved ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(prob * 100).toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
