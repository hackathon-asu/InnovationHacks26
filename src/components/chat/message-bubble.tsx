import type { UIMessage } from 'ai';

export function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-xl p-3 text-sm ${
        isUser ? 'bg-[#F6F8FB] text-slate-700' : 'bg-[#dceeff] text-[#15173F]'
      }`}>
        {message.parts.map((part, i) => part.type === 'text' ? <span key={i}>{part.text}</span> : null)}
      </div>
    </div>
  );
}
