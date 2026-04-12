// backend/src/services/memory/MemoryService.js
//import { IndexFlatL2 } from 'faiss-node';
import pkg from 'faiss-node';
const { IndexFlatL2 } = pkg;

export class MemoryService {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.shortTermMemory = []; // Last N turns
    this.SHORT_TERM_LIMIT = 10;

    // FAISS long-term memory
    this.dimension = 768; // text-embedding-004 output dim
    this.index = null;
    this.documents = []; // Parallel array to FAISS index
    this.embedder = null;

    this._initFAISS();
  }

  _initFAISS() {
    try {
      this.index = new IndexFlatL2(this.dimension);
      console.log(`🧠 FAISS index initialized for session ${this.sessionId}`);
    } catch (err) {
      console.warn('FAISS initialization failed, using text-only memory:', err.message);
      this.index = null;
    }
  }

  async addTurn(role, content) {
    const turn = { role, content, timestamp: Date.now() };

    // Add to short-term memory
    this.shortTermMemory.push(turn);
    if (this.shortTermMemory.length > this.SHORT_TERM_LIMIT) {
      const evicted = this.shortTermMemory.shift();
      // Move evicted turns to long-term memory
      await this._addToLongTerm(evicted);
    }
  }

  async getRelevantContext(query) {
    const result = {
      recent: this.shortTermMemory.slice(-6).map(t => `${t.role}: ${t.content}`),
      relevant: [],
    };

    // Query FAISS for relevant past context
    if (this.index && this.documents.length > 0 && this.embedder) {
      try {
        const queryEmbedding = await this._embed(query);
        const k = Math.min(3, this.documents.length);
        const { distances, labels } = this.index.search(queryEmbedding, k);

        result.relevant = labels
          .filter(idx => idx >= 0 && idx < this.documents.length)
          .filter((_, i) => distances[i] < 1.5) // Similarity threshold
          .map(idx => this.documents[idx].content);
      } catch (err) {
        console.warn('FAISS search error:', err.message);
      }
    }

    return result;
  }

  async _addToLongTerm(turn) {
    if (!this.index) return;

    try {
      const embedding = await this._embed(turn.content);
      if (embedding && embedding.length === this.dimension) {
        this.index.add(embedding);
        this.documents.push(turn);
      }
    } catch (err) {
      console.warn('Long-term memory add error:', err.message);
    }
  }

  async _embed(text) {
    // Lazy load embedder to avoid circular imports
    if (!this.embedder) {
      const { GeminiService } = await import('../ai/GeminiService.js');
      this.embedder = new GeminiService();
    }
    return this.embedder.generateEmbedding(text);
  }

  getShortTermContext() {
    return this.shortTermMemory;
  }

  cleanup() {
    this.shortTermMemory = [];
    this.documents = [];
    this.index = null;
  }
}
