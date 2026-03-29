'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  createSeriesMarkers,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarkerBar,
  type Time,
  type ISeriesMarkersPluginApi,
} from 'lightweight-charts'
import { Candle, CatalystEvent, EVENT_COLORS } from '@/lib/types'
import EventTooltip from './EventTooltip'

interface ChartProps {
  candles: Candle[]
  events: CatalystEvent[]
}

export default function Chart({ candles, events }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null)

  const [tooltip, setTooltip] = useState<{
    event: CatalystEvent
    x: number
    y: number
  } | null>(null)

  // Chart initialization
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#0b0e11' },
        textColor: '#848e9c',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1b1e23' },
        horzLines: { color: '#1b1e23' },
      },
      crosshair: {
        vertLine: {
          color: '#848e9c40',
          labelBackgroundColor: '#1b1e23',
        },
        horzLine: {
          color: '#848e9c40',
          labelBackgroundColor: '#1b1e23',
        },
      },
      timeScale: {
        borderColor: '#1b1e23',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1b1e23',
      },
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#0ecb81',
      downColor: '#f6465d',
      borderVisible: false,
      wickUpColor: '#0ecb81',
      wickDownColor: '#f6465d',
    })

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.85,
        bottom: 0,
      },
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries

    return () => {
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
      markersPluginRef.current = null
    }
  }, [])

  // Update candle data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return

    const candleData = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))

    const volumeData = candles.map((c) => ({
      time: c.time as Time,
      value: c.volume,
      color: c.close >= c.open ? '#0ecb8140' : '#f6465d40',
    }))

    candleSeriesRef.current.setData(candleData)
    volumeSeriesRef.current.setData(volumeData)

    chartRef.current?.timeScale().fitContent()
  }, [candles])

  // Update event markers
  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current || candles.length === 0) return

    // Build markers sorted by time
    const markers: SeriesMarkerBar<Time>[] = events
      .filter((e) => {
        const first = candles[0]?.time ?? 0
        const last = candles[candles.length - 1]?.time ?? 0
        return e.timestamp >= first && e.timestamp <= last
      })
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((e) => ({
        time: e.timestamp as Time,
        position: 'aboveBar' as const,
        shape: 'circle' as const,
        color: EVENT_COLORS[e.source],
        text: e.headline.slice(0, 25),
        size: 2,
      }))

    // Set markers on candle series
    if (markersPluginRef.current) {
      markersPluginRef.current.setMarkers(markers)
    } else {
      markersPluginRef.current = createSeriesMarkers(candleSeriesRef.current, markers)
    }
  }, [events, candles])

  // Crosshair move handler for tooltip
  const handleCrosshairMove = useCallback(
    (param: { point?: { x: number; y: number }; time?: Time }) => {
      if (!param.point || !param.time) {
        setTooltip(null)
        return
      }

      const cursorTime = param.time as number
      // Find event within 2 candle periods (1-minute candles = 120 seconds)
      const threshold = 120
      const nearEvent = events.find(
        (e) => Math.abs(e.timestamp - cursorTime) <= threshold
      )

      if (nearEvent) {
        setTooltip({
          event: nearEvent,
          x: param.point.x,
          y: param.point.y,
        })
      } else {
        setTooltip(null)
      }
    },
    [events]
  )

  // Subscribe to crosshair move
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    chart.subscribeCrosshairMove(handleCrosshairMove)
    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove)
    }
  }, [handleCrosshairMove])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {tooltip && (
        <EventTooltip event={tooltip.event} x={tooltip.x} y={tooltip.y} />
      )}
    </div>
  )
}
