import React, { useState } from 'react';
import {
  Sparkles, Calculator, UserRound, Wallet, Landmark, ArrowRight, Loader2
} from 'lucide-react';

const SAMPLE_PROFILES = {
  standard: {
    applicant_name: "John Doe",
    ApplicantIncome: 5500,
    CoapplicantIncome: 1800,
    LoanAmount: 140,
    Loan_Amount_Term: 360,
    Credit_History: "1",
    Property_Area: "Semiurban",
    Married: "Yes",
    Education: "Graduate",
    Self_Employed: "No",
    Dependents: "1",
  },
  high_income: {
    applicant_name: "Sarah Jenkins",
    ApplicantIncome: 25000,
    CoapplicantIncome: 0,
    LoanAmount: 220,
    Loan_Amount_Term: 360,
    Credit_History: "1",
    Property_Area: "Urban",
    Married: "Yes",
    Education: "Graduate",
    Self_Employed: "Yes",
    Dependents: "2",
  },
  bad_credit: {
    applicant_name: "Robert Smith",
    ApplicantIncome: 4200,
    CoapplicantIncome: 0,
    LoanAmount: 160,
    Loan_Amount_Term: 360,
    Credit_History: "0",
    Property_Area: "Rural",
    Married: "No",
    Education: "Not Graduate",
    Self_Employed: "No",
    Dependents: "0",
  },
  short_term: {
    applicant_name: "Elena Rostova",
    ApplicantIncome: 8500,
    CoapplicantIncome: 3500,
    LoanAmount: 110,
    Loan_Amount_Term: 120,
    Credit_History: "1",
    Property_Area: "Urban",
    Married: "Yes",
    Education: "Graduate",
    Self_Employed: "No",
    Dependents: "0",
  },
};

