// backend/src/routes/auth.js
import { getAuth } from '../config/firebase.js';

export async function authRoutes(fastify) {
  // Verify token (used by frontend to confirm auth state)
  fastify.post('/verify', async (req, reply) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return reply.code(401).send({ error: 'No token' });

    try {
      const decoded = await getAuth().verifyIdToken(token);
      return { uid: decoded.uid, email: decoded.email, valid: true };
    } catch {
      return reply.code(401).send({ error: 'Invalid token' });
    }
  });
}
