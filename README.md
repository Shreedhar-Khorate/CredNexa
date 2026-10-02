# CredNexa: Loan Eligibility Prediction & Production ML Pipeline

> **Disclaimer:** Educational decision-support demo. Not for real lending decisions.

## Overview

CredNexa is a production-style Machine Learning module for automated loan eligibility screening and applicant risk segmentation based on historical loan application data.

## Features

- **Leakage-Free Training Pipeline**: Stratified 80/20 split before any fitting; end-to-end `sklearn.pipeline.Pipeline` with `Clipper`, `SimpleImputer`, `StandardScaler`, and `OneHotEncoder`.
- **Annuity EMI Calculation**: Standard 9% annual interest rate annuity formula.
- **Fairness & Sensitive Attribute Exclusion**: `Gender` is excluded from model inputs to prevent demographic bias.
- **Robust Input Handling**: `Credit_History` handled as `1`, `0`, or `Unknown`. Extreme numerical values clipped to 1st-99th training percentiles.
- **Calibrated Probabilities & Thresholding**: Calibrated classifier (`CalibratedClassifierCV`) paired with optimal thresholding.
- **K-Means Applicant Segmentation**: Optimal $K=2$ segmentation pipeline based on silhouette score analysis ($S = 0.6441$).
- **Explainability & What-If Suggestions**: `predict(payload)` returns per-feature contribution factors and actionable what-if recommendations.

## Directory Structure

```
ml/
  config.py          # Relative paths, feature definitions, and global constants
  preprocess.py      # Feature engineering, Clipper transformer, ColumnTransformer
  train.py           # Training routine, baseline metrics, model comparison & calibration
  cluster.py         # K-Means silhouette selection, segmentation pipeline
  predict.py         # Prediction API function, schema validation, explainability & suggestions
artifacts/
  model_v1.joblib    # Production classification pipeline
  cluster_v1.joblib  # K-Means clustering pipeline
  metrics.json       # Baseline metrics, CV scores, holdout results
  coefficients.csv   # Model feature weights
  roc.png, confusion_matrix.png, calibration.png
data/
  Loan_Data.csv      # Raw dataset
tests/
  test_preprocess.py # Unit tests for feature engineering, EMI formula & Clipper
  test_predict.py    # Unit tests for validation, unseen categories & sign sanity
```

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Train Models & Generate Artifacts
```bash
python -m ml.train --data data/Loan_Data.csv
python -m ml.cluster
```

### 3. Run Unit Tests
```bash
pytest -v
```

### 4. Inference Example
```python
from ml.predict import predict

payload = {
    "ApplicantIncome": 5000,
    "CoapplicantIncome": 1500,
    "LoanAmount": 150,
    "Loan_Amount_Term": 360,
    "Credit_History": "1",
    "Property_Area": "Semiurban",
    "Married": "Yes",
    "Education": "Graduate",
    "Self_Employed": "No",
    "Dependents": "0"
}

result = predict(payload)
print(result)
```