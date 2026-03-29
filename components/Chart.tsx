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
  const displayedEventsRef = useRef<CatalystEvent[]>([])

  const [tooltip, setTooltip] = useState<{
    event: CatalystEvent
    x: number
    y: number
  } | null>(null)
  const lastMatchedEventRef = useRef<CatalystEvent | null>(null)

  // Zoom state
  const [isZoomed, setIsZoomed] = useState(false)
  const zoomOverlayRef = useRef<HTMLDivElement>(null)
  const zoomStartXRef = useRef<number | null>(null)
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
        fixLeftEdge: true,
        fixRightEdge: true,
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

  // Native event listeners for Shift+drag zoom
  // Must use native listeners with stopImmediatePropagation to block the chart's internal handlers
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function showOverlay(left: number, width: number) {
      const el = zoomOverlayRef.current
      if (!el) return
      el.style.display = 'block'
      el.style.left = `${left}px`
      el.style.width = `${width}px`
    }

    function hideOverlay() {
      const el = zoomOverlayRef.current
      if (el) el.style.display = 'none'
    }

    function onMouseDown(e: MouseEvent) {
      if (!e.shiftKey) return
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()

      const rect = container!.getBoundingClientRect()
      const x = e.clientX - rect.left
      zoomStartXRef.current = x
      isDraggingRef.current = true
      showOverlay(x, 0)
    }

    function onMouseMove(e: MouseEvent) {
      if (!isDraggingRef.current || zoomStartXRef.current === null) return
      e.preventDefault()
      e.stopPropagation()

      const rect = container!.getBoundingClientRect()
      const x = e.clientX - rect.left
      const startX = zoomStartXRef.current
      showOverlay(Math.min(startX, x), Math.abs(x - startX))
    }

    function onMouseUp(e: MouseEvent) {
      if (!isDraggingRef.current || zoomStartXRef.current === null) return
      e.preventDefault()
      e.stopPropagation()

      isDraggingRef.current = false
      const rect = container!.getBoundingClientRect()
      const endX = e.clientX - rect.left
      const startX = zoomStartXRef.current
      zoomStartXRef.current = null
      hideOverlay()

      const leftX = Math.min(startX, endX)
      const rightX = Math.max(startX, endX)

      if (rightX - leftX < 20 || !chartRef.current) return

      const ts = chartRef.current.timeScale()
      const leftLogical = ts.coordinateToLogical(leftX)
      const rightLogical = ts.coordinateToLogical(rightX)

      if (leftLogical !== null && rightLogical !== null) {
        ts.setVisibleLogicalRange({ from: leftLogical, to: rightLogical })
        setIsZoomed(true)
      }
    }

    // Use capture phase to intercept before the chart's own handlers
    container.addEventListener('mousedown', onMouseDown, true)
    window.addEventListener('mousemove', onMouseMove, true)
    window.addEventListener('mouseup', onMouseUp, true)

    return () => {
      container.removeEventListener('mousedown', onMouseDown, true)
      window.removeEventListener('mousemove', onMouseMove, true)
      window.removeEventListener('mouseup', onMouseUp, true)
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
    displayedEventsRef.current = filtered

    // Snap event timestamps to nearest candle time so markers align with candles
    function snapToCandle(ts: number): number {
      let closest = candles[0]?.time ?? ts
      let minDist = Math.abs(ts - closest)
      for (const c of candles) {
        const d = Math.abs(ts - c.time)
        if (d < minDist) { minDist = d; closest = c.time }
        if (c.time > ts) break // candles are sorted, no need to go further
      }
      return closest
    }

    const markers: SeriesMarkerBar<Time>[] = filtered
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((e) => ({
        time: snapToCandle(e.timestamp) as Time,
        position: 'aboveBar' as const,
        shape: 'circle' as const,
        color: EVENT_COLORS[e.source],
        text: '',
        size: 1,
      }))

    if (markersPluginRef.current) {
      markersPluginRef.current.setMarkers(markers)
    } else {
      markersPluginRef.current = createSeriesMarkers(candleSeriesRef.current, markers)
    }
  }, [events, candles])

  // Find the nearest displayed event to a given time
  function findNearestEvent(cursorTime: number): CatalystEvent | null {
    const candleInterval = candles.length >= 2 ? candles[1].time - candles[0].time : 60
    let closest: CatalystEvent | null = null
    let closestDist = Infinity

    for (const event of displayedEventsRef.current) {
      let snappedTime = event.timestamp
      let minSnapDist = Infinity
      for (const c of candles) {
        const d = Math.abs(event.timestamp - c.time)
        if (d < minSnapDist) { minSnapDist = d; snappedTime = c.time }
        if (c.time > event.timestamp) break
      }
      const dist = Math.abs(snappedTime - cursorTime)
      if (dist <= candleInterval && dist < closestDist) {
        closestDist = dist
        closest = event
      }
    }
    return closest
  }

  // Crosshair move — show tooltip and track matched event for click
  const handleCrosshairMove = useCallback(
    (param: { point?: { x: number; y: number }; time?: Time }) => {
      if (!param.point || !param.time) {
        setTooltip(null)
        lastMatchedEventRef.current = null
        return
      }

      const matched = findNearestEvent(param.time as number)
      lastMatchedEventRef.current = matched

      if (matched) {
        setTooltip({ event: matched, x: param.point.x, y: param.point.y })
      } else {
        setTooltip(null)
      }
    },
    [events, candles]
  )

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    chart.subscribeCrosshairMove(handleCrosshairMove)
    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove)
    }
  }, [handleCrosshairMove])

  function handleResetZoom() {
    chartRef.current?.timeScale().fitContent()
    setIsZoomed(false)
  }

  // Click on chart opens graph for the matched event
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    const handler = () => {
      const event = lastMatchedEventRef.current
      if (event) {
        const q = encodeURIComponent(event.headline)
        window.open(`/graph?q=${q}`, '_blank')
      }
    }

    chart.subscribeClick(handler)
    return () => chart.unsubscribeClick(handler)
  }, [candles, events])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Shift+drag zoom selection overlay — positioned via ref for instant updates */}
      <div
        ref={zoomOverlayRef}
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{
          display: 'none',
          backgroundColor: 'rgba(240, 185, 11, 0.15)',
          borderLeft: '2px solid var(--accent)',
          borderRight: '2px solid var(--accent)',
        }}
      />

      {/* Reset zoom button — always visible when zoomed */}
      {isZoomed && (
        <button
          onClick={handleResetZoom}
          className="absolute top-2 right-2 px-3 py-1.5 text-xs font-medium rounded cursor-pointer z-10"
          style={{
            backgroundColor: 'var(--bg-panel)',
            color: 'var(--accent)',
            border: '1px solid var(--accent)',
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
