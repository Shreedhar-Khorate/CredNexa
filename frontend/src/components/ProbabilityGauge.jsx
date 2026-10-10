import React from 'react';
import { CheckCircle2, XCircle, Layers, Cpu } from 'lucide-react';

export default function ProbabilityGauge({ probability, threshold, decision, segment }) {
  const percentage = Math.round(probability * 100);
  const isApproved = decision === 'Approved';

  // SVG Gauge calculations (radius = 44, circumference = 2 * pi * 44 ~= 276.46)
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * percentage) / 100;

  return (
    <div className={`cn-card p-6 flex flex-col justify-between relative transition-all ${
      isApproved ? 'border-emerald-500/25' : 'border-rose-500/25'
    }`}>
      
      {/* ── Top Header & Decision Badge ── */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-[var(--cn-border)]">
        <span className="text-[11px] font-mono font-medium text-[var(--cn-text-subtle)] flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-[var(--cn-primary)]" />
          <span>Calibrated Model Score</span>
        </span>

        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
          isApproved
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25'
        }`}>
          {isApproved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          <span>{isApproved ? 'Approved' : 'Rejected'}</span>
        </span>
      </div>

      {/* ── Analytical Score Ring ── */}
      <div className="relative w-44 h-44 mx-auto flex items-center justify-center my-4 select-none">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background Track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="text-[var(--cn-surface-muted)]"
            strokeWidth="7"
            stroke="currentColor"
            fill="transparent"
          />
          {/* Active Calibrated Arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className={`transition-all duration-1000 ease-out ${
              isApproved ? 'text-emerald-500' : 'text-rose-500'
            }`}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
          />
        </svg>

        {/* Center Numerical Typography */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-extrabold text-[var(--cn-text-main)] tracking-tight font-mono">
            {percentage}%
          </span>
          <span className="text-[11px] text-[var(--cn-text-muted)] font-medium mt-0.5">
            Approval Probability
          </span>
          <span className="text-[9px] text-[var(--cn-text-subtle)] font-mono">
            P(Y = 1 | X)
          </span>
        </div>
      </div>

      {/* ── Threshold & Segment Benchmarks ── */}
      <div className="w-full pt-3 border-t border-[var(--cn-border)] space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--cn-text-muted)] font-mono">
          <div className="text-left">
            <span className="text-[10px] text-[var(--cn-text-subtle)] block">Decision Cutoff</span>
            <span className="text-[var(--cn-text-main)] font-semibold">
              {Math.round(threshold * 100)}% threshold
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[var(--cn-text-subtle)] block">Risk Segment</span>
            <span className="inline-flex items-center gap-1 text-[var(--cn-primary)] font-semibold truncate max-w-[130px]">
              <Layers className="w-3 h-3 flex-shrink-0" />
              <span>{segment?.name || 'Standard'}</span>
            </span>
          </div>
        </div>

        {/* Advisory Note */}
        <p className="text-[10px] text-[var(--cn-text-subtle)] text-center leading-tight pt-1">
          Advisory ML score based on calibrated logistic regression.
        </p>
      </div>

    </div>
  );
}
