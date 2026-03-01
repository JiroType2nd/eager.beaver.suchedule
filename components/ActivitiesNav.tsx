'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Pencil,
  UserCheck,
  LayoutGrid,
  Calendar,
  CalendarPlus,
  UserPlus,
  List,
} from 'lucide-react';

const navItems = [
  { href: '/activities', label: '一覧', icon: List },
  { href: '/activities/bulk-edit', label: '一括編集', icon: Pencil },
  { href: '/activities/bulk-attendance', label: '一括出欠', icon: UserCheck },
  { href: '/activities/attendance-matrix', label: 'マトリックス', icon: LayoutGrid },
  { href: '/activities/calendar', label: 'カレンダー', icon: Calendar },
  { href: '/activities/bulk-calendar', label: '一括追加', icon: CalendarPlus },
  { href: '/activities/guest-recruitment/new', label: '外部募集', icon: UserPlus },
] as const;

export function ActivitiesNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/activities') {
      return pathname === '/activities';
    }
    return pathname?.startsWith(href) ?? false;
  };

  return (
    <nav className="flex flex-wrap gap-2 mb-6">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        const isExternal = href.includes('guest-recruitment');
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
              isExternal
                ? active
                  ? 'bg-violet-500/20 border border-violet-400/70 text-violet-300'
                  : 'border border-violet-400/70 text-violet-300 hover:bg-violet-500/10'
                : active
                ? 'bg-gold-500/20 border border-gold-500/70 text-gold-400'
                : 'border border-gold-500/70 text-gold-400 hover:bg-gold-500/10'
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
