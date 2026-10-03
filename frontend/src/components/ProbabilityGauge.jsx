import React from 'react';
import { CheckCircle2, XCircle, Layers, Cpu } from 'lucide-react';

export default function ProbabilityGauge({ probability, threshold, decision, segment }) {
  const percentage = Math.round(probability * 100);
  const isApproved = decision === 'Approved';

  // SVG Gauge calculations (r = 45 -> circumference = 2 * pi * 45 ~= 283)
  const strokeDasharray = 283;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100;

  return (
    <div className={`cn-card p-6 flex flex-col items-center justify-between text-center relative overflow-hidden transition-all ${
      isApproved ? 'border-emerald-500/30' : 'border-rose-500/30'
    }`}>
      
      {/* Top Header & Decision Badge */}
      <div className="w-full flex items-center justify-between mb-3 pb-3 border-b border-[var(--cn-border)]">
        <span className="text-[11px] font-mono font-medium text-[var(--cn-text-subtle)] flex items-center gap-1">
          <Cpu className="w-3.5 h-3.5 text-sky-500" />
          <span>ML v1.0 Calibrated</span>
        </span>

        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
          isApproved
            ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30'
            : 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/30'
        }`}>
          {isApproved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          <span>{isApproved ? 'Approved' : 'Rejected'}</span>
        </span>
      </div>

      {/* Circular Gauge Ring */}
      <div className="relative w-44 h-44 flex items-center justify-center my-3 select-none">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            className="text-[var(--cn-surface-muted)]"
            strokeWidth="9"
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
            strokeWidth="9"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
          />
        </svg>

        <div className="absolute flex flex-col items-center">
          <span className="text-4xl font-extrabold text-[var(--cn-text-main)] tracking-tight font-mono">
            {percentage}%
          </span>
          <span className="text-xs text-[var(--cn-text-muted)] font-medium mt-0.5">
            Approval Probability
          </span>
        </div>
      </div>

      {/* Threshold & Segment Info */}
      <div className="w-full mt-3 pt-3 border-t border-[var(--cn-border)] flex items-center justify-between text-xs text-[var(--cn-text-muted)] font-mono">
        <div className="text-left">
          <span className="text-[var(--cn-text-subtle)] block text-[10px]">Decision Cutoff</span>
          <span className="text-[var(--cn-text-main)] font-semibold">{Math.round(threshold * 100)}% threshold</span>
        </div>
        <div className="text-right">
          <span className="text-[var(--cn-text-subtle)] block text-[10px]">Applicant Cluster</span>
          <span className="inline-flex items-center gap-1 text-[var(--cn-accent)] font-semibold truncate max-w-[130px]">
            <Layers className="w-3 h-3 flex-shrink-0" />
            <span>{segment?.name || 'Standard'}</span>
          </span>
        </div>
      </div>

    </div>
  );
}
