"""Gemini & Groq Dual-LLM Service for CredNexa.

Provides evidence-grounded natural language explanations for loan application outcomes.
Primary Engine: Google Gemini API (gemini-1.5-flash)
Fallback Engine: Groq API (llama-3.3-70b-versatile)
"""

import json
import logging
import os
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional

logger = logging.getLogger("crednexa_llm_service")

SYSTEM_PROMPT = """You are CredNexa's automated assessment explanation assistant.
Your role is to explain structured outputs produced by CredNexa's machine-learning and credit risk analytics service.

RULES:
1. Treat supplied assessment evidence as the ONLY source of facts.
2. NEVER invent or modify predictions, probabilities, thresholds, metrics, or feature impacts.
3. NEVER independently approve or reject a loan application.
4. Explain clearly that this is an educational, dataset-based decision-support tool, NOT a real lending decision or financial advice.
5. Do not infer missing applicant information or make causal claims.
6. REQUIREMENT: You MUST include a "detailed_narrative" field containing EXACTLY TWO PARAGRAPHS:
   - Paragraph 1: Explains WHY the loan application was approved (or rejected) based on the applicant's input parameters and the calibrated ML model prediction output compared to the decision threshold.
   - Paragraph 2: Explains ON WHAT BASES the decision was calculated, detailing specific financial metrics and key feature impacts (such as Credit History, Loan-to-Income ratio, Property Area, and total income).
7. Return your output STRICTLY as a valid JSON object matching this schema:
{
  "summary": "Short clear summary of the prediction result",
  "prediction_explanation": "Explanation of how probability compares to threshold",
  "detailed_narrative": "Paragraph 1: Why the loan was approved/rejected based on inputs & model prediction.\\n\\nParagraph 2: On what bases the decision was calculated detailing key financial drivers.",
  "key_factors": [
    {
      "feature": "Feature name",
      "explanation": "Clear explanation of how this feature impacted the outcome"
    }
  ],
  "segment_explanation": "Interpretation of the applicant's financial risk segment",
  "suggestions_explanation": "Explanation of recommended what-if changes if any",
  "limitations": [
    "Limitation point 1",
    "Limitation point 2"
  ],
  "disclaimer": "Educational decision-support disclaimer"
}
"""

def build_evidence_prompt(assessment_data: Dict[str, Any]) -> str:
    """Construct a clean, sanitized evidence payload string for the LLM."""
    evidence = {
        "applicant_name": assessment_data.get("applicant_name", "Applicant"),
        "decision": assessment_data.get("decision", "Unknown"),
        "probability": assessment_data.get("probability", 0.0),
        "threshold": assessment_data.get("threshold", 0.4145),
        "segment": assessment_data.get("segment", {}),
        "top_factors": assessment_data.get("top_factors", []),
        "suggestions": assessment_data.get("suggestions", []),
        "model_version": assessment_data.get("model_version", "v1"),
        "financial_summary": {
            "ApplicantIncome": assessment_data.get("ApplicantIncome"),
            "CoapplicantIncome": assessment_data.get("CoapplicantIncome"),
            "LoanAmount": assessment_data.get("LoanAmount"),
            "Loan_Amount_Term": assessment_data.get("Loan_Amount_Term"),
            "Credit_History": assessment_data.get("Credit_History"),
            "Property_Area": assessment_data.get("Property_Area")
        }
    }
    return f"Assessment Evidence Payload:\n{json.dumps(evidence, indent=2)}\n\nPlease provide a structured JSON explanation based strictly on the above evidence."


def clean_and_parse_json(text: str) -> Dict[str, Any]:
    """Clean markdown codeblocks and parse JSON safely."""
    s = text.strip()
    if s.startswith("```json"):
        s = s[7:]
    elif s.startswith("```"):
        s = s[3:]
    if s.endswith("```"):
        s = s[:-3]
    s = s.strip()

    try:
        return json.loads(s)
    except json.JSONDecodeError:
        start = s.find("{")
        end = s.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(s[start : end + 1])
        raise


def call_gemini_api(prompt: str, api_key: str, model: str, temperature: float, max_tokens: int, timeout: float) -> Dict[str, Any]:
    """Execute API call to Google Gemini REST API."""
    clean_model = model.replace("models/", "").strip()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": f"{SYSTEM_PROMPT}\n\n{prompt}"}
                ]
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max(max_tokens, 1500),
            "responseMimeType": "application/json"
        }
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        res_data = json.loads(resp.read().decode("utf-8"))
        candidates = res_data.get("candidates", [])
        if not candidates:
            raise RuntimeError("Gemini API returned empty candidates response")
        text_content = candidates[0]["content"]["parts"][0]["text"]
        return clean_and_parse_json(text_content)


