"""Preprocessing module for CredNexa ML pipeline."""

from typing import List, Optional
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from ml.config import ANNUAL_INTEREST_RATE, CATEGORICAL_FEATURES, NUMERIC_FEATURES


def calculate_annuity_emi(
    loan_amount_k: float,
    term_months: float,
    annual_rate: float = ANNUAL_INTEREST_RATE,
) -> float:
    """Calculate monthly annuity EMI for loan amount in thousands and term in months."""
    if pd.isna(loan_amount_k) or loan_amount_k <= 0:
        return 0.0
    if pd.isna(term_months) or term_months <= 0:
        term_months = 360.0

    p = loan_amount_k * 1000.0
    i = annual_rate / 12.0
    n = float(term_months)

    try:
        factor = (1.0 + i) ** n
        emi = p * i * factor / (factor - 1.0)
        return float(emi)
    except (OverflowError, ZeroDivisionError):
        return float(p / n)


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """Engineer financial features and format categorical variables."""
    df_out = df.copy()

    # Drop Loan_ID and Gender if present
    for col in ["Loan_ID", "Gender"]:
        if col in df_out.columns:
            df_out = df_out.drop(columns=[col])

    # Convert numeric fields safely
    for col in ["ApplicantIncome", "CoapplicantIncome", "LoanAmount", "Loan_Amount_Term"]:
        if col in df_out.columns:
            df_out[col] = pd.to_numeric(df_out[col], errors="coerce")
        else:
            df_out[col] = 0.0

    # 1. Total Income
    applicant_inc = df_out["ApplicantIncome"].fillna(0.0).clip(lower=0)
    coapplicant_inc = df_out["CoapplicantIncome"].fillna(0.0).clip(lower=0)
    total_income = applicant_inc + coapplicant_inc
    df_out["TotalIncome"] = total_income

    # 2. Has Coapplicant
    df_out["Has_Coapplicant"] = (coapplicant_inc > 0).astype(int)

    # 3. Log Transforms
    df_out["Log_ApplicantIncome"] = np.log1p(applicant_inc)
    df_out["Log_CoapplicantIncome"] = np.log1p(coapplicant_inc)
    df_out["Log_LoanAmount"] = np.log1p(df_out["LoanAmount"].fillna(0.0).clip(lower=0))

    # 4. Annuity EMI
    def row_emi(row):
        return calculate_annuity_emi(row.get("LoanAmount"), row.get("Loan_Amount_Term"))

    df_out["EMI"] = df_out.apply(row_emi, axis=1)

    # 5. Loan to Income ratio
    df_out["LoanToIncome"] = df_out["LoanAmount"].fillna(0.0) / (total_income + 1.0)

    # 6. Credit History formatting (1 / 0 / Unknown)
    if "Credit_History" in df_out.columns:
        def format_credit_history(val):
            if pd.isna(val) or val is None or str(val).strip().lower() in ["unknown", "nan", "", "none"]:
                return "Unknown"
            try:
                v_float = float(val)
                if v_float == 1.0:
                    return "1"
                elif v_float == 0.0:
                    return "0"
            except (ValueError, TypeError):
                pass
            s_val = str(val).strip()
            if s_val in ["1", "1.0", "Yes", "Y"]:
                return "1"
            if s_val in ["0", "0.0", "No", "N"]:
                return "0"
            return "Unknown"

        df_out["Credit_History"] = df_out["Credit_History"].apply(format_credit_history)

    # Format other categoricals as string
    for cat_col in ["Married", "Education", "Self_Employed", "Dependents", "Property_Area"]:
        if cat_col in df_out.columns:
            df_out[cat_col] = df_out[cat_col].astype(str).fillna("Unknown").replace({"nan": "Unknown", "None": "Unknown"})

    return df_out


class Clipper(BaseEstimator, TransformerMixin):
    """Transformer to clip numeric feature values to lower and upper percentile bounds."""

    def __init__(self, lower_percentile: float = 1.0, upper_percentile: float = 99.0):
        self.lower_percentile = lower_percentile
        self.upper_percentile = upper_percentile
        self.lower_bounds_ = None
        self.upper_bounds_ = None

    def fit(self, X, y=None):
        X_arr = np.asarray(X, dtype=np.float64)
        self.lower_bounds_ = np.nanpercentile(X_arr, self.lower_percentile, axis=0)
        self.upper_bounds_ = np.nanpercentile(X_arr, self.upper_percentile, axis=0)
        return self

    def transform(self, X):
        X_arr = np.asarray(X, dtype=np.float64)
        if self.lower_bounds_ is None or self.upper_bounds_ is None:
            return X_arr
        return np.clip(X_arr, self.lower_bounds_, self.upper_bounds_)


def build_column_transformer(
    numeric_cols: Optional[List[str]] = None,
    categorical_cols: Optional[List[str]] = None,
) -> ColumnTransformer:
    """Construct ColumnTransformer for feature pipeline."""
    num_cols = NUMERIC_FEATURES if numeric_cols is None else numeric_cols
    cat_cols = CATEGORICAL_FEATURES if categorical_cols is None else categorical_cols

    transformers = []

    if num_cols:
        num_pipeline = Pipeline(
            [
                ("clip", Clipper(1.0, 99.0)),
                ("imp", SimpleImputer(strategy="median")),
                ("sc", StandardScaler()),
            ]
        )
        transformers.append(("num", num_pipeline, num_cols))

    if cat_cols:
        cat_pipeline = Pipeline(
            [
                ("imp", SimpleImputer(strategy="constant", fill_value="Unknown")),
                ("oh", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
            ]
        )
        transformers.append(("cat", cat_pipeline, cat_cols))

    preprocessor = ColumnTransformer(transformers=transformers)
    return preprocessor
