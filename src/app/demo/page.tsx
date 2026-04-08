'use client';
/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

const STEPS = [
  { num: '01', title: 'Upload PDFs', desc: 'Drop payer policy docs — Aetna, Cigna, UHC, Anthem, Humana', color: 'from-blue-500 to-cyan-400' },
  { num: '02', title: 'AI Extracts', desc: '5 LLM providers parse drugs, J-codes, step therapy, prior auth', color: 'from-violet-500 to-purple-400' },
  { num: '03', title: 'Compare', desc: 'Side-by-side drug coverage across all indexed payers', color: 'from-emerald-500 to-teal-400' },
  { num: '04', title: 'Ask AI', desc: 'RAG-powered Q&A with citations from actual policy text', color: 'from-amber-500 to-orange-400' },
];

const PIPELINE = [
  { name: 'Parse & OCR', icon: '📄' },
  { name: 'Bio NER', icon: '🧬' },
  { name: 'LLM Extract', icon: '🤖' },
  { name: 'RxNorm', icon: '💊' },
  { name: 'Save DB', icon: '💾' },
  { name: 'Chunk', icon: '✂️' },
  { name: 'Embed', icon: '🧮' },
  { name: 'Index', icon: '🔍' },
];

const PROVIDERS = [
  { name: 'Gemini 2.5', org: 'Google', color: 'bg-blue-500' },
  { name: 'Claude', org: 'Anthropic', color: 'bg-amber-500' },
  { name: 'DeepSeek V3', org: 'NVIDIA', color: 'bg-green-500' },
  { name: 'Groq Llama', org: 'Groq', color: 'bg-orange-500' },
  { name: 'Qwen3 4B', org: 'Local', color: 'bg-purple-500' },
];

const TECH = [
  { name: 'Next.js 16', desc: 'App Router', icon: '▲' },
  { name: 'FastAPI', desc: 'Async backend', icon: '⚡' },
  { name: 'Neon Postgres', desc: 'Cloud + pgvector', icon: '🐘' },
  { name: 'Docling', desc: 'PDF parsing', icon: '📑' },
  { name: 'scispaCy', desc: 'Biomedical NER', icon: '🧬' },
  { name: 'pgvector', desc: '768-dim search', icon: '📐' },
  { name: 'RxNorm API', desc: 'Drug codes', icon: '💊' },
  { name: 'RAG Pipeline', desc: 'Grounded answers', icon: '🎯' },
];

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    function tick(now: number) {
      const p = Math.min((now - start) / 1200, 1);
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return <>{count}{suffix}</>;
}

function Stars() {
  const [mounted, setMounted] = useState(false);
  const stars = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      w: (((i * 7 + 3) % 20) / 10 + 1).toFixed(1),
      top: ((i * 17 + 5) % 100).toFixed(1),
      left: ((i * 31 + 11) % 100).toFixed(1),
      opacity: (((i * 13 + 7) % 50) / 100 + 0.1).toFixed(2),
      delay: ((i * 11) % 40) / 10 + 's',
      dur: ((i * 7) % 30) / 10 + 2 + 's',
    })),
  []);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 dark:block hidden">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white animate-pulse"
          style={{ width: s.w + 'px', height: s.w + 'px', top: s.top + '%', left: s.left + '%', opacity: Number(s.opacity), animationDelay: s.delay, animationDuration: s.dur }}
        />
      ))}
    </div>
  );
}

