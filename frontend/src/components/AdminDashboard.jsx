import React, { useEffect, useState, useMemo } from 'react';
import {
  fetchAdminMetrics, fetchAdminUsers, fetchAdminAudit, fetchApplications, reviewApplication
} from '../services/api';
import {
  BarChart3, Database, Cpu, Target, Award, Table, Users, ShieldCheck,
  Activity, CheckCircle2, XCircle, Clock,
  FileText, RefreshCw, FileCheck
} from 'lucide-react';

// ── Sub-component: Metric Card ──────────────────────────────────────────────
function MetricCard({ label, value, sub, icon: Icon, color = 'sky', pulse = false }) {
  const colors = {
    sky:     'text-sky-500 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
    emerald: 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    indigo:  'text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    amber:   'text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose:    'text-rose-500 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
  };
  return (
    <div className="cn-card p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-medium text-[var(--cn-text-muted)]">{label}</span>
        <div className={`p-2 rounded-xl border ${colors[color]}`}>
          <Icon className={`w-4 h-4 ${pulse ? 'animate-pulse' : ''}`} />
        </div>
      </div>
      <div className="text-2xl font-bold text-[var(--cn-text-main)] font-mono">{value}</div>
      {sub && <div className="text-[11px] text-[var(--cn-text-subtle)] mt-1">{sub}</div>}
    </div>
  );
}

// ── Sub-component: Section Heading ──────────────────────────────────────────
function SectionHeading({ icon: Icon, title, badge }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-sky-500" />
      <h3 className="text-base font-bold text-[var(--cn-text-main)]">{title}</h3>
      {badge && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/20">{badge}</span>
      )}
    </div>
  );
}

