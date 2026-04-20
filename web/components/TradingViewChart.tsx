'use client';

import { useEffect, useRef } from 'react';

// TradingView attaches this global when tv.js loads.
declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => unknown;
    };
  }
}

const TV_SCRIPT_SRC = 'https://s3.tradingview.com/tv.js';
let tvScriptPromise: Promise<void> | null = null;

function loadTv(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.TradingView) return Promise.resolve();
  if (tvScriptPromise) return tvScriptPromise;
  tvScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${TV_SCRIPT_SRC}"]`,
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('tv.js')));
      return;
    }
    const s = document.createElement('script');
    s.src = TV_SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('tv.js'));
    document.head.appendChild(s);
  });
  return tvScriptPromise;
}

/**
 * Embedded TradingView advanced chart for BNBUSDT on Binance.
 * Purely presentational — we can't overlay onchain orders here
 * (TradingView's widget is closed), but some users prefer the
 * familiar TradingView tools (drawings, indicators, timeframes).
 */
export function TradingViewChart() {
  const hostRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(`tv-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    let cancelled = false;
    loadTv()
      .then(() => {
        if (cancelled || !window.TradingView || !hostRef.current) return;
        new window.TradingView.widget({
          container_id: idRef.current,
          symbol: 'BINANCE:BNBUSDT',
          interval: '15',
          autosize: true,
          theme: 'dark',
          style: '1',
          timezone: 'Etc/UTC',
          locale: 'en',
          toolbar_bg: '#000000',
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: false,
          withdateranges: true,
          studies: [],
          backgroundColor: '#000000',
          gridColor: '#1d1d1d',
        });
      })
      .catch(() => {
        /* fail silently — the toggle lets them go back */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative h-full w-full bg-bg">
      <div id={idRef.current} ref={hostRef} className="h-full w-full" />
    </div>
  );
}
