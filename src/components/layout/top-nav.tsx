'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Overview' },
  { href: '/upload', label: 'Upload' },
  { href: '/fetch', label: 'Auto-Fetch' },
  { href: '/drugs', label: 'Drugs' },
  { href: '/compare', label: 'Compare' },
  { href: '/policies', label: 'Policies' },
  { href: '/changes', label: 'Changes' },
  { href: '/chat', label: 'Ask AI' },
  { href: '/api-docs', label: 'API' },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-2xl font-semibold tracking-tight font-[var(--font-montserrat)]">
            ANTON<span className="text-[#91BFEB]">RX</span>
          </Link>
          <span className="hidden rounded-full bg-[#dceeff] px-3 py-1 text-xs font-medium text-[#15173F] md:block">
            AI Policy Tracker
          </span>
        </div>
        <nav className="hidden gap-6 text-sm text-slate-500 md:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-colors hover:text-[#15173F] ${
                  isActive ? 'text-[#15173F] font-medium' : ''
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
