import React, { useEffect, useState } from 'react';
import { Sparkles, Bot, CheckCircle, Cpu, RefreshCw, ShieldAlert } from 'lucide-react';
import { fetchAiExplanation } from '../services/api';

export default function AiExplanationCard({ assessment }) {
  const [explanation, setExplanation] = useState(assessment?.llm_explanation || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (assessment?.llm_explanation) {
      setExplanation(assessment.llm_explanation);
    } else if (assessment) {
      // Auto-fetch explanation if not present in initial prediction response
      setLoading(true);
      fetchAiExplanation(assessment)
        .then((data) => setExplanation(data))
        .catch((err) => console.error('Failed to auto-fetch AI explanation:', err))
        .finally(() => setLoading(false));
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
    <div className="cn-card p-6 shadow-xl relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-[var(--cn-border)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--cn-text-main)] flex items-center gap-2">
              <span>AI Assessment Insights</span>
            </h3>
            <p className="text-xs text-[var(--cn-text-muted)] mt-0.5">
              Evidence-grounded natural language reasoning layer
            </p>
          </div>
        </div>

        {!explanation && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="cn-btn cn-btn-ai text-xs py-2 px-4 shadow-sm cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing Evidence...</span>
              </>
            ) : (
              <>
                <Bot className="w-4 h-4" />
                <span>Explain with AI</span>
              </>
            )}
          </button>
        )}
      </div>

      {explanation && (
        <div className="space-y-4 text-sm animate-fadeIn">
          
          {/* Active Engine Metadata Badge */}
          <div className="flex items-center justify-between bg-[var(--cn-surface-elevated)] px-3.5 py-2 rounded-xl border border-[var(--cn-border)] text-xs">
            <span className="text-[var(--cn-text-muted)] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Active Inference Engine:</span>
            </span>
            <span className="font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/25 font-mono text-[11px]">
              {explanation.engine_used || 'Gemini 1.5 Flash'}
            </span>
          </div>

          {/* Narrative Summary */}
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[var(--cn-text-main)]">
            <p className="font-medium text-sm leading-relaxed">{explanation.summary}</p>
          </div>

          {/* Comprehensive 2-Paragraph Detailed AI Narrative */}
          {explanation.detailed_narrative && (
            <div className="p-4 rounded-xl bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)] space-y-3">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-indigo-400" />
                <span>Comprehensive Decision Analysis</span>
              </h4>
              {explanation.detailed_narrative.split("\n\n").map((para, idx) => (
                <p key={idx} className="text-xs leading-relaxed text-[var(--cn-text-secondary)]">
                  {para}
                </p>
              ))}
            </div>
          )}

          {/* Prediction Explanation */}
          <div className="p-4 rounded-xl bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)]">
            <h4 className="text-xs font-bold text-[var(--cn-text-main)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>Decision Threshold Rationale</span>
            </h4>
            <p className="text-[var(--cn-text-secondary)] text-xs leading-relaxed">
              {explanation.prediction_explanation}
            </p>
          </div>

          {/* Key Factor Explanations */}
          {explanation.key_factors && explanation.key_factors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[var(--cn-text-main)] uppercase tracking-wider">
                Primary Decision Drivers
              </h4>
              <div className="grid gap-2">
                {explanation.key_factors.map((item, idx) => (
                  <div key={idx} className="p-3 bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)] rounded-xl text-xs">
                    <span className="font-semibold text-indigo-400">{item.feature}: </span>
                    <span className="text-[var(--cn-text-secondary)]">{item.explanation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer & Limitations */}
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[var(--cn-text-main)]">{explanation.disclaimer}</p>
              {explanation.limitations && (
                <ul className="list-disc list-inside mt-1 text-[11px] text-[var(--cn-text-muted)] space-y-0.5">
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