export default function AdminDashboard({ user, onRefreshParent }) {
  const [metrics, setMetrics]         = useState(null);
  const [users, setUsers]             = useState([]);
  const [auditLogs, setAuditLogs]     = useState([]);
  const [applications, setApplications] = useState([]);
  const [activeSection, setActiveSection] = useState('queue'); // 'queue' | 'overview' | 'users' | 'audit' | 'model'
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({});

  const load = async () => {
    setRefreshing(true);
    const [m, u, a, apps] = await Promise.all([
      fetchAdminMetrics(),
      fetchAdminUsers(),
      fetchAdminAudit(),
      fetchApplications(),
    ]);
    setMetrics(m);
    setUsers(u || []);
    setAuditLogs(a || []);
    setApplications(apps || []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const unified      = metrics?.unified_model_comparison || {};
  const holdout      = metrics?.final_calibrated_holdout || {};
  const threshold    = metrics?.chosen_threshold || 0.4145;
  const coefficients = metrics?.coefficients || [];

  const pendingApps = useMemo(() => {
    return applications.filter(a => !a.status || a.status === 'pending');
  }, [applications]);

  const reviewedApps = useMemo(() => {
    return applications.filter(a => a.status && a.status !== 'pending');
  }, [applications]);

  const userStats = useMemo(() => ({
    total:   users.length,
    admins:  users.filter(u => u.role === 'admin').length,
    regular: users.filter(u => u.role !== 'admin').length,
  }), [users]);

  const auditStats = useMemo(() => {
    const logins      = auditLogs.filter(l => l.action === 'USER_LOGIN').length;
    const appCreated  = auditLogs.filter(l => l.action === 'APPLICATION_CREATED').length;
    const appReviewed = auditLogs.filter(l => l.action === 'APPLICATION_REVIEWED').length;
    return { logins, appCreated, appReviewed };
  }, [auditLogs]);

  const handleReviewAction = async (appId, decision) => {
    setReviewingId(appId);
    try {
      const note = reviewNotes[appId] || '';
      await reviewApplication(appId, decision, note);
      await load();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      alert('Failed to submit review decision: ' + (err.response?.data?.detail || err.message));
    } finally {
      setReviewingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="cn-card p-8 animate-pulse">
            <div className="h-4 bg-[var(--cn-surface-elevated)] rounded w-1/3 mb-3" />
            <div className="h-8 bg-[var(--cn-surface-elevated)] rounded w-1/5" />
          </div>
        ))}
      </div>
    );
  }

  const navItems = [
    { key: 'queue',    label: 'Review Queue', icon: FileCheck, badge: pendingApps.length },
    { key: 'overview', label: 'Overview',     icon: BarChart3 },
    { key: 'users',    label: 'Users',        icon: Users,    badge: userStats.total },
    { key: 'audit',    label: 'Audit Log',    icon: Activity, badge: auditLogs.length },
    { key: 'model',    label: 'Model Metrics',icon: Cpu },
  ];

  return (
    <div className="space-y-6">

      {/* Admin Workbench Banner */}
      <div className="cn-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-indigo-500/25 bg-gradient-to-r from-indigo-500/10 via-transparent to-sky-500/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-[var(--cn-text-main)] text-sm flex items-center gap-2">
              <span>Admin Underwriter Operations Workbench</span>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                ACTIVE
              </span>
            </div>
            <div className="text-xs text-[var(--cn-text-muted)] mt-0.5">
              Signed in as <span className="text-indigo-400 font-semibold">{user?.email}</span> · Supabase Underwriter Permissions Active
            </div>
          </div>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="cn-btn cn-btn-secondary text-xs py-1.5 px-3 flex-shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Segmented Section Navigation */}
      <div className="flex flex-wrap gap-1.5 bg-[var(--cn-surface)] border border-[var(--cn-border)] rounded-2xl p-1.5 shadow-xs">
        {navItems.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeSection === key
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-main)] hover:bg-[var(--cn-surface-elevated)]'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            {badge !== undefined && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeSection === key ? 'bg-white/20 text-white' : 'bg-[var(--cn-surface-elevated)] text-[var(--cn-text-muted)]'
              }`}>{badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── REVIEW QUEUE ── */}
      {activeSection === 'queue' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard icon={Clock}        label="Pending Reviews"     value={pendingApps.length} sub="Awaiting underwriter decision" color="amber" pulse={pendingApps.length > 0} />
            <MetricCard icon={CheckCircle2} label="Reviewed & Decided"  value={reviewedApps.length} sub="Approved / Rejected / Deferred" color="emerald" />
            <MetricCard icon={Activity}     label="Total Applications"  value={applications.length} sub="System total" color="sky" />
          </div>

          {/* Pending Applications Section */}
          <div className="cn-card overflow-hidden">
            <div className="p-5 border-b border-[var(--cn-border)] flex items-center justify-between">
              <SectionHeading icon={Clock} title="Pending Loan Approvals Queue" badge={`${pendingApps.length} Pending`} />
            </div>

            {pendingApps.length === 0 ? (
              <div className="p-12 text-center text-[var(--cn-text-muted)] font-mono text-sm space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <div className="font-semibold text-[var(--cn-text-main)]">All Pending Applications Reviewed!</div>
                <div className="text-xs text-[var(--cn-text-subtle)]">There are currently no applications waiting for administrative review.</div>
              </div>
            ) : (
              <div className="divide-y divide-[var(--cn-border)]">
                {pendingApps.map((app) => {
                  const isMlApproved = app.decision === 'Approved';
                  const isProcessing = reviewingId === app.id;

                  return (
                    <div key={app.id} className="p-5 space-y-4 hover:bg-[var(--cn-surface-elevated)] transition">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-[var(--cn-text-main)] text-base">{app.applicant_name}</span>
                            <span className="cn-badge cn-badge-pending">
                              PENDING REVIEW
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-mono text-[var(--cn-text-muted)] flex-wrap mt-1">
                            <span>Income: <strong className="text-[var(--cn-text-main)]">₹{(app.ApplicantIncome || 0).toLocaleString()}</strong></span>
                            <span>Loan: <strong className="text-[var(--cn-text-main)]">₹{app.LoanAmount}k</strong> ({app.Loan_Amount_Term}m)</span>
                            <span>Credit History: <strong className={app.Credit_History === '1' ? 'text-emerald-500' : 'text-rose-500'}>{app.Credit_History === '1' ? 'Clean (1.0)' : 'Delinquent (0.0)'}</strong></span>
                            <span>Location: <strong className="text-[var(--cn-text-main)]">{app.Property_Area}</strong></span>
                          </div>
                        </div>

                        {/* ML Prediction Snapshot */}
                        <div className="flex items-center gap-3 bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)] p-3 rounded-xl flex-shrink-0">
                          <div>
                            <div className="text-[10px] text-[var(--cn-text-subtle)] font-mono">ML Suggestion</div>
                            <div className={`text-xs font-bold font-mono ${isMlApproved ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {app.decision} ({Math.round((app.probability || 0) * 100)}%)
                            </div>
                          </div>
                          <div className="h-6 w-px bg-[var(--cn-border)]" />
                          <div className="text-right">
                            <div className="text-[10px] text-[var(--cn-text-subtle)] font-mono">Cutoff</div>
                            <div className="text-xs font-bold font-mono text-sky-500">{app.threshold || 0.4145}</div>
                          </div>
                        </div>
                      </div>

                      {/* Review Note & Interactive Approve / Reject / Defer Action Buttons */}
                      <div className="pt-2 border-t border-[var(--cn-border)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <input
                          type="text"
                          placeholder="Optional Underwriter Review Note..."
                          value={reviewNotes[app.id] || ''}
                          onChange={(e) => setReviewNotes({ ...reviewNotes, [app.id]: e.target.value })}
                          className="cn-input text-xs py-1.5 flex-1"
                        />

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Approve Button */}
                          <button
                            onClick={() => handleReviewAction(app.id, 'approved')}
                            disabled={isProcessing}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-xs disabled:opacity-50 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{isProcessing ? 'Saving...' : 'Approve'}</span>
                          </button>

                          {/* Reject Button */}
                          <button
                            onClick={() => handleReviewAction(app.id, 'rejected')}
                            disabled={isProcessing}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-xs disabled:opacity-50 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>{isProcessing ? 'Saving...' : 'Reject'}</span>
                          </button>

                          {/* Defer Button */}
                          <button
                            onClick={() => handleReviewAction(app.id, 'deferred')}
                            disabled={isProcessing}
                            className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-[var(--cn-surface-elevated)] hover:bg-[var(--cn-surface-muted)] text-indigo-400 border border-indigo-500/30 text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                            title="Defer decision pending documentation"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Defer</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Decided Applications Section */}
          <div className="cn-card overflow-hidden">
            <div className="p-5 border-b border-[var(--cn-border)] flex items-center justify-between">
              <SectionHeading icon={FileCheck} title="Reviewed Applications Archive" badge={`${reviewedApps.length} Decided`} />
            </div>

            {reviewedApps.length === 0 ? (
              <div className="p-8 text-center text-[var(--cn-text-subtle)] text-xs">No reviewed applications in archive yet.</div>
            ) : (
              <div className="divide-y divide-[var(--cn-border)]">
                {reviewedApps.map((app) => {
                  const isApproved = app.status === 'approved';
                  const isRejected = app.status === 'rejected';

                  return (
                    <div key={app.id} className="p-4 flex items-center justify-between gap-4 text-xs font-mono hover:bg-[var(--cn-surface-elevated)] transition">
                      <div>
                        <div className="font-semibold text-[var(--cn-text-main)] text-sm">{app.applicant_name}</div>
                        <div className="text-[var(--cn-text-muted)] text-[11px] mt-0.5">
                          Income: ₹{(app.ApplicantIncome || 0).toLocaleString()} · Loan: ₹{app.LoanAmount}k
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`cn-badge ${
                          isApproved ? 'cn-badge-approved' :
                          isRejected ? 'cn-badge-rejected' : 'cn-badge-reviewed'
                        }`}>
                          {isApproved ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                           isRejected ? <XCircle className="w-3.5 h-3.5" /> :
                           <Clock className="w-3.5 h-3.5" />}
                          <span>{app.status?.toUpperCase()}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── OVERVIEW ── */}
      {activeSection === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard icon={Target}   label="CV Accuracy"        value="80.08%"  sub="± 3.24% (5-fold CV)"     color="sky" />
            <MetricCard icon={Award}    label="Holdout ROC-AUC"    value="0.8227"  sub="122 holdout test rows"   color="emerald" />
            <MetricCard icon={Cpu}      label="Decision Cutoff"    value={threshold.toString().slice(0, 7)} sub="Calibrated F1 threshold" color="indigo" />
            <MetricCard icon={Database} label="Model Architecture" value="Cal. LR" sub="Artifact pipeline v1.0" color="amber" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard icon={Users}       label="Registered Users"  value={userStats.total}   sub={`${userStats.admins} admins · ${userStats.regular} users`} color="sky" />
            <MetricCard icon={FileText}    label="Logged App Events" value={auditStats.appCreated} sub="In audit ledger" color="emerald" />
            <MetricCard icon={Activity}    label="Logged Sessions"   value={auditStats.logins} sub="Captured in system log" color="indigo" pulse />
          </div>

          {/* Confusion Matrix */}
          <div className="cn-card p-6">
            <SectionHeading icon={BarChart3} title="Holdout Confusion Matrix (Test Set)" />
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-center font-mono">
              {[
                { label: 'True Rejected (TN)', val: 17, color: 'text-emerald-500', sub: 'Correct Rejections' },
                { label: 'False Approved (FP)', val: 21, color: 'text-rose-500',   sub: 'Type I Error' },
                { label: 'False Rejected (FN)', val: 1,  color: 'text-amber-500',  sub: 'Type II Error' },
                { label: 'True Approved (TP)',  val: 83, color: 'text-emerald-500', sub: 'Correct Approvals' },
              ].map(({ label, val, color, sub }) => (
                <div key={label} className="bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)] p-4 rounded-xl">
                  <div className="text-[11px] text-[var(--cn-text-muted)] mb-1">{label}</div>
                  <div className={`text-3xl font-bold ${color}`}>{val}</div>
                  <div className="text-[10px] text-[var(--cn-text-subtle)] mt-1">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── USERS ── */}
      {activeSection === 'users' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="cn-card overflow-hidden">
            <div className="p-5 border-b border-[var(--cn-border)]">
              <SectionHeading icon={Users} title="Registered User Accounts" badge={`${users.length} total`} />
            </div>
            {users.length === 0 ? (
              <div className="p-12 text-center text-[var(--cn-text-muted)] text-sm">No users found in database.</div>
            ) : (
              <div className="divide-y divide-[var(--cn-border)]">
                {users.map((u, idx) => (
                  <div key={u.id || idx} className="p-4 flex items-center gap-4 hover:bg-[var(--cn-surface-elevated)] transition">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0284c7] to-[#4f46e5] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {(u.full_name || u.email || 'U')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[var(--cn-text-main)] text-sm truncate">{u.full_name || 'N/A'}</div>
                      <div className="text-xs text-[var(--cn-text-muted)] truncate font-mono">{u.email}</div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className={`cn-badge ${u.role === 'admin' ? 'cn-badge-admin' : 'cn-badge-approved'}`}>
                        {u.role?.toUpperCase() || 'USER'}
                      </span>
                      <span className="hidden md:block text-[10px] text-[var(--cn-text-subtle)] font-mono">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AUDIT LOG ── */}
      {activeSection === 'audit' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <MetricCard icon={Activity}     label="Total Log Entries"    value={auditLogs.length} color="sky" />
            <MetricCard icon={FileText}     label="App Created Events"   value={auditStats.appCreated} color="emerald" />
            <MetricCard icon={CheckCircle2} label="User Logins"          value={auditStats.logins} color="indigo" />
          </div>

          <div className="cn-card overflow-hidden">
            <div className="p-5 border-b border-[var(--cn-border)]">
              <SectionHeading icon={Activity} title="System Audit Trail & Security Ledger" badge={`${auditLogs.length} events`} />
            </div>
            {auditLogs.length === 0 ? (
              <div className="p-12 text-center text-[var(--cn-text-muted)] text-sm">No audit logs found.</div>
            ) : (
              <div className="divide-y divide-[var(--cn-border)] max-h-[500px] overflow-y-auto">
                {auditLogs.map((log, idx) => {
                  const isApp = log.action === 'APPLICATION_CREATED';
                  const isLogin = log.action === 'USER_LOGIN';
                  const isReg = log.action === 'USER_REGISTERED';
                  return (
                    <div key={log.id || idx} className="p-4 flex items-start gap-3 hover:bg-[var(--cn-surface-elevated)] transition">
                      <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${
                        isApp ? 'bg-emerald-500/10 text-emerald-500' :
                        isLogin ? 'bg-sky-500/10 text-sky-500' :
                        isReg ? 'bg-indigo-500/10 text-indigo-400' :
                        'bg-[var(--cn-surface-elevated)] text-[var(--cn-text-muted)]'
                      }`}>
                        {isApp ? <FileText className="w-3.5 h-3.5" /> :
                         isLogin ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                         isReg ? <Users className="w-3.5 h-3.5" /> :
                         <Activity className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[var(--cn-text-main)] text-xs font-mono">{log.action}</span>
                          {log.actor_role && (
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              log.actor_role === 'admin'
                                ? 'bg-indigo-500/10 text-indigo-400'
                                : 'bg-[var(--cn-surface-elevated)] text-[var(--cn-text-muted)]'
                            }`}>{log.actor_role}</span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--cn-text-muted)] mt-0.5 font-mono truncate">
                          {log.details || log.resource_type || 'System event'}
                          {log.resource_id ? ` · ${String(log.resource_id).slice(0, 16)}` : ''}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right text-[10px] text-[var(--cn-text-subtle)] font-mono">
                        {log.created_at ? new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODEL ── */}
      {activeSection === 'model' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Model Comparison Table */}
          <div className="cn-card overflow-hidden">
            <div className="p-5 border-b border-[var(--cn-border)] flex items-center justify-between">
              <SectionHeading icon={BarChart3} title="Model Selection & Baseline Comparison" />
              <span className="text-xs text-[var(--cn-text-muted)] font-mono">Leakage-Free 80/20 Holdout</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[var(--cn-surface-elevated)] text-[var(--cn-text-muted)] border-b border-[var(--cn-border)]">
                  <tr>
                    <th className="p-3">Model / Baseline</th>
                    <th className="p-3">CV Acc (Train)</th>
                    <th className="p-3">CV AUC (Train)</th>
                    <th className="p-3">Holdout Acc (Test)</th>
                    <th className="p-3">Holdout AUC (Test)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cn-border)] text-[var(--cn-text-secondary)]">
                  {Object.entries(unified).map(([modelName, data], idx) => (
                    <tr key={idx} className={modelName.includes('Tuned') ? 'bg-sky-500/5 font-bold text-sky-500 dark:text-sky-300' : 'hover:bg-[var(--cn-surface-elevated)]'}>
                      <td className="p-3 font-semibold">{modelName}</td>
                      <td className="p-3">{Math.round((data?.cv_train_oof?.accuracy || 0) * 10000) / 100}%</td>
                      <td className="p-3">{data?.cv_train_oof?.roc_auc?.toFixed(4) || 'N/A'}</td>
                      <td className="p-3">{Math.round((data?.holdout_test?.accuracy || 0) * 10000) / 100}%</td>
                      <td className="p-3">{data?.holdout_test?.roc_auc?.toFixed(4) || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Feature Coefficients */}
          <div className="cn-card overflow-hidden">
            <div className="p-5 border-b border-[var(--cn-border)]">
              <SectionHeading icon={Table} title="Learned Model Feature Weights" badge="Logistic Regression" />
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              <div className="space-y-2">
                {coefficients.slice(0, 15).map((row, idx) => {
                  const isPos = row.coefficient >= 0;
                  const maxCoeff = Math.max(...coefficients.map(c => Math.abs(c.coefficient)));
                  const pct = Math.abs(row.coefficient) / maxCoeff * 100;
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-36 text-xs text-[var(--cn-text-muted)] font-mono truncate">{row.feature}</div>
                      <div className="flex-1 bg-[var(--cn-surface-muted)] rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isPos ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-rose-700 to-rose-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className={`w-16 text-right text-xs font-bold font-mono ${isPos ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                        {isPos ? '+' : ''}{row.coefficient.toFixed(4)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Holdout Metrics Details */}
          {Object.keys(holdout).length > 0 && (
            <div className="cn-card p-5">
              <SectionHeading icon={Award} title="Final Calibrated Holdout Metrics" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(holdout).map(([k, v]) => (
                  <div key={k} className="bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)] p-3 rounded-xl text-center">
                    <div className="text-[10px] text-[var(--cn-text-muted)] font-mono uppercase mb-1">{k.replace(/_/g, ' ')}</div>
                    <div className="text-lg font-bold text-sky-500 font-mono">
                      {typeof v === 'number' ? (v > 1 ? v.toFixed(1) + '%' : v.toFixed(4)) : v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
