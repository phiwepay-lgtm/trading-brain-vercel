import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dark Orders — Pure Price + History',
  description: 'A price-only TradingView overlay for journaling and context.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
