/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
import type { Metadata } from 'next';
import { Inter, Montserrat } from 'next/font/google';
import { TopNav } from '@/components/layout/top-nav';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: {
    default: 'AntonRX — AI Policy Tracker',
    template: '%s | AntonRX',
  },
  description: 'Parse, compare, and track medical drug policies across major US payers with AI-powered extraction. 8-stage pipeline, 5 LLM providers, real-time RAG.',
  keywords: ['drug policy', 'prior authorization', 'medical policy', 'payer comparison', 'AI extraction', 'pharmacy benefits', 'AntonRX'],
  authors: [{ name: 'AntonRX Team' }],
  creator: 'AntonRX',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://antonrx.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'AntonRX',
    title: 'AntonRX — AI-Powered Drug Policy Tracker',
    description: 'Parse, compare, and track medical drug policies across major US payers with AI-powered extraction.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AntonRX — AI-Powered Drug Policy Tracker',
    description: 'Parse, compare, and track medical drug policies across major US payers with AI-powered extraction.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`} suppressHydrationWarning>
      <body className="antialiased bg-[#F5F3EF] dark:bg-[#0F1117] text-[#15173F] dark:text-slate-200 min-h-screen font-[var(--font-inter)] transition-colors">
        <ThemeProvider>
          <TopNav />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
