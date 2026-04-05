'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { MessageBubble } from './message-bubble';

type Message = { id: string; role: 'user' | 'assistant'; content: string };
type Provider = 'gemini' | 'anthropic' | 'nvidia' | 'groq' | 'ollama';

const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: 'Gemini 2.5',
  anthropic: 'Claude',
  nvidia: 'DeepSeek V3',
  groq: 'Groq Llama',
  ollama: 'Qwen3 Local',
};

const SUGGESTIONS = [
  { icon: '💊', title: 'Drug Coverage', desc: 'Which plans cover bevacizumab?', query: 'Which plans cover bevacizumab?' },
  { icon: '🔄', title: 'Step Therapy', desc: 'Compare Rituxan step therapy', query: 'Compare step therapy requirements for Rituxan across payers' },
  { icon: '📋', title: 'Prior Auth', desc: 'Cigna biologics prior auth?', query: 'What prior authorization does Cigna require for biologics?' },
  { icon: '📊', title: 'Policy Changes', desc: 'What changed recently?', query: 'What changed in recent policy updates?' },
];

export function ChatInterface() {
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState<Provider>('ollama');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const [dark, setDark] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;
    setInput('');

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: msg, provider }),
      });
      const data = await res.json();
      const answer = data.answer ?? data.error ?? 'No response from backend.';
      const sources = data.sources?.length
        ? `\n\n---\n**Sources:** ${data.sources.map((s: { payer_name: string; filename: string }) => `${s.payer_name} (${s.filename})`).join(', ')}`
        : '';
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: answer + sources },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: 'Failed to reach the backend.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="flex flex-1 flex-col min-h-screen bg-[#FAFBFD] dark:bg-[#0F1117]">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <div className="h-7 w-7 rounded-lg bg-[#15173F] dark:bg-[#91BFEB] flex items-center justify-center">
              <span className="text-[10px] font-bold text-white dark:text-[#15173F]">Rx</span>
            </div>
            <span className="text-sm font-semibold text-slate-800 dark:text-white">AntonRX Policy AI</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={() => setDark(!dark)}
              className="rounded-lg border border-slate-200 dark:border-white/10 p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              title={dark ? 'Light mode' : 'Dark mode'}
            >
              {dark ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <button
              onClick={() => { setMessages([]); setInput(''); }}
              className="rounded-lg border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              New Chat
            </button>
          </div>
        </header>

        {/* Messages / Welcome area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {!hasMessages ? (
            <div className="flex flex-col items-center justify-center px-6 py-20">
              {/* Greeting */}
              <div className="mb-2 h-14 w-14 rounded-2xl bg-[#15173F] dark:bg-[#91BFEB] flex items-center justify-center">
                <span className="text-lg font-bold text-white dark:text-[#15173F]">Rx</span>
              </div>
              <h1 className="mt-4 text-2xl font-bold text-[#15173F] dark:text-white font-[var(--font-montserrat)]">
                How can I help you today?
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md text-center">
                Ask questions about drug coverage, prior authorization, step therapy, and policy differences across payers.
              </p>

              {/* Suggestion cards */}
              <div className="mt-8 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    onClick={() => handleSend(s.query)}
                    className="group flex flex-col items-start rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] p-4 text-left transition-all hover:border-[#91BFEB] hover:shadow-md dark:hover:border-[#91BFEB]/60"
                  >
                    <span className="text-xl">{s.icon}</span>
                    <span className="mt-2 text-sm font-semibold text-slate-800 dark:text-white group-hover:text-[#15173F] dark:group-hover:text-[#91BFEB]">{s.title}</span>
                    <span className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-snug">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4 px-6 py-6">
              {messages.map((m) => <MessageBubble key={m.id} message={m} dark={dark} />)}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="shrink-0 h-8 w-8 rounded-lg bg-[#15173F] dark:bg-[#91BFEB] flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white dark:text-[#15173F]">Rx</span>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-[#181A20] border border-slate-200 dark:border-white/10 p-3 text-sm text-slate-500 dark:text-slate-400 animate-pulse">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-[#91BFEB] animate-bounce" />
                      <div className="h-2 w-2 rounded-full bg-[#91BFEB] animate-bounce [animation-delay:0.15s]" />
                      <div className="h-2 w-2 rounded-full bg-[#91BFEB] animate-bounce [animation-delay:0.3s]" />
                      <span className="ml-2 text-xs">Analyzing policies...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] px-6 py-4">
          <div className="mx-auto max-w-3xl">
            <div className="relative rounded-2xl border border-slate-200 dark:border-white/10 bg-[#F6F8FB] dark:bg-[#0F1117] focus-within:border-[#91BFEB] focus-within:ring-2 focus-within:ring-[#91BFEB]/20 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about drug coverage policies..."
                rows={1}
                className="w-full resize-none bg-transparent px-4 pt-3 pb-12 text-sm text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
              />
              {/* Bottom toolbar inside textarea */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                {/* Model selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowProviderMenu(!showProviderMenu)}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-white/5 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    {PROVIDER_LABELS[provider]}
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {showProviderMenu && (
                    <div className="absolute bottom-full left-0 mb-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E2028] py-1 shadow-lg min-w-[160px] z-10">
                      {(Object.entries(PROVIDER_LABELS) as [Provider, string][]).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => { setProvider(key); setShowProviderMenu(false); }}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors ${
                            provider === key
                              ? 'bg-[#F6F8FB] dark:bg-white/5 text-[#15173F] dark:text-white font-semibold'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                          }`}
                        >
                          {provider === key && <svg className="h-3 w-3 text-[#91BFEB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          {provider !== key && <span className="w-3" />}
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Send button */}
                <button
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#15173F] dark:bg-[#91BFEB] text-white dark:text-[#15173F] hover:opacity-90 disabled:opacity-30 transition-opacity"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                </button>
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-400 dark:text-slate-500">
              AntonRX AI can make mistakes. Verify drug coverage details with official payer documentation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