export default function LoanForm({ onSubmit, loading }) {
  const [form, setForm] = useState(SAMPLE_PROFILES.standard);
  const [activePreset, setActivePreset] = useState('standard');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setActivePreset(null);
  };

  const handlePreset = (presetKey) => {
    setForm(SAMPLE_PROFILES[presetKey]);
    setActivePreset(presetKey);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formatted = {
      ...form,
      ApplicantIncome: parseFloat(form.ApplicantIncome) || 0,
      CoapplicantIncome: parseFloat(form.CoapplicantIncome) || 0,
      LoanAmount: parseFloat(form.LoanAmount) || 0,
      Loan_Amount_Term: parseFloat(form.Loan_Amount_Term) || 360,
    };
    onSubmit(formatted);
  };

  return (
    <div className="cn-card p-6 sm:p-8 relative">
      {/* ── Top Header & Profile Presets ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-[var(--cn-border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="cn-eyebrow">
              <Calculator className="w-3.5 h-3.5" /> Assessment Workspace
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-[var(--cn-text-main)]">
            Applicant & Credit Parameters
          </h3>
          <p className="text-xs text-[var(--cn-text-muted)] mt-0.5">
            Configure applicant profile parameters to generate instant calibrated ML risk metrics.
          </p>
        </div>

        {/* Quick Profile Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-[var(--cn-text-subtle)] font-mono flex items-center mr-1">
            <Sparkles className="w-3 h-3 text-[var(--cn-primary)] mr-1" /> Presets:
          </span>
          {[
            { key: 'standard', label: 'Standard Prime' },
            { key: 'high_income', label: 'High Net Worth' },
            { key: 'bad_credit', label: 'Subprime Risk' },
            { key: 'short_term', label: 'Short Duration' },
          ].map(preset => {
            const isActive = activePreset === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => handlePreset(preset.key)}
                className={`cn-preset-btn ${isActive ? 'cn-preset-btn-active' : ''}`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* ── SECTION 1: Applicant Profile ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border border-[var(--cn-primary)]/20">
              <UserRound className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--cn-text-main)]">
              1. Applicant Demographics & Profile
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Applicant Name */}
            <div>
              <label className="cn-label" htmlFor="applicant_name">Applicant Full Name *</label>
              <input
                id="applicant_name"
                type="text"
                name="applicant_name"
                value={form.applicant_name}
                onChange={handleChange}
                required
                className="cn-input"
                placeholder="e.g. Eleanor Vance"
              />
              <span className="cn-helper">Full legal name of primary borrower</span>
            </div>

            {/* Marital Status */}
            <div>
              <label className="cn-label" htmlFor="Married">Marital Status</label>
              <select
                id="Married"
                name="Married"
                value={form.Married}
                onChange={handleChange}
                className="cn-select"
              >
                <option value="Yes">Married</option>
                <option value="No">Single</option>
              </select>
              <span className="cn-helper">Household obligation proxy</span>
            </div>

            {/* Dependents */}
            <div>
              <label className="cn-label" htmlFor="Dependents">Dependents</label>
              <select
                id="Dependents"
                name="Dependents"
                value={form.Dependents}
                onChange={handleChange}
                className="cn-select"
              >
                <option value="0">0 Dependents</option>
                <option value="1">1 Dependent</option>
                <option value="2">2 Dependents</option>
                <option value="3+">3+ Dependents</option>
              </select>
              <span className="cn-helper">Financial dependents count</span>
            </div>

            {/* Education */}
            <div>
              <label className="cn-label" htmlFor="Education">Education Level</label>
              <select
                id="Education"
                name="Education"
                value={form.Education}
                onChange={handleChange}
                className="cn-select"
              >
                <option value="Graduate">Graduate Degree</option>
                <option value="Not Graduate">Non-Graduate</option>
              </select>
              <span className="cn-helper">Earning capacity indicator</span>
            </div>

          </div>
        </div>

        {/* ── SECTION 2: Financials & Loan Parameters ── */}
        <div className="pt-4 border-t border-[var(--cn-border)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border border-[var(--cn-primary)]/20">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--cn-text-main)]">
              2. Financials & Requested Loan Terms
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Applicant Income */}
            <div>
              <label className="cn-label" htmlFor="ApplicantIncome">Primary Income (₹/mo) *</label>
              <input
                id="ApplicantIncome"
                type="number"
                name="ApplicantIncome"
                value={form.ApplicantIncome}
                onChange={handleChange}
                required
                min="0"
                className="cn-input font-mono"
              />
              <span className="cn-helper">Monthly verified gross income</span>
            </div>

            {/* Coapplicant Income */}
            <div>
              <label className="cn-label" htmlFor="CoapplicantIncome">Co-Applicant Income (₹/mo)</label>
              <input
                id="CoapplicantIncome"
                type="number"
                name="CoapplicantIncome"
                value={form.CoapplicantIncome}
                onChange={handleChange}
                min="0"
                className="cn-input font-mono"
              />
              <span className="cn-helper">Additional household monthly cashflow</span>
            </div>

            {/* Loan Amount */}
            <div>
              <label className="cn-label" htmlFor="LoanAmount">Loan Principal (₹k) *</label>
              <input
                id="LoanAmount"
                type="number"
                name="LoanAmount"
                value={form.LoanAmount}
                onChange={handleChange}
                required
                min="1"
                className="cn-input font-mono"
              />
              <span className="cn-helper">Expressed in thousands (150 = ₹150,000)</span>
            </div>

            {/* Loan Term */}
            <div>
              <label className="cn-label" htmlFor="Loan_Amount_Term">Loan Duration (Months) *</label>
              <input
                id="Loan_Amount_Term"
                type="number"
                name="Loan_Amount_Term"
                value={form.Loan_Amount_Term}
                onChange={handleChange}
                required
                min="12"
                max="480"
                className="cn-input font-mono"
              />
              <span className="cn-helper">360 months = 30-year amortization</span>
            </div>

          </div>
        </div>

        {/* ── SECTION 3: Credit Risk & Demographics ── */}
        <div className="pt-4 border-t border-[var(--cn-border)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border border-[var(--cn-primary)]/20">
              <Landmark className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--cn-text-main)]">
              3. Credit History & Collateral Geography
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Credit History */}
            <div>
              <label className="cn-label" htmlFor="Credit_History">Credit History Record *</label>
              <select
                id="Credit_History"
                name="Credit_History"
                value={form.Credit_History}
                onChange={handleChange}
                className="cn-select"
              >
                <option value="1">Positive (1.0 — Clean Bureau Record)</option>
                <option value="0">Negative (0.0 — Delinquency / Past Default)</option>
                <option value="Unknown">Untracked / Insufficient History</option>
              </select>
              <span className="cn-helper">Primary ML feature weight</span>
            </div>

            {/* Property Area */}
            <div>
              <label className="cn-label" htmlFor="Property_Area">Property Location Area</label>
              <select
                id="Property_Area"
                name="Property_Area"
                value={form.Property_Area}
                onChange={handleChange}
                className="cn-select"
              >
                <option value="Semiurban">Semiurban</option>
                <option value="Urban">Urban</option>
                <option value="Rural">Rural</option>
                <option value="Metro">Metro</option>
              </select>
              <span className="cn-helper">Collateral market liquidity zone</span>
            </div>

            {/* Self Employed */}
            <div>
              <label className="cn-label" htmlFor="Self_Employed">Employment Classification</label>
              <select
                id="Self_Employed"
                name="Self_Employed"
                value={form.Self_Employed}
                onChange={handleChange}
                className="cn-select"
              >
                <option value="No">Salaried Employee</option>
                <option value="Yes">Self-Employed / Business Owner</option>
              </select>
              <span className="cn-helper">Income volatility proxy</span>
            </div>

          </div>
        </div>

        {/* ── Action Bar & Submission ── */}
        <div className="pt-5 border-t border-[var(--cn-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[var(--cn-text-subtle)] font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Calibrated Logistic Pipeline v1.0 Ready</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cn-btn cn-btn-cta px-6 py-2.5 text-xs font-bold uppercase tracking-wider shadow-md w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Underwriting Analysis...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Execute Risk Screening</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
