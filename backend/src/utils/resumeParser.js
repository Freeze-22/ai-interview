// backend/src/utils/resumeParser.js
/**
 * Resume parser - extracts text from PDF, DOCX, TXT files
 * Uses basic extraction; for production consider Google Document AI
 */

export async function parseResume(buffer, mimeType) {
  try {
    if (mimeType === 'text/plain') {
      return buffer.toString('utf8');
    }

    if (mimeType === 'application/pdf') {
      return await parsePDF(buffer);
    }

    if (mimeType.includes('word') || mimeType.includes('docx')) {
      return await parseDOCX(buffer);
    }

    return buffer.toString('utf8');
  } catch (err) {
    console.error('Resume parse error:', err);
    return 'Could not parse resume. Please provide a plain text version.';
  }
}

async function parsePDF(buffer) {
  // Dynamic import to avoid issues if not installed
  try {
    const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
    const data = await pdfParse(buffer);
    return cleanText(data.text);
  } catch (err) {
    console.warn('PDF parse failed:', err.message);
    return 'PDF parsing unavailable. Please paste resume text directly.';
  }
}

async function parseDOCX(buffer) {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return cleanText(result.value);
  } catch (err) {
    console.warn('DOCX parse failed:', err.message);
    return 'DOCX parsing unavailable. Please paste resume text directly.';
  }
}

function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]+/g, ' ')
    .trim();
}