def call_groq_api(prompt: str, api_key: str, model: str, temperature: float, max_tokens: int, timeout: float) -> Dict[str, Any]:
    """Execute API call to Groq OpenAI-compatible REST API."""
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    payload = {
        "model": model,
        "temperature": temperature,
        "max_tokens": max(max_tokens, 1500),
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        res_data = json.loads(resp.read().decode("utf-8"))
        choices = res_data.get("choices", [])
        if not choices:
            raise RuntimeError("Groq API returned empty choices response")
        text_content = choices[0]["message"]["content"]
        return clean_and_parse_json(text_content)


def generate_fallback_explanation(assessment_data: Dict[str, Any], reason: str = "Local Engine") -> Dict[str, Any]:
    """Generate a reliable, evidence-grounded template response if live APIs are unavailable."""
    decision = assessment_data.get("decision", "Rejected")
    prob = assessment_data.get("probability", 0.0)
    thresh = assessment_data.get("threshold", 0.4145)
    factors = assessment_data.get("top_factors", [])
    
    key_factors_exp = []
    for factor in factors:
        feat = factor.get("feature", "Attribute")
        direction = factor.get("direction", "neutral")
        impact = factor.get("impact", 0.0)
        desc = "positively increased approval odds" if direction == "positive" else "reduced approval odds"
        key_factors_exp.append({
            "feature": feat,
            "explanation": f"{feat} ({desc}, impact magnitude: {abs(impact):.3f})."
        })
        
    p1 = (
        f"The loan application submitted by {assessment_data.get('applicant_name', 'the applicant')} was evaluated as '{decision}' by CredNexa's calibrated machine learning model. "
        f"The model calculated an approval probability of {prob:.1%} ({prob:.3f}), which is {'above' if decision == 'Approved' else 'below'} the decision threshold of {thresh:.3f}. "
        f"This outcome reflects patterns learned from historical loan screening data based on the provided applicant metrics."
    )

    factor_names = [f.get('feature', 'attribute') for f in factors[:3]]
    factors_str = ", ".join(factor_names) if factor_names else "financial profile indicators"
    p2 = (
        f"This evaluation was determined on the basis of key applicant attributes, primarily {factors_str}. "
        f"The model evaluated historical credit history signals, overall income stability (including co-applicant contributions), requested loan size, and property location to establish the risk profile segment ('{assessment_data.get('segment', {}).get('name', 'Standard Profile')}')."
    )

    narrative = f"{p1}\n\n{p2}"

    return {
        "summary": f"The ML model evaluated the application and issued a status of '{decision}' with an estimated approval probability of {prob:.1%}.",
        "prediction_explanation": f"The calculated probability ({prob:.3f}) is {'at or above' if decision == 'Approved' else 'below'} the calibrated decision threshold of {thresh:.3f}.",
        "detailed_narrative": narrative,
        "key_factors": key_factors_exp,
        "segment_explanation": f"Assigned to applicant risk cluster: {assessment_data.get('segment', {}).get('name', 'Standard Segment')}.",
        "suggestions_explanation": "Review what-if scenarios to adjust loan terms or co-applicant financial inputs.",
        "limitations": [
            "Prediction is based on historical project training dataset patterns.",
            "Outputs are for decision-support and educational demonstration only."
        ],
        "disclaimer": "CredNexa provides educational decision support. Not for binding credit or banking decisions.",
        "engine_used": f"Evidence Template ({reason})"
    }


def explain_assessment(assessment_data: Dict[str, Any]) -> Dict[str, Any]:
    """Main LLM explanation router with Gemini primary and Groq fallback failover."""
    prompt = build_evidence_prompt(assessment_data)
    
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
    gemini_temp = float(os.getenv("GEMINI_TEMPERATURE", "0.2"))
    gemini_max_tokens = int(os.getenv("GEMINI_MAX_TOKENS", "700"))
    gemini_timeout = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "10.0"))

    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
    groq_temp = float(os.getenv("GROQ_TEMPERATURE", "0.2"))
    groq_max_tokens = int(os.getenv("GROQ_MAX_TOKENS", "700"))
    groq_timeout = float(os.getenv("GROQ_TIMEOUT_SECONDS", "10.0"))

    # 1. Try Primary Engine: Google Gemini API
    if gemini_key and gemini_key != "your_gemini_api_key":
        try:
            logger.info(f"Invoking primary LLM engine: Google Gemini ({gemini_model})")
            parsed = call_gemini_api(prompt, gemini_key, gemini_model, gemini_temp, gemini_max_tokens, gemini_timeout)
            parsed["engine_used"] = f"Google Gemini ({gemini_model}) - Primary"
            logger.info("Successfully generated explanation via Google Gemini")
            return parsed
        except Exception as gemini_err:
            logger.warning(f"Google Gemini primary call failed ({gemini_err}). Triggering Groq fallback...")

    # 2. Try Fallback Engine: Groq API
    if groq_key and groq_key != "your_groq_api_key":
        try:
            logger.info(f"Invoking fallback LLM engine: Groq Cloud ({groq_model})")
            parsed = call_groq_api(prompt, groq_key, groq_model, groq_temp, groq_max_tokens, groq_timeout)
            parsed["engine_used"] = f"Groq Cloud ({groq_model}) - Fallback"
            logger.info("Successfully generated explanation via Groq Cloud")
            return parsed
        except Exception as groq_err:
            logger.warning(f"Groq fallback call failed ({groq_err}). Using Evidence Template...")

    # 3. Safe Evidence Template Fallback
    logger.info("Generating safe Evidence Template explanation fallback")
    return generate_fallback_explanation(assessment_data, reason="Local Evidence Engine")
