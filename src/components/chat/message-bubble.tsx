import type { UIMessage } from 'ai';

interface MessageBubbleProps {
  message: UIMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl p-3 ${
          isUser
            ? 'bg-white border border-[#e8e8e4] rounded-tr-sm'
            : 'bg-[#f4f4f0] rounded-tl-sm'
        }`}
      >
        <p className="text-[10px] font-medium uppercase tracking-wider text-[#b0b0ac] mb-1">
          {isUser ? 'You' : 'AI Analyst'}
        </p>
        <div className="text-sm text-[#1a1a1a] whitespace-pre-wrap leading-relaxed">
          {message.parts.map((part, i) => {
            if (part.type === 'text') {
              return <span key={i}>{part.text}</span>;
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
}
