import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { TopNav } from '@/components/layout/top-nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Anton RX Track',
  description: 'Drug coverage tracking and comparison across major US payers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased bg-[#fafaf8] text-[#1a1a1a] min-h-screen">
        <TopNav />
        <main className="mx-auto max-w-[1400px] px-6 pb-12">
          {children}
        </main>
      </body>
    </html>
  );
}
