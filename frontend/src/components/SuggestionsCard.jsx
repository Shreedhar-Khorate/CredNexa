import React from 'react';
import { Lightbulb, ArrowRight, Sparkles } from 'lucide-react';

export default function SuggestionsCard({ suggestions = [] }) {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="cn-card p-6 border-amber-500/25">
      <div className="flex items-center space-x-2.5 mb-2">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500">
          <Lightbulb className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[var(--cn-text-main)] flex items-center gap-1.5">
            <span>Actionable What-If Recommendations</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </h3>
          <p className="text-xs text-[var(--cn-text-muted)] mt-0.5">
            Modifying application parameters could significantly elevate approval probability:
          </p>
        </div>
      </div>

      <div className="space-y-2.5 mt-4">
        {suggestions.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)] hover:border-amber-500/30 p-3 rounded-xl text-xs transition-all"
          >
            <span className="text-[var(--cn-text-main)] font-medium">{item.change}</span>
            <div className="flex items-center space-x-1.5 font-mono text-emerald-500 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              <ArrowRight className="w-3 h-3" />
              <span>{Math.round(item.new_probability * 100)}% P(Approve)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
