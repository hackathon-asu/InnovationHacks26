import { ChatInterface } from '@/components/chat/chat-interface';

export default function ChatPage() {
  return (
    <div className="space-y-4 pt-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#1a1a1a]">Policy Q&A</h1>
        <p className="text-sm text-[#8b8b8b] mt-1">
          Ask natural language questions about drug coverage policies.
        </p>
      </div>
      <ChatInterface />
    </div>
  );
}
