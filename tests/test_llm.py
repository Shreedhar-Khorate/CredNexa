import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.llm_service import build_evidence_prompt, generate_fallback_explanation, explain_assessment

client = TestClient(app)

SAMPLE_ASSESSMENT = {
    "applicant_name": "Test Applicant",
    "decision": "Approved",
    "probability": 0.85,
    "threshold": 0.4145,
    "segment": {"id": 1, "name": "Dual-Income Household"},
    "top_factors": [
        {"feature": "Credit_History", "direction": "positive", "impact": 0.94},
        {"feature": "LoanToIncome", "direction": "negative", "impact": -0.15}
    ],
    "suggestions": [
        {"change": "Reduce loan amount by 10%", "new_probability": 0.89}
    ],
    "model_version": "v1",
    "ApplicantIncome": 50000,
    "CoapplicantIncome": 15000,
    "LoanAmount": 200,
    "Loan_Amount_Term": 360,
    "Credit_History": "1",
    "Property_Area": "Semiurban"
}


def test_build_evidence_prompt():
    """Verify prompt builder formats evidence JSON without error."""
    prompt = build_evidence_prompt(SAMPLE_ASSESSMENT)
    assert "Assessment Evidence Payload:" in prompt
    assert "Test Applicant" in prompt
    assert "0.85" in prompt
    assert "Credit_History" in prompt


def test_generate_fallback_explanation():
    """Verify safe local template fallback explanation format."""
    res = generate_fallback_explanation(SAMPLE_ASSESSMENT, reason="Unit Test")
    assert "summary" in res
    assert "prediction_explanation" in res
    assert "key_factors" in res
    assert len(res["key_factors"]) == 2
    assert "disclaimer" in res
    assert "Unit Test" in res["engine_used"]


def test_explain_assessment_router():
    """Verify main explanation router returns expected schema structure."""
    result = explain_assessment(SAMPLE_ASSESSMENT)
    assert "summary" in result
    assert "prediction_explanation" in result
    assert "key_factors" in result
    assert "disclaimer" in result
    assert "engine_used" in result


def test_api_explain_endpoint():
    """Verify FastAPI POST /api/v1/llm/explain endpoint."""
    response = client.post("/api/v1/llm/explain", json=SAMPLE_ASSESSMENT)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "explanation" in data
    assert "summary" in data["explanation"]
