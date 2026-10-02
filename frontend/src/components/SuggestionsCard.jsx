import React from 'react';
import { Lightbulb, ArrowRight } from 'lucide-react';

export default function SuggestionsCard({ suggestions = [] }) {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel p-6 border-amber-500/30 bg-amber-500/5">
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-amber-400" />
        </div>
        <h3 className="text-base font-semibold text-white">Actionable What-If Recommendations</h3>
      </div>

      <p className="text-xs text-slate-400 mb-4">
        Modifying application parameters could significantly elevate approval probability:
      </p>

      <div className="space-y-2.5">
        {suggestions.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between bg-slate-900/70 border border-slate-800 p-3 rounded-xl text-xs">
            <span className="text-slate-200 font-medium">{item.change}</span>
            <div className="flex items-center space-x-1 font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
              <ArrowRight className="w-3 h-3" />
              <span>{Math.round(item.new_probability * 100)}% P(Approve)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
