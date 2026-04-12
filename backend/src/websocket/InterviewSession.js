// backend/src/websocket/InterviewSession.js
import { StreamingSTT } from '../services/voice/StreamingSTT.js';
import { StreamingTTS } from '../services/voice/StreamingTTS.js';
import { GeminiService } from '../services/ai/GeminiService.js';
import { MemoryService } from '../services/memory/MemoryService.js';
import { EvaluationService } from '../services/evaluation/EvaluationService.js';
import { InterviewEngine } from '../services/ai/InterviewEngine.js';
import { getFirestore } from '../config/firebase.js';

export class InterviewSession {
  constructor(sessionId, userId, socket) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.socket = socket;
    this.lastActivity = Date.now();

    // State machine
    this.state = 'idle'; // idle | listening | processing | speaking | coding
    this.isAISpeaking = false;
    this.isCancelled = false;

    // Services
    this.stt = new StreamingSTT();
    this.tts = new StreamingTTS();
    this.gemini = new GeminiService();
    this.memory = new MemoryService(sessionId);
    this.evaluation = new EvaluationService();
    this.engine = new InterviewEngine(this.gemini, this.memory);

    // Conversation tracking
    this.conversationHistory = [];
    this.interviewData = null;
    this.currentLLMController = null; // AbortController for cancellation

    // Audio buffer for barge-in detection
    this.audioBuffer = [];
    this.silenceTimer = null;
    this.VAD_SILENCE_MS = 800; // ms of silence before processing

    this._setupSTTHandlers();
    this._setupTTSHandlers();

