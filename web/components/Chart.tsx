'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import { fetchCandles } from '@/lib/binance';
import { BASE, CANDLE_POLL_MS } from '@/lib/constants';
import { useOpenOrders } from '@/hooks/useOpenOrders';
import { useRecentFills } from '@/hooks/useRecentFills';
import {
  orderBaseSize,
  orderLimitPrice,
  orderSide,
  formatSize,
} from '@/lib/price';

const BASE_SYM = BASE.symbol;

export type TimeframeId = '1m' | '5m' | '15m' | '1h' | '4h';

export function Chart({
  onPriceClick,
  timeframe = '1m',
}: {
  onPriceClick?: (price: number) => void;
  timeframe?: TimeframeId;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const linesRef = useRef<Map<string, IPriceLine>>(new Map());
  const [ready, setReady] = useState(false);

  const { orders } = useOpenOrders();
  const { fills } = useRecentFills();

  // Create chart once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: '#000000' },
        textColor: '#909090',
        fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' },
      },
      rightPriceScale: { borderColor: '#1d1d1d' },
      timeScale: {
        borderColor: '#1d1d1d',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        horzLine: {
          color: '#ffa028',
          labelBackgroundColor: '#ffa028',
        },
        vertLine: {
          color: '#ffa028',
          labelBackgroundColor: '#ffa028',
        },
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: '#4af6c3',
      downColor: '#ff433d',
      borderUpColor: '#4af6c3',
      borderDownColor: '#ff433d',
      wickUpColor: '#4af6c3',
      wickDownColor: '#ff433d',
    });

    chartRef.current = chart;
    seriesRef.current = series;
    setReady(true);

    const handleClick = (param: { point?: { x: number; y: number } }) => {
      if (!param.point || !onPriceClick) return;
      const price = series.coordinateToPrice(param.point.y);
      if (price != null && Number.isFinite(price)) onPriceClick(Number(price));
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
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll candles — re-fires when timeframe changes
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      try {
        const candles = await fetchCandles(timeframe, 500);
        if (stopped || !seriesRef.current) return;
        seriesRef.current.setData(candles);
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
  }, [timeframe]);

  // Memoize overlay lines keyed by orderId.
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
        color: side === 'buy' ? '#4af6c3' : '#ff433d',
        title: `${side === 'buy' ? 'BUY' : 'SELL'} ${formatSize(size)} ${BASE_SYM}`,
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
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
        });
      } else {
        const handle = series.createPriceLine({
          price: line.price,
          color: line.color,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
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

  // Fill markers
  const markers = useMemo<SeriesMarker<Time>[]>(() => {
    return fills
      .filter((f) => f.timestamp != null)
      .map((f) => ({
        time: f.timestamp as UTCTimestamp,
        position: 'aboveBar' as const,
        color: '#ffa028',
        shape: 'circle' as const,
        text: `fill #${String(f.orderId)}`,
      }))
      .sort((a, b) => Number(a.time) - Number(b.time));
  }, [fills]);

  useEffect(() => {
    if (!ready) return;
    seriesRef.current?.setMarkers(markers);
  }, [ready, markers]);

  const buyCount = overlayLines.filter((l) => l.color === '#4af6c3').length;
  const sellCount = overlayLines.length - buyCount;

  return (
    <div className="relative h-full w-full bg-bg">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col gap-1 text-[10px]">
        <div className="num border border-border bg-bg/80 px-2 py-[2px] backdrop-blur">
          <span className="text-buy">● {buyCount} BUYS</span>
          <span className="mx-2 text-muted">·</span>
          <span className="text-sell">● {sellCount} SELLS</span>
          <span className="ml-2 text-muted">onchain book</span>
          {markers.length > 0 && (
            <>
              <span className="mx-2 text-muted">·</span>
              <span className="text-accent">● {markers.length} fills</span>
            </>
          )}
        </div>
        <div className="border border-border bg-bg/80 px-2 py-[2px] text-[9px] uppercase tracking-widest text-muted backdrop-blur">
          click chart → prefill limit price
        </div>
      </div>
    </div>
  );
}
