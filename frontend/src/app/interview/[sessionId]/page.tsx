// frontend/src/app/interview/[sessionId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { useInterviewStore } from '@/store/interviewStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import InterviewHeader from '@/components/interview/InterviewHeader';
import ConversationPanel from '@/components/interview/ConversationPanel';
import AudioControls from '@/components/interview/AudioControls';
import CodingPanel from '@/components/coding/CodingPanel';
import StatusOverlay from '@/components/interview/StatusOverlay';
import ReportPanel from '@/components/interview/ReportPanel';

export default function InterviewPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);

  const { phase, isMuted, setPhase, statusMessage } = useInterviewStore();
  const { send, sendAudio, sendBargein } = useWebSocket(sessionId);
  const { initContext } = useAudioPlayer();

  const { startCapture, hasPermission, isActive, getAudioLevel } = useAudioCapture({
    onChunk: sendAudio,
    onBargein: sendBargein,
    isMuted,
  });

  // Auth guard
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (!user) { router.push('/auth'); return; }
      setAuthReady(true);
    });
    return unsub;
  }, []);

  // Start the interview once auth is ready
  useEffect(() => {
    if (!authReady || interviewStarted) return;

    // Small delay to ensure WS is connected
    const timer = setTimeout(async () => {
      // Init audio context (must be triggered by user gesture)
      initContext();

      // Retrieve setup data
      const setupData = sessionStorage.getItem(`setup_${sessionId}`);
      if (setupData) {
        const data = JSON.parse(setupData);
        send({ type: 'start_interview', data });
        sessionStorage.removeItem(`setup_${sessionId}`);
      }

      // Start mic capture
      await startCapture();
      setInterviewStarted(true);
      setPhase('connecting');
    }, 800);

    return () => clearTimeout(timer);
  }, [authReady, interviewStarted, sessionId]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (phase === 'completed') {
    return <ReportPanel />;
  }

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col">
      <InterviewHeader sessionId={sessionId} onEnd={() => send({ type: 'end_interview' })} />

      <main className="flex-1 flex overflow-hidden">
        {phase === 'coding' ? (
          <CodingPanel send={send} />
        ) : (
          <ConversationPanel getAudioLevel={getAudioLevel} />
        )}
      </main>

      <AudioControls send={send} getAudioLevel={getAudioLevel} />

      {(phase === 'connecting' || statusMessage) && (
        <StatusOverlay message={statusMessage || 'Connecting...'} />
      )}
    </div>
  );
}
