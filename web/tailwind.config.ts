import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        panel: '#111111',
        panel2: '#141414',
        border: '#1f1f1f',
        border2: '#222222',
        text: '#fafafa',
        subtext: '#a1a1aa',
        muted: '#52525b',
        accent: '#eab308',
        buy: '#22c55e',
        sell: '#ef4444',
      },
      borderRadius: {
        DEFAULT: '2px',
        sm: '2px',
        md: '2px',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
