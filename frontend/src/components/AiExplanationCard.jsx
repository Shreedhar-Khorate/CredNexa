import React, { useEffect, useState } from 'react';
import { Sparkles, Bot, CheckCircle, Cpu, RefreshCw, ShieldAlert, FileText } from 'lucide-react';
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
    <div className="cn-card p-6 shadow-sm relative">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-[var(--cn-border)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border border-[var(--cn-primary)]/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--cn-text-main)] flex items-center gap-2">
              <span>Explainable AI Intelligence Layer</span>
            </h3>
            <p className="text-xs text-[var(--cn-text-muted)] mt-0.5">
              Evidence-grounded natural language reasoning & compliance narrative
            </p>
          </div>
        </div>

        {!explanation && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="cn-btn cn-btn-primary text-xs py-1.5 px-3.5 cursor-pointer self-start sm:self-auto"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing Evidence...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate AI Explanation</span>
              </>
            )}
          </button>
        )}
      </div>

      {explanation && (
        <div className="space-y-4 text-xs animate-fadeIn">
          
          {/* Active Engine Metadata Badge */}
          <div className="flex items-center justify-between bg-[var(--cn-surface-elevated)] px-3.5 py-2 rounded-xl border border-[var(--cn-border)]">
            <span className="text-[var(--cn-text-muted)] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[var(--cn-primary)]" />
              <span>Inference Engine:</span>
            </span>
            <span className="font-semibold text-[var(--cn-primary)] bg-[var(--cn-primary-tint)] px-2.5 py-0.5 rounded-full border border-[var(--cn-primary)]/20 font-mono text-[11px]">
              {explanation.engine_used || 'Calibrated Natural Language Layer'}
            </span>
          </div>

          {/* Executive Narrative Summary */}
          <div className="p-4 rounded-xl bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)] text-[var(--cn-text-main)]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--cn-primary)] mb-1">
              Executive Assessment Synthesis
            </div>
            <p className="font-medium text-xs sm:text-sm leading-relaxed">
              {explanation.summary}
            </p>
          </div>

          {/* Detailed Decision Analysis */}
          {explanation.detailed_narrative && (
            <div className="p-4 rounded-xl bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)] space-y-2">
              <h4 className="text-[11px] font-bold text-[var(--cn-text-main)] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[var(--cn-primary)]" />
                <span>Decision Evidence & Parametric Breakdown</span>
              </h4>
              {explanation.detailed_narrative.split("\n\n").map((para, idx) => (
                <p key={idx} className="text-xs leading-relaxed text-[var(--cn-text-secondary)]">
                  {para}
                </p>
              ))}
            </div>
          )}

          {/* Decision Threshold Rationale */}
          {explanation.prediction_explanation && (
            <div className="p-3.5 rounded-xl bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)]">
              <h4 className="text-[11px] font-bold text-[var(--cn-text-main)] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>Threshold Evaluation Rationale</span>
              </h4>
              <p className="text-[var(--cn-text-secondary)] text-xs leading-relaxed">
                {explanation.prediction_explanation}
              </p>
            </div>
          )}

          {/* Key Factor Explanations */}
          {explanation.key_factors && explanation.key_factors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-[var(--cn-text-main)] uppercase tracking-wider">
                Primary Decision Drivers
              </h4>
              <div className="grid gap-2">
                {explanation.key_factors.map((item, idx) => (
                  <div key={idx} className="p-3 bg-[var(--cn-surface-elevated)] border border-[var(--cn-border)] rounded-xl">
                    <span className="font-semibold text-[var(--cn-primary)]">{item.feature}: </span>
                    <span className="text-[var(--cn-text-secondary)]">{item.explanation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compliance Disclaimer */}
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs flex items-start gap-2.5">
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
