import { ChatInterface } from '@/components/chat/chat-interface';

export default function ChatPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold font-[var(--font-montserrat)]">Policy Q&A</h1>
        <p className="mt-1 text-sm text-slate-500">Ask natural language questions about drug coverage policies.</p>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <ChatInterface />
      </div>
    </main>
  );
}
