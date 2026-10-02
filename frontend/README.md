# CredNexa Frontend (React + Vite + Tailwind CSS)

This is the single-page web portal for the **CredNexa** Loan Eligibility Screening and Credit Risk Analytics Platform.

## Features & UI Components

- **Interactive Assessment Form**: Input applicant profile and financial metrics.
- **Visual Probability Gauge**: Radial progress meter displaying approval likelihood and decision thresholds.
- **Explainability Cards**: Feature impact bars illustrating positive and negative drivers.
- **AI Explanation Panel**: Generates plain-language decision explanations powered by **Google Gemini** (`gemini-1.5-flash`) with automatic **Groq** (`llama-3.3-70b-versatile`) API fallback.
- **Admin Monitoring Dashboard**: Model performance benchmarks, cross-validation metrics, confusion matrix, and feature weight coefficients.

## Setup & Development

```bash
# Install dependencies
npm install

# Run local dev server
npm run dev
```
