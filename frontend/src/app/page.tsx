// frontend/src/app/page.tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mic, Code, BarChart2, Zap, Shield, Brain } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface-900 overflow-hidden">
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <Mic size={16} className="text-black" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">InterviewAI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link
            href="/auth"
            className="text-sm px-4 py-2 bg-brand-500 text-black font-semibold rounded-lg hover:bg-brand-400 transition-colors"
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 pt-24 pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            Real-time AI • Zero Latency • Natural Voice
          </div>

          <h1 className="font-display text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
            Your AI interviewer
            <br />
            <span className="text-brand-500 glow-green-text">is ready for you</span>
          </h1>

          <p className="text-zinc-400 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Practice with an AI that interrupts, follows up, adapts — and feels like
            talking to a real senior engineer. Voice-first. Instant. Honest.
          </p>

          <Link
            href="/auth"
            className="inline-flex items-center gap-2 px-8 py-4 bg-brand-500 text-black font-bold text-lg rounded-xl hover:bg-brand-400 transition-all glow-green"
          >
            <Mic size={20} />
            Start your interview
          </Link>
        </motion.div>

        {/* Mock interview UI preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-20 glass rounded-2xl p-6 max-w-2xl mx-auto text-left"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center">
              <span className="text-brand-400 text-sm font-bold">AI</span>
            </div>
            <div>
              <div className="text-sm font-medium">Alex · Senior Engineer</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                <span className="text-xs text-brand-400">Speaking</span>
              </div>
            </div>
          </div>
          <p className="text-zinc-300 leading-relaxed">
            "I see you've worked with distributed systems at your last role. Walk me through
            the most complex scaling challenge you faced — specifically around data consistency."
          </p>
          <div className="mt-4 flex gap-1 items-end h-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="wave-bar" />
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Mic, title: 'Full-Duplex Voice', desc: 'Interrupt naturally. The AI stops immediately and adapts.' },
            { icon: Brain, title: 'Context Memory', desc: 'References your earlier answers. Never repeats itself.' },
            { icon: Code, title: 'Live Coding Round', desc: 'Real problems with execution, feedback, and follow-ups.' },
            { icon: Zap, title: 'Zero-Lag Pipeline', desc: 'STT → LLM → TTS run in parallel. No waiting.' },
            { icon: BarChart2, title: 'Detailed Report', desc: 'Scores across 5 dimensions with actionable feedback.' },
            { icon: Shield, title: 'Adaptive Difficulty', desc: 'Gets harder when you ace it, probes deeper when you slip.' },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="glass rounded-xl p-6 group hover:border-brand-500/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center mb-4 group-hover:bg-brand-500/20 transition-colors">
                <f.icon size={20} className="text-brand-400" />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
