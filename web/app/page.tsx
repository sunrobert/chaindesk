'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Panel } from '@/components/Panel';
import { Chart, type TimeframeId } from '@/components/Chart';
import { TradingViewChart } from '@/components/TradingViewChart';
import { OrderTicket } from '@/components/OrderTicket';
import { MyOrders } from '@/components/MyOrders';
import { RecentFills } from '@/components/RecentFills';
import { BookLadder } from '@/components/BookLadder';
import { WrapHelper } from '@/components/WrapHelper';
import { GetBusd } from '@/components/GetBusd';
import { TimeframeSelector } from '@/components/TimeframeSelector';
import { StatsBar } from '@/components/StatsBar';
import { SignalsStrip } from '@/components/SignalsStrip';
import { StatusFooter } from '@/components/StatusFooter';
import { HelpModal } from '@/components/HelpModal';
import { NewsTicker } from '@/components/NewsTicker';
import { MarketRead } from '@/components/MarketRead';

type ChartMode = 'native' | 'tradingview';

export default function Page() {
  const [prefillPrice, setPrefillPrice] = useState<number | null>(null);
  const [timeframe, setTimeframe] = useState<TimeframeId>('1m');
  const [chartMode, setChartMode] = useState<ChartMode>('native');
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      // Allow F-keys even from inputs; skip printable shortcuts when typing.
      const inInput =
        tag === 'INPUT' || tag === 'TEXTAREA' || !!t?.isContentEditable;
      if (!inInput && (e.key === '?' || e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }
      // F1–F4 scroll to the relevant panels. Letter fallbacks (T/B/C/L) are
      // provided because macOS often hijacks F-keys for brightness/volume.
      const fkeyMap: Record<string, string> = {
        F1: 'panel-ticket',
        F2: 'panel-book',
        F3: 'panel-chart',
        F4: 'panel-fills',
      };
      const letterMap: Record<string, string> = {
        t: 'panel-ticket',
        b: 'panel-book',
        c: 'panel-chart',
        l: 'panel-fills',
      };
      const target =
        fkeyMap[e.key] ?? (!inInput ? letterMap[e.key.toLowerCase()] : undefined);
      if (target) {
        e.preventDefault();
        const el = document.getElementById(target);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.classList.add('tick-pulse');
        setTimeout(() => el?.classList.remove('tick-pulse'), 400);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-bg">
      <Header />
      <NewsTicker />
      <StatsBar />
      <SignalsStrip />
      <main className="grid min-h-0 flex-1 grid-cols-[16%_18%_46%_20%]">
        {/* COL 1: Order book ladder */}
        <Panel
          id="panel-book"
          title="Order Book · Onchain"
          className="border-r border-border"
        >
          <BookLadder />
        </Panel>

        {/* COL 2: Market Read + My Orders + Recent Fills */}
        <div className="flex min-h-0 flex-col border-r border-border">
          <div className="shrink-0">
            <MarketRead />
          </div>
          <div className="flex min-h-0 flex-[3] flex-col">
            <Panel title="My Orders">
              <MyOrders />
            </Panel>
          </div>
          <div id="panel-fills" className="flex min-h-0 flex-[2] flex-col border-t border-border">
            <Panel title="Recent Fills">
              <RecentFills />
            </Panel>
          </div>
        </div>

        {/* COL 3: Chart */}
        <Panel
          id="panel-chart"
          title="WBNB / BUSD"
          right={
            <div className="flex items-center gap-3">
              <span className="hidden text-[9px] uppercase tracking-[0.18em] text-muted lg:inline">
                {chartMode === 'native'
                  ? 'candles · binance — overlay · onchain'
                  : 'tradingview · BINANCE:BNBUSDT'}
              </span>
              <ChartModeToggle value={chartMode} onChange={setChartMode} />
              {chartMode === 'native' && (
                <TimeframeSelector value={timeframe} onChange={setTimeframe} />
              )}
            </div>
          }
          className="border-r border-border"
        >
          {chartMode === 'native' ? (
            <Chart
              onPriceClick={(p) => setPrefillPrice(p)}
              timeframe={timeframe}
            />
          ) : (
            <TradingViewChart />
          )}
        </Panel>

        {/* COL 4: Order ticket + Wrap helper */}
        <div id="panel-ticket" className="flex min-h-0 flex-col">
          <div className="flex min-h-0 flex-1 flex-col">
            <Panel title="Order Ticket">
              <OrderTicket
                prefillPrice={prefillPrice}
                clearPrefill={() => setPrefillPrice(null)}
              />
            </Panel>
          </div>
          <WrapHelper />
          <GetBusd />
        </div>
      </main>
      <StatusFooter onOpenHelp={() => setHelpOpen(true)} />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

function ChartModeToggle({
  value,
  onChange,
}: {
  value: ChartMode;
  onChange: (m: ChartMode) => void;
}) {
  const opts: { id: ChartMode; label: string }[] = [
    { id: 'native', label: 'NATIVE' },
    { id: 'tradingview', label: 'TV' },
  ];
  return (
    <div className="flex border border-border">
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`num px-2 py-[3px] text-[10px] tracking-widest ${
            value === o.id
              ? 'bg-accent/15 text-accent'
              : 'text-subtext hover:text-text'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
