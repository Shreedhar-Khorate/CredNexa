import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Layers } from 'lucide-react';

export default function ProbabilityGauge({ probability, threshold, decision, segment }) {
  const percentage = Math.round(probability * 100);
  const isApproved = decision === 'Approved';

  // SVG Gauge calculations
  const strokeDasharray = 283; // 2 * pi * 45
  const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100;

  return (
    <div className="glass-panel p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
      {/* Background Glow */}
      <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
        isApproved ? 'bg-emerald-500' : 'bg-rose-500'
      }`} />

      {/* Decision Status Badge */}
      <div className={`inline-flex items-center space-x-2 px-4 py-1.5 rounded-full font-semibold text-sm mb-4 border shadow-sm ${
        isApproved
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
      }`}>
        {isApproved ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        <span>{isApproved ? 'APPROVED' : 'REJECTED'}</span>
      </div>

      {/* Circular Gauge */}
      <div className="relative w-44 h-44 flex items-center justify-center my-2">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            className="text-slate-800"
            strokeWidth="10"
            stroke="currentColor"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            className={`transition-all duration-1000 ease-out ${
              isApproved ? 'text-emerald-500' : 'text-rose-500'
            }`}
            strokeWidth="10"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
          />
        </svg>

        <div className="absolute flex flex-col items-center">
          <span className="text-4xl font-extrabold text-white tracking-tight">{percentage}%</span>
          <span className="text-xs text-slate-400 font-medium">P(Approved)</span>
        </div>
      </div>

      {/* Threshold & Segment Info */}
      <div className="w-full mt-4 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400 font-mono">
        <div>
          <span>Decision Threshold: </span>
          <span className="text-slate-200 font-semibold">{Math.round(threshold * 100)}%</span>
        </div>
        <div className="flex items-center space-x-1 text-sky-400">
          <Layers className="w-3.5 h-3.5" />
          <span className="truncate max-w-[140px]">{segment?.name || 'Standard Segment'}</span>
        </div>
      </div>
    </div>
  );
}
