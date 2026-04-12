// frontend/src/components/coding/CodingPanel.tsx
'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useInterviewStore } from '@/store/interviewStore';
import { api } from '@/lib/api';
import { Play, Loader2, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy load Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const LANGUAGES = ['javascript', 'python', 'java', 'cpp', 'typescript', 'go'];

interface Props {
  send: (data: object) => void;
}

export default function CodingPanel({ send }: Props) {
  const {
    codingQuestion,
    userCode, setUserCode,
    executionResult, setExecutionResult,
    codeEvaluation,
    selectedLanguage, setSelectedLanguage,
  } = useInterviewStore();

  const [running, setRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [showConstraints, setShowConstraints] = useState(false);

  const defaultCode: Record<string, string> = {
    javascript: `// ${codingQuestion?.title || 'Solution'}\n\nfunction solution(input) {\n  // Your code here\n  \n}\n\nconsole.log(solution());`,
    python:     `# ${codingQuestion?.title || 'Solution'}\n\ndef solution(input):\n    # Your code here\n    pass\n\nprint(solution(None))`,
    java:       `// ${codingQuestion?.title || 'Solution'}\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}`,
    typescript: `// ${codingQuestion?.title || 'Solution'}\n\nfunction solution(input: any): any {\n  // Your code here\n  \n}\n\nconsole.log(solution(undefined));`,
    cpp:        `// ${codingQuestion?.title || 'Solution'}\n#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}`,
    go:         `// ${codingQuestion?.title || 'Solution'}\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello")\n}`,
  };

  const handleRun = useCallback(async () => {
    if (!userCode.trim()) return;
    setRunning(true);
    setShowOutput(true);
    setExecutionResult(null as any);

    try {
      const result = await api.executeCode({
        code: userCode,
        language: selectedLanguage,
      });
      setExecutionResult(result);
    } catch (err: any) {
      setExecutionResult({
        status: 'Error',
        stdout: '',
        stderr: err.message,
        compile_output: '',
        time: '0',
        memory: 0,
        success: false,
      });
    } finally {
      setRunning(false);
    }
  }, [userCode, selectedLanguage, setExecutionResult]);

  const handleSubmit = useCallback(() => {
    if (!userCode.trim() || !codingQuestion) return;
    send({
      type: 'code_submission',
      data: {
        code: userCode,
        language: selectedLanguage,
        executionResult,
        questionTitle: codingQuestion.title,
      },
    });
  }, [userCode, selectedLanguage, executionResult, codingQuestion, send]);

  const currentCode = userCode || defaultCode[selectedLanguage] || '';

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Problem statement */}
      <div className="w-[380px] flex-shrink-0 border-r border-zinc-800 overflow-y-auto p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            codingQuestion?.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
            codingQuestion?.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {codingQuestion?.difficulty || 'medium'}
          </span>
          <span className="text-xs text-zinc-500 font-mono">Coding Round</span>
        </div>

        <h2 className="font-display text-lg font-bold leading-tight">
          {codingQuestion?.title || 'Coding Challenge'}
        </h2>

        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {codingQuestion?.description}
        </p>

        {/* Examples */}
        {codingQuestion?.examples && codingQuestion.examples.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Examples</p>
            {codingQuestion.examples.map((ex, i) => (
              <div key={i} className="bg-surface-800 rounded-xl p-3 font-mono text-xs space-y-1.5">
                <div><span className="text-zinc-500">Input: </span><span className="text-zinc-200">{ex.input}</span></div>
                <div><span className="text-zinc-500">Output: </span><span className="text-brand-400">{ex.output}</span></div>
                {ex.explanation && (
                  <div><span className="text-zinc-500">Explanation: </span><span className="text-zinc-400">{ex.explanation}</span></div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Constraints toggle */}
        {codingQuestion?.constraints && codingQuestion.constraints.length > 0 && (
          <div>
            <button
              onClick={() => setShowConstraints(v => !v)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {showConstraints ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Constraints
            </button>
            <AnimatePresence>
              {showConstraints && (
                <motion.ul
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 space-y-1 overflow-hidden"
                >
                  {codingQuestion.constraints.map((c, i) => (
                    <li key={i} className="text-xs text-zinc-400 font-mono bg-surface-800 px-3 py-1.5 rounded-lg">
                      • {c}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* AI Evaluation result */}
        <AnimatePresence>
          {codeEvaluation && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-zinc-700 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-300">AI Evaluation</p>
                <span className={`text-lg font-bold font-mono ${
                  codeEvaluation.score >= 80 ? 'text-brand-400' :
                  codeEvaluation.score >= 60 ? 'text-yellow-400' : 'text-red-400'
                }`}>{codeEvaluation.score}/100</span>
              </div>

              <div className="flex gap-3 text-xs">
                <span className="text-zinc-400">Time: <span className="text-zinc-200 font-mono">{codeEvaluation.timeComplexity}</span></span>
                <span className="text-zinc-400">Space: <span className="text-zinc-200 font-mono">{codeEvaluation.spaceComplexity}</span></span>
              </div>

              {codeEvaluation.strengths?.length > 0 && (
                <div>
                  <p className="text-xs text-green-400 mb-1">Strengths</p>
                  {codeEvaluation.strengths.map((s: string, i: number) => (
                    <p key={i} className="text-xs text-zinc-400">✓ {s}</p>
                  ))}
                </div>
              )}

              {codeEvaluation.issues?.length > 0 && (
                <div>
                  <p className="text-xs text-yellow-400 mb-1">Issues</p>
                  {codeEvaluation.issues.map((s: string, i: number) => (
                    <p key={i} className="text-xs text-zinc-400">⚠ {s}</p>
                  ))}
                </div>
              )}

              {codeEvaluation.betterApproach && (
                <div>
                  <p className="text-xs text-zinc-400">💡 {codeEvaluation.betterApproach}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: Editor + Controls */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-surface-800/50">
          <select
            value={selectedLanguage}
            onChange={e => {
              setSelectedLanguage(e.target.value);
              setUserCode('');
            }}
            className="text-xs bg-surface-700 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-300 focus:outline-none focus:border-brand-500 capitalize"
          >
            {LANGUAGES.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-surface-600 border border-zinc-600 hover:border-zinc-400 text-sm transition-colors disabled:opacity-50"
            >
              {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              Run
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-500 text-black font-semibold text-sm hover:bg-brand-400 transition-colors"
            >
              Submit
            </button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 overflow-hidden">
          <MonacoEditor
            height="100%"
            language={selectedLanguage === 'cpp' ? 'cpp' : selectedLanguage}
            value={currentCode}
            onChange={v => setUserCode(v || '')}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: 'JetBrains Mono, monospace',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              lineNumbers: 'on',
              renderLineHighlight: 'line',
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
              tabSize: 2,
              smoothScrolling: true,
            }}
          />
        </div>

        {/* Output panel */}
        <AnimatePresence>
          {showOutput && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 160 }}
              exit={{ height: 0 }}
              className="border-t border-zinc-800 overflow-hidden bg-surface-800"
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-400 font-medium">Output</span>
                  {executionResult && (
                    <span className={`flex items-center gap-1 ${executionResult.success ? 'text-green-400' : 'text-red-400'}`}>
                      {executionResult.success
                        ? <><CheckCircle size={11} /> Accepted</>
                        : <><XCircle size={11} /> {executionResult.status}</>
                      }
                    </span>
                  )}
                  {running && <Loader2 size={11} className="animate-spin text-zinc-400" />}
                </div>
                <button onClick={() => setShowOutput(false)} className="text-zinc-600 hover:text-zinc-300 text-xs">✕</button>
              </div>
              <div className="p-4 font-mono text-xs text-zinc-300 overflow-auto h-[calc(100%-33px)]">
                {running && <span className="text-zinc-500">Running...</span>}
                {executionResult && !running && (
                  <div className="space-y-1">
                    {executionResult.stdout && (
                      <div>
                        <span className="text-zinc-500">stdout: </span>
                        <span className="text-green-400 whitespace-pre">{executionResult.stdout}</span>
                      </div>
                    )}
                    {executionResult.stderr && (
                      <div>
                        <span className="text-zinc-500">stderr: </span>
                        <span className="text-red-400 whitespace-pre">{executionResult.stderr}</span>
                      </div>
                    )}
                    {executionResult.compile_output && (
                      <div>
                        <span className="text-zinc-500">compile: </span>
                        <span className="text-yellow-400 whitespace-pre">{executionResult.compile_output}</span>
                      </div>
                    )}
                    <div className="text-zinc-500 mt-2">
                      Time: {executionResult.time}s · Memory: {Math.round((executionResult.memory || 0) / 1024)}KB
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
