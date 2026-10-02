"""Configuration module for CredNexa ML pipeline."""

import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
ARTIFACTS_DIR = BASE_DIR / "artifacts"

RAW_DATA_PATH = DATA_DIR / "Loan_Data.csv"
TRAIN_DATA_PATH = DATA_DIR / "train.csv"
TEST_DATA_PATH = DATA_DIR / "test.csv"
HISTORICAL_SEED_PATH = DATA_DIR / "historical_seed.csv"

MODEL_PATH = ARTIFACTS_DIR / "model_v1.joblib"
CLUSTER_PATH = ARTIFACTS_DIR / "cluster_v1.joblib"
METRICS_PATH = ARTIFACTS_DIR / "metrics.json"
COEFFS_PATH = ARTIFACTS_DIR / "coefficients.csv"

# Global Constants
SEED = 42
ANNUAL_INTEREST_RATE = 0.09  # 9% annual interest rate for annuity EMI
DEFAULT_THRESHOLD = 0.60

# Feature Specifications
TARGET_COL = "Loan_Status"
DROP_COLS = ["Loan_ID", "Gender"]

NUMERIC_FEATURES = [
    "Log_ApplicantIncome",
    "Log_CoapplicantIncome",
    "Log_LoanAmount",
    "Loan_Amount_Term",
    "LoanToIncome",
    "EMI",
]

CATEGORICAL_FEATURES = [
    "Credit_History",
    "Property_Area",
    "Married",
    "Education",
    "Self_Employed",
    "Dependents",
]

CLUSTER_FEATURES = [
    "Log_ApplicantIncome",
    "Log_CoapplicantIncome",
    "Log_LoanAmount",
]
