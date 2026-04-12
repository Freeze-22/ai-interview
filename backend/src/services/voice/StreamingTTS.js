// backend/src/services/voice/StreamingTTS.js
import textToSpeech from '@google-cloud/text-to-speech';
import { EventEmitter } from 'events';

export class StreamingTTS extends EventEmitter {
  constructor() {
    super();
    this.client = new textToSpeech.TextToSpeechClient();
    this.isStopped = false;
    this.activeRequests = new Set();
  }

  async synthesizeAndStream(text, onChunk) {
    if (!text || text.trim().length === 0) return;
    this.isStopped = false;

    const chunks = this._splitIntoChunks(text);

    for (const chunk of chunks) {
      if (this.isStopped) break;
      await this._synthesizeChunk(chunk, onChunk);
    }

    if (!this.isStopped) {
      this.emit('done');
    }
  }

  async synthesizeStreaming(text, onChunk) {
    return this.synthesizeAndStream(text, onChunk);
  }

  async _synthesizeChunk(text, onChunk) {
    if (this.isStopped) return;

    const requestId = Math.random().toString(36).slice(2);
    this.activeRequests.add(requestId);

    try {
      const request = {
        input: { text },
        voice: {
          languageCode: 'en-US',
          name: 'en-US-Journey-D', // Natural, conversational voice
          ssmlGender: 'NEUTRAL',
        },
        audioConfig: {
          audioEncoding: 'OGG_OPUS', // Better compression for streaming
          speakingRate: 1.05, // Slightly faster = more natural
          pitch: 0,
          volumeGainDb: 0,
          effectsProfileId: ['headphone-class-device'],
        },
      };

      const [response] = await this.client.synthesizeSpeech(request);

      if (!this.isStopped && response.audioContent) {
        const buffer = Buffer.from(response.audioContent);

        // Stream in small chunks to enable faster playback start
        const CHUNK_SIZE = 4096;
        for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
          if (this.isStopped) break;
          const chunk = buffer.slice(i, i + CHUNK_SIZE);
          onChunk(chunk);
          this.emit('audio_chunk', chunk);
          // Small delay to allow network to breathe
          await new Promise(r => setTimeout(r, 1));
        }
      }
    } catch (err) {
      if (!this.isStopped) {
        console.error('TTS synthesis error:', err);
        this.emit('error', err);
      }
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  stop() {
    this.isStopped = true;
    this.activeRequests.clear();
    this.emit('stopped');
    console.log('🔇 TTS stopped');
  }

  _splitIntoChunks(text) {
    // Split on sentence boundaries for natural pauses
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  }
}
