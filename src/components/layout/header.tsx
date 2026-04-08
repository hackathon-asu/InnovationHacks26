/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-6">
      <div className="flex items-center gap-4">
        {/* Spacer for mobile hamburger */}
        <div className="w-8 md:hidden" />
        <Link href="/" className="text-sm text-muted-foreground md:hidden">
          Insight <span className="text-primary font-medium">RX</span>
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-xs font-mono">
          Hackathon MVP
        </Badge>
      </div>
    </header>
  );
}
