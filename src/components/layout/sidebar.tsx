'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Pill, GitCompareArrows, FileText,
  History, MessageSquare, Upload, Menu, X, BookOpen,
} from 'lucide-react';
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/drugs', label: 'Drug Search', icon: Pill },
  { href: '/compare', label: 'Compare Plans', icon: GitCompareArrows },
  { href: '/policies', label: 'Policies', icon: FileText },
  { href: '/changes', label: 'Changes', icon: History },
  { href: '/chat', label: 'Ask AI', icon: MessageSquare },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/api-docs', label: 'API Docs', icon: BookOpen },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-1 p-3">
      {navItems.map((item) => {
        const isActive = pathname === item.href ||
          (item.href !== '/' && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:block">
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Anton <span className="text-primary">RX</span> Track
          </Link>
        </div>
        <NavLinks pathname={pathname} />
      </aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-50 rounded-md p-2 text-muted-foreground hover:bg-accent md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-60 border-r border-border bg-card md:hidden">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="text-lg font-semibold tracking-tight"
              >
                Anton <span className="text-primary">RX</span> Track
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}
