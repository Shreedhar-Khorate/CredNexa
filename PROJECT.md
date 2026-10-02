# CredNexa: Automated Loan Eligibility & Risk Analytics Platform

> **Project Report & Architectural Overview**  
> *A production-ready Machine Learning system and Web Application for credit risk evaluation, applicant segmentation, decision explainability, and model monitoring.*

---

## 1. Executive Summary

**CredNexa** is an automated loan screening and risk analytics platform designed for retail banking institutions. It replaces manual underwriting heuristics with a calibrated Machine Learning classifier, an unsupervised customer segmentation engine, and an interactive web portal.

The platform processes applicant financial metrics (income, loan size, term, credit history, property location, and demographics) to compute calibrated approval probabilities, decision thresholds, segment classifications, decision driver explainability, and actionable what-if recommendations.

---

## 2. Platform Features & Capabilities

### 🧠 Machine Learning Engine
- **Leakage-Free Training Pipeline**: Enforces a strict 80/20 stratified train-test split **prior** to any feature transformation or fitting, preventing optimistic test metric inflation.
- **Calibrated Classifier**: Utilizes `CalibratedClassifierCV` (Sigmoid calibration) over a tuned Logistic Regression core (`C=0.1`) to ensure probabilities accurately represent real-world approval likelihoods.
- **Out-of-Fold Threshold Selection**: Automatically selects the decision threshold ($0.414522$) that maximizes F1-score using Out-Of-Fold probabilities on the **training set only**, avoiding data leakage.
- **Continuous Value Clipping (`Clipper`)**: Clips numerical input features to 1st–99th percentiles of the training distribution, preventing out-sized outlier leverage while allowing inference on high-income applicants without row dropping.
- **Annuity EMI Calculation**: Standard 9% annual interest rate annuity formula:
  $$\text{EMI} = P \times i \times \frac{(1+i)^n}{(1+i)^n - 1}$$
- **Applicant Risk Segmentation**: Unsupervised $K$-Means clustering ($S = 0.4823$) categorizing applicants into distinct financial segments (e.g. *Single Applicant Household* vs. *Dual-Income Household*).

### 🛡️ Responsible AI & Governance
- **Sensitive Attribute Exclusion**: Excludes `Gender` from model feature inputs to eliminate demographic bias in automated credit scoring.
- **Missing Signal Preservation**: Encodes `Credit_History` into 3 explicit categories (`1`, `0`, `Unknown`), preserving signal for applicants with missing credit records.
- **Model Governance Artifacts**: Automatically generates versioned models (`model_v1.joblib`), clustering models (`cluster_v1.joblib`), evaluation matrices (`metrics.json`), feature coefficient weights (`coefficients.csv`), and visualization charts (`roc.png`, `confusion_matrix.png`, `calibration.png`).

### 💻 Web Application & UX
- **Interactive Assessment Portal**: Modern dark-mode user interface with 1-click sample profile loader buttons (*Standard*, *High Income*, *Bad Credit*, *Short Term*).
- **Visual Risk Gauge**: Animated radial score gauge depicting approval percentage, threshold marker, and decision badges (*APPROVED* / *REJECTED*).
- **Explainability Cards**: Visual bar indicators illustrating the positive and negative impact of key applicant attributes based on learned logistic regression coefficients.
- **Actionable What-If Recommendations**: Automatically suggests targeted adjustments (e.g., *Reduce loan amount by 15%*, *Add co-applicant income*) that raise approval probability.
- **Admin Dashboard**: Live system monitoring displaying leakage-free 5-fold CV statistics, holdout test metrics, confusion matrix breakdown, and coefficient tables.

---

## 3. Technology Stack

| Layer | Component | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18+ & Vite | Single Page Application built for rapid rendering and HMR. |
| **Frontend Styling** | Tailwind CSS v4 | Utility-first CSS with dark/light themes and glassmorphic UI. |
| **Icons & Charts** | `lucide-react` & `recharts` | UI icons and responsive SVG data visualization charts. |
| **HTTP Client** | Axios | Async API client with offline demo fallback simulation. |
| **Backend Framework** | FastAPI (Python 3.10+) | Asynchronous REST microservice with automatic OpenAPI Swagger docs. |
| **Data Validation** | Pydantic v2 | Strict DTO schemas for requests, responses, and error handling. |
| **ML Core** | Scikit-Learn, Pandas, NumPy | Pipeline transformations, cross-validation, calibration, and inference. |
| **Artifact Storage** | Joblib & JSON | Serialized production model files and metadata metrics. |
| **Database & Auth** | Supabase (PostgreSQL) | Managed PostgreSQL schema with Row Level Security (RLS) policies. |
| **Testing** | Pytest 9.0+ | Automated test suite for preprocessing, API contracts, and robustness. |

