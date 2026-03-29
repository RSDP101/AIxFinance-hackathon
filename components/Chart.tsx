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
import { filterOverlappingEvents } from '@/lib/eventDensity'
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

  // Zoom state
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomDrag, setZoomDrag] = useState<{
    startX: number
    currentX: number
  } | null>(null)
  const isDraggingRef = useRef(false)

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
    setIsZoomed(false)
  }, [candles])

  // Update event markers with density filtering
  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current || candles.length === 0) return

    const timeScale = chartRef.current.timeScale()

    const first = candles[0]?.time ?? 0
    const last = candles[candles.length - 1]?.time ?? 0
    const inRange = events.filter(
      (e) => e.timestamp >= first && e.timestamp <= last
    )

    const filtered = filterOverlappingEvents(inRange, candles, timeScale)

    const markers: SeriesMarkerBar<Time>[] = filtered
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((e) => ({
        time: e.timestamp as Time,
        position: 'aboveBar' as const,
        shape: 'circle' as const,
        color: EVENT_COLORS[e.source],
        text: e.headline.slice(0, 25),
        size: 2,
      }))

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

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    chart.subscribeCrosshairMove(handleCrosshairMove)
    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove)
    }
  }, [handleCrosshairMove])

  // Shift+drag zoom handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!e.shiftKey) return
      e.preventDefault()
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = e.clientX - rect.left
      isDraggingRef.current = true
      setZoomDrag({ startX: x, currentX: x })
    },
    []
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingRef.current) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = e.clientX - rect.left
      setZoomDrag((prev) => (prev ? { ...prev, currentX: x } : null))
    },
    []
  )

  const handleMouseUp = useCallback(
    () => {
      if (!isDraggingRef.current || !zoomDrag || !chartRef.current) {
        isDraggingRef.current = false
        setZoomDrag(null)
        return
      }

      isDraggingRef.current = false
      const ts = chartRef.current.timeScale()

      const leftX = Math.min(zoomDrag.startX, zoomDrag.currentX)
      const rightX = Math.max(zoomDrag.startX, zoomDrag.currentX)

      if (rightX - leftX < 20) {
        setZoomDrag(null)
        return
      }

      const leftLogical = ts.coordinateToLogical(leftX)
      const rightLogical = ts.coordinateToLogical(rightX)

      if (leftLogical !== null && rightLogical !== null) {
        ts.setVisibleLogicalRange({ from: leftLogical, to: rightLogical })
        setIsZoomed(true)
      }

      setZoomDrag(null)
    },
    [zoomDrag]
  )

  function handleResetZoom() {
    chartRef.current?.timeScale().fitContent()
    setIsZoomed(false)
  }

  const overlayStyle = zoomDrag
    ? {
        left: Math.min(zoomDrag.startX, zoomDrag.currentX),
        width: Math.abs(zoomDrag.currentX - zoomDrag.startX),
      }
    : null

  return (
    <div
      className="relative w-full h-full"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div ref={containerRef} className="w-full h-full" />

      {overlayStyle && (
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{
            left: overlayStyle.left,
            width: overlayStyle.width,
            backgroundColor: 'rgba(240, 185, 11, 0.1)',
            borderLeft: '1px solid var(--accent)',
            borderRight: '1px solid var(--accent)',
          }}
        />
      )}

      {isZoomed && (
        <button
          onClick={handleResetZoom}
          className="absolute top-2 right-2 px-2 py-1 text-xs rounded"
          style={{
            backgroundColor: 'var(--bg-panel)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          Reset Zoom
        </button>
      )}

      {tooltip && (
        <EventTooltip event={tooltip.event} x={tooltip.x} y={tooltip.y} />
      )}
    </div>
  )
}
