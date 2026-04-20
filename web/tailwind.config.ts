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
        bg: '#000000',
        panel: '#0c0c0c',
        panel2: '#131313',
        border: '#1d1d1d',
        border2: '#262626',
        text: '#ffffff',
        subtext: '#d7d7d7',
        muted: '#909090',
        accent: '#ffa028',
        warn: '#e0c010',
        buy: '#4af6c3',
        sell: '#ff433d',
      },
      borderRadius: {
        DEFAULT: '0',
        sm: '0',
        md: '0',
        lg: '0',
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