---

## 4. Complete Project Directory Structure

```
CredNexa/
├── backend/
│   └── main.py                     # FastAPI REST API server (Endpoints: health, predict, history, metrics)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Top navigation bar & API status indicator
│   │   │   ├── LoanForm.jsx        # Application input form & 1-click preset loader
│   │   │   ├── ProbabilityGauge.jsx# Circular probability gauge & decision badge
│   │   │   ├── ExplainabilityCard.jsx # Feature contribution impact visualizer
│   │   │   ├── SuggestionsCard.jsx # Actionable what-if recommendations
│   │   │   ├── AdminDashboard.jsx  # Model benchmarks, confusion matrix & feature weights
│   │   │   └── HistoryTable.jsx    # Application audit log history table
│   │   ├── services/
│   │   │   └── api.js              # Axios API client with fallback simulation
│   │   ├── App.jsx                 # Tab state router & view container
│   │   └── index.css               # Tailwind CSS entry directives & custom glass styles
│   ├── tailwind.config.js          # Tailwind CSS theme configuration
│   ├── postcss.config.js           # PostCSS configuration for Tailwind v4
│   └── package.json                # Frontend package dependencies
├── ml/
│   ├── config.py                   # Paths, seeds, feature schemas, and global constants
│   ├── preprocess.py               # Feature engineering, Clipper percentile transformer, ColumnTransformer
│   ├── train.py                    # Stratified split, baseline comparisons, Repeated CV, calibration, artifacts
│   ├── cluster.py                  # K-Means silhouette evaluation & applicant segmentation
│   └── predict.py                  # Core inference API function, validation, explainability & suggestions
├── artifacts/
│   ├── model_v1.joblib             # Serialized production classification pipeline
│   ├── cluster_v1.joblib           # Serialized K-Means clustering pipeline
│   ├── metrics.json                # Comprehensive evaluation metrics & metadata
│   ├── coefficients.csv            # Learned feature weight coefficients
│   ├── roc.png                     # Receiver Operating Characteristic plot
│   ├── confusion_matrix.png        # Holdout test confusion matrix plot
│   └── calibration.png             # Probability calibration curve plot
├── data/
│   ├── Loan_Data.csv               # Raw dataset copy (614 rows x 13 columns)
│   ├── train.csv                   # Training data split (487 rows)
│   ├── test.csv                    # Holdout test data split (122 rows)
│   └── historical_seed.csv         # Cleaned seed dataset (609 rows)
├── Data-Models/                    # Original exploratory notebooks & analysis reports
│   ├── Loan.ipynb                  # Preprocessing & Decision Tree analysis
│   ├── DWMLoan.ipynb               # Classification model comparisons & Naïve Bayes
│   ├── DWMLoanKmeansCluster.ipynb  # Supervised & K-Means clustering analysis
│   ├── Agglomerative_Clustering.ipynb # Hierarchical Agglomerative clustering study
│   ├── LOANEXP6.ipynb              # Logistic Regression accuracy & coefficient study
│   └── Loan_EDA.ipynb              # Exploratory Data Analysis & business insights report
├── tests/
│   ├── fixtures/
│   │   └── example_inputs.json     # Test payload fixtures (valid, bad credit, short/long terms)
│   ├── test_preprocess.py          # Pytest suite for EMI, Clipper, features, and zero leakage
│   └── test_predict.py             # Pytest suite for validation, unseen categories, extreme values, and sign sanity
├── requirements.txt                # Pinned backend Python dependencies
├── README.md                       # Project quick start & disclaimer
└── TECH.md                         # Technical system design specification
```

---

## 5. Model Evaluation Benchmarks

Evaluated on the 609 raw record dataset (after income $\ge 1000$ filtering) using a leakage-free 80/20 stratified split (487 Train / 122 Holdout Test):

