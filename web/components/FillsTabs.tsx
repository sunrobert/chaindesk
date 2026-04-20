'use client';

import { useState } from 'react';
import { RecentFills } from './RecentFills';
import { TopExecutors } from './TopExecutors';

type Tab = 'fills' | 'executors';

export function FillsTabs() {
  const [tab, setTab] = useState<Tab>('fills');
  return (
    <section className="flex min-h-0 flex-col overflow-hidden bg-bg">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border bg-panel px-3">
        <div className="flex items-center gap-4">
          <TabBtn
            active={tab === 'fills'}
            onClick={() => setTab('fills')}
            label="Recent Fills"
          />
          <TabBtn
            active={tab === 'executors'}
            onClick={() => setTab('executors')}
            label="Top Executors"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'fills' ? <RecentFills /> : <TopExecutors />}
      </div>
    </section>
  );
}

function TabBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
        active ? 'text-accent' : 'text-subtext hover:text-text'
      }`}
    >
      {label}
    </button>
  );
}
