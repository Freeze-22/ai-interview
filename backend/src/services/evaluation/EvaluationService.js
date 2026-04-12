// backend/src/services/evaluation/EvaluationService.js
import { GeminiService } from '../ai/GeminiService.js';

export class EvaluationService {
  constructor() {
    this.gemini = new GeminiService();
  }

  async generateReport({ sessionId, conversationHistory, interviewData, strategy }) {
    const transcript = conversationHistory
      .map(t => `${t.role.toUpperCase()}: ${t.content}`)
      .join('\n\n');

    const prompt = `
You are evaluating a technical job interview session.

ROLE: ${strategy?.jobTitle || 'Software Engineer'}
EXPERIENCE LEVEL: ${strategy?.experienceLevel || 'mid'}
FOCUS AREAS: ${strategy?.focusAreas?.join(', ') || 'General'}

FULL INTERVIEW TRANSCRIPT:
${transcript}

Generate a comprehensive evaluation report. Return JSON:
{
  "overallScore": 0-100,
  "summary": "2-3 sentence overall summary",
  "scores": {
    "communication": {"score": 0-100, "feedback": "specific feedback"},
    "technicalKnowledge": {"score": 0-100, "feedback": "specific feedback"},
    "problemSolving": {"score": 0-100, "feedback": "specific feedback"},
    "confidence": {"score": 0-100, "feedback": "specific feedback"},
    "codingSkills": {"score": 0-100, "feedback": "specific feedback"}
  },
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["area1", "area2", "area3"],
  "topMoments": [
    {"moment": "description", "why": "why it was impressive"}
  ],
  "recommendation": "strong_hire|hire|maybe|no_hire",
  "recommendationReason": "reason for recommendation",
  "nextSteps": ["step1", "step2"],
  "keyTopicsDiscussed": ["topic1", "topic2"],
  "missedOpportunities": ["topic they could have elaborated on"]
}

Return ONLY JSON.`;

    try {
      const result = await this.gemini.chat([{ role: 'user', content: prompt }], {
        temperature: 0.3,
      });

      const report = JSON.parse(result.replace(/```json|```/g, '').trim());
      report.sessionId = sessionId;
      report.generatedAt = new Date().toISOString();
      return report;
    } catch (err) {
      console.error('Report generation error:', err);
      return this._defaultReport(sessionId);
    }
  }

  _defaultReport(sessionId) {
    return {
      sessionId,
      overallScore: 70,
      summary: 'Interview completed. Full analysis unavailable.',
      scores: {
        communication: { score: 70, feedback: 'Good communication skills demonstrated.' },
        technicalKnowledge: { score: 70, feedback: 'Solid technical foundation.' },
        problemSolving: { score: 70, feedback: 'Adequate problem-solving approach.' },
        confidence: { score: 70, feedback: 'Confident presentation.' },
        codingSkills: { score: 70, feedback: 'Reasonable coding ability shown.' },
      },
      strengths: ['Communication', 'Technical knowledge'],
      improvements: ['Could provide more detailed explanations'],
      recommendation: 'maybe',
      generatedAt: new Date().toISOString(),
    };
  }
}
