"""Unit tests for preprocessing and feature engineering."""

import sys
from pathlib import Path

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import numpy as np
import pandas as pd
import pytest

from ml.preprocess import (
    Clipper,
    add_features,
    build_column_transformer,
    calculate_annuity_emi,
)


def test_annuity_emi_formula():
    """Test standard annuity EMI formula at 9% interest rate."""
    emi = calculate_annuity_emi(loan_amount_k=128.0, term_months=360.0, annual_rate=0.09)
    # Expected EMI for 128k @ 9% for 30 yrs is approx 1029.92
    assert pytest.approx(emi, abs=1.0) == 1030.0


def test_add_features_creation():
    """Test feature engineering logic."""
    df = pd.DataFrame([{
        "ApplicantIncome": 5000,
        "CoapplicantIncome": 2000,
        "LoanAmount": 150,
        "Loan_Amount_Term": 360,
        "Credit_History": 1.0,
        "Gender": "Male",
        "Loan_ID": "LP001",
    }])

    df_feat = add_features(df)

    assert "TotalIncome" in df_feat.columns
    assert df_feat["TotalIncome"].iloc[0] == 7000
    assert df_feat["Has_Coapplicant"].iloc[0] == 1
    assert "Log_ApplicantIncome" in df_feat.columns
    assert df_feat["Credit_History"].iloc[0] == "1"
    assert "Gender" not in df_feat.columns
    assert "Loan_ID" not in df_feat.columns


def test_clipper_bounds():
    """Test continuous value clipping transformer."""
    X = np.array([[1.0], [2.0], [3.0], [4.0], [100.0]])
    clipper = Clipper(lower_percentile=10, upper_percentile=90)
    clipper.fit(X)
    X_clip = clipper.transform(X)

    assert X_clip.min() >= clipper.lower_bounds_[0]
    assert X_clip.max() <= clipper.upper_bounds_[0]


def test_credit_history_formatting():
    """Test handling of NaN, float and unknown credit history."""
    df = pd.DataFrame([
        {"Credit_History": 1.0},
        {"Credit_History": 0.0},
        {"Credit_History": np.nan},
        {"Credit_History": "Unknown"},
    ])
    df_feat = add_features(df)
    results = df_feat["Credit_History"].tolist()
    assert results == ["1", "0", "Unknown", "Unknown"]
