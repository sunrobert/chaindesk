'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type UTCTimestamp,
} from 'lightweight-charts';
import { fetchCandles } from '@/lib/binance';
import { CANDLE_POLL_MS } from '@/lib/constants';
import { useOpenOrders } from '@/hooks/useOpenOrders';
import {
  orderBaseSize,
  orderLimitPrice,
  orderSide,
  formatPrice,
  formatSize,
} from '@/lib/price';

export function Chart({
  onPriceClick,
}: {
  onPriceClick?: (price: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const linesRef = useRef<Map<string, IPriceLine>>(new Map());
  const lastPriceRef = useRef<number | null>(null);

  const { orders } = useOpenOrders();

  // Create chart once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: '#11151a' },
        textColor: '#8b98a5',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#161b22' },
        horzLines: { color: '#161b22' },
      },
      rightPriceScale: { borderColor: '#222933' },
      timeScale: {
        borderColor: '#222933',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        horzLine: {
          color: '#f0b90b',
          labelBackgroundColor: '#f0b90b',
        },
        vertLine: {
          color: '#f0b90b',
          labelBackgroundColor: '#f0b90b',
        },
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Click-to-prefill: convert click Y coordinate → price
    const handleClick = (param: { point?: { x: number; y: number } }) => {
      if (!param.point || !onPriceClick) return;
      const price = series.coordinateToPrice(param.point.y);
      if (price != null && Number.isFinite(price)) {
        onPriceClick(Number(price));
      }
    };
    chart.subscribeClick(handleClick);

    const ro = new ResizeObserver(() => {
      chart.applyOptions({
        width: el.clientWidth,
        height: el.clientHeight,
      });
    });
    ro.observe(el);
    chart.applyOptions({
      width: el.clientWidth,
      height: el.clientHeight,
    });

    return () => {
      ro.disconnect();
      chart.unsubscribeClick(handleClick);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      linesRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll candles
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      try {
        const candles = await fetchCandles('1m', 500);
        if (stopped || !seriesRef.current) return;
        seriesRef.current.setData(candles);
        const last = candles[candles.length - 1];
        if (last) lastPriceRef.current = last.close;
      } catch (e) {
        console.warn('candle fetch failed', e);
      } finally {
        if (!stopped) timer = setTimeout(tick, CANDLE_POLL_MS);
      }
    }
    tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Memoize the overlay lines keyed by orderId so we can diff efficiently.
  const overlayLines = useMemo(() => {
    const out: {
      key: string;
      price: number;
      color: string;
      title: string;
    }[] = [];
    for (const { id, order } of orders) {
      const side = orderSide(order);
      if (!side) continue;
      const price = orderLimitPrice(order);
      if (!price || !Number.isFinite(price)) continue;
      const size = orderBaseSize(order) ?? 0;
      out.push({
        key: `${side}-${id.toString()}`,
        price,
        color: side === 'buy' ? '#26a69a' : '#ef5350',
        title: `${side === 'buy' ? 'BUY' : 'SELL'} ${formatSize(size)} @ ${formatPrice(price)}`,
      });
    }
    return out;
  }, [orders]);

  // Diff + apply price lines
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    const cur = linesRef.current;
    const seen = new Set<string>();
    for (const line of overlayLines) {
      seen.add(line.key);
      const existing = cur.get(line.key);
      if (existing) {
        existing.applyOptions({
          price: line.price,
          color: line.color,
          title: line.title,
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
        });
      } else {
        const handle = series.createPriceLine({
          price: line.price,
          color: line.color,
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: line.title,
        });
        cur.set(line.key, handle);
      }
    }
    for (const [key, handle] of cur.entries()) {
      if (!seen.has(key)) {
        series.removePriceLine(handle);
        cur.delete(key);
      }
    }
  }, [overlayLines]);

  const buyCount = overlayLines.filter((l) => l.color === '#26a69a').length;
  const sellCount = overlayLines.length - buyCount;

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-1 text-[11px]">
        <div className="rounded border border-border bg-panel/80 px-2 py-[3px] backdrop-blur tab-nums">
          <span className="text-subtext">BNB/BUSD · 1m · </span>
          <span className="text-text">Binance spot (reference)</span>
        </div>
        <div className="rounded border border-border bg-panel/80 px-2 py-[3px] backdrop-blur tab-nums">
          <span className="text-buy">● {buyCount} buys</span>
          <span className="mx-2 text-subtext">/</span>
          <span className="text-sell">● {sellCount} sells</span>
          <span className="ml-2 text-subtext">(live onchain book)</span>
        </div>
        <div className="rounded border border-border bg-panel/80 px-2 py-[3px] text-subtext backdrop-blur">
          tap any price → prefills ticket
        </div>
      </div>
    </div>
  );
}
