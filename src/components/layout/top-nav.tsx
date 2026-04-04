'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Pill, GitCompareArrows, FileText, History,
  MessageSquare, Upload, BookOpen, LayoutDashboard,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/drugs', label: 'Drugs', icon: Pill },
  { href: '/compare', label: 'Compare', icon: GitCompareArrows },
  { href: '/policies', label: 'Policies', icon: FileText },
  { href: '/changes', label: 'Changes', icon: History },
  { href: '/chat', label: 'Ask AI', icon: MessageSquare },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/api-docs', label: 'API', icon: BookOpen },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#e8e8e4]">
      <div className="mx-auto max-w-[1400px] px-6 flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
            <Pill className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-semibold tracking-tight">
            Anton <span className="text-emerald-600">RX</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#1a1a1a] text-white shadow-sm'
                    : 'text-[#6b6b6b] hover:text-[#1a1a1a] hover:bg-[#f0f0ec]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-300 to-orange-400" />
        </div>
      </div>
    </header>
  );
}
