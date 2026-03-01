import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2563eb', dark: '#1d4ed8' },
        court: { light: '#f0fdf4', DEFAULT: '#22c55e', dark: '#15803d' },
        // ネイビーテーマ（UIデザイン要件定義より）メインカラー
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#0f172a',  // メイン背景
          950: '#0a0f1a',
        },
        // アクセント（ネイビーと相性の良いパレット）
        gold: {
          300: '#f5edc8',  // ホバー用・軽い強調
          400: '#f0e5b8',  // 淡いゴールド
          500: '#e6d9a0',  // プライマリアクセント
          600: '#dccc82',
          700: '#c9b86c',
        },
      },
      safe: {
        bottom: 'env(safe-area-inset-bottom, 0px)',
      },
      fontFamily: {
        brand: [
          'var(--font-plus-jakarta)',
          'var(--font-zen-kaku)',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
