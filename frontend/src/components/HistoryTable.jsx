import React from 'react';
import { History, CheckCircle2, XCircle, Search } from 'lucide-react';

export default function HistoryTable({ applications = [], onSelect }) {
  if (!applications || applications.length === 0) {
    return (
      <div className="glass-panel p-8 text-center text-slate-400 font-mono text-sm">
        No application assessment history recorded yet. Run an assessment to generate logs.
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <History className="w-4 h-4 text-sky-400" />
          <span>Application Assessment History ({applications.length})</span>
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
            <tr>
              <th className="p-3">Applicant</th>
              <th className="p-3">Income (₹)</th>
              <th className="p-3">Loan Size (₹k)</th>
              <th className="p-3">Credit History</th>
              <th className="p-3">Decision</th>
              <th className="p-3">Probability</th>
              <th className="p-3">Segment</th>
              <th className="p-3 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-200">
            {applications.map((row, idx) => {
              const isApproved = row.decision === 'Approved';
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
                    <span className={`px-2 py-0.5 rounded-full ${row.Credit_History === '1' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {row.Credit_History === '1' ? '1.0 Clean' : '0.0 Delinquent'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      isApproved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}>
                      {isApproved ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{row.decision}</span>
                    </span>
                  </td>
                  <td className="p-3 font-bold text-sky-400">{Math.round(row.probability * 100)}%</td>
                  <td className="p-3 text-slate-400 truncate max-w-[140px]">{row.segment?.name || 'Standard'}</td>
                  <td className="p-3 text-right text-slate-400">
                    {row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
