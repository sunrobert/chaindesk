'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Panel } from '@/components/Panel';
import { Chart, type TimeframeId } from '@/components/Chart';
import { OrderTicket } from '@/components/OrderTicket';
import { MyOrders } from '@/components/MyOrders';
import { RecentFills } from '@/components/RecentFills';
import { BookLadder } from '@/components/BookLadder';
import { WrapHelper } from '@/components/WrapHelper';
import { GetBusd } from '@/components/GetBusd';
import { TimeframeSelector } from '@/components/TimeframeSelector';

export default function Page() {
  const [prefillPrice, setPrefillPrice] = useState<number | null>(null);
  const [timeframe, setTimeframe] = useState<TimeframeId>('1m');

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-bg">
      <Header />
      <main className="grid min-h-0 flex-1 grid-cols-[16%_18%_46%_20%]">
        {/* COL 1: Order book ladder */}
        <Panel title="Order Book · Onchain" className="border-r border-border">
          <BookLadder />
        </Panel>

        {/* COL 2: My Orders + Recent Fills */}
        <div className="flex min-h-0 flex-col border-r border-border">
          <div className="flex min-h-0 flex-[3] flex-col">
            <Panel title="My Orders">
              <MyOrders />
            </Panel>
          </div>
          <div className="flex min-h-0 flex-[2] flex-col border-t border-border">
            <Panel title="Recent Fills">
              <RecentFills />
            </Panel>
          </div>
        </div>

        {/* COL 3: Chart */}
        <Panel
          title="WBNB / BUSD"
          right={
            <div className="flex items-center gap-3">
              <span className="hidden text-[9px] uppercase tracking-[0.18em] text-muted lg:inline">
                candles · binance — overlay · onchain
              </span>
              <TimeframeSelector value={timeframe} onChange={setTimeframe} />
            </div>
          }
          className="border-r border-border"
        >
          <Chart
            onPriceClick={(p) => setPrefillPrice(p)}
            timeframe={timeframe}
          />
        </Panel>

        {/* COL 4: Order ticket + Wrap helper */}
        <div className="flex min-h-0 flex-col">
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
    </div>
  );
}