    console.log(`📋 Session created: ${sessionId}`);
  }

  reconnect(socket) {
    this.socket = socket;
    this.send({ type: 'reconnected', sessionId: this.sessionId });
  }

  // ─── MESSAGE ROUTER ─────────────────────────────────────────────────────────

  async handleMessage(message) {
    this.lastActivity = Date.now();

    switch (message.type) {
      case 'start_interview':
        await this._startInterview(message.data);
        break;
      case 'audio_chunk':
        // Base64 encoded audio from browser
        await this.handleAudioChunk(Buffer.from(message.data, 'base64'));
        break;
      case 'user_speaking':
        await this._handleBargein();
        break;
      case 'user_stopped_speaking':
        this._scheduleProcessing();
        break;
      case 'text_message':
        // Fallback text mode
        await this._processTextInput(message.text);
        break;
      case 'code_submission':
        await this._handleCodeSubmission(message.data);
        break;
      case 'end_interview':
        await this._endInterview();
        break;
      case 'ping':
        this.send({ type: 'pong', timestamp: Date.now() });
        break;
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  async handleAudioChunk(buffer) {
    this.lastActivity = Date.now();

    // If AI is speaking, detect barge-in via energy level
    if (this.isAISpeaking) {
      const energy = this._calculateAudioEnergy(buffer);
      if (energy > 0.02) { // threshold for speech detection
        await this._handleBargein();
        return;
      }
    }

    // Stream to STT
    this.stt.write(buffer);

    // Reset silence timer
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      this.stt.flushBuffer();
    }, this.VAD_SILENCE_MS);
  }

  // ─── INTERVIEW LIFECYCLE ────────────────────────────────────────────────────

  async _startInterview(data) {
    try {
      this.interviewData = data;
      this.state = 'processing';

      this.send({ type: 'status', message: 'Analyzing your resume and job description...' });

      // Generate interview strategy
      const strategy = await this.engine.generateStrategy(
        data.resumeText,
        data.jobDescription,
        data.interviewType || 'technical'
      );

      this.interviewData.strategy = strategy;

      // Save session to Firestore
      await this._saveSessionToFirestore();

      // Generate opening message
      const openingMessage = await this.engine.getOpeningMessage(strategy, data);

      this.send({ type: 'interview_started', strategy: { type: strategy.type, focusAreas: strategy.focusAreas } });

      // Speak the opening
      await this._speakAndStream(openingMessage, 'ai_message');

      this.state = 'listening';
      this.stt.startStream();

    } catch (err) {
      console.error('Start interview error:', err);
      this.send({ type: 'error', message: 'Failed to start interview. Please try again.' });
    }
  }

  async _processUserInput(transcript) {
    if (!transcript || transcript.trim().length < 2) return;

    this.state = 'processing';
    this.send({ type: 'user_transcript', text: transcript });

    // Add to memory
    this.conversationHistory.push({ role: 'user', content: transcript });
    await this.memory.addTurn('user', transcript);

    try {
      // Get relevant context from memory
      const context = await this.memory.getRelevantContext(transcript);

      // Check if coding round should be triggered
      const shouldStartCoding = await this.engine.shouldTriggerCodingRound(
        this.conversationHistory,
        this.interviewData?.strategy
      );

      if (shouldStartCoding && this.state !== 'coding') {
        await this._triggerCodingRound();
        return;
      }

      // Generate AI response with streaming
      await this._generateAndStreamResponse(transcript, context);

    } catch (err) {
      console.error('Process input error:', err);
      await this._speakAndStream("I'm sorry, could you repeat that?", 'ai_message');
    }
  }

  async _processTextInput(text) {
    await this._processUserInput(text);
  }

  async _generateAndStreamResponse(userInput, context) {
    // Create abort controller for this LLM request
    this.currentLLMController = new AbortController();
    this.isCancelled = false;

    const messages = this._buildMessages(userInput, context);

    let fullResponse = '';
    let ttsBuffer = '';
    const SENTENCE_ENDS = /[.!?。]/;

    this.state = 'speaking';
    this.isAISpeaking = true;

    try {
      const stream = await this.gemini.streamChat(messages, {
        signal: this.currentLLMController.signal,
        systemPrompt: this.engine.getSystemPrompt(this.interviewData?.strategy),
      });

      for await (const chunk of stream) {
        if (this.isCancelled) break;

        const text = chunk.text || '';
        fullResponse += text;
        ttsBuffer += text;

        // Stream TTS as soon as we have a complete sentence
        if (SENTENCE_ENDS.test(ttsBuffer) && ttsBuffer.trim().length > 10) {
          const toSpeak = ttsBuffer.trim();
          ttsBuffer = '';
          this.tts.synthesizeStreaming(toSpeak, (audioChunk) => {
            if (!this.isCancelled) {
              this.send({ type: 'audio_chunk', data: audioChunk.toString('base64') });
            }
          });
        }

        // Send text chunk to frontend for display
        this.send({ type: 'ai_text_chunk', text });
      }

      // Flush remaining buffer
      if (ttsBuffer.trim() && !this.isCancelled) {
        await this.tts.synthesizeStreaming(ttsBuffer.trim(), (audioChunk) => {
          if (!this.isCancelled) {
            this.send({ type: 'audio_chunk', data: audioChunk.toString('base64') });
          }
        });
      }

      if (!this.isCancelled) {
        this.conversationHistory.push({ role: 'assistant', content: fullResponse });
        await this.memory.addTurn('assistant', fullResponse);

        this.send({ type: 'ai_message_complete', text: fullResponse });
        this.isAISpeaking = false;
        this.state = 'listening';
      }

    } catch (err) {
      if (err.name === 'AbortError' || this.isCancelled) {
        console.log('LLM stream cancelled (barge-in)');
      } else {
        console.error('LLM stream error:', err);
        this.send({ type: 'error', message: 'AI response error' });
      }
      this.isAISpeaking = false;
      this.state = 'listening';
    }
  }

  // ─── BARGE-IN HANDLING ──────────────────────────────────────────────────────

  async _handleBargein() {
    if (!this.isAISpeaking) return;

    console.log('🎤 Barge-in detected!');

    // 1. Cancel LLM generation
    if (this.currentLLMController) {
      this.isCancelled = true;
      this.currentLLMController.abort();
    }

    // 2. Stop TTS
    this.tts.stop();

    // 3. Stop audio output on frontend
    this.send({ type: 'stop_audio' });

    // 4. Reset state
    this.isAISpeaking = false;
    this.state = 'listening';

    // 5. Resume STT listening
    this.stt.startStream();

    this.send({ type: 'bargein_detected' });
  }

  // ─── CODING ROUND ───────────────────────────────────────────────────────────

  async _triggerCodingRound() {
    this.state = 'coding';

    const question = await this.engine.generateCodingQuestion(
      this.interviewData?.strategy,
      this.conversationHistory
    );

    this.send({
      type: 'coding_round_start',
      question: {
        title: question.title,
        description: question.description,
        examples: question.examples,
        constraints: question.constraints,
        difficulty: question.difficulty,
        language: question.preferredLanguage || 'javascript',
      }
    });

    const announcement = `Let's move to a coding challenge. ${question.announcement}`;
    await this._speakAndStream(announcement, 'ai_message');
  }

  async _handleCodeSubmission(data) {
    const { code, language, executionResult, questionTitle } = data;

    this.send({ type: 'status', message: 'Analyzing your solution...' });

    const evaluation = await this.engine.evaluateCode({
      question: questionTitle,
      code,
      language,
      executionResult,
      conversationHistory: this.conversationHistory,
    });

    this.send({ type: 'code_evaluation', evaluation });

    // Speak the evaluation
    await this._speakAndStream(evaluation.verbalFeedback, 'ai_message');

    // Store follow-up question
    if (evaluation.followUpQuestion) {
      this.conversationHistory.push({
        role: 'assistant',
        content: evaluation.verbalFeedback
      });
    }

    this.state = 'listening';
    this.stt.startStream();
  }

  // ─── END INTERVIEW ──────────────────────────────────────────────────────────

  async _endInterview() {
    this.state = 'processing';

    this.send({ type: 'status', message: 'Generating your evaluation report...' });

    try {
      const report = await this.evaluation.generateReport({
        sessionId: this.sessionId,
        conversationHistory: this.conversationHistory,
        interviewData: this.interviewData,
        strategy: this.interviewData?.strategy,
      });

      // Save report to Firestore
      await this._saveReportToFirestore(report);

      this.send({ type: 'interview_complete', report });

      const closingMessage = `Thank you for completing the interview! I've generated a detailed report for you. Overall, you scored ${report.overallScore}/100. ${report.summary}`;
      await this._speakAndStream(closingMessage, 'ai_message');

    } catch (err) {
      console.error('End interview error:', err);
      this.send({ type: 'error', message: 'Failed to generate report' });
    }
  }

  // ─── STT HANDLERS ───────────────────────────────────────────────────────────

  _setupSTTHandlers() {
    this.stt.on('partial_transcript', (text) => {
      this.send({ type: 'partial_transcript', text });
    });

    this.stt.on('final_transcript', async (text) => {
      if (this.state === 'listening') {
        await this._processUserInput(text);
      }
    });

    this.stt.on('error', (err) => {
      console.error('STT error:', err);
      this.send({ type: 'stt_error', message: err.message });
    });
  }

  _setupTTSHandlers() {
    this.tts.on('audio_chunk', (chunk) => {
      if (!this.isCancelled) {
        this.send({ type: 'audio_chunk', data: chunk.toString('base64') });
      }
    });

    this.tts.on('done', () => {
      this.send({ type: 'audio_done' });
    });
  }

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  async _speakAndStream(text, eventType) {
    this.isAISpeaking = true;
    this.isCancelled = false;

    this.send({ type: eventType || 'ai_message', text });

    await this.tts.synthesizeAndStream(text, (chunk) => {
      if (!this.isCancelled) {
        this.send({ type: 'audio_chunk', data: chunk.toString('base64') });
      }
    });

    if (!this.isCancelled) {
      this.send({ type: 'audio_done' });
      this.isAISpeaking = false;
    }
  }

  _buildMessages(userInput, context) {
    const recent = this.conversationHistory.slice(-10);
    if (context?.relevant?.length > 0) {
      recent.unshift({
        role: 'system',
        content: `Relevant context from earlier: ${context.relevant.join(' | ')}`
      });
    }
    return recent;
  }

  _calculateAudioEnergy(buffer) {
    if (buffer.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < buffer.length; i += 2) {
      const sample = buffer.readInt16LE(Math.min(i, buffer.length - 2)) / 32768;
      sum += sample * sample;
    }
    return Math.sqrt(sum / (buffer.length / 2));
  }

  _scheduleProcessing() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => this.stt.flushBuffer(), 300);
  }

  async _saveSessionToFirestore() {
    const db = getFirestore();
    await db.collection('sessions').doc(this.sessionId).set({
      sessionId: this.sessionId,
      userId: this.userId,
      startedAt: new Date(),
      status: 'active',
      interviewType: this.interviewData?.interviewType || 'technical',
      jobTitle: this.interviewData?.jobTitle || '',
    });
  }

  async _saveReportToFirestore(report) {
    const db = getFirestore();
    await db.collection('sessions').doc(this.sessionId).update({
      status: 'completed',
      completedAt: new Date(),
      report,
    });
  }

  send(data) {
    if (this.socket && this.socket.readyState === 1) { // OPEN
      try {
        this.socket.send(JSON.stringify(data));
      } catch (err) {
        console.error('Send error:', err);
      }
    }
  }

  handleDisconnect() {
    this.stt.stop();
    this.tts.stop();
    if (this.currentLLMController) {
      this.isCancelled = true;
      this.currentLLMController.abort();
    }
  }

  cleanup() {
    this.handleDisconnect();
    this.memory.cleanup();
  }
}
