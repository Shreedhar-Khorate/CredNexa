"""Unit tests for predict contract and model robustness."""

import sys
from pathlib import Path

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import pytest

from ml.predict import ValidationError, predict


@pytest.fixture
def valid_payload():
    return {
        "ApplicantIncome": 5000,
        "CoapplicantIncome": 1500,
        "LoanAmount": 150,
        "Loan_Amount_Term": 360,
        "Credit_History": "1",
        "Property_Area": "Semiurban",
        "Married": "Yes",
        "Education": "Graduate",
        "Self_Employed": "No",
        "Dependents": "0",
    }


def test_missing_required_field():
    """Test validation raises exception on missing required field."""
    invalid_form = {"CoapplicantIncome": 1000}
    with pytest.raises(ValidationError) as exc_info:
        predict(invalid_form)
    assert "ApplicantIncome" in exc_info.value.field


def test_unseen_categorical_value(valid_payload):
    """Test model handles unseen categorical values gracefully without crashing."""
    payload = valid_payload.copy()
    payload["Property_Area"] = "Metro"  # Unseen category
    payload["Credit_History"] = "Unknown"

    result = predict(payload)
    assert result["decision"] in ["Approved", "Rejected"]
    assert 0.0 <= result["probability"] <= 1.0


def test_extreme_input_values(valid_payload):
    """Test model prediction stability on extreme financial values."""
    payload = valid_payload.copy()
    payload["ApplicantIncome"] = 1_000_000
    payload["LoanAmount"] = 50_000

    result = predict(payload)
    assert result["decision"] in ["Approved", "Rejected"]
    assert 0.0 <= result["probability"] <= 1.0


def test_credit_history_sign_sanity(valid_payload):
    """Sanity test: Credit_History = 0 should give significantly lower probability than 1."""
    good_credit_payload = valid_payload.copy()
    good_credit_payload["Credit_History"] = "1"
    good_res = predict(good_credit_payload)

    bad_credit_payload = valid_payload.copy()
    bad_credit_payload["Credit_History"] = "0"
    bad_res = predict(bad_credit_payload)

    assert good_res["probability"] > bad_res["probability"]
    assert (good_res["probability"] - bad_res["probability"]) >= 0.20
