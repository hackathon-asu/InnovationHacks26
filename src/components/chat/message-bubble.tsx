type Message = { id: string; role: 'user' | 'assistant'; content: string };

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-xl p-3 text-sm whitespace-pre-wrap ${
        isUser ? 'bg-[#F6F8FB] text-slate-700' : 'bg-[#dceeff] text-[#15173F]'
      }`}>
        {message.content}
      </div>
    </div>
  );
}
