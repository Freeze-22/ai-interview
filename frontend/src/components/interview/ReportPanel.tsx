// frontend/src/components/interview/ReportPanel.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useInterviewStore } from '@/store/interviewStore';
import { motion } from 'framer-motion';
import {
  CheckCircle, TrendingUp, AlertTriangle,
  Award, RotateCcw, Home, BarChart2
} from 'lucide-react';

const RECOMMENDATION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  strong_hire: { label: 'Strong Hire', color: 'text-green-400',  bg: 'bg-green-500/15 border-green-500/30' },
  hire:        { label: 'Hire',        color: 'text-brand-400',  bg: 'bg-brand-500/15 border-brand-500/30' },
  maybe:       { label: 'Maybe',       color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' },
  no_hire:     { label: 'No Hire',     color: 'text-red-400',    bg: 'bg-red-500/15 border-red-500/30' },
};

const SCORE_LABELS: Record<string, string> = {
  communication:      'Communication',
  technicalKnowledge: 'Technical',
  problemSolving:     'Problem Solving',
  confidence:         'Confidence',
  codingSkills:       'Coding',
};

function ScoreBar({ label, score, feedback }: { label: string; score: number; feedback: string }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="font-mono font-bold" style={{ color }}>{score}</span>
      </div>
      <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed">{feedback}</p>
    </div>
  );
}

export default function ReportPanel() {
  const router = useRouter();
  const { report, reset } = useInterviewStore();

  if (!report) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="text-center">
          <BarChart2 size={40} className="text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">Report not available</p>
          <button onClick={() => router.push('/dashboard')} className="mt-4 text-brand-400 text-sm hover:text-brand-300">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const rec = RECOMMENDATION_CONFIG[report.recommendation] || RECOMMENDATION_CONFIG.maybe;

  return (
    <div className="min-h-screen bg-surface-900">
      {/* Header */}
      <header className="border-b border-zinc-800/60 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <Award size={18} className="text-brand-400" />
          <span className="font-semibold">Interview Complete</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { reset(); router.push('/dashboard'); }}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <Home size={13} /> Dashboard
          </button>
          <button
            onClick={() => { reset(); router.push('/dashboard'); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-black text-xs font-semibold rounded-lg hover:bg-brand-400 transition-colors"
          >
            <RotateCcw size={13} /> New Interview
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Score hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-8 flex items-center gap-8"
        >
          {/* Big score */}
          <div className="text-center flex-shrink-0">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="text-7xl font-display font-bold"
              style={{ color: report.overallScore >= 80 ? '#22c55e' : report.overallScore >= 60 ? '#eab308' : '#ef4444' }}
            >
              {report.overallScore}
            </motion.div>
            <div className="text-zinc-400 text-sm mt-1">out of 100</div>
          </div>

          <div className="flex-1">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold mb-3 ${rec.bg} ${rec.color}`}>
              <CheckCircle size={14} />
              {rec.label}
            </div>
            <p className="text-zinc-300 leading-relaxed text-sm">{report.summary}</p>
            {report.recommendationReason && (
              <p className="text-zinc-500 text-xs mt-2">{report.recommendationReason}</p>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Score breakdown */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-6 space-y-5"
          >
            <h2 className="font-semibold flex items-center gap-2">
              <BarChart2 size={16} className="text-brand-400" />
              Score Breakdown
            </h2>
            {Object.entries(report.scores || {}).map(([key, val]: [string, any]) => (
              <ScoreBar
                key={key}
                label={SCORE_LABELS[key] || key}
                score={val.score}
                feedback={val.feedback}
              />
            ))}
          </motion.div>

          {/* Strengths & Improvements */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-2xl p-6"
            >
              <h2 className="font-semibold flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-green-400" />
                Strengths
              </h2>
              <ul className="space-y-2">
                {report.strengths?.map((s: string, i: number) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    className="flex items-start gap-2 text-sm text-zinc-300"
                  >
                    <CheckCircle size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                    {s}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="glass rounded-2xl p-6"
            >
              <h2 className="font-semibold flex items-center gap-2 mb-4">
                <AlertTriangle size={16} className="text-yellow-400" />
                Areas to Improve
              </h2>
              <ul className="space-y-2">
                {report.improvements?.map((s: string, i: number) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.08 }}
                    className="flex items-start gap-2 text-sm text-zinc-300"
                  >
                    <AlertTriangle size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                    {s}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>

        {/* Top moments + next steps */}
        {(report.topMoments?.length > 0 || report.nextSteps?.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {report.topMoments?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="glass rounded-2xl p-6"
              >
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <Award size={16} className="text-brand-400" />
                  Standout Moments
                </h2>
                <ul className="space-y-3">
                  {report.topMoments.map((m: any, i: number) => (
                    <li key={i} className="text-sm">
                      <p className="text-zinc-200">"{m.moment}"</p>
                      <p className="text-zinc-500 text-xs mt-1">{m.why}</p>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {report.nextSteps?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="glass rounded-2xl p-6"
              >
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-400" />
                  Next Steps
                </h2>
                <ol className="space-y-2">
                  {report.nextSteps.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="text-xs font-mono text-zinc-500 mt-0.5 w-4 flex-shrink-0">{i + 1}.</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </motion.div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
