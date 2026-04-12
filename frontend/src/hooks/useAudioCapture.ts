// frontend/src/hooks/useAudioCapture.ts
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAudioCaptureOptions {
  onChunk: (buffer: ArrayBuffer) => void;
  onBargein: () => void;
  isMuted: boolean;
}

export function useAudioCapture({ onChunk, onBargein, isMuted }: UseAudioCaptureOptions) {
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const isCapturing = useRef(false);
  const bargeinThrottle = useRef(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isActive, setIsActive] = useState(false);

  const startCapture = useCallback(async () => {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
      });

      setHasPermission(true);

      // Set up audio analyser for barge-in detection
      audioContext.current = new AudioContext({ sampleRate: 48000 });
      const source = audioContext.current.createMediaStreamSource(stream.current);
      analyser.current = audioContext.current.createAnalyser();
      analyser.current.fftSize = 256;
      analyser.current.smoothingTimeConstant = 0.8;
      source.connect(analyser.current);

      // Set up MediaRecorder for streaming audio
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      mediaRecorder.current = new MediaRecorder(stream.current, {
        mimeType,
        audioBitsPerSecond: 32000,
      });

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0 && !isMuted && isCapturing.current) {
          e.data.arrayBuffer().then(onChunk);
        }
      };

      mediaRecorder.current.start(100); // Send chunks every 100ms
      isCapturing.current = true;
      setIsActive(true);

      // Start barge-in detection loop
      _detectBargein();

    } catch (err: any) {
      console.error('Microphone access error:', err);
      setHasPermission(false);
    }
  }, [onChunk, isMuted]);

  const stopCapture = useCallback(() => {
    if (mediaRecorder.current?.state !== 'inactive') {
      mediaRecorder.current?.stop();
    }
    stream.current?.getTracks().forEach(t => t.stop());
    audioContext.current?.close();
    isCapturing.current = false;
    setIsActive(false);
  }, []);

  const _detectBargein = useCallback(() => {
    if (!analyser.current || !isCapturing.current) return;

    const dataArray = new Uint8Array(analyser.current.frequencyBinCount);

    const check = () => {
      if (!isCapturing.current || !analyser.current) return;

      analyser.current.getByteFrequencyData(dataArray);

      // Calculate RMS energy
      const rms = Math.sqrt(dataArray.reduce((sum, val) => sum + (val / 255) ** 2, 0) / dataArray.length);

      // Barge-in threshold
      if (rms > 0.15 && !bargeinThrottle.current) {
        bargeinThrottle.current = true;
        onBargein();
        setTimeout(() => { bargeinThrottle.current = false; }, 500);
      }

      requestAnimationFrame(check);
    };

    requestAnimationFrame(check);
  }, [onBargein]);

  // Get current audio energy for visualizer
  const getAudioLevel = useCallback((): number => {
    if (!analyser.current) return 0;
    const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
    analyser.current.getByteFrequencyData(dataArray);
    return dataArray.reduce((sum, val) => sum + val, 0) / (dataArray.length * 255);
  }, []);

  useEffect(() => {
    return () => stopCapture();
  }, [stopCapture]);

  return { startCapture, stopCapture, hasPermission, isActive, getAudioLevel };
}
