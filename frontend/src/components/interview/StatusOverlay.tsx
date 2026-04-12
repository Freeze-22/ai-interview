// frontend/src/components/interview/StatusOverlay.tsx
'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface Props {
  message: string;
}

export default function StatusOverlay({ message }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-surface-900/80 backdrop-blur-sm z-40 flex items-center justify-center"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-brand-500/30 flex items-center justify-center">
            <Loader2 size={28} className="text-brand-400 animate-spin" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-brand-500 animate-ping opacity-20" />
        </div>
        <p className="text-zinc-300 text-sm max-w-xs text-center leading-relaxed">{message}</p>
      </div>
    </motion.div>
  );
}
