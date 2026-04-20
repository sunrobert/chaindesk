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
      className={`flex min-h-0 flex-col overflow-hidden rounded border border-border bg-panel ${className}`}
    >
      <div className="flex items-center justify-between border-b border-border bg-panel2 px-3 py-[6px]">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-subtext">
          {title}
        </h2>
        {right}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  );
}
