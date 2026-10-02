import React, { useState } from 'react';
import { Sparkles, Calculator } from 'lucide-react';

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePreset = (presetKey) => {
    setForm(SAMPLE_PROFILES[presetKey]);
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
    <div className="glass-panel p-6 sm:p-8 relative">
      {/* Top Header & Presets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-700/60">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-sky-400" />
            <span>Loan Application Details</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Input applicant parameters to run instant machine learning screening.
          </p>
        </div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-mono flex items-center mr-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 mr-1" /> Presets:
          </span>
          <button
            type="button"
            onClick={() => handlePreset('standard')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
          >
            Standard
          </button>
          <button
            type="button"
            onClick={() => handlePreset('high_income')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-emerald-400 border border-slate-700 transition"
          >
            High Income
          </button>
          <button
            type="button"
            onClick={() => handlePreset('bad_credit')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-rose-400 border border-slate-700 transition"
          >
            Bad Credit
          </button>
          <button
            type="button"
            onClick={() => handlePreset('short_term')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-sky-400 border border-slate-700 transition"
          >
            Short Term
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Applicant Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Applicant Name</label>
            <input
              type="text"
              name="applicant_name"
              value={form.applicant_name}
              onChange={handleChange}
              required
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Applicant Income */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Applicant Monthly Income (₹)</label>
            <input
              type="number"
              name="ApplicantIncome"
              value={form.ApplicantIncome}
              onChange={handleChange}
              required
              min="0"
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono"
            />
          </div>

          {/* Coapplicant Income */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Coapplicant Monthly Income (₹)</label>
            <input
              type="number"
              name="CoapplicantIncome"
              value={form.CoapplicantIncome}
              onChange={handleChange}
              min="0"
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono"
            />
          </div>

          {/* Loan Amount (thousands) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Loan Amount (₹ Thousands)</label>
            <input
              type="number"
              name="LoanAmount"
              value={form.LoanAmount}
              onChange={handleChange}
              required
              min="1"
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">e.g. 150 = ₹150,000</span>
          </div>

          {/* Loan Term (months) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Loan Term (Months)</label>
            <input
              type="number"
              name="Loan_Amount_Term"
              value={form.Loan_Amount_Term}
              onChange={handleChange}
              required
              min="12"
              max="480"
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">360 = 30 Years</span>
          </div>

          {/* Credit History */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Credit History</label>
            <select
              name="Credit_History"
              value={form.Credit_History}
              onChange={handleChange}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="1">Positive (1.0 - Clean Record)</option>
              <option value="0">Negative (0.0 - Past Delinquency)</option>
              <option value="Unknown">Unknown / Untracked</option>
            </select>
          </div>

          {/* Property Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Property Location</label>
            <select
              name="Property_Area"
              value={form.Property_Area}
              onChange={handleChange}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="Semiurban">Semiurban</option>
              <option value="Urban">Urban</option>
              <option value="Rural">Rural</option>
              <option value="Metro">Metro</option>
            </select>
          </div>

          {/* Married */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Marital Status</label>
            <select
              name="Married"
              value={form.Married}
              onChange={handleChange}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="Yes">Married</option>
              <option value="No">Single</option>
            </select>
          </div>

          {/* Education */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Education Level</label>
            <select
              name="Education"
              value={form.Education}
              onChange={handleChange}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="Graduate">Graduate</option>
              <option value="Not Graduate">Not Graduate</option>
            </select>
          </div>

          {/* Self Employed */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Employment Type</label>
            <select
              name="Self_Employed"
              value={form.Self_Employed}
              onChange={handleChange}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="No">Salaried Employee</option>
              <option value="Yes">Self-Employed / Business</option>
            </select>
          </div>

          {/* Dependents */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Number of Dependents</label>
            <select
              name="Dependents"
              value={form.Dependents}
              onChange={handleChange}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="0">0 Dependents</option>
              <option value="1">1 Dependent</option>
              <option value="2">2 Dependents</option>
              <option value="3+">3+ Dependents</option>
            </select>
          </div>

        </div>

        {/* Submit Button */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="glass-button bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-sky-500/25 flex items-center space-x-2 text-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Evaluating Model...' : 'Run Eligibility Assessment'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
