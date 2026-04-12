// frontend/src/components/interview/AudioControls.tsx
'use client';

import { useState } from 'react';
import { useInterviewStore } from '@/store/interviewStore';
import { Mic, MicOff, MessageSquare, Send } from 'lucide-react';
import AudioWaveform from './AudioWaveform';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  send: (data: object) => void;
  getAudioLevel: () => number;
}

export default function AudioControls({ send, getAudioLevel }: Props) {
  const { isMuted, toggleMute, audioState, phase } = useInterviewStore();
  const [showText, setShowText] = useState(false);
  const [textInput, setTextInput] = useState('');

  const handleSendText = () => {
    if (!textInput.trim()) return;
    send({ type: 'text_message', text: textInput.trim() });
    setTextInput('');
    setShowText(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  if (phase === 'completed') return null;

  return (
    <div className="border-t border-zinc-800/60 bg-surface-900/80 backdrop-blur-sm px-5 py-4">
      <div className="max-w-3xl mx-auto">
        <AnimatePresence>
          {showText && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mb-3 flex gap-2"
            >
              <textarea
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your response... (Enter to send)"
                rows={2}
                autoFocus
                className="flex-1 px-4 py-2.5 rounded-xl bg-surface-700 border border-zinc-700 focus:border-brand-500 focus:outline-none text-sm transition-colors placeholder-zinc-500 resize-none"
              />
              <button
                onClick={handleSendText}
                disabled={!textInput.trim()}
                className="px-4 py-2.5 bg-brand-500 text-black rounded-xl disabled:opacity-40 hover:bg-brand-400 transition-colors"
              >
                <Send size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between">
          {/* Mic status */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMute}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-medium ${
                isMuted
                  ? 'border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                  : audioState === 'user_speaking'
                  ? 'border-brand-500/60 bg-brand-500/15 text-brand-400 glow-green'
                  : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
              }`}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
              {isMuted ? 'Unmute' : audioState === 'user_speaking' ? 'Listening' : 'Muted off'}
            </button>

            {!isMuted && audioState === 'user_speaking' && (
              <AudioWaveform getLevel={getAudioLevel} barCount={10} />
            )}
          </div>

          {/* Center: audio state label */}
          <div className="text-xs text-zinc-500 text-center">
            {audioState === 'ai_speaking' && (
              <span className="flex items-center gap-1.5 text-brand-400">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                AI is speaking
              </span>
            )}
            {audioState === 'processing' && (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                Processing...
              </span>
            )}
            {audioState === 'idle' && (
              <span className="text-zinc-600">Speak when ready</span>
            )}
          </div>

          {/* Text fallback toggle */}
          <button
            onClick={() => setShowText(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs transition-all ${
              showText
                ? 'border-brand-500/40 text-brand-400 bg-brand-500/10'
                : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
            }`}
          >
            <MessageSquare size={13} />
            {showText ? 'Hide text' : 'Text mode'}
          </button>
        </div>
      </div>
    </div>
  );
}
