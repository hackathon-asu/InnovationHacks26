'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './message-bubble';

type Message = { id: string; role: 'user' | 'assistant'; content: string };
type Provider = 'gemini' | 'nvidia' | 'groq' | 'ollama';

export function ChatInterface() {
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState<Provider>('ollama');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, provider }),
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

  return (
    <div className="flex h-[calc(100vh-16rem)] flex-col">
      {/* Provider toggle */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <span className="text-xs font-medium text-slate-500">Model:</span>
        <div className="flex rounded-lg border border-slate-200 bg-[#F6F8FB] p-0.5">
          {(['gemini', 'nvidia', 'groq', 'ollama'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                provider === p
                  ? 'bg-[#15173F] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p === 'gemini' ? 'Gemini' : p === 'nvidia' ? 'NVIDIA' : p === 'groq' ? 'Groq' : 'Ollama'}
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 py-4">
        {messages.length === 0 && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-[#15173F] flex items-center justify-center text-white font-semibold">AI</div>
            <p className="text-lg font-semibold font-[var(--font-montserrat)] text-[#15173F]">Ask about drug coverage policies</p>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">Try &quot;Does Aetna cover Keytruda?&quot; or &quot;Compare Humira step therapy requirements&quot;</p>
            <div className="mt-4 flex flex-wrap gap-2 max-w-lg mx-auto justify-center">
              {['Which payers cover adalimumab?', 'Compare Humira step therapy', 'What changed in UHC policies?'].map((s) => (
                <span key={s} onClick={() => setInput(s)} className="cursor-pointer rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">{s}</span>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
        {isLoading && (
          <div className="rounded-xl bg-[#F6F8FB] p-3 max-w-[80%] animate-pulse text-sm text-slate-500">Thinking...</div>
        )}
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-200">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about drug coverage..."
          className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-[#91BFEB] transition-colors"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
        />
        <button onClick={handleSend} disabled={isLoading || !input.trim()} className="rounded-xl bg-[#15173F] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity">Send</button>
      </div>
    </div>
  );
}
