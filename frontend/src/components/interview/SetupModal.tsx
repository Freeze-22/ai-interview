// frontend/src/components/interview/SetupModal.tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { X, Upload, FileText, Loader2 } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const INTERVIEW_TYPES = [
  { id: 'technical', label: 'Technical', desc: 'DS&A, system design, architecture' },
  { id: 'behavioral', label: 'Behavioral', desc: 'STAR method, leadership, culture fit' },
  { id: 'fullstack', label: 'Full Stack', desc: 'Frontend, backend, and coding rounds' },
  { id: 'system_design', label: 'System Design', desc: 'Scale, architecture, trade-offs' },
];

export default function SetupModal({ onClose }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [interviewType, setInterviewType] = useState('technical');
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFile(file);
    setUploading(true);
    setError('');
    try {
      const result = await api.uploadResume(file);
      setResumeText(result.resumeText);
    } catch (err: any) {
      setError('Failed to parse resume. You can paste the text manually below.');
    } finally {
      setUploading(false);
    }
  };

  const handleStart = async () => {
    if (!resumeText && !jobDescription) {
      setError('Please provide at least a resume or job description.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const session = await api.createSession({ jobTitle, interviewType });
      // Store data for WebSocket init
      sessionStorage.setItem(`setup_${session.sessionId}`, JSON.stringify({
        resumeText,
        jobDescription,
        jobTitle,
        interviewType,
      }));
      router.push(`/interview/${session.sessionId}`);
    } catch (err: any) {
      setError(err.message);
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl glass rounded-2xl shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <div>
            <h2 className="font-semibold">Set up interview</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Step {step} of 2</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="text-sm font-medium mb-2 block">Interview Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {INTERVIEW_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setInterviewType(t.id)}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        interviewType === t.id
                          ? 'border-brand-500 bg-brand-500/10'
                          : 'border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      <div className="text-sm font-medium">{t.label}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-700 border border-zinc-700 focus:border-brand-500 focus:outline-none text-sm transition-colors placeholder-zinc-500"
                />
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3 bg-brand-500 text-black font-semibold rounded-xl hover:bg-brand-400 transition-colors text-sm"
              >
                Next: Add Resume & JD
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              {/* Resume upload */}
              <div>
                <label className="text-sm font-medium mb-2 block">Resume</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-zinc-700 hover:border-brand-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors"
                >
                  {uploading ? (
                    <Loader2 size={24} className="animate-spin text-brand-400 mx-auto mb-2" />
                  ) : resumeFile ? (
                    <FileText size={24} className="text-brand-400 mx-auto mb-2" />
                  ) : (
                    <Upload size={24} className="text-zinc-500 mx-auto mb-2" />
                  )}
                  <p className="text-sm text-zinc-400">
                    {uploading ? 'Parsing resume...' : resumeFile ? resumeFile.name : 'Upload PDF, DOCX, or TXT'}
                  </p>
                  <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileChange} className="hidden" />
                </div>
                <div className="mt-2">
                  <p className="text-xs text-zinc-500 mb-1">Or paste resume text:</p>
                  <textarea
                    value={resumeText}
                    onChange={e => setResumeText(e.target.value)}
                    placeholder="Paste resume text here..."
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-700 border border-zinc-700 focus:border-brand-500 focus:outline-none text-sm transition-colors placeholder-zinc-500 resize-none"
                  />
                </div>
              </div>

              {/* JD */}
              <div>
                <label className="text-sm font-medium mb-2 block">Job Description</label>
                <textarea
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here..."
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-700 border border-zinc-700 focus:border-brand-500 focus:outline-none text-sm transition-colors placeholder-zinc-500 resize-none"
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-zinc-700 hover:border-zinc-500 rounded-xl text-sm transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleStart}
                  disabled={creating}
                  className="flex-2 flex-1 py-3 bg-brand-500 text-black font-semibold rounded-xl hover:bg-brand-400 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? <><Loader2 size={16} className="animate-spin" /> Starting...</> : '🎙️ Start Interview'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
