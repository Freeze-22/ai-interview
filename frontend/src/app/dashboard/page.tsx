// frontend/src/app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { Plus, Mic, Code, BarChart2, LogOut, Clock, CheckCircle, XCircle } from 'lucide-react';
import SetupModal from '@/components/interview/SetupModal';

export default function DashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) { router.push('/auth'); return; }
      setUser(u);
      loadSessions();
    });
    return unsub;
  }, []);

  const loadSessions = async () => {
    try {
      const data = await api.getSessions();
      setSessions(data.sessions);
    } catch (err) {
      console.error('Load sessions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/');
  };

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle size={14} className="text-brand-400" />;
    if (status === 'active') return <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />;
    return <Clock size={14} className="text-zinc-500" />;
  };

  return (
    <div className="min-h-screen bg-surface-900">
      {/* Header */}
      <header className="border-b border-zinc-800/60 px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <Mic size={14} className="text-black" />
            </div>
            <span className="font-display font-bold">InterviewAI</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">{user?.displayName || user?.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-12">
        {/* Welcome + Stats */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="font-display text-3xl font-bold mb-1">
              Welcome back{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}
            </h1>
            <p className="text-zinc-400">Ready to practise?</p>
          </div>
          <button
            onClick={() => setShowSetup(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-black font-semibold rounded-xl hover:bg-brand-400 transition-colors glow-green text-sm"
          >
            <Plus size={16} />
            New Interview
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Total Sessions', value: sessions.length, icon: Mic },
            { label: 'Completed', value: sessions.filter(s => s.status === 'completed').length, icon: CheckCircle },
            { label: 'Avg Score', value: sessions.filter(s => s.report).length > 0
              ? Math.round(sessions.filter(s => s.report).reduce((a, s) => a + (s.report?.overallScore || 0), 0) / sessions.filter(s => s.report).length)
              : '—', icon: BarChart2 },
          ].map((stat, i) => (
            <div key={i} className="glass rounded-xl p-5">
              <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
                <stat.icon size={14} />
                {stat.label}
              </div>
              <div className="font-display text-3xl font-bold text-white">
                {typeof stat.value === 'number' && stat.label === 'Avg Score' ? `${stat.value}` : stat.value}
                {stat.label === 'Avg Score' && typeof stat.value === 'number' ? <span className="text-base text-zinc-400">/100</span> : null}
              </div>
            </div>
          ))}
        </div>

        {/* Sessions list */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4">
            Recent Sessions
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="glass rounded-xl h-16 animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <Mic size={32} className="text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400 mb-4">No interviews yet</p>
              <button
                onClick={() => setShowSetup(true)}
                className="text-brand-400 hover:text-brand-300 text-sm"
              >
                Start your first interview →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session, i) => (
                <motion.div
                  key={session.sessionId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass rounded-xl px-5 py-4 flex items-center justify-between hover:border-zinc-600 transition-colors cursor-pointer group"
                  onClick={() => session.status === 'completed' && router.push(`/dashboard/report/${session.sessionId}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-surface-600 flex items-center justify-center">
                      <Mic size={15} className="text-zinc-400" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{session.jobTitle || 'Technical Interview'}</div>
                      <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
                        {statusIcon(session.status)}
                        {session.status === 'completed' ? 'Completed' : session.status === 'active' ? 'In progress' : 'Created'}
                        {session.report?.overallScore != null && (
                          <span className="text-brand-400 ml-1">· {session.report.overallScore}/100</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {session.status === 'completed' && (
                    <span className="text-xs text-zinc-500 group-hover:text-brand-400 transition-colors">
                      View report →
                    </span>
                  )}
                  {session.status !== 'completed' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/interview/${session.sessionId}`); }}
                      className="text-xs px-3 py-1 bg-brand-500/20 text-brand-400 rounded-lg hover:bg-brand-500/30 transition-colors"
                    >
                      Resume
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showSetup && <SetupModal onClose={() => setShowSetup(false)} />}
    </div>
  );
}
