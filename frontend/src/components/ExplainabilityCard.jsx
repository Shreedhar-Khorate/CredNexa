import React from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

export default function ExplainabilityCard({ topFactors = [] }) {
  if (!topFactors || topFactors.length === 0) {
    return null;
  }

  return (
    <div className="cn-card p-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--cn-border)]">
        <div>
          <h3 className="text-base font-bold text-[var(--cn-text-main)] flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-500" />
            <span>Top Contributing Decision Factors</span>
          </h3>
          <p className="text-xs text-[var(--cn-text-muted)] mt-0.5">
            Individual parametric weights driving the calibrated credit decision
          </p>
        </div>
        <span className="text-[11px] text-[var(--cn-text-subtle)] font-mono bg-[var(--cn-surface-elevated)] px-2.5 py-1 rounded-lg border border-[var(--cn-border)]">
          Logistic Weights
        </span>
      </div>

      <div className="space-y-3">
        {topFactors.map((factor, idx) => {
          const isPos = factor.direction === 'positive';
          const mag = Math.abs(factor.impact);
          const barWidth = Math.min(100, Math.max(15, mag * 50));

          return (
            <div
              key={idx}
              className="bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)] p-3 rounded-xl transition-all hover:border-[var(--cn-border-muted)]"
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-[var(--cn-text-main)] flex items-center gap-2">
                  {isPos ? (
                    <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="p-1 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20">
                      <TrendingDown className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <span>{factor.feature}</span>
                </span>
                <span className={`font-mono font-bold text-xs ${isPos ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                  {isPos ? '+' : ''}{factor.impact}
                </span>
              </div>

              {/* Impact Bar */}
              <div className="w-full bg-[var(--cn-surface-muted)] rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isPos ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
