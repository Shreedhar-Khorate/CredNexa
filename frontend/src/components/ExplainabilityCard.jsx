import React from 'react';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';

export default function ExplainabilityCard({ topFactors = [] }) {
  if (!topFactors || topFactors.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white flex items-center space-x-2">
          <span>Top Contributing Decision Factors</span>
        </h3>
        <span className="text-xs text-slate-400 font-mono">Logistic Coefficients</span>
      </div>

      <div className="space-y-3">
        {topFactors.map((factor, idx) => {
          const isPos = factor.direction === 'positive';
          const mag = Math.abs(factor.impact);
          const barWidth = Math.min(100, Math.max(15, mag * 50));

          return (
            <div key={idx} className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-200 flex items-center space-x-1.5">
                  {isPos ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span>{factor.feature}</span>
                </span>
                <span className={`font-mono font-semibold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPos ? '+' : ''}{factor.impact}
                </span>
              </div>

              {/* Impact Bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
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
