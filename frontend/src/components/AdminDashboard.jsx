import React, { useEffect, useState, useMemo } from 'react';
import {
  fetchAdminMetrics, fetchAdminUsers, fetchAdminAudit
} from '../services/api';
import {
  BarChart3, Database, Cpu, Target, Award, Table, Users, ShieldCheck,
  Activity, TrendingUp, TrendingDown, CheckCircle2, XCircle, Clock,
  FileText, AlertTriangle, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';

// ── Sub-component: Metric Card ──────────────────────────────────────────────
function MetricCard({ label, value, sub, icon: Icon, color = 'sky', pulse = false }) {
  const colors = {
    sky:     'text-sky-400 bg-sky-500/10 border-sky-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    indigo:  'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    amber:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose:    'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-slate-400">{label}</span>
        <div className={`p-2 rounded-xl border ${colors[color]}`}>
          <Icon className={`w-4 h-4 ${pulse ? 'animate-pulse' : ''}`} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white font-mono">{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

// ── Sub-component: Section Heading ──────────────────────────────────────────
function SectionHeading({ icon: Icon, title, badge }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-sky-400" />
      <h3 className="text-base font-bold text-white">{title}</h3>
      {badge && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">{badge}</span>
      )}
    </div>
  );
}

export default function AdminDashboard({ user }) {
  const [metrics, setMetrics]     = useState(null);
  const [users, setUsers]         = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeSection, setActiveSection] = useState('overview'); // 'overview' | 'users' | 'audit' | 'model'
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    const [m, u, a] = await Promise.all([
      fetchAdminMetrics(),
      fetchAdminUsers(),
      fetchAdminAudit(),
    ]);
    setMetrics(m);
    setUsers(u || []);
    setAuditLogs(a || []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const unified     = metrics?.unified_model_comparison || {};
  const holdout     = metrics?.final_calibrated_holdout || {};
  const threshold   = metrics?.chosen_threshold || 0.4145;
  const coefficients = metrics?.coefficients || [];

  const userStats = useMemo(() => ({
    total:   users.length,
    admins:  users.filter(u => u.role === 'admin').length,
    regular: users.filter(u => u.role !== 'admin').length,
  }), [users]);

  const auditStats = useMemo(() => {
    const logins      = auditLogs.filter(l => l.action === 'USER_LOGIN').length;
    const appCreated  = auditLogs.filter(l => l.action === 'APPLICATION_CREATED').length;
    return { logins, appCreated };
  }, [auditLogs]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-8 animate-pulse">
            <div className="h-4 bg-slate-800 rounded w-1/3 mb-3" />
            <div className="h-8 bg-slate-800 rounded w-1/5" />
          </div>
        ))}
      </div>
    );
  }

  const navItems = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'users',    label: 'Users',    icon: Users,    badge: userStats.total },
    { key: 'audit',    label: 'Audit Log',icon: Activity, badge: auditLogs.length },
    { key: 'model',    label: 'Model',    icon: Cpu },
  ];

  return (
    <div className="space-y-6">

      {/* Admin Banner */}
      <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-sky-950/40 border border-indigo-500/20 rounded-2xl p-4 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-sm">Admin Control Panel</div>
          <div className="text-xs text-slate-400 mt-0.5">
            Logged in as <span className="text-indigo-400 font-semibold">{user?.email}</span> · Full system access granted
          </div>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Section Nav */}
      <div className="flex flex-wrap gap-1.5 bg-slate-900/60 border border-slate-800 rounded-2xl p-1.5">
        {navItems.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeSection === key
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {badge !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeSection === key ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
              }`}>{badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeSection === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard icon={Target}   label="CV Accuracy"        value="80.08%"  sub="± 3.24% (5-fold CV)"     color="sky" />
            <MetricCard icon={Award}    label="Holdout ROC-AUC"    value="0.8227"  sub="122 holdout test rows"   color="emerald" />
            <MetricCard icon={Cpu}      label="Decision Threshold"  value={threshold.toString().slice(0, 7)} sub="Train OOF Calibrated F1" color="indigo" />
            <MetricCard icon={Database} label="Active Classifier"  value="Cal. LR" sub="Joblib artifact v1.0"    color="amber" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard icon={Users}       label="Registered Users"  value={userStats.total}   sub={`${userStats.admins} admins · ${userStats.regular} users`} color="sky" />
            <MetricCard icon={FileText}    label="App Events Logged" value={auditStats.appCreated} sub="In audit trail" color="emerald" />
            <MetricCard icon={Activity}    label="Login Events"      value={auditStats.logins} sub="Captured in audit log" color="indigo" pulse />
          </div>

          {/* Confusion Matrix */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
            <SectionHeading icon={BarChart3} title="Holdout Confusion Matrix" />
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-center font-mono">
              {[
                { label: 'True Rejected (TN)', val: 17, color: 'text-emerald-400', sub: 'Correct Rejections' },
                { label: 'False Approved (FP)', val: 21, color: 'text-rose-400',   sub: 'Type I Error' },
                { label: 'False Rejected (FN)', val: 1,  color: 'text-amber-400',  sub: 'Type II Error' },
                { label: 'True Approved (TP)',  val: 83, color: 'text-emerald-400', sub: 'Correct Approvals' },
              ].map(({ label, val, color, sub }) => (
                <div key={label} className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <div className="text-[11px] text-slate-400 mb-1">{label}</div>
                  <div className={`text-3xl font-bold ${color}`}>{val}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── USERS ── */}
      {activeSection === 'users' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800">
              <SectionHeading icon={Users} title="Registered User Accounts" badge={`${users.length} total`} />
            </div>
            {users.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">No users found in database.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {users.map((u, idx) => (
                  <div key={u.id || idx} className="p-4 flex items-center gap-4 hover:bg-slate-800/30 transition">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {(u.full_name || u.email || 'U')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-100 text-sm truncate">{u.full_name || 'N/A'}</div>
                      <div className="text-xs text-slate-400 truncate font-mono">{u.email}</div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        u.role === 'admin'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                          : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                      }`}>
                        {u.role?.toUpperCase() || 'USER'}
                      </span>
                      <span className="hidden md:block text-[10px] text-slate-500 font-mono">
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
            <MetricCard icon={Activity}  label="Total Log Entries"    value={auditLogs.length} color="sky" />
            <MetricCard icon={FileText}  label="App Created Events"   value={auditStats.appCreated} color="emerald" />
            <MetricCard icon={CheckCircle2} label="Login Events"      value={auditStats.logins} color="indigo" />
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800">
              <SectionHeading icon={Activity} title="System Audit Trail" badge={`${auditLogs.length} entries`} />
            </div>
            {auditLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">No audit logs found.</div>
            ) : (
              <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto">
                {auditLogs.map((log, idx) => {
                  const isApp = log.action === 'APPLICATION_CREATED';
                  const isLogin = log.action === 'USER_LOGIN';
                  const isReg = log.action === 'USER_REGISTERED';
                  return (
                    <div key={log.id || idx} className="p-4 flex items-start gap-3 hover:bg-slate-800/30 transition">
                      <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${
                        isApp ? 'bg-emerald-500/10 text-emerald-400' :
                        isLogin ? 'bg-sky-500/10 text-sky-400' :
                        isReg ? 'bg-indigo-500/10 text-indigo-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {isApp ? <FileText className="w-3.5 h-3.5" /> :
                         isLogin ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                         isReg ? <Users className="w-3.5 h-3.5" /> :
                         <Activity className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-100 text-xs font-mono">{log.action}</span>
                          {log.actor_role && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              log.actor_role === 'admin'
                                ? 'bg-indigo-500/10 text-indigo-400'
                                : 'bg-slate-700 text-slate-400'
                            }`}>{log.actor_role}</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-mono truncate">
                          {log.details || log.resource_type || 'System event'}
                          {log.resource_id ? ` · ${String(log.resource_id).slice(0, 16)}` : ''}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right text-[10px] text-slate-500 font-mono">
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
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <SectionHeading icon={BarChart3} title="Model Selection & Baseline Comparison" />
              <span className="text-xs text-slate-400 font-mono">Leakage-Free 80/20 Split</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="p-3">Model / Baseline</th>
                    <th className="p-3">CV Acc (Train)</th>
                    <th className="p-3">CV AUC (Train)</th>
                    <th className="p-3">Holdout Acc (Test)</th>
                    <th className="p-3">Holdout AUC (Test)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {Object.entries(unified).map(([modelName, data], idx) => (
                    <tr key={idx} className={modelName.includes('Tuned') ? 'bg-sky-500/5 font-bold text-sky-300' : 'hover:bg-slate-800/40'}>
                      <td className="p-3">{modelName}</td>
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
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800">
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
                      <div className="w-36 text-xs text-slate-400 font-mono truncate">{row.feature}</div>
                      <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isPos ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-rose-700 to-rose-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className={`w-16 text-right text-xs font-bold font-mono ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
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
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
              <SectionHeading icon={Award} title="Final Calibrated Holdout Metrics" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(holdout).map(([k, v]) => (
                  <div key={k} className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl text-center">
                    <div className="text-[10px] text-slate-400 font-mono uppercase mb-1">{k.replace(/_/g, ' ')}</div>
                    <div className="text-lg font-bold text-sky-400 font-mono">
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
