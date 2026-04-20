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
        bg: '#0b0d10',
        panel: '#11151a',
        panel2: '#161b22',
        border: '#222933',
        text: '#e6edf3',
        subtext: '#8b98a5',
        accent: '#f0b90b',
        buy: '#26a69a',
        sell: '#ef5350',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
