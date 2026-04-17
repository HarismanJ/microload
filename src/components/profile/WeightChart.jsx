import { useEffect, useId, useRef, useState, useMemo } from 'react'
import { convertWeight } from '../../lib/liftMath'

// SVG line chart — shows bodyweight over time

function getPointDate(point) {
  const d = point?.loggedAt
    ? new Date(point.loggedAt)
    : point?.date
      ? new Date(`${point.date}T12:00:00`)
      : null
  return d && !Number.isNaN(d.getTime()) ? d : null
}

function formatXAxisLabel(point, spanDays) {
  const sourceDate = getPointDate(point)
  if (!sourceDate) return ''

  if (spanDays > 365) {
    // e.g. "Mar '25"
    const mon = sourceDate.toLocaleDateString('en-US', { month: 'short' })
    const yr = String(sourceDate.getFullYear()).slice(2)
    return `${mon} '${yr}`
  }
  // e.g. "28 Mar"
  return sourceDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

function getNiceStep(range, tickCount) {
  const safeRange = Math.max(range, 1)
  const roughStep = safeRange / Math.max(1, tickCount - 1)
  const exponent = Math.floor(Math.log10(roughStep))
  const scale = 10 ** exponent
  const fraction = roughStep / scale

  if (fraction <= 1) return 1 * scale
  if (fraction <= 2) return 2 * scale
  if (fraction <= 2.5) return 2.5 * scale
  if (fraction <= 5) return 5 * scale
  return 10 * scale
}

function formatWeightTick(value, step) {
  if (step >= 1) return String(Math.round(value))
  if (step >= 0.5) return value.toFixed(1)
  return value.toFixed(2)
}

export default function WeightChart({ data, unit = 'kg', height = 130, tickCount = 3, padding = 'default', animationReady = true }) {
  const containerRef = useRef(null)
  const gradientBaseId = useId()
  const [containerWidth, setContainerWidth] = useState(0)
  const [lineDrawn, setLineDrawn] = useState(false)
  const accentColor = 'var(--blue)'
  const gradientId = `weight-grad-${gradientBaseId.replace(/:/g, '')}`
  const dataSignature = useMemo(() => (data || [])
    .map(point => `${point.id ?? point.loggedAt ?? point.date ?? ''}:${point.weight}:${point.unit || unit}`)
    .join('|')
  , [data, unit])

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const updateWidth = () => {
      const nextWidth = Math.round(node.getBoundingClientRect().width || 0)
      if (!nextWidth) return
      setContainerWidth(prev => (prev === nextWidth ? prev : nextWidth))
    }

    updateWidth()

    if (typeof ResizeObserver === 'undefined') return undefined

    const observer = new ResizeObserver(() => updateWidth())
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!data?.length) return undefined

    setLineDrawn(false)
    if (!animationReady) return undefined

    const animationFrame = requestAnimationFrame(() => {
      setLineDrawn(true)
    })

    return () => cancelAnimationFrame(animationFrame)
  }, [animationReady, dataSignature, containerWidth, unit, height, tickCount])

  if (!data || data.length === 0) {
    return <div className="chart-empty">No weight history yet</div>
  }

  const normalizedData = data.map(point => ({
    ...point,
    displayWeight: convertWeight(point.weight, point.unit || unit, unit),
  }))

  const tightPadding = padding === 'tight'
  const mobileTightPadding = padding === 'tight-mobile'
  const W = containerWidth || 300
  const H = height
  const padL = mobileTightPadding ? 30 : tightPadding ? 34 : 46
  const padR = mobileTightPadding ? 18 : tightPadding ? 8 : 12
  const padT = mobileTightPadding ? 14 : tightPadding ? 4 : 12
  const padB = mobileTightPadding ? 22 : tightPadding ? 10 : 28
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const values = normalizedData.map(d => d.displayWeight)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const range = rawMax - rawMin
  const niceStep = getNiceStep(range || Math.max(Math.abs(rawMax), 1) * 0.25, tickCount)
  let minVal = Math.floor(rawMin / niceStep) * niceStep
  let maxVal = Math.ceil(rawMax / niceStep) * niceStep

  if (minVal === maxVal) {
    minVal -= niceStep
    maxVal += niceStep
  } else if (!tightPadding && !mobileTightPadding) {
    if (rawMin === minVal) minVal -= niceStep
    if (rawMax === maxVal) maxVal += niceStep
  }

  const xAt = (i) => padL + (normalizedData.length === 1 ? plotW / 2 : (i / (normalizedData.length - 1)) * plotW)
  const yAt = (v) => padT + plotH - ((v - minVal) / (maxVal - minVal)) * plotH

  const pts = normalizedData.map((d, i) => `${xAt(i)},${yAt(d.displayWeight)}`).join(' ')
  const areaBase = padT + plotH
  const area = `${padL},${areaBase} ${pts} ${xAt(normalizedData.length - 1)},${areaBase}`

  const yTicks = []
  for (let value = minVal; value <= maxVal + niceStep * 0.001; value += niceStep) {
    yTicks.push({
      y: yAt(value),
      label: formatWeightTick(value, niceStep),
    })
  }

  const n = normalizedData.length - 1
  const xLabelIdx = [...new Set([0, Math.round(n / 4), Math.round(n / 2), Math.round((3 * n) / 4), n])]
  const firstDate = getPointDate(normalizedData[0])
  const lastDate = getPointDate(normalizedData.at(-1))
  const spanDays = firstDate && lastDate ? (lastDate - firstDate) / 86400000 : 0

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={height}
        style={{ overflow: 'visible', display: 'block' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={accentColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map(({ y, label }) => (
          <g key={y}>
            <line x1={padL} y1={y} x2={padL + plotW} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={padL - 5} y={y + 3.5} fontSize="8.5" fill="#6b7280" textAnchor="end">{label}</text>
          </g>
        ))}

        <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

        {normalizedData.length > 1 && (
          <polygon
            points={area}
            fill={`url(#${gradientId})`}
            style={{
              opacity: lineDrawn ? 1 : 0,
              transition: 'opacity 640ms ease 980ms',
            }}
          />
        )}

        {normalizedData.length > 1 && (
          <polyline
            points={pts}
            fill="none"
            stroke={accentColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={lineDrawn ? 0 : 1}
            style={{
              transition: 'stroke-dashoffset 1480ms cubic-bezier(0.22, 1, 0.36, 1) 220ms',
            }}
          />
        )}

        {normalizedData.map((d, i) => (
          <circle
            key={i}
            cx={xAt(i)}
            cy={yAt(d.displayWeight)}
            r={normalizedData.length === 1 ? 4 : 3}
            fill={accentColor}
            style={{
              opacity: lineDrawn ? 1 : 0,
              transition: `opacity 280ms ease ${normalizedData.length === 1 ? 420 : 1260 + i * 90}ms`,
            }}
          />
        ))}

        {xLabelIdx.map(i => (
          <text key={i} x={xAt(i)} y={H - 6} fontSize="8.5" fill="#6b7280" textAnchor="middle">
            {formatXAxisLabel(normalizedData[i], spanDays)}
          </text>
        ))}

        <text x={padL - 5} y={padT - 3} fontSize="8" fill="#6b7280" textAnchor="end">{unit}</text>
      </svg>
    </div>
  )
}
