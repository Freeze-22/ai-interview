// frontend/src/components/interview/ConversationPanel.tsx
'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInterviewStore } from '@/store/interviewStore';
import { Mic, Bot } from 'lucide-react';
import AudioWaveform from './AudioWaveform';

interface Props {
  getAudioLevel: () => number;
}

export default function ConversationPanel({ getAudioLevel }: Props) {
  const { messages, partialTranscript, audioState } = useInterviewStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partialTranscript]);

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-6 overflow-hidden">
      {/* AI Avatar + Status */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          <div className={`w-20 h-20 rounded-full bg-surface-700 border-2 flex items-center justify-center transition-all duration-300 ${
            audioState === 'ai_speaking' ? 'border-brand-500 glow-green' : 'border-zinc-700'
          }`}>
            <Bot size={36} className="text-zinc-300" />
          </div>
          {audioState === 'ai_speaking' && (
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-brand-500 border-2 border-surface-900 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
            </span>
          )}
        </div>
        <div className="mt-3 text-center">
          <p className="font-semibold text-sm">Alex</p>
          <p className="text-xs text-zinc-500">Senior Technical Interviewer</p>
        </div>

        {/* Waveform when AI is speaking */}
        {audioState === 'ai_speaking' && (
          <div className="mt-3 flex gap-1 items-end h-6">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="wave-bar"
                style={{ animationDelay: `${i * 0.08}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 ${
                msg.role === 'assistant'
                  ? 'bg-brand-500/20 border border-brand-500/40 text-brand-400'
                  : 'bg-surface-600 border border-zinc-600 text-zinc-300'
              }`}>
                {msg.role === 'assistant' ? 'AI' : 'You'}
              </div>

              {/* Bubble */}
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'assistant'
                  ? 'bg-surface-700 text-zinc-100 rounded-tl-sm'
                  : 'bg-brand-500/15 border border-brand-500/25 text-zinc-100 rounded-tr-sm'
              } ${msg.isPartial ? 'animate-pulse' : ''}`}>
                {msg.content}
                {msg.isPartial && (
                  <span className="inline-flex gap-0.5 ml-1">
                    {[0, 0.2, 0.4].map((d, i) => (
                      <span key={i} className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Partial transcript (user speaking) */}
        <AnimatePresence>
          {partialTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3 flex-row-reverse"
            >
              <div className="w-7 h-7 rounded-full flex-shrink-0 bg-surface-600 border border-zinc-600 flex items-center justify-center text-xs font-bold text-zinc-300 mt-0.5">
                You
              </div>
              <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm bg-brand-500/10 border border-brand-500/20 text-zinc-300 text-sm italic leading-relaxed">
                {partialTranscript}
                <span className="ml-1 text-brand-400">●</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* User mic indicator */}
      {audioState === 'user_speaking' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mt-4 py-2"
        >
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-xs text-zinc-400">Listening...</span>
          <AudioWaveform getLevel={getAudioLevel} />
        </motion.div>
      )}
    </div>
  );
}
