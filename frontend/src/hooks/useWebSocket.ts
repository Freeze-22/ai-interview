// frontend/src/hooks/useWebSocket.ts
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useInterviewStore } from '@/store/interviewStore';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

export function useWebSocket(sessionId: string | null) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout>();
  const reconnectCount = useRef(0);
  const MAX_RECONNECTS = 5;

  const {
    setPhase,
    setAudioState,
    addMessage,
    setPartialTranscript,
    updateLastAiMessage,
    setCodingQuestion,
    setCodeEvaluation,
    setReport,
    setStrategy,
    setStatusMessage,
    messages,
  } = useInterviewStore();

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);
      handleServerMessage(msg);
    } catch {
      // Binary data handled by audio hook
    }
  }, []);

  const handleServerMessage = useCallback((msg: any) => {
    switch (msg.type) {
      case 'connected':
        console.log('✅ WS Connected:', msg.sessionId);
        reconnectCount.current = 0;
        break;

      case 'status':
        setStatusMessage(msg.message);
        break;

      case 'interview_started':
        setStrategy(msg.strategy);
        setPhase('active');
        setStatusMessage('');
        break;

      case 'user_transcript':
        setPartialTranscript('');
        addMessage({ role: 'user', content: msg.text });
        setAudioState('processing');
        break;

      case 'partial_transcript':
        setPartialTranscript(msg.text);
        setAudioState('user_speaking');
        break;

      case 'ai_text_chunk':
        updateLastAiMessage(msg.text);
        setAudioState('ai_speaking');
        break;

      case 'ai_message':
        // Full message (non-streaming fallback)
        addMessage({ role: 'assistant', content: msg.text });
        setAudioState('ai_speaking');
        break;

      case 'ai_message_complete':
        // Mark last partial message as complete
        setAudioState('idle');
        break;

      case 'audio_chunk':
        // Handled by useAudioPlayer hook
        window.dispatchEvent(new CustomEvent('ai_audio_chunk', { detail: msg.data }));
        break;

      case 'audio_done':
        window.dispatchEvent(new CustomEvent('ai_audio_done'));
        setAudioState('idle');
        break;

      case 'stop_audio':
        window.dispatchEvent(new CustomEvent('ai_audio_stop'));
        break;

      case 'bargein_detected':
        setAudioState('user_speaking');
        break;

      case 'coding_round_start':
        setCodingQuestion(msg.question);
        setPhase('coding');
        break;

      case 'code_evaluation':
        setCodeEvaluation(msg.evaluation);
        break;

      case 'interview_complete':
        setReport(msg.report);
        setPhase('completed');
        break;

      case 'error':
        console.error('Server error:', msg.message);
        setStatusMessage(`Error: ${msg.message}`);
        break;

      case 'pong':
        break;

      default:
        console.warn('Unknown WS message:', msg.type);
    }
  }, [setPhase, setAudioState, addMessage, setPartialTranscript, updateLastAiMessage,
      setCodingQuestion, setCodeEvaluation, setReport, setStrategy, setStatusMessage]);

  const connect = useCallback(() => {
    if (!sessionId) return;
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const token = localStorage.getItem('authToken') || '';
    const url = `${WS_URL}/ws/interview/${sessionId}`;
    ws.current = new WebSocket(url);
    ws.current.binaryType = 'arraybuffer';

    ws.current.onopen = () => {
      console.log('🔌 WebSocket connected');
      reconnectCount.current = 0;
    };

    ws.current.onmessage = handleMessage;

    ws.current.onclose = (e) => {
      console.log('🔌 WebSocket closed:', e.code);
      if (reconnectCount.current < MAX_RECONNECTS) {
        const delay = Math.min(1000 * 2 ** reconnectCount.current, 10000);
        reconnectTimer.current = setTimeout(() => {
          reconnectCount.current++;
          connect();
        }, delay);
      }
    };

    ws.current.onerror = (err) => {
      console.error('WS error:', err);
    };
  }, [sessionId, handleMessage]);

  const send = useCallback((data: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  const sendAudio = useCallback((buffer: ArrayBuffer) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      // Send as base64 in JSON for compatibility
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      ws.current.send(JSON.stringify({ type: 'audio_chunk', data: base64 }));
    }
  }, []);

  const sendBargein = useCallback(() => {
    send({ type: 'user_speaking' });
  }, [send]);

  // Ping to keep connection alive
  useEffect(() => {
    const ping = setInterval(() => {
      send({ type: 'ping' });
    }, 25000);
    return () => clearInterval(ping);
  }, [send]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  return { send, sendAudio, sendBargein, ws };
}
