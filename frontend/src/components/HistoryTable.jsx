import React, { useState } from 'react';
import { History, CheckCircle2, XCircle, Clock, ShieldCheck } from 'lucide-react';
import { reviewApplication } from '../services/api';

export default function HistoryTable({ applications = [], onSelect, isAdmin = false, onReload }) {
  const [processingId, setProcessingId] = useState(null);

  if (!applications || applications.length === 0) {
    return (
      <div className="glass-panel p-8 text-center text-slate-400 font-mono text-sm">
        No application assessment history recorded yet. Run an assessment to generate logs.
      </div>
    );
  }

  const handleQuickReview = async (e, appId, decision) => {
    e.stopPropagation();
    setProcessingId(appId);
    try {
      await reviewApplication(appId, decision, 'Quick decision via History Table');
      if (onReload) await onReload();
    } catch (err) {
      alert('Review action failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="glass-panel p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <History className="w-4 h-4 text-sky-400" />
          <span>Application Assessment History ({applications.length})</span>
        </h3>
        {isAdmin && (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Admin Review Actions Active</span>
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
            <tr>
              <th className="p-3">Applicant</th>
              <th className="p-3">Income (₹)</th>
              <th className="p-3">Loan Size (₹k)</th>
              <th className="p-3">ML Decision</th>
              <th className="p-3">Admin Status</th>
              <th className="p-3">Probability</th>
              <th className="p-3">Segment</th>
              <th className="p-3 text-right">Date</th>
              {isAdmin && <th className="p-3 text-center">Underwriter Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-200">
            {applications.map((row, idx) => {
              const isMlApproved = row.decision === 'Approved';
              const status = row.status || 'pending';
              const isApproved = status === 'approved';
              const isRejected = status === 'rejected';
              const isPending  = status === 'pending';

              return (
                <tr
                  key={row.id || idx}
                  onClick={() => onSelect && onSelect(row)}
                  className="hover:bg-slate-800/60 cursor-pointer transition"
                >
                  <td className="p-3 font-semibold text-slate-100">{row.applicant_name}</td>
                  <td className="p-3">₹{(row.ApplicantIncome || 0).toLocaleString()}</td>
                  <td className="p-3">₹{row.LoanAmount}k</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      isMlApproved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}>
                      {isMlApproved ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{row.decision}</span>
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      isApproved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      isRejected ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {isApproved ? <CheckCircle2 className="w-3 h-3" /> :
                       isRejected ? <XCircle className="w-3 h-3" /> :
                       <Clock className="w-3 h-3 animate-pulse" />}
                      <span>{status.toUpperCase()}</span>
                    </span>
                  </td>
                  <td className="p-3 font-bold text-sky-400">{Math.round((row.probability || 0) * 100)}%</td>
                  <td className="p-3 text-slate-400 truncate max-w-[140px]">{row.segment?.name || 'Standard'}</td>
                  <td className="p-3 text-right text-slate-400">
                    {row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </td>
                  {isAdmin && (
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {isPending ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => handleQuickReview(e, row.id, 'approved')}
                            disabled={processingId === row.id}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] transition"
                            title="Approve Loan Application"
                          >
                            Approve
                          </button>
                          <button
                            onClick={(e) => handleQuickReview(e, row.id, 'rejected')}
                            disabled={processingId === row.id}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition"
                            title="Reject Loan Application"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500">Decided</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

