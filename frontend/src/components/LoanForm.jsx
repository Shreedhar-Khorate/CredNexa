import React, { useState } from 'react';
import {
  Sparkles, Calculator, User, Coins, ShieldCheck, ArrowRight, Loader2
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
      {/* Top Header & Presets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-[var(--cn-border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="cn-eyebrow">
              <Calculator className="w-3.5 h-3.5" /> Workspace
            </span>
          </div>
          <h2 className="text-xl font-bold text-[var(--cn-text-main)] flex items-center space-x-2">
            <span>Loan Application Details</span>
          </h2>
          <p className="text-xs text-[var(--cn-text-muted)] mt-0.5">
            Input applicant parameters to run instant calibrated machine learning risk screening.
          </p>
        </div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--cn-text-subtle)] font-mono flex items-center mr-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 mr-1" /> Presets:
          </span>
          <button
            type="button"
            onClick={() => handlePreset('standard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activePreset === 'standard'
                ? 'bg-sky-500/15 text-sky-500 dark:text-sky-400 border border-sky-500/40 shadow-xs'
                : 'bg-[var(--cn-surface-elevated)] hover:bg-[var(--cn-surface-muted)] text-[var(--cn-text-muted)] border border-[var(--cn-border)]'
            }`}
          >
            Standard
          </button>
          <button
            type="button"
            onClick={() => handlePreset('high_income')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activePreset === 'high_income'
                ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/40 shadow-xs'
                : 'bg-[var(--cn-surface-elevated)] hover:bg-[var(--cn-surface-muted)] text-[var(--cn-text-muted)] border border-[var(--cn-border)]'
            }`}
          >
            High Income
          </button>
          <button
            type="button"
            onClick={() => handlePreset('bad_credit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activePreset === 'bad_credit'
                ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/40 shadow-xs'
                : 'bg-[var(--cn-surface-elevated)] hover:bg-[var(--cn-surface-muted)] text-[var(--cn-text-muted)] border border-[var(--cn-border)]'
            }`}
          >
            Bad Credit
          </button>
          <button
            type="button"
            onClick={() => handlePreset('short_term')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activePreset === 'short_term'
                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/40 shadow-xs'
                : 'bg-[var(--cn-surface-elevated)] hover:bg-[var(--cn-surface-muted)] text-[var(--cn-text-muted)] border border-[var(--cn-border)]'
            }`}
          >
            Short Term
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-7">
        
        {/* ── GROUP 1: Applicant Information ── */}
        <div>
          <div className="flex items-center gap-2 mb-3.5">
            <User className="w-4 h-4 text-sky-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--cn-text-main)]">
              Applicant Information
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Applicant Name */}
            <div>
              <label className="cn-label" htmlFor="applicant_name">Applicant Full Name</label>
              <input
                id="applicant_name"
                type="text"
                name="applicant_name"
                value={form.applicant_name}
                onChange={handleChange}
                required
                className="cn-input"
              />
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
            </div>

            {/* Number of Dependents */}
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
            </div>

            {/* Education Level */}
            <div>
              <label className="cn-label" htmlFor="Education">Education Level</label>
              <select
                id="Education"
                name="Education"
                value={form.Education}
                onChange={handleChange}
                className="cn-select"
              >
                <option value="Graduate">Graduate</option>
                <option value="Not Graduate">Not Graduate</option>
              </select>
            </div>

          </div>
        </div>

        {/* ── GROUP 2: Financial Information ── */}
        <div className="pt-2 border-t border-[var(--cn-border)]">
          <div className="flex items-center gap-2 mb-3.5">
            <Coins className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--cn-text-main)]">
              Financial & Loan Parameters
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Applicant Income */}
            <div>
              <label className="cn-label" htmlFor="ApplicantIncome">Applicant Income (₹/mo)</label>
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
              <span className="cn-helper">Monthly primary income</span>
            </div>

            {/* Coapplicant Income */}
            <div>
              <label className="cn-label" htmlFor="CoapplicantIncome">Coapplicant Income (₹/mo)</label>
              <input
                id="CoapplicantIncome"
                type="number"
                name="CoapplicantIncome"
                value={form.CoapplicantIncome}
                onChange={handleChange}
                min="0"
                className="cn-input font-mono"
              />
              <span className="cn-helper">Monthly secondary income</span>
            </div>

            {/* Loan Amount */}
            <div>
              <label className="cn-label" htmlFor="LoanAmount">Loan Amount (₹k)</label>
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
              <span className="cn-helper">e.g. 150 = ₹150,000</span>
            </div>

            {/* Loan Term */}
            <div>
              <label className="cn-label" htmlFor="Loan_Amount_Term">Loan Term (Months)</label>
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
              <span className="cn-helper">360 = 30 Years</span>
            </div>

          </div>
        </div>

        {/* ── GROUP 3: Credit Risk & Demographics ── */}
        <div className="pt-2 border-t border-[var(--cn-border)]">
          <div className="flex items-center gap-2 mb-3.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--cn-text-main)]">
              Credit Risk & Demographics
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Credit History */}
            <div>
              <label className="cn-label" htmlFor="Credit_History">Credit History</label>
              <select
                id="Credit_History"
                name="Credit_History"
                value={form.Credit_History}
                onChange={handleChange}
                className="cn-select"
              >
                <option value="1">Positive (1.0 - Clean Record)</option>
                <option value="0">Negative (0.0 - Past Delinquency)</option>
                <option value="Unknown">Unknown / Untracked</option>
              </select>
              <span className="cn-helper">Primary ML feature weight</span>
            </div>

            {/* Property Area */}
            <div>
              <label className="cn-label" htmlFor="Property_Area">Property Location</label>
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
              <span className="cn-helper">Collateral geography</span>
            </div>

            {/* Self Employed */}
            <div>
              <label className="cn-label" htmlFor="Self_Employed">Employment Type</label>
              <select
                id="Self_Employed"
                name="Self_Employed"
                value={form.Self_Employed}
                onChange={handleChange}
                className="cn-select"
              >
                <option value="No">Salaried Employee</option>
                <option value="Yes">Self-Employed / Business</option>
              </select>
              <span className="cn-helper">Income stability proxy</span>
            </div>

          </div>
        </div>

        {/* Submit Action Bar */}
        <div className="pt-4 border-t border-[var(--cn-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[var(--cn-text-subtle)] font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>CredNexa Calibrated ML Pipeline v1.0 Ready</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cn-btn cn-btn-cta px-6 py-3 text-sm shadow-md cursor-pointer w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Evaluating Applicant Profile...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Run Eligibility Assessment</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
