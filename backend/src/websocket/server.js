// backend/src/websocket/server.js
import { InterviewSession } from './InterviewSession.js';

// Active sessions map: sessionId -> InterviewSession
const sessions = new Map();

export function setupWebSocketServer(fastify) {
  fastify.get('/ws/interview/:sessionId', { websocket: true }, (socket, req) => {
    const { sessionId } = req.params;
    const userId = req.headers['x-user-id'] || 'anonymous';

    console.log(`🔌 WebSocket connected: session=${sessionId}, user=${userId}`);

    // Create or retrieve session
    let session = sessions.get(sessionId);
    if (!session) {
      session = new InterviewSession(sessionId, userId, socket);
      sessions.set(sessionId, session);
    } else {
      session.reconnect(socket);
    }

    // Handle incoming messages
    socket.on('message', async (rawData) => {
      try {
        const message = JSON.parse(rawData.toString());
        await session.handleMessage(message);
      } catch (err) {
        // Could be binary audio data
        if (rawData instanceof Buffer) {
          await session.handleAudioChunk(rawData);
        } else {
          console.error('WS message parse error:', err);
        }
      }
    });

    socket.on('close', (code, reason) => {
      console.log(`🔌 WebSocket closed: session=${sessionId}, code=${code}`);
      session.handleDisconnect();
    });

    socket.on('error', (err) => {
      console.error(`WS error for session ${sessionId}:`, err);
    });

    // Send connection acknowledgment
    session.send({ type: 'connected', sessionId, timestamp: Date.now() });
  });

  // Cleanup stale sessions periodically
  setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions.entries()) {
      if (now - session.lastActivity > 30 * 60 * 1000) { // 30 min timeout
        session.cleanup();
        sessions.delete(id);
        console.log(`🧹 Cleaned up stale session: ${id}`);
      }
    }
  }, 5 * 60 * 1000); // Check every 5 min
}

export function getSession(sessionId) {
  return sessions.get(sessionId);
}
