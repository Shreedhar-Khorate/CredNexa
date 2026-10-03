import React, { useState, useMemo } from 'react';
import {
  History, CheckCircle2, XCircle, Clock, Search, ArrowUpRight
} from 'lucide-react';
import { reviewApplication } from '../services/api';

export default function HistoryTable({ applications = [], onSelect, isAdmin = false, onReload }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [processingId, setProcessingId] = useState(null);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const name = (app.applicant_name || '').toLowerCase();
      const segment = (app.segment?.name || '').toLowerCase();
      const matchesSearch = name.includes(searchTerm.toLowerCase()) || segment.includes(searchTerm.toLowerCase());
      
      const appStatus = (app.status || 'pending').toLowerCase();
      const matchesStatus = statusFilter === 'all' || appStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [applications, searchTerm, statusFilter]);

  const handleQuickReview = async (e, appId, decision) => {
    e.stopPropagation();
    setProcessingId(appId);
    try {
      await reviewApplication(appId, decision, 'Decision via History Table');
      if (onReload) await onReload();
    } catch (err) {
      alert('Review action failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setProcessingId(null);
    }
  };

  if (!applications || applications.length === 0) {
    return (
      <div className="cn-card p-10 text-center text-[var(--cn-text-muted)] font-mono text-sm space-y-2">
        <History className="w-8 h-8 text-[var(--cn-text-subtle)] mx-auto mb-2" />
        <p className="font-semibold text-[var(--cn-text-main)]">No Evaluation History Available</p>
        <p className="text-xs text-[var(--cn-text-subtle)]">Run an applicant risk screening to generate evaluation audit logs.</p>
      </div>
    );
  }

  return (
    <div className="cn-card p-6 overflow-hidden">
      
      {/* Table Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-[var(--cn-border)]">
        <div>
          <h3 className="text-base font-bold text-[var(--cn-text-main)] flex items-center gap-2">
            <History className="w-4 h-4 text-sky-500" />
            <span>Assessment Records Repository</span>
            <span className="ml-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-[var(--cn-surface-elevated)] text-[var(--cn-accent)] border border-[var(--cn-border)]">
              {filteredApplications.length} of {applications.length}
            </span>
          </h3>
          <p className="text-xs text-[var(--cn-text-muted)] mt-0.5">
            Full ledger of automated loan evaluations and underwriting review decisions
          </p>
        </div>

        {/* Controls: Search & Status Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--cn-text-subtle)] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search applicant or cluster..."
              className="cn-input pl-8.5 py-1.5 text-xs w-48 sm:w-56"
            />
          </div>

          <div className="flex items-center gap-1 bg-[var(--cn-surface-elevated)] p-1 rounded-xl border border-[var(--cn-border)]">
            {['all', 'approved', 'rejected', 'pending'].map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => setStatusFilter(filterKey)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition cursor-pointer ${
                  statusFilter === filterKey
                    ? 'bg-[var(--cn-surface)] text-[var(--cn-text-main)] shadow-xs border border-[var(--cn-border-muted)]'
                    : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-main)]'
                }`}
              >
                {filterKey}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[var(--cn-surface-elevated)] text-[var(--cn-text-muted)] border-b border-[var(--cn-border)] select-none">
            <tr>
              <th className="p-3 font-semibold">Applicant</th>
              <th className="p-3 font-semibold">Income</th>
              <th className="p-3 font-semibold">Loan Size</th>
              <th className="p-3 font-semibold">ML Recommendation</th>
              <th className="p-3 font-semibold">Underwriter Decision</th>
              <th className="p-3 font-semibold">Probability</th>
              <th className="p-3 font-semibold">Segment</th>
              <th className="p-3 font-semibold text-right">Timestamp</th>
              {isAdmin && <th className="p-3 font-semibold text-center">Underwriter Review</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--cn-border)] text-[var(--cn-text-secondary)]">
            {filteredApplications.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} className="p-8 text-center text-[var(--cn-text-subtle)] font-mono">
                  No records match your filter criteria.
                </td>
              </tr>
            ) : (
              filteredApplications.map((row, idx) => {
                const isMlApproved = row.decision === 'Approved';
                const status = row.status || 'pending';
                const isApproved = status === 'approved';
                const isRejected = status === 'rejected';

                return (
                  <tr
                    key={row.id || idx}
                    onClick={() => onSelect && onSelect(row)}
                    className="hover:bg-[var(--cn-surface-elevated)] cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-semibold text-[var(--cn-text-main)] flex items-center gap-1.5">
                      <span>{row.applicant_name}</span>
                      <ArrowUpRight className="w-3 h-3 text-[var(--cn-text-subtle)] opacity-0 group-hover:opacity-100" />
                    </td>
                    <td className="p-3 font-mono">₹{(row.ApplicantIncome || 0).toLocaleString()}</td>
                    <td className="p-3 font-mono">₹{row.LoanAmount}k</td>
                    <td className="p-3">
                      <span className={`cn-badge ${isMlApproved ? 'cn-badge-approved' : 'cn-badge-rejected'}`}>
                        {isMlApproved ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{row.decision}</span>
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`cn-badge ${
                        isApproved ? 'cn-badge-approved' :
                        isRejected ? 'cn-badge-rejected' : 'cn-badge-pending'
                      }`}>
                        {isApproved ? <CheckCircle2 className="w-3 h-3" /> :
                         isRejected ? <XCircle className="w-3 h-3" /> :
                         <Clock className="w-3 h-3" />}
                        <span>{status.toUpperCase()}</span>
                      </span>
                    </td>
                    <td className="p-3 font-bold font-mono text-[var(--cn-accent)]">
                      {Math.round((row.probability || 0) * 100)}%
                    </td>
                    <td className="p-3 text-[var(--cn-text-muted)] truncate max-w-[130px]">
                      {row.segment?.name || 'Standard'}
                    </td>
                    <td className="p-3 text-right text-[var(--cn-text-subtle)] font-mono text-[11px]">
                      {row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                    </td>
                    {isAdmin && (
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {status === 'pending' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={(e) => handleQuickReview(e, row.id, 'approved')}
                              disabled={processingId === row.id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] transition shadow-xs cursor-pointer"
                              title="Approve Loan Application"
                            >
                              Approve
                            </button>
                            <button
                              onClick={(e) => handleQuickReview(e, row.id, 'rejected')}
                              disabled={processingId === row.id}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition shadow-xs cursor-pointer"
                              title="Reject Loan Application"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-[var(--cn-text-subtle)] uppercase">
                            Logged
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
