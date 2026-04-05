type Message = { id: string; role: 'user' | 'assistant'; content: string };

export function MessageBubble({ message, dark }: { message: Message; dark?: boolean }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-[9px] font-bold ${
        isUser
          ? 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'
          : 'bg-[#15173F] dark:bg-[#91BFEB] text-white dark:text-[#15173F]'
      }`}>
        {isUser ? 'You' : 'Rx'}
      </div>
      {/* Bubble */}
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? 'bg-[#15173F] text-white'
          : 'bg-white dark:bg-[#181A20] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200'
      }`}>
        {message.content}
      </div>
    </div>
  );
}
