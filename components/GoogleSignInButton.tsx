'use client';

import { signIn } from 'next-auth/react';

export function GoogleSignInButton() {
  return (
    <button
      type="button"
      onClick={() => signIn('google', { callbackUrl: '/' })}
      className="inline-block px-6 py-3 bg-gold-500 text-navy-900 rounded-xl font-medium min-w-[200px] touch-manipulation hover:bg-gold-400 active:opacity-90"
    >
      Googleでログイン
    </button>
  );
}
