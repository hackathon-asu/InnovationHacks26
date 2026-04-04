import { Card, CardContent } from '@/components/ui/card';
import type { UIMessage } from 'ai';

interface MessageBubbleProps {
  message: UIMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <Card
        className={`max-w-[80%] ${
          isUser ? 'bg-primary text-primary-foreground' : ''
        }`}
      >
        <CardContent className="py-3">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider opacity-60">
              {isUser ? 'You' : 'AI Analyst'}
            </p>
            <div className="text-sm whitespace-pre-wrap leading-relaxed">
              {message.parts.map((part, i) => {
                if (part.type === 'text') {
                  return <span key={i}>{part.text}</span>;
                }
                return null;
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
