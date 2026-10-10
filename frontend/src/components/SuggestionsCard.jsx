import React from 'react';
import { Lightbulb, ArrowRight, Sparkles } from 'lucide-react';

export default function SuggestionsCard({ suggestions = [] }) {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="cn-card p-6 border-amber-500/20">
      <div className="flex items-start sm:items-center space-x-3 mb-4 pb-3 border-b border-[var(--cn-border)]">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 flex-shrink-0 mt-0.5 sm:mt-0">
          <Lightbulb className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[var(--cn-text-main)] flex items-center gap-1.5">
            <span>Actionable What-If Recommendations</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </h3>
          <p className="text-xs text-[var(--cn-text-muted)] mt-0.5">
            Simulated scenario adjustments to enhance approval probability:
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {suggestions.map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)] hover:border-amber-500/30 p-3 rounded-xl text-xs transition-all"
          >
            <span className="text-[var(--cn-text-main)] font-medium">{item.change}</span>
            <div className="flex items-center space-x-1.5 font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 self-start sm:self-auto">
              <ArrowRight className="w-3 h-3" />
              <span>{Math.round(item.new_probability * 100)}% P(Approve)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
