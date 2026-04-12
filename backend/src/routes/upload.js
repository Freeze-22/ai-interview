// backend/src/routes/upload.js
import { getStorage } from '../config/firebase.js';
import { authMiddleware } from '../middleware/auth.js';
import { parseResume } from '../utils/resumeParser.js';
import { v4 as uuidv4 } from 'uuid';

export async function uploadRoutes(fastify) {
  fastify.post('/resume', { preHandler: authMiddleware }, async (req, reply) => {
    const data = await req.file();

    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    const allowedTypes = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'];

    if (!allowedTypes.includes(data.mimetype)) {
      return reply.code(400).send({ error: 'Invalid file type. PDF, DOC, DOCX, or TXT only.' });
    }

    const chunks = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Parse resume text first (this is the critical part)
    const resumeText = await parseResume(buffer, data.mimetype);

    const fileId = uuidv4();
    let filePath = '';

    // Upload to Cloud Storage (non-blocking — don't fail the request if GCS is unavailable)
    try {
      const storage = getStorage();
      const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
      filePath = `resumes/${req.user.uid}/${fileId}-${data.filename}`;
      const file = bucket.file(filePath);

      await file.save(buffer, {
        metadata: { contentType: data.mimetype },
      });
    } catch (err) {
      console.warn('⚠️ GCS upload failed (non-critical):', err.message);
      // Continue — the parsed text is what matters for the interview
    }

    return {
      fileId,
      filePath,
      resumeText,
      filename: data.filename,
    };
  });
}
