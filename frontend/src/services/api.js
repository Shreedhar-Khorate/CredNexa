import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const checkHealth = async () => {
  try {
    const res = await apiClient.get('/health');
    return res.data;
  } catch (err) {
    console.warn('Backend API unavailable, operating in standalone demo mode.');
    return { status: 'offline', active_version: 'v1 (local fallback)' };
  }
};

export const submitApplication = async (payload) => {
  try {
    const res = await apiClient.post('/predict', payload);
    return res.data;
  } catch (err) {
    console.error('API Error, generating fallback response:', err);
    // Fallback simulation for seamless UI offline demo
    const prob = payload.Credit_History === '0' ? 0.18 : 0.84;
    const isApproved = prob >= 0.4145;
    return {
      id: 'demo-' + Math.random().toString(36).substr(2, 9),
      applicant_name: payload.applicant_name || 'Sample Applicant',
      decision: isApproved ? 'Approved' : 'Rejected',
      probability: prob,
      threshold: 0.4145,
      segment: { id: 0, name: 'Standard Profile' },
      top_factors: [
        { feature: payload.Credit_History === '1' ? 'Positive Credit History' : 'Negative Credit History', direction: payload.Credit_History === '1' ? 'positive' : 'negative', impact: 0.94 },
        { feature: 'Semiurban Property Location', direction: 'positive', impact: 0.23 }
      ],
      suggestions: isApproved ? [] : [{ change: 'Add a co-applicant income (e.g. INR 15,000/mo)', new_probability: 0.65 }],
      model_version: 'v1',
      created_at: new Date().toISOString()
    };
  }
};

export const fetchApplications = async () => {
  try {
    const res = await apiClient.get('/applications');
    return res.data.applications;
  } catch (err) {
    return [];
  }
};

export const fetchAdminMetrics = async () => {
  try {
    const res = await apiClient.get('/admin/metrics');
    return res.data;
  } catch (err) {
    return null;
  }
};

export const fetchAiExplanation = async (assessmentPayload) => {
  try {
    const res = await apiClient.post('/llm/explain', assessmentPayload);
    return res.data.explanation;
  } catch (err) {
    console.warn('Backend LLM endpoint offline, returning simulated AI explanation.');
    const decision = assessmentPayload.decision || 'Approved';
    const prob = assessmentPayload.probability || 0.84;
    return {
      summary: `The ML model evaluated this assessment and returned a decision of '${decision}' with an approval probability of ${(prob * 100).toFixed(1)}%.`,
      prediction_explanation: `The calculated probability (${prob.toFixed(3)}) is ${decision === 'Approved' ? 'above' : 'below'} the decision threshold of ${assessmentPayload.threshold || 0.415}.`,
      key_factors: assessmentPayload.top_factors ? assessmentPayload.top_factors.map(f => ({
        feature: f.feature,
        explanation: `${f.feature} contributed ${f.direction === 'positive' ? 'positively' : 'negatively'} to the decision.`
      })) : [],
      segment_explanation: `Assigned to segment: ${assessmentPayload.segment?.name || 'Standard Segment'}.`,
      suggestions_explanation: 'Consider updating credit profile or adjusting requested loan size for better odds.',
      limitations: [
        'Prediction is derived from project historical training data.',
        'This is a decision-support demonstration tool.'
      ],
      disclaimer: 'Educational decision support. Not for binding bank lending decisions.',
      engine_used: 'Standalone AI Simulation'
    };
  }
};

