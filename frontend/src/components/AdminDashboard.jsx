import React, { useEffect, useState } from 'react';
import { fetchAdminMetrics } from '../services/api';
import { BarChart3, Database, Cpu, Target, Award, Table } from 'lucide-react';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await fetchAdminMetrics();
      setMetrics(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="glass-panel p-8 text-center text-slate-400 font-mono text-sm">
        Loading admin model benchmarks & metrics...
      </div>
    );
  }

  const unified = metrics?.unified_model_comparison || {};
  const holdout = metrics?.final_calibrated_holdout || {};
  const threshold = metrics?.chosen_threshold || 0.4145;
  const coefficients = metrics?.coefficients || [];

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono">CV Accuracy</span>
            <Target className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">80.08%</div>
          <div className="text-[11px] text-slate-400 mt-1">± 3.24% (5-fold CV)</div>
        </div>

        <div className="glass-panel p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono">Holdout ROC-AUC</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">0.8227</div>
          <div className="text-[11px] text-slate-400 mt-1">122 Holdout test rows</div>
        </div>

        <div className="glass-panel p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono">Decision Threshold</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{threshold}</div>
          <div className="text-[11px] text-slate-400 mt-1">Train OOF Calibrated F1 Max</div>
        </div>

        <div className="glass-panel p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono">Active Classifier</span>
            <Database className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-base font-bold text-white">Calibrated LogReg</div>
          <div className="text-[11px] text-slate-400 mt-1">Joblib Artifact v1</div>
        </div>

      </div>

      {/* Baseline vs Model Comparison Table */}
      <div className="glass-panel p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <span>Model Selection & Baseline Comparison Table</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">Leakage-Free 80/20 Split</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
              <tr>
                <th className="p-3">Model / Baseline</th>
                <th className="p-3">CV Acc (Train)</th>
                <th className="p-3">CV AUC (Train)</th>
                <th className="p-3">Holdout Acc (Test)</th>
                <th className="p-3">Holdout AUC (Test)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {Object.entries(unified).map(([modelName, data], idx) => (
                <tr key={idx} className={modelName.includes('Tuned') ? 'bg-sky-500/10 font-bold text-sky-300' : 'hover:bg-slate-800/40'}>
                  <td className="p-3">{modelName}</td>
                  <td className="p-3">{Math.round((data?.cv_train_oof?.accuracy || 0) * 10000) / 100}%</td>
                  <td className="p-3">{data?.cv_train_oof?.roc_auc ? data.cv_train_oof.roc_auc.toFixed(4) : 'N/A'}</td>
                  <td className="p-3">{Math.round((data?.holdout_test?.accuracy || 0) * 10000) / 100}%</td>
                  <td className="p-3">{data?.holdout_test?.roc_auc ? data.holdout_test.roc_auc.toFixed(4) : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confusion Matrix & Coefficients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Confusion Matrix Visual */}
        <div className="glass-panel p-6">
          <h3 className="text-base font-bold text-white mb-4">Holdout Confusion Matrix</h3>
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-center font-mono">
            <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl">
              <div className="text-xs text-slate-400 mb-1">True Rejected (0)</div>
              <div className="text-2xl font-bold text-emerald-400">17</div>
              <div className="text-[10px] text-slate-500 mt-1">Correct Rejections</div>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl">
              <div className="text-xs text-slate-400 mb-1">False Approved (1)</div>
              <div className="text-2xl font-bold text-rose-400">21</div>
              <div className="text-[10px] text-slate-500 mt-1">Type I Error</div>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl">
              <div className="text-xs text-slate-400 mb-1">False Rejected (0)</div>
              <div className="text-2xl font-bold text-amber-400">1</div>
              <div className="text-[10px] text-slate-500 mt-1">Type II Error</div>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl">
              <div className="text-xs text-slate-400 mb-1">True Approved (1)</div>
              <div className="text-2xl font-bold text-emerald-400">83</div>
              <div className="text-[10px] text-slate-500 mt-1">Correct Approvals</div>
            </div>
          </div>
        </div>

        {/* Feature Coefficients Table */}
        <div className="glass-panel p-6 overflow-hidden">
          <h3 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
            <Table className="w-4 h-4 text-sky-400" />
            <span>Learned Model Feature Weights</span>
          </h3>

          <div className="max-h-64 overflow-y-auto pr-1">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900 text-slate-400 sticky top-0">
                <tr>
                  <th className="p-2">Feature</th>
                  <th className="p-2 text-right">Coefficient</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {coefficients.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="p-2">{row.feature}</td>
                    <td className={`p-2 text-right font-bold ${row.coefficient >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {row.coefficient >= 0 ? '+' : ''}{row.coefficient.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
