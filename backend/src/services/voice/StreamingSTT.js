// backend/src/services/voice/StreamingSTT.js
import speech from '@google-cloud/speech';
import { EventEmitter } from 'events';

export class StreamingSTT extends EventEmitter {
  constructor() {
    super();
    this.client = new speech.SpeechClient();
    this.recognizeStream = null;
    this.isStreaming = false;
    this.restartTimer = null;
    this.STREAM_LIMIT_MS = 290000; // Google STT limit is 305s
  }

  startStream() {
    if (this.isStreaming) return;

    const request = {
      config: {
        encoding: 'WEBM_OPUS', // Browser MediaRecorder default
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: false,
        model: 'latest_short',
        useEnhanced: true,
        speechContexts: [{
          phrases: [
            'algorithm', 'complexity', 'O(n)', 'recursion', 'dynamic programming',
            'binary search', 'hash map', 'linked list', 'binary tree', 'graph',
            'REST API', 'microservices', 'Docker', 'Kubernetes', 'React', 'Node.js',
            'TypeScript', 'Python', 'Java', 'machine learning', 'neural network',
          ],
          boost: 10,
        }],
      },
      interimResults: true,
      singleUtterance: false,
    };

    this.recognizeStream = this.client
      .streamingRecognize(request)
      .on('error', (err) => {
        if (err.code === 11) {
          // Stream limit reached, restart
          this._restartStream();
        } else {
          this.emit('error', err);
        }
      })
      .on('data', (data) => {
        if (!data.results?.[0]) return;

        const result = data.results[0];
        const transcript = result.alternatives?.[0]?.transcript || '';

        if (!transcript) return;

        if (result.isFinal) {
          this.emit('final_transcript', transcript.trim());
        } else {
          this.emit('partial_transcript', transcript.trim());
        }
      });

    this.isStreaming = true;

    // Auto-restart before stream limit
    this.restartTimer = setTimeout(() => {
      this._restartStream();
    }, this.STREAM_LIMIT_MS);

    console.log('🎙️ STT stream started');
  }

  write(audioBuffer) {
    if (!this.isStreaming || !this.recognizeStream) {
      this.startStream();
    }
    try {
      if (this.recognizeStream && !this.recognizeStream.destroyed) {
        this.recognizeStream.write(audioBuffer);
      }
    } catch (err) {
      console.error('STT write error:', err);
    }
  }

  flushBuffer() {
    // Signal end of utterance for better final transcript
    if (this.recognizeStream && !this.recognizeStream.destroyed) {
      // Send silence to flush
      const silence = Buffer.alloc(1600, 0); // 100ms of silence at 16kHz
      this.recognizeStream.write(silence);
    }
  }

  stop() {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    if (this.recognizeStream && !this.recognizeStream.destroyed) {
      this.recognizeStream.end();
    }
    this.recognizeStream = null;
    this.isStreaming = false;
    console.log('🎙️ STT stream stopped');
  }

  _restartStream() {
    this.stop();
    setTimeout(() => this.startStream(), 100);
  }
}
