// backend/src/services/ai/InterviewEngine.js
export class InterviewEngine {
  constructor(gemini, memory) {
    this.gemini = gemini;
    this.memory = memory;
    this.codingRoundTriggered = false;
    this.questionCount = 0;
  }

  // ─── STRATEGY GENERATION ────────────────────────────────────────────────────

  async generateStrategy(resumeText, jobDescription, interviewType) {
    const prompt = `
Analyze this resume and job description to create an interview strategy.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Return a JSON object with this exact structure:
{
  "type": "${interviewType}",
  "candidateName": "extracted name",
  "jobTitle": "extracted job title",
  "company": "extracted company",
  "topSkills": ["skill1", "skill2", ...],
  "missingSkills": ["skill1", "skill2", ...],
  "focusAreas": ["area1", "area2", ...],
  "experienceLevel": "junior|mid|senior",
  "questionPlan": [
    {"topic": "topic", "type": "behavioral|technical|coding", "difficulty": "easy|medium|hard", "priority": 1}
  ],
  "openingContext": "brief context for opening",
  "weakAreas": ["area1", "area2"],
  "codingLanguage": "preferred language based on JD"
}

Return ONLY the JSON, no markdown.`;

    const result = await this.gemini.chat([{ role: 'user', content: prompt }]);

    try {
      const cleaned = result.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return this._defaultStrategy(interviewType);
    }
  }

  async getOpeningMessage(strategy, data) {
    const prompt = `
You are starting a technical job interview for ${strategy.candidateName || 'a candidate'} 
applying for the ${strategy.jobTitle || 'software engineer'} role at ${strategy.company || 'the company'}.

Write a warm, professional opening message (2-3 sentences max) that:
1. Greets them by first name
2. Introduces yourself as their AI interviewer
3. Briefly mentions you've reviewed their background

Be conversational and natural, not robotic. Do NOT say "certainly" or "absolutely".`;

    return this.gemini.chat([{ role: 'user', content: prompt }]);
  }

  // ─── SYSTEM PROMPT ──────────────────────────────────────────────────────────

  getSystemPrompt(strategy) {
    const name = strategy?.candidateName?.split(' ')[0] || 'the candidate';
    const role = strategy?.jobTitle || 'Software Engineer';
    const level = strategy?.experienceLevel || 'mid';
    const focusAreas = strategy?.focusAreas?.join(', ') || 'general software engineering';
    const weakAreas = strategy?.weakAreas?.join(', ') || 'none identified';

    return `You are Alex, an experienced senior technical interviewer conducting a real-time voice interview.

CANDIDATE: ${name}
ROLE: ${role} (${level} level)
FOCUS AREAS: ${focusAreas}
WEAK AREAS TO PROBE: ${weakAreas}

YOUR PERSONALITY:
- Warm but professional, like a real senior engineer
- Conversational, not robotic — avoid "certainly!", "great!", "absolutely!"
- Ask one question at a time
- Listen carefully and follow up on interesting points
- If answer is weak, probe deeper with follow-ups before moving on
- Naturally transition between topics
- Keep responses concise (2-4 sentences max) unless explaining something

INTERVIEW RULES:
1. Never repeat the same question
2. Adapt difficulty based on the quality of answers
3. Reference previous answers to show you're listening
4. Ask follow-up questions for weak or vague answers
5. After 4-5 questions, naturally transition to a coding challenge
6. Be encouraging but honest

RESPONSE FORMAT:
- Speak naturally as if in a real conversation
- End with either a question or a clear prompt for them to continue
- Keep it under 60 words unless explaining something complex
- Never use bullet points or numbered lists in speech`;
  }

  // ─── CODING ROUND ───────────────────────────────────────────────────────────

