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
    <div className="flex h-[calc(100vh-14rem)] flex-col">
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-lg font-semibold mb-4">
              AI
            </div>
            <p className="text-lg font-medium text-[#1a1a1a]">Ask about drug coverage policies</p>
            <p className="mt-1 text-sm text-[#8b8b8b] max-w-md">
              Try questions like &quot;Does Aetna cover Keytruda for breast cancer?&quot;
              or &quot;Which plans require step therapy for Humira?&quot;
            </p>
            <div className="mt-4 flex flex-wrap gap-2 max-w-lg justify-center">
              {[
                'Which payers cover adalimumab?',
                'Compare Humira step therapy requirements',
                'What changed in UHC policies this quarter?',
              ].map((suggestion) => (
                <span
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="cursor-pointer rounded-full bg-[#f0f0ec] px-3 py-1.5 text-xs text-[#6b6b6b] hover:bg-[#e4e4e0] transition-colors"
                >
                  {suggestion}
                </span>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="bg-[#f4f4f0] rounded-2xl rounded-tl-sm p-3 max-w-[80%] animate-pulse">
            <p className="text-sm text-[#8b8b8b]">Thinking...</p>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4 border-t border-[#e8e8e4]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about drug coverage..."
          className="flex-1 rounded-xl border border-[#e8e8e4] bg-white px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#b0b0ac] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="shrink-0 rounded-xl bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#333] disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
