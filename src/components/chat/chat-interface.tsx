'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MessageBubble } from './message-bubble';

const transport = new DefaultChatTransport({ api: '/api/chat' });

export function ChatInterface() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat({ transport });
  const isLoading = status === 'streaming' || status === 'submitted';

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    await sendMessage({ text });
  }

  return (
    <div className="flex h-[calc(100vh-16rem)] flex-col">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
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
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
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
