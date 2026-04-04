'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/drugs', label: 'Drug Search', icon: 'Pill' },
  { href: '/compare', label: 'Compare Plans', icon: 'GitCompareArrows' },
  { href: '/policies', label: 'Policies', icon: 'FileText' },
  { href: '/changes', label: 'Changes', icon: 'History' },
  { href: '/chat', label: 'Ask AI', icon: 'MessageSquare' },
  { href: '/upload', label: 'Upload', icon: 'Upload' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:block">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Anton <span className="text-primary">RX</span> Track
        </Link>
      </div>
      <nav className="space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