  async shouldTriggerCodingRound(conversationHistory, strategy) {
    if (this.codingRoundTriggered) return false;
    if (strategy?.type === 'behavioral') return false;

    const userTurns = conversationHistory.filter(m => m.role === 'user').length;
    if (userTurns < 4) return false; // Too early

    const recentHistory = conversationHistory.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');

    const decision = await this.gemini.quickDecision(`
Based on this interview conversation, should we NOW transition to a coding challenge?
Answer only "yes" or "no".

The interview has had ${userTurns} exchanges.
Strategy type: ${strategy?.type || 'technical'}

Recent conversation:
${recentHistory}

Consider: yes if we've covered enough behavioral/technical questions and timing feels right.
Answer:`);

    const should = decision.trim().toLowerCase().startsWith('yes');
    if (should) this.codingRoundTriggered = true;
    return should;
  }

  async generateCodingQuestion(strategy, conversationHistory) {
    const level = strategy?.experienceLevel || 'mid';
    const language = strategy?.codingLanguage || 'JavaScript';
    const topics = strategy?.focusAreas || [];

    const prompt = `
Generate a coding interview question appropriate for a ${level}-level ${strategy?.jobTitle || 'Software Engineer'}.

Focus areas from the interview: ${topics.join(', ')}
Preferred language: ${language}

Return JSON:
{
  "title": "Problem title",
  "announcement": "Natural verbal transition to the coding problem (1 sentence)",
  "description": "Full problem description",
  "examples": [{"input": "...", "output": "...", "explanation": "..."}],
  "constraints": ["constraint1", "constraint2"],
  "difficulty": "easy|medium|hard",
  "preferredLanguage": "${language}",
  "hints": ["hint1", "hint2"],
  "optimalSolution": "brief description of optimal approach",
  "timeComplexity": "O(...)",
  "spaceComplexity": "O(...)"
}

Return ONLY JSON.`;

    const result = await this.gemini.chat([{ role: 'user', content: prompt }]);
    try {
      return JSON.parse(result.replace(/```json|```/g, '').trim());
    } catch {
      return this._defaultCodingQuestion(level);
    }
  }

  async evaluateCode({ question, code, language, executionResult, conversationHistory }) {
    const prompt = `
You are evaluating a coding solution submitted during a technical interview.

QUESTION: ${question}
LANGUAGE: ${language}
CODE:
\`\`\`${language}
${code}
\`\`\`

EXECUTION RESULT:
${JSON.stringify(executionResult, null, 2)}

Evaluate and return JSON:
{
  "isCorrect": true|false,
  "score": 0-100,
  "timeComplexity": "O(...)",
  "spaceComplexity": "O(...)",
  "strengths": ["strength1", "strength2"],
  "issues": ["issue1", "issue2"],
  "optimizations": ["optimization1"],
  "betterApproach": "description if exists",
  "verbalFeedback": "2-3 sentence natural verbal feedback as an interviewer would give",
  "followUpQuestion": "a follow-up question about their solution approach"
}

Return ONLY JSON.`;

    const result = await this.gemini.chat([{ role: 'user', content: prompt }]);
    try {
      return JSON.parse(result.replace(/```json|```/g, '').trim());
    } catch {
      return { verbalFeedback: "Thanks for your solution. Let's discuss your approach.", score: 60 };
    }
  }

  // ─── DEFAULTS ───────────────────────────────────────────────────────────────

  _defaultStrategy(type) {
    return {
      type,
      candidateName: 'Candidate',
      jobTitle: 'Software Engineer',
      topSkills: ['JavaScript', 'Problem Solving'],
      missingSkills: [],
      focusAreas: ['Data Structures', 'System Design', 'Problem Solving'],
      experienceLevel: 'mid',
      questionPlan: [],
      weakAreas: [],
      codingLanguage: 'JavaScript',
    };
  }

  _defaultCodingQuestion(level) {
    return {
      title: 'Two Sum',
      announcement: "Let's work through a coding problem together.",
      description: 'Given an array of integers and a target sum, return indices of two numbers that add up to the target.',
      examples: [{ input: '[2,7,11,15], target=9', output: '[0,1]', explanation: 'nums[0]+nums[1]=9' }],
      constraints: ['Each input has exactly one solution', 'Cannot use same element twice'],
      difficulty: level === 'senior' ? 'medium' : 'easy',
      preferredLanguage: 'JavaScript',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
    };
  }
}
