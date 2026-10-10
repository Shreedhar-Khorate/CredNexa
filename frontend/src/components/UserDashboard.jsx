import React, { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, FileText, CheckCircle2,
  XCircle, ChevronRight, BarChart3, Target, Award, Calendar, ShieldCheck
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = 'teal' }) {
  const colors = {
    teal:    'text-[var(--cn-primary)] bg-[var(--cn-primary-tint)] border-[var(--cn-primary)]/20',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    rose:    'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
    amber:   'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    blue:    'text-[var(--cn-accent-secondary)] bg-[var(--cn-surface-muted)] border-[var(--cn-border)]',
  };

  return (
    <div className="cn-card p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl border flex-shrink-0 ${colors[color] || colors.teal}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-[var(--cn-text-main)] font-mono tracking-tight">{value}</div>
        <div className="text-xs text-[var(--cn-text-muted)] mt-0.5 truncate">{label}</div>
        {sub && <div className="text-[10px] text-[var(--cn-text-subtle)] mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  );
}

export default function UserDashboard({ user, applications = [], onSelectApp }) {
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

      {/* ── Profile Summary Card ── */}
      <div className="cn-card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[var(--cn-primary)] to-[var(--cn-accent-secondary)] flex items-center justify-center text-white text-2xl font-bold shadow-sm">
            {initials}
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[var(--cn-surface-solid)] flex items-center justify-center">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[var(--cn-text-main)] truncate">{user?.full_name || 'CredNexa Borrower'}</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border border-[var(--cn-primary)]/20">
              Applicant Profile
            </span>
          </div>
          <p className="text-xs text-[var(--cn-text-muted)] mt-1 truncate">{user?.email}</p>
          <div className="flex flex-wrap gap-2 mt-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--cn-surface-elevated)] text-[var(--cn-text-subtle)] border border-[var(--cn-border)] font-mono">
              Account ID: {user?.id ? user.id.slice(0, 8) + '...' : 'Verified'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Supabase Cloud Sync</span>
            </span>
          </div>
        </div>
        <div className="flex-shrink-0 text-right hidden sm:block">
          <div className="text-xs text-[var(--cn-text-subtle)] font-mono">Active Since</div>
          <div className="text-sm text-[var(--cn-text-main)] font-semibold mt-0.5">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' }) : '2026'}
          </div>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Evaluations" value={stats.total} color="teal" />
        <StatCard icon={CheckCircle2} label="Eligible Approvals" value={stats.approved} sub={stats.total ? `${((stats.approved/stats.total)*100).toFixed(0)}% approval rate` : ''} color="emerald" />
        <StatCard icon={XCircle} label="Risk Rejections" value={stats.rejected} color="rose" />
        <StatCard icon={Target} label="Mean Model Score" value={stats.avgProb !== '—' ? `${stats.avgProb}%` : '—'} sub="Calibrated probability" color="blue" />
      </div>

      {/* ── Assessment History Ledger ── */}
      <div className="cn-card-solid overflow-hidden">
        <div className="p-5 border-b border-[var(--cn-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[var(--cn-primary)]" />
            <h3 className="text-base font-bold text-[var(--cn-text-main)]">Personal Assessment History</h3>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border border-[var(--cn-primary)]/20 font-mono">
              {applications.length} records
            </span>
          </div>
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-[var(--cn-surface-elevated)] rounded-xl p-1 border border-[var(--cn-border)]">
            {[['all', 'All'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filter === key
                    ? 'bg-[var(--cn-primary)] text-white shadow-xs'
                    : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-main)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)] flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-[var(--cn-text-subtle)]" />
            </div>
            <p className="text-[var(--cn-text-main)] text-sm font-semibold">No assessments found</p>
            <p className="text-[var(--cn-text-muted)] text-xs mt-1">Submit a loan risk assessment to see your evaluation records here.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--cn-border)]">
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
                  className="w-full p-4 flex items-center gap-4 hover:bg-[var(--cn-surface-elevated)] transition text-left group cursor-pointer"
                >
                  {/* Decision icon */}
                  <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                    isApproved ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}>
                    {isApproved ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[var(--cn-text-main)] text-sm truncate">
                        {app.applicant_name || 'Applicant'}
                      </span>
                      <span className={`cn-badge ${isApproved ? 'cn-badge-approved' : 'cn-badge-rejected'}`}>
                        {decision}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--cn-text-muted)] mt-0.5 font-mono">
                      Income: ₹{income.toLocaleString('en-IN')} · Loan: ₹{loan}k
                    </div>
                  </div>

                  {/* Probability */}
                  <div className="flex-shrink-0 text-right hidden sm:block">
                    <div className={`text-base font-bold font-mono ${isApproved ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {(prob * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-[var(--cn-text-subtle)] font-mono">Score</div>
                  </div>

                  {/* Date */}
                  <div className="flex-shrink-0 text-right hidden md:block">
                    <div className="text-xs text-[var(--cn-text-subtle)] font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {date ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-[var(--cn-text-subtle)] group-hover:text-[var(--cn-text-main)] group-hover:translate-x-0.5 transition flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Probability Distribution Spread ── */}
      {applications.length > 0 && (
        <div className="cn-card-solid p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-[var(--cn-primary)]" />
            <h3 className="text-sm font-bold text-[var(--cn-text-main)]">Approval Probability Spread</h3>
          </div>
          <div className="space-y-2.5">
            {applications.slice(0, 8).map((app, idx) => {
              const prob = app.probability ?? app.predicted_prob ?? 0;
              const decision = app.decision || app.predicted_decision || 'Unknown';
              const isApproved = decision === 'Approved';
              return (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <div className="w-24 text-[var(--cn-text-muted)] truncate font-mono">{(app.applicant_name || 'App').split(' ')[0]}</div>
                  <div className="flex-1 bg-[var(--cn-surface-muted)] rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isApproved ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(prob * 100, 100)}%` }}
                    />
                  </div>
                  <div className={`w-10 font-bold font-mono text-right ${isApproved ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
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
