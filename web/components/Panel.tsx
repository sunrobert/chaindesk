import type { ReactNode } from 'react';

export function Panel({
  title,
  right,
  children,
  className = '',
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden bg-bg ${className}`}
    >
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border bg-panel px-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtext">
          {title}
        </h2>
        {right}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  );
}
