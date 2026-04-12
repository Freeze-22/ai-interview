// frontend/src/components/interview/AudioWaveform.tsx
'use client';

import { useEffect, useRef } from 'react';

interface Props {
  getLevel: () => number;
  barCount?: number;
  color?: string;
}

export default function AudioWaveform({ getLevel, barCount = 12, color = '#22c55e' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>();
  const historyRef = useRef<number[]>(new Array(barCount).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const level = getLevel();
      historyRef.current.push(level);
      historyRef.current.shift();

      const W = canvas.width;
      const H = canvas.height;
      const barW = Math.floor(W / barCount) - 2;

      ctx.clearRect(0, 0, W, H);

      historyRef.current.forEach((val, i) => {
        const h = Math.max(3, val * H * 2.5);
        const x = i * (barW + 2);
        const y = (H - h) / 2;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.4 + val * 2;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, h, 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [getLevel, barCount, color]);

  return (
    <canvas
      ref={canvasRef}
      width={barCount * 8}
      height={24}
      className="rounded"
    />
  );
}
