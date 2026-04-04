import type { Metadata } from 'next';
import { Inter, Montserrat } from 'next/font/google';
import { TopNav } from '@/components/layout/top-nav';
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
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="antialiased bg-[#F6F8FB] text-[#15173F] min-h-screen font-[var(--font-inter)]">
        <TopNav />
        {children}
      </body>
    </html>
  );
}
