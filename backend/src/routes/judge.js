// backend/src/routes/judge.js
import axios from 'axios';
import { authMiddleware } from '../middleware/auth.js';

const JUDGE0_URL = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_KEY = process.env.JUDGE0_API_KEY;

const LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
  typescript: 74,
  go: 60,
  rust: 73,
  kotlin: 78,
  swift: 83,
};

export async function judgeRoutes(fastify) {
  fastify.post('/execute', { preHandler: authMiddleware }, async (req, reply) => {
    const { code, language, stdin } = req.body;

    if (!code || !language) {
      return reply.code(400).send({ error: 'Code and language are required' });
    }

    const languageId = LANGUAGE_IDS[language.toLowerCase()];
    if (!languageId) {
      return reply.code(400).send({ error: `Unsupported language: ${language}` });
    }

    try {
      // Submit to Judge0
      const submitResponse = await axios.post(
        `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
        {
          source_code: code,
          language_id: languageId,
          stdin: stdin || '',
          cpu_time_limit: 5,
          memory_limit: 128000, // 128MB
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': JUDGE0_KEY,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
          },
          timeout: 15000,
        }
      );

      const result = submitResponse.data;

      return {
        status: result.status?.description || 'Unknown',
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        compile_output: result.compile_output || '',
        time: result.time || '0',
        memory: result.memory || 0,
        exit_code: result.exit_code,
        success: result.status?.id === 3, // 3 = Accepted
      };
    } catch (err) {
      console.error('Judge0 error:', err.response?.data || err.message);

      // Fallback: return simulated execution for demo
      return {
        status: 'Service Unavailable',
        stdout: '',
        stderr: 'Code execution service temporarily unavailable.',
        success: false,
        fallback: true,
      };
    }
  });
}
