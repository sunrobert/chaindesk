'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Panel } from '@/components/Panel';
import { Chart } from '@/components/Chart';
import { OrderTicket } from '@/components/OrderTicket';
import { MyOrders } from '@/components/MyOrders';
import { RecentFills } from '@/components/RecentFills';
import { BASE, QUOTE } from '@/lib/constants';

export default function Page() {
  const [prefillPrice, setPrefillPrice] = useState<number | null>(null);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-bg">
      <Header />
      <main className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)_340px] gap-2 p-2">
        {/* Left column: My Orders + Recent Fills stacked */}
        <div className="grid min-h-0 grid-rows-[1fr_1fr] gap-2">
          <Panel title="My Orders">
            <MyOrders />
          </Panel>
          <Panel title="Recent Fills (onchain)">
            <RecentFills />
          </Panel>
        </div>

        {/* Center: Chart */}
        <Panel
          title={`${BASE.symbol} / ${QUOTE.symbol}`}
          right={
            <span className="text-[10px] uppercase tracking-widest text-subtext">
              candles: Binance spot · overlay: LimitOrderBook (BSC testnet)
            </span>
          }
        >
          <Chart onPriceClick={(p) => setPrefillPrice(p)} />
        </Panel>

        {/* Right: Order ticket */}
        <Panel title="Order Ticket">
          <OrderTicket
            prefillPrice={prefillPrice}
            clearPrefill={() => setPrefillPrice(null)}
          />
        </Panel>
      </main>
    </div>
  );
}
