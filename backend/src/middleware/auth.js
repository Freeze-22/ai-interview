// backend/src/middleware/auth.js
import { getAuth } from '../config/firebase.js';

export async function authMiddleware(req, reply) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return reply.code(401).send({ error: 'Authentication required' });
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.user = decoded;
  } catch (err) {
    console.error('🔥 Token verification failed:', err);
    return reply.code(401).send({ error: 'Invalid or expired token', details: err.message });
  }
}
