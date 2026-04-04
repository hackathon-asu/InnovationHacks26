'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-lg font-medium">Ask about drug coverage policies</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-md">
                Try questions like &quot;Does Aetna cover Keytruda for breast cancer?&quot;
                or &quot;Which plans require step therapy for Humira?&quot;
              </p>
              <div className="mt-4 flex flex-wrap gap-2 max-w-lg justify-center">
                {[
                  'Which payers cover adalimumab?',
                  'Compare Humira step therapy requirements',
                  'What changed in UHC policies this quarter?',
                ].map((suggestion) => (
                  <Badge
                    key={suggestion}
                    variant="secondary"
                    className="cursor-pointer hover:bg-accent transition-colors text-xs"
                    onClick={() => setInput(suggestion)}
                  >
                    {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <Card className="max-w-[80%]">
              <CardContent className="py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      <div className="flex gap-3 pt-4 border-t border-border">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about drug coverage..."
          className="min-h-[44px] max-h-32 resize-none"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
