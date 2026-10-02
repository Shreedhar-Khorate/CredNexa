import React, { useEffect, useState } from 'react';
import { Sparkles, Bot, AlertTriangle, CheckCircle, Cpu, RefreshCw, ShieldAlert } from 'lucide-react';
import { fetchAiExplanation } from '../services/api';

export default function AiExplanationCard({ assessment }) {
  const [explanation, setExplanation] = useState(assessment?.llm_explanation || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (assessment?.llm_explanation) {
      setExplanation(assessment.llm_explanation);
    } else {
      setExplanation(null);
    }
  }, [assessment]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await fetchAiExplanation(assessment);
      setExplanation(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!assessment) return null;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              AI Assessment Insights
            </h3>
            <p className="text-xs text-slate-400">
              Evidence-grounded natural language reasoning layer
            </p>
          </div>
        </div>

        {!explanation && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Analyzing Evidence...
              </>
            ) : (
              <>
                <Bot className="w-4 h-4" />
                Explain with AI
              </>
            )}
          </button>
        )}
      </div>

      {explanation && (
        <div className="space-y-4 text-sm animate-fadeIn">
          {/* Active Engine Badge */}
          <div className="flex items-center justify-between bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              Active LLM Engine:
            </span>
            <span className="font-semibold text-purple-300 bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-800/50">
              {explanation.engine_used || 'Gemini 1.5 Flash'}
            </span>
          </div>

          {/* Narrative Summary */}
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-indigo-100">
            <p className="font-medium leading-relaxed">{explanation.summary}</p>
          </div>

          {/* Prediction Explanation */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Decision Threshold Rationale
            </h4>
            <p className="text-slate-300 text-xs leading-relaxed">
              {explanation.prediction_explanation}
            </p>
          </div>

          {/* Key Factor Explanations */}
          {explanation.key_factors && explanation.key_factors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Primary Decision Drivers
              </h4>
              <div className="grid gap-2">
                {explanation.key_factors.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-950/30 border border-slate-800/60 rounded-xl text-xs">
                    <span className="font-semibold text-purple-300">{item.feature}: </span>
                    <span className="text-slate-300">{item.explanation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer & Limitations */}
          <div className="p-3 bg-amber-950/20 border border-amber-800/30 rounded-xl text-amber-200/90 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{explanation.disclaimer}</p>
              {explanation.limitations && (
                <ul className="list-disc list-inside mt-1 text-[11px] text-amber-300/70 space-y-0.5">
                  {explanation.limitations.map((lim, idx) => (
                    <li key={idx}>{lim}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
