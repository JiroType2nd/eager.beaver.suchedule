'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, CalendarDays, Users, Trophy, User } from 'lucide-react';

export function BottomNav() {
  const { status } = useSession();
  const pathname = usePathname();

  if (status !== 'authenticated') return null;
  if (pathname?.startsWith('/t/')) return null;
  if (pathname?.startsWith('/join/')) return null;
  if (pathname?.startsWith('/attend/')) return null;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname?.startsWith(href) ?? false;
  };

  const navItems: { href: string; label: string; icon: React.ElementType }[] = [
    { href: '/', label: 'ホーム', icon: Home },
    { href: '/activities', label: '活動', icon: Calendar },
    { href: '/slots', label: '交流戦', icon: CalendarDays },
    { href: '/members', label: 'メンバー', icon: Users },
    { href: '/team', label: '試合記録', icon: Trophy },
    { href: '/me', label: 'マイページ', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 flex justify-around items-center py-2 px-1 bg-navy-800 border-t border-navy-700 pb-safe">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 px-2 py-2 text-xs ${active ? 'text-gold-400 font-medium' : 'text-slate-400'}`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