export default function DemoPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [pipelineStage, setPipelineStage] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setActiveStep((s) => (s + 1) % STEPS.length), 1800);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const i = setInterval(() => setPipelineStage((s) => (s + 1) % (PIPELINE.length + 1)), 600);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0b1a] text-[#15173F] dark:text-white overflow-x-hidden transition-colors">
      <Stars />

      {/* ── Hero (left-aligned) + Pipeline (right) ── */}
      <section className="relative px-6 pt-12 pb-16">
        <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-600/10 dark:bg-blue-600/20 blur-[120px] pointer-events-none" />
        <div className="absolute top-10 right-10 w-[300px] h-[300px] rounded-full bg-purple-600/10 dark:bg-purple-600/15 blur-[100px] pointer-events-none" />

        <div className="relative mx-auto max-w-6xl grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-start">
          {/* Left — Hero text */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-1.5 text-xs backdrop-blur mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Innovation Hacks 2.0 — ASU April 2026
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] font-[var(--font-montserrat)] tracking-tight">
              Drug Policy
              <br />
              <span className="bg-gradient-to-r from-[#15173F] via-blue-600 to-purple-600 dark:from-[#91BFEB] dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                Intelligence
              </span>
            </h1>

            <p className="mt-5 text-base text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              Upload payer PDFs. AI extracts drug coverage rules.
              Compare across plans. Ask questions with grounded answers.
            </p>

            <div className="mt-8 flex items-center gap-3">
              <Link href="/upload" className="rounded-xl bg-gradient-to-r from-[#91BFEB] to-blue-400 px-6 py-3 text-sm font-bold text-[#0a0b1a] hover:scale-105 transition-transform shadow-lg shadow-blue-500/25">
                Try It Now
              </Link>
              <Link href="/chat" className="rounded-xl border border-slate-200 dark:border-white/20 bg-slate-50 dark:bg-white/5 px-6 py-3 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-white/10 transition backdrop-blur">
                Ask AI
              </Link>
              <Link href="/" className="rounded-xl border border-slate-200 dark:border-white/10 px-6 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-[#15173F] dark:hover:text-white transition">
                Dashboard
              </Link>
            </div>

            {/* Stats inline */}
            <div className="mt-10 grid grid-cols-4 gap-4">
              {[
                { v: 5, l: 'LLM Providers' },
                { v: 8, l: 'Pipeline Stages' },
                { v: 16, l: 'API Endpoints', s: '+' },
                { v: 5, l: 'Payer Adapters' },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-2xl font-extrabold font-[var(--font-montserrat)] bg-gradient-to-b from-[#15173F] to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                    <AnimatedCounter target={s.v} suffix={s.s} />
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Pipeline visualization */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-6 backdrop-blur">
            <div className="flex items-center gap-2 mb-5">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-bold">8-Stage AI Pipeline</span>
              <span className="text-xs text-slate-500 ml-auto font-mono">live</span>
            </div>

            <div className="space-y-2">
              {PIPELINE.map((stage, i) => {
                const isDone = i < pipelineStage;
                const isActive = i === pipelineStage;
                return (
                  <div key={stage.name} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300 ${
                    isActive ? 'bg-[#91BFEB]/10 border border-[#91BFEB]/30' :
                    isDone ? 'bg-white dark:bg-white/[0.03]' : 'opacity-40'
                  }`}>
                    <span className="text-lg w-7 text-center">{stage.icon}</span>
                    <span className={`flex-1 text-sm font-medium ${isActive ? 'text-blue-600 dark:text-[#91BFEB]' : isDone ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                      {stage.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600">{i + 1}/8</span>
                    {isDone && <svg className="h-4 w-4 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    {isActive && <div className="h-3.5 w-3.5 rounded-full border-2 border-[#91BFEB] border-t-transparent animate-spin" />}
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-1.5 rounded-full bg-slate-200 dark:bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${Math.min((pipelineStage / PIPELINE.length) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Providers + Tech in two columns ── */}
      <section className="relative py-14 px-6">
        <div className="mx-auto max-w-6xl grid gap-10 lg:grid-cols-2">
          {/* LLM Providers */}
          <div>
            <h2 className="text-2xl font-bold font-[var(--font-montserrat)] mb-6">5 AI Providers</h2>
            <div className="space-y-3">
              {PROVIDERS.map((p) => (
                <div key={p.name} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] p-3 hover:border-[#91BFEB]/50 dark:hover:border-white/10 hover:shadow-md dark:hover:bg-white/[0.04] transition-all">
                  <div className={`h-9 w-9 rounded-lg ${p.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {p.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.org}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tech stack */}
          <div>
            <h2 className="text-2xl font-bold font-[var(--font-montserrat)] mb-6">Tech Stack</h2>
            <div className="grid grid-cols-2 gap-3">
              {TECH.map((t) => (
                <div key={t.name} className="rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] p-3 hover:border-[#91BFEB]/50 dark:hover:border-white/10 hover:shadow-md dark:hover:bg-white/[0.04] transition-all">
                  <span className="text-xl">{t.icon}</span>
                  <div className="mt-1 text-sm font-bold">{t.name}</div>
                  <div className="text-[10px] text-slate-500">{t.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works — fast cycling ── */}
      <section className="relative py-14 px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl font-bold font-[var(--font-montserrat)] mb-8 text-center">How It Works</h2>

          <div className="grid gap-4 sm:grid-cols-4">
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className={`rounded-xl border p-5 transition-all duration-300 cursor-pointer ${
                  activeStep === i
                    ? 'border-[#91BFEB]/40 dark:border-white/20 bg-[#91BFEB]/5 dark:bg-white/[0.06] scale-[1.03] shadow-xl'
                    : 'border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/10'
                }`}
                onClick={() => setActiveStep(i)}
              >
                <div className={`h-1 w-10 rounded-full bg-gradient-to-r ${step.color} mb-3 transition-all ${activeStep === i ? 'w-full' : ''}`} />
                <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mb-1">STEP {step.num}</div>
                <h3 className="text-sm font-bold mb-1">{step.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-16 px-6">
        <div className="absolute inset-0 bg-gradient-to-t from-blue-600/5 dark:from-blue-600/10 to-transparent pointer-events-none" />
        <div className="relative mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold font-[var(--font-montserrat)]">
            Ready to explore?
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400">Upload a policy PDF and watch AI extract everything in real-time.</p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link href="/upload" className="rounded-xl bg-gradient-to-r from-[#91BFEB] to-blue-400 px-7 py-3.5 text-sm font-bold text-[#0a0b1a] hover:scale-105 transition-transform shadow-lg shadow-blue-500/25">
              Upload a PDF
            </Link>
            <Link href="/chat" className="rounded-xl border border-slate-200 dark:border-white/20 bg-slate-50 dark:bg-white/5 px-7 py-3.5 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-white/10 transition backdrop-blur">
              Ask AI a Question
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-6 px-6 text-center text-xs text-slate-400 dark:text-slate-600">
        InsightRX — Innovation Hacks 2.0 @ ASU — April 2026
      </footer>
    </div>
  );
}
