// backend/src/routes/sessions.js
import { v4 as uuidv4 } from 'uuid';
import { getFirestore } from '../config/firebase.js';
import { authMiddleware } from '../middleware/auth.js';

export async function sessionRoutes(fastify) {
  // Create new session
  fastify.post('/create', { preHandler: authMiddleware }, async (req, reply) => {
    const { jobTitle, interviewType, jobDescription } = req.body;
    const sessionId = uuidv4();
    const userId = req.user.uid;

    const db = getFirestore();
    await db.collection('sessions').doc(sessionId).set({
      sessionId,
      userId,
      jobTitle: jobTitle || '',
      interviewType: interviewType || 'technical',
      status: 'created',
      createdAt: new Date(),
    });

    return { sessionId, wsUrl: `/ws/interview/${sessionId}` };
  });

  // Get session details
  fastify.get('/:sessionId', { preHandler: authMiddleware }, async (req, reply) => {
    const { sessionId } = req.params;
    const db = getFirestore();
    const doc = await db.collection('sessions').doc(sessionId).get();

    if (!doc.exists) {
      return reply.code(404).send({ error: 'Session not found' });
    }

    return doc.data();
  });

  // Get user's sessions
  fastify.get('/user/all', { preHandler: authMiddleware }, async (req, reply) => {
    const db = getFirestore();
    const snapshot = await db.collection('sessions')
      .where('userId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const sessions = snapshot.docs.map(doc => doc.data());
    return { sessions };
  });

  // Get report for a session
  fastify.get('/:sessionId/report', { preHandler: authMiddleware }, async (req, reply) => {
    const { sessionId } = req.params;
    const db = getFirestore();
    const doc = await db.collection('sessions').doc(sessionId).get();

    if (!doc.exists) return reply.code(404).send({ error: 'Session not found' });

    const data = doc.data();
    if (!data.report) return reply.code(404).send({ error: 'Report not yet generated' });

    return data.report;
  });
}
