import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, createSeriesMarkers, CandlestickSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, ISeriesMarkersPluginApi, SeriesMarker, Time } from 'lightweight-charts';
import { useTradingStore } from '../../store/tradingStore';
import { useCandles } from '../../hooks/useMarketData';
import type { CatalystEvent } from '../../types/events';
import { EVENT_COLORS } from '../../types/events';
import EventTooltip from './EventTooltip';

export default function Chart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const selectedPair = useTradingStore((s) => s.selectedPair);
  const events = useTradingStore((s) => s.events);
  const filters = useTradingStore((s) => s.filters);
  const scrollToTimestamp = useTradingStore((s) => s.scrollToTimestamp);
  const setScrollToTimestamp = useTradingStore((s) => s.setScrollToTimestamp);
  const callbacksRef = useCandles(selectedPair);

  const [hoveredEvent, setHoveredEvent] = useState<{ event: CatalystEvent; x: number; y: number } | null>(null);

  // Filter events for current pair
  const relevantEvents = events.filter(
    (e) =>
      filters[e.source] &&
      (e.coin === selectedPair || e.coin === 'ALL')
  );

  // Update markers when events or filters change
  const updateMarkers = useCallback(() => {
    if (!markersRef.current) return;

    const markers: SeriesMarker<Time>[] = relevantEvents
      .map((e) => ({
        time: e.timestamp as Time,
        position: 'aboveBar' as const,
        color: EVENT_COLORS[e.source],
        shape: 'circle' as const,
        text: e.headline.length > 30 ? e.headline.slice(0, 30) + '…' : e.headline,
        size: 1,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    markersRef.current.setMarkers(markers);
  }, [relevantEvents]);

  // Handle scroll to timestamp from news click
  useEffect(() => {
    if (scrollToTimestamp && chartRef.current) {
      chartRef.current.timeScale().scrollToRealTime();
      setScrollToTimestamp(null);
    }
  }, [scrollToTimestamp, setScrollToTimestamp]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0f0b1a' },
        textColor: '#9891a8',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: '#1a133380' },
        horzLines: { color: '#1a133380' },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: '#7C3AED', width: 1, style: 2, labelBackgroundColor: '#7C3AED' },
        horzLine: { color: '#7C3AED', width: 1, style: 2, labelBackgroundColor: '#7C3AED' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#241d40',
      },
      rightPriceScale: { borderColor: '#241d40' },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // Create markers plugin (v5 API)
    const seriesMarkers = createSeriesMarkers(series, []);

    chartRef.current = chart;
    seriesRef.current = series;
    markersRef.current = seriesMarkers;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });
    resizeObserver.observe(containerRef.current);

    callbacksRef.current = {
      onInitial: (candles) => {
        series.setData(candles as any);
        chart.timeScale().fitContent();
        updateMarkers();
      },
      onUpdate: (candle) => {
        series.update(candle as any);
      },
    };

    // Handle crosshair move for event tooltip
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        setHoveredEvent(null);
        return;
      }

      const hoverTime = param.time as number;
      // Find nearest event within 120 seconds
      const nearest = relevantEvents.find(
        (e) => Math.abs(e.timestamp - hoverTime) < 120
      );

      if (nearest && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setHoveredEvent({
          event: nearest,
          x: rect.left + (param.point.x || 0),
          y: rect.top + (param.point.y || 0),
        });
      } else {
        setHoveredEvent(null);
      }
    });

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      markersRef.current = null;
    };
  }, [selectedPair]);

  // Re-apply markers when events/filters change
  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />
      {hoveredEvent && (
        <EventTooltip
          event={hoveredEvent.event}
          x={hoveredEvent.x}
          y={hoveredEvent.y}
        />
      )}
    </div>
  );
}
