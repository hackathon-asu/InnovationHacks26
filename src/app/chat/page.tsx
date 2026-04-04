import { ChatInterface } from '@/components/chat/chat-interface';

export default function ChatPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Policy Q&A</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ask natural language questions about drug coverage policies.
        </p>
      </div>
      <ChatInterface />
    </div>
  );
}
