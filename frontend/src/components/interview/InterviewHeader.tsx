// frontend/src/components/interview/InterviewHeader.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useInterviewStore } from '@/store/interviewStore';
import { Mic, Clock, ChevronLeft, Square } from 'lucide-react';

interface Props {
  sessionId: string;
  onEnd: () => void;
}

export default function InterviewHeader({ sessionId, onEnd }: Props) {
  const router = useRouter();
  const { phase, strategy } = useInterviewStore();
  const [elapsed, setElapsed] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (phase === 'active' || phase === 'coding') {
      const t = setInterval(() => setElapsed(e => e + 1), 1000);
      return () => clearInterval(t);
    }
  }, [phase]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const handleEnd = () => {
    setShowConfirm(false);
    onEnd();
  };

  return (
    <>
      <header className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/60 bg-surface-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-brand-500 flex items-center justify-center">
              <Mic size={12} className="text-black" />
            </div>
            <span className="font-semibold text-sm">
              {strategy?.jobTitle || 'Technical Interview'}
            </span>
            {strategy?.experienceLevel && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-600 text-zinc-400 capitalize">
                {strategy.experienceLevel}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
            <Clock size={14} />
            <span className="font-mono">{formatTime(elapsed)}</span>
          </div>

          {/* Phase indicator */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            phase === 'coding'
              ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
              : phase === 'active'
              ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
              : 'bg-surface-600 text-zinc-400'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {phase === 'coding' ? 'Coding Round' : phase === 'active' ? 'Live' : 'Connecting...'}
          </div>

          {/* End button */}
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-red-500/50 hover:text-red-400 text-zinc-400 text-xs transition-all"
          >
            <Square size={12} />
            End
          </button>
        </div>
      </header>

      {/* Confirm end modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="glass rounded-2xl p-6 max-w-sm w-full mx-4 animate-fade-in">
            <h3 className="font-semibold mb-2">End interview?</h3>
            <p className="text-zinc-400 text-sm mb-5">
              This will generate your evaluation report. You can't continue after ending.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 border border-zinc-700 rounded-xl text-sm hover:border-zinc-500 transition-colors"
              >
                Keep going
              </button>
              <button
                onClick={handleEnd}
                className="flex-1 py-2.5 bg-red-500/20 border border-red-500/40 text-red-400 rounded-xl text-sm hover:bg-red-500/30 transition-colors"
              >
                End & get report
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
