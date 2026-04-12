// frontend/src/hooks/useAudioPlayer.ts
'use client';

import { useEffect, useRef, useCallback } from 'react';

export function useAudioPlayer() {
  const audioContext = useRef<AudioContext | null>(null);
  const audioQueue = useRef<ArrayBuffer[]>([]);
  const isPlaying = useRef(false);
  const gainNode = useRef<GainNode | null>(null);
  const currentSource = useRef<AudioBufferSourceNode | null>(null);

  const initContext = useCallback(() => {
    if (!audioContext.current || audioContext.current.state === 'closed') {
      audioContext.current = new AudioContext({ sampleRate: 24000 });
      gainNode.current = audioContext.current.createGain();
      gainNode.current.connect(audioContext.current.destination);
    }
  }, []);

  const stop = useCallback(() => {
    audioQueue.current = [];
    isPlaying.current = false;
    if (currentSource.current) {
      try { currentSource.current.stop(); } catch {}
      currentSource.current = null;
    }
  }, []);

  const playQueue = useCallback(async () => {
    if (isPlaying.current || audioQueue.current.length === 0) return;
    isPlaying.current = true;

    while (audioQueue.current.length > 0) {
      const chunk = audioQueue.current.shift()!;
      try {
        await playChunk(chunk);
      } catch (err) {
        console.warn('Audio play error:', err);
      }
    }

    isPlaying.current = false;
  }, []);

  const playChunk = useCallback(async (buffer: ArrayBuffer) => {
    if (!audioContext.current || !gainNode.current) return;

    return new Promise<void>((resolve) => {
      audioContext.current!.decodeAudioData(buffer.slice(0), (audioBuffer) => {
        if (!audioContext.current || !gainNode.current) { resolve(); return; }

        const source = audioContext.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(gainNode.current!);
        currentSource.current = source;

        source.onended = () => resolve();
        source.start(0);
      }, () => resolve()); // ignore decode errors
    });
  }, []);

  const enqueueChunk = useCallback((base64: string) => {
    initContext();
    const binary = atob(base64);
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      view[i] = binary.charCodeAt(i);
    }
    audioQueue.current.push(buffer);
    if (!isPlaying.current) playQueue();
  }, [initContext, playQueue]);

  useEffect(() => {
    const onChunk = (e: Event) => enqueueChunk((e as CustomEvent).detail);
    const onStop = () => stop();
    const onDone = () => { /* natural end */ };

    window.addEventListener('ai_audio_chunk', onChunk);
    window.addEventListener('ai_audio_stop', onStop);
    window.addEventListener('ai_audio_done', onDone);

    return () => {
      window.removeEventListener('ai_audio_chunk', onChunk);
      window.removeEventListener('ai_audio_stop', onStop);
      window.removeEventListener('ai_audio_done', onDone);
    };
  }, [enqueueChunk, stop]);

  return { stop, initContext };
}
