// frontend/src/store/interviewStore.ts
import { create } from 'zustand';

export type InterviewPhase =
  | 'setup'
  | 'connecting'
  | 'active'
  | 'coding'
  | 'completed'
  | 'error';

export type AudioState =
  | 'idle'
  | 'user_speaking'
  | 'processing'
  | 'ai_speaking';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isPartial?: boolean;
}

export interface CodingQuestion {
  title: string;
  description: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  constraints: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  preferredLanguage: string;
}

export interface ExecutionResult {
  status: string;
  stdout: string;
  stderr: string;
  compile_output: string;
  time: string;
  memory: number;
  success: boolean;
}

export interface InterviewReport {
  overallScore: number;
  summary: string;
  scores: Record<string, { score: number; feedback: string }>;
  strengths: string[];
  improvements: string[];
  recommendation: string;
  recommendationReason: string;
}

interface InterviewStore {
  // Phase
  phase: InterviewPhase;
  setPhase: (phase: InterviewPhase) => void;

  // Session
  sessionId: string | null;
  setSessionId: (id: string) => void;

  // Audio
  audioState: AudioState;
  setAudioState: (state: AudioState) => void;
  isMuted: boolean;
  toggleMute: () => void;

  // Transcripts
  messages: Message[];
  partialTranscript: string;
  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => void;
  setPartialTranscript: (text: string) => void;
  updateLastAiMessage: (text: string) => void;

  // Coding
  codingQuestion: CodingQuestion | null;
  setCodingQuestion: (q: CodingQuestion) => void;
  userCode: string;
  setUserCode: (code: string) => void;
  executionResult: ExecutionResult | null;
  setExecutionResult: (r: ExecutionResult) => void;
  codeEvaluation: any | null;
  setCodeEvaluation: (e: any) => void;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;

  // Report
  report: InterviewReport | null;
  setReport: (r: InterviewReport) => void;

  // Strategy
  strategy: any | null;
  setStrategy: (s: any) => void;

  // Status
  statusMessage: string;
  setStatusMessage: (msg: string) => void;

  // Reset
  reset: () => void;
}

export const useInterviewStore = create<InterviewStore>((set) => ({
  phase: 'setup',
  setPhase: (phase) => set({ phase }),

  sessionId: null,
  setSessionId: (sessionId) => set({ sessionId }),

  audioState: 'idle',
  setAudioState: (audioState) => set({ audioState }),
  isMuted: false,
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),

  messages: [],
  partialTranscript: '',
  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, { ...msg, id: Math.random().toString(36).slice(2), timestamp: Date.now() }],
    })),
  setPartialTranscript: (partialTranscript) => set({ partialTranscript }),
  updateLastAiMessage: (text) =>
    set((s) => {
      const msgs = [...s.messages];
      const lastAi = [...msgs].reverse().find((m) => m.role === 'assistant' && m.isPartial);
      if (lastAi) {
        const idx = msgs.lastIndexOf(lastAi);
        msgs[idx] = { ...lastAi, content: lastAi.content + text };
      } else {
        msgs.push({ id: Math.random().toString(36).slice(2), role: 'assistant', content: text, timestamp: Date.now(), isPartial: true });
      }
      return { messages: msgs };
    }),

  codingQuestion: null,
  setCodingQuestion: (codingQuestion) => set({ codingQuestion }),
  userCode: '',
  setUserCode: (userCode) => set({ userCode }),
  executionResult: null,
  setExecutionResult: (executionResult) => set({ executionResult }),
  codeEvaluation: null,
  setCodeEvaluation: (codeEvaluation) => set({ codeEvaluation }),
  selectedLanguage: 'javascript',
  setSelectedLanguage: (selectedLanguage) => set({ selectedLanguage }),

  report: null,
  setReport: (report) => set({ report }),

  strategy: null,
  setStrategy: (strategy) => set({ strategy }),

  statusMessage: '',
  setStatusMessage: (statusMessage) => set({ statusMessage }),

  reset: () =>
    set({
      phase: 'setup',
      sessionId: null,
      audioState: 'idle',
      messages: [],
      partialTranscript: '',
      codingQuestion: null,
      userCode: '',
      executionResult: null,
      codeEvaluation: null,
      report: null,
      strategy: null,
      statusMessage: '',
    }),
}));