| Model / Baseline | Out-Of-Fold CV Accuracy (Train) | Out-Of-Fold CV ROC-AUC (Train) | Holdout Accuracy (Test) | Holdout ROC-AUC (Test) | Holdout F1-Score |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Majority Baseline** | 68.79% ± 0.00% | 0.5000 | 68.85% | 0.5000 | 0.8155 |
| **Credit_History Rule** | 76.80% ± 0.00% | 0.6966 | 77.87% | 0.6880 | 0.8525 |
| **Credit_History LogReg** | 80.90% ± 3.43% | 0.6883 | 81.97% | 0.7013 | 0.8830 |
| **Logistic Regression (Tuned C=0.1)** | **80.08% ± 3.24%** | **0.7310** | **81.97%** | **0.8192** | **0.8830** |
| **Random Forest** | 80.29% ± 2.86% | 0.7398 | 81.97% | 0.8371 | 0.8830 |
| **Extra Trees** | 79.67% ± 3.89% | 0.7081 | 81.15% | 0.7967 | 0.8778 |
| **Gradient Boosting** | 78.85% ± 1.96% | 0.7345 | 79.51% | 0.7910 | 0.8646 |
| **SVM Classifier** | 80.08% ± 3.09% | 0.7432 | 81.15% | 0.8468 | 0.8778 |
| **Final Calibrated LogReg (Threshold=0.4145)** | - | - | **81.97%** | **0.8227** | **0.8830** |

### Holdout Confusion Matrix Breakdown
- **True Approved ($Y \rightarrow Y$)**: 83 applicants
- **True Rejected ($N \rightarrow N$)**: 17 applicants
- **False Approved ($N \rightarrow Y$)**: 21 applicants
- **False Rejected ($Y \rightarrow N$)**: 1 applicant

---

## 6. REST API Endpoint Reference

| Method | Endpoint | Description | Sample Output / Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Health status and model version | `{"status": "healthy", "active_version": "v1"}` |
| `POST` | `/api/v1/predict` | Runs model inference on application payload | Returns decision, probability, threshold, factors & suggestions |
| `GET` | `/api/v1/applications` | Lists historical application audit logs | `{"total": N, "applications": [...]}` |
| `GET` | `/api/v1/applications/{id}` | Fetches application detail report by UUID | Returns complete single assessment JSON |
| `GET` | `/api/v1/admin/metrics` | Returns CV benchmarks, confusion matrix & weights | Reads [`artifacts/metrics.json`](file:///c:/Users/Shreedhar%20Khorate/Desktop/CredNexa/artifacts/metrics.json) & [`coefficients.csv`](file:///c:/Users/Shreedhar%20Khorate/Desktop/CredNexa/artifacts/coefficients.csv) |

---

## 7. Quality Assurance & Test Suite

Automated Pytest suite (`pytest -v`) verifies pipeline correctness and robustness across 10 test cases:

```
tests/test_predict.py::test_missing_required_field PASSED                [ 10%]
tests/test_predict.py::test_unseen_categorical_value PASSED              [ 20%]
tests/test_predict.py::test_extreme_input_values PASSED                  [ 30%]
tests/test_predict.py::test_term_12_and_480 PASSED                       [ 40%]
tests/test_predict.py::test_credit_history_sign_sanity PASSED            [ 50%]
tests/test_preprocess.py::test_annuity_emi_formula PASSED                [ 60%]
tests/test_preprocess.py::test_add_features_creation PASSED              [ 70%]
tests/test_preprocess.py::test_clipper_bounds PASSED                     [ 80%]
tests/test_preprocess.py::test_credit_history_formatting PASSED          [ 90%]
tests/test_preprocess.py::test_no_leakage_transformers PASSED            [100%]
```

---

## 8. Quick Start & Execution Commands

### 8.1 Backend API Server
```bash
# From project root
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```
- Interactive Swagger API Documentation: [`http://127.0.0.1:8000/docs`](http://127.0.0.1:8000/docs)

### 8.2 Frontend Web Application
```bash
cd frontend
npm run dev
```
- Local Web Application URL: [`http://localhost:5173`](http://localhost:5173)

### 8.3 Retrain ML Pipeline & Run Tests
```bash
# Retrain classification model
python -m ml.train --data data/Loan_Data.csv

# Retrain applicant segmentation model
python -m ml.cluster

# Run test suite
pytest -v
```

---

> **Academic Disclaimer:** CredNexa is developed as an educational decision-support demonstration for risk analytics. It does not replace formal banking compliance or legally binding credit underwriting decisions.
