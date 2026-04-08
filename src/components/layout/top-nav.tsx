'use client';
/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/theme-provider';

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
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/60 dark:border-white/10 bg-[#F6F8FB]/90 dark:bg-[#181A20]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/demo" className="text-2xl font-semibold tracking-tight font-[var(--font-montserrat)] dark:text-white">
            ANTON<span className="text-[#91BFEB]">RX</span>
          </Link>
          <span className="hidden rounded-full bg-[#dceeff] dark:bg-[#91BFEB]/15 px-3 py-1 text-xs font-medium text-[#15173F] dark:text-[#91BFEB] md:block">
            AI Policy Tracker
          </span>
        </div>
        <div className="flex items-center gap-4">
          <nav className="hidden gap-6 text-sm text-slate-500 dark:text-slate-400 md:flex">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`transition-colors hover:text-[#15173F] dark:hover:text-white ${
                    isActive ? 'text-[#15173F] dark:text-white font-medium' : ''
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={toggle}
            className="rounded-lg border border-slate-200 dark:border-white/10 p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
