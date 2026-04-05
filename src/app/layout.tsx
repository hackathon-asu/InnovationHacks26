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
  title: 'AntonRX — Policy Tracker',
  description: 'Drug coverage tracking and comparison across major US payers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`} suppressHydrationWarning>
      <body className="antialiased bg-[#F6F8FB] dark:bg-[#0F1117] text-[#15173F] dark:text-slate-200 min-h-screen font-[var(--font-inter)] transition-colors">
        <ThemeProvider>
          <TopNav />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
