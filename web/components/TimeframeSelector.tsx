'use client';

import type { TimeframeId } from './Chart';

const OPTIONS: TimeframeId[] = ['1m', '5m', '15m', '1h', '4h'];

export function TimeframeSelector({
  value,
  onChange,
}: {
  value: TimeframeId;
  onChange: (v: TimeframeId) => void;
}) {
  return (
    <div className="flex items-center gap-px">
      {OPTIONS.map((tf) => {
        const active = tf === value;
        return (
          <button
            key={tf}
            onClick={() => onChange(tf)}
            className={`num px-[6px] py-[2px] text-[10px] uppercase tracking-widest ${
              active
                ? 'bg-accent/15 text-accent'
                : 'bg-panel2 text-subtext hover:text-text'
            }`}
          >
            {tf}
          </button>
        );
      })}
    </div>
  );
}
