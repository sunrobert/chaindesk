'use client';

import { useNews } from '@/hooks/useNews';

export function NewsTicker() {
  const { data, isLoading, isError } = useNews();
  const items = data ?? [];

  if (isLoading || isError || items.length === 0) {
    return (
      <div className="flex h-[22px] items-center border-b border-border bg-panel px-3 text-[10px] tracking-widest text-muted">
        <span className="mr-3 border-r border-border pr-3 font-semibold text-accent">
          NEWS
        </span>
        <span>{isError ? 'feed offline' : 'loading headlines…'}</span>
      </div>
    );
  }

  // Duplicate the list so the marquee wraps seamlessly.
  const loop = [...items, ...items];

  return (
    <div className="relative flex h-[22px] items-center border-b border-border bg-panel text-[10px]">
      {/* Fixed label */}
      <div className="z-10 flex h-full items-center border-r border-border bg-panel px-3 font-semibold uppercase tracking-widest text-accent">
        NEWS
      </div>

      {/* Marquee track */}
      <div className="relative flex-1 overflow-hidden">
        <div className="marquee-track flex whitespace-nowrap will-change-transform">
          {loop.map((n, i) => (
            <a
              key={`${n.id}-${i}`}
              href={n.url}
              target="_blank"
              rel="noreferrer"
              className="group mx-6 flex items-center gap-2 tracking-wide"
              title={n.title}
            >
              <span className="text-muted">
                {fmtAgo(n.publishedAt)}
              </span>
              <span className="text-muted">·</span>
              <span className="text-subtext group-hover:text-accent">
                {n.source}
              </span>
              <span className="text-muted">·</span>
              <span className="text-text group-hover:text-accent">
                {n.title}
              </span>
              {n.tags.length > 0 && (
                <span className="num text-[9px] uppercase tracking-widest text-accent/70">
                  [{n.tags.slice(0, 2).join(' / ')}]
                </span>
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function fmtAgo(ts: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
