'use client';

import Link from 'next/link';

/** 共通の戻るリンク */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-gold-400 hover:text-gold-300 text-sm flex items-center gap-1">
      ← {children}
    </Link>
  );
}

/** 共通のページタイトル */
export function PageTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="text-xl font-bold text-white">{children}</h1>;
}

/** 共通のプライマリボタン（ゴールド） */
export function PrimaryButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`px-4 py-2 bg-gold-500 text-navy-900 rounded-lg font-medium hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** 共通のセカンダリボタン（枠線） */
export function SecondaryButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`px-4 py-2 border border-gold-500/70 text-gold-400 rounded-lg font-medium hover:bg-gold-500/10 disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
