// backend/src/routes/index.js
import { sessionRoutes } from './sessions.js';
import { uploadRoutes } from './upload.js';
import { authRoutes } from './auth.js';
import { judgeRoutes } from './judge.js';

export async function registerRoutes(fastify) {
  fastify.register(authRoutes, { prefix: '/api/auth' });
  fastify.register(sessionRoutes, { prefix: '/api/sessions' });
  fastify.register(uploadRoutes, { prefix: '/api/upload' });
  fastify.register(judgeRoutes, { prefix: '/api/judge' });
}
