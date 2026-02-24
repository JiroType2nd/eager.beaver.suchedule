import type { Metadata, Viewport } from 'next';
import { Zen_Kaku_Gothic_New, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { BottomNav } from '@/components/BottomNav';

const zenKaku = Zen_Kaku_Gothic_New({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-zen-kaku',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: '交流戦スケジュール | バスケチーム',
  description: '交流戦スケジューリング・出欠・カレンダー同期',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${zenKaku.variable} ${plusJakarta.variable}`}>
      <body className="antialiased min-h-screen bg-navy-900 text-slate-100 font-brand">
        <Providers>
          {children}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
