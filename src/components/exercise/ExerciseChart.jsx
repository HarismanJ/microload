// SVG line chart — shows estimated 1RM over time

export default function ExerciseChart({ data, unit = 'kg' }) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">No history yet</div>
  }

  const W = 300, H = 130
  const padL = 46, padR = 12, padT = 12, padB = 28
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const values = data.map(d => d.orm)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const range = rawMax - rawMin || 1
  const minVal = rawMin - range * 0.1
  const maxVal = rawMax + range * 0.1

  const xAt = (i) => padL + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW)
  const yAt = (v) => padT + plotH - ((v - minVal) / (maxVal - minVal)) * plotH

  const pts = data.map((d, i) => `${xAt(i)},${yAt(d.orm)}`).join(' ')
  const areaBase = padT + plotH
  const area = `${padL},${areaBase} ${pts} ${xAt(data.length - 1)},${areaBase}`

  // Y axis ticks — 3 evenly spaced
  const yTicks = [0, 0.5, 1].map(t => ({
    y: padT + plotH * (1 - t),
    label: (minVal + (maxVal - minVal) * t).toFixed(1),
  }))

  // X axis labels — show first, middle, last (deduplicated)
  const xLabelIdx = [...new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id="orm-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--blue)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid + Y labels */}
      {yTicks.map(({ y, label }) => (
        <g key={y}>
          <line x1={padL} y1={y} x2={padL + plotW} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <text x={padL - 5} y={y + 3.5} fontSize="8.5" fill="#6b7280" textAnchor="end">{label}</text>
        </g>
      ))}

      {/* X axis line */}
      <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

      {/* Area fill */}
      {data.length > 1 && <polygon points={area} fill="url(#orm-grad)" />}

      {/* Line */}
      {data.length > 1 && (
        <polyline points={pts} fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Dots */}
      {data.map((d, i) => (
        <circle key={i} cx={xAt(i)} cy={yAt(d.orm)} r={data.length === 1 ? 4 : 3} fill="var(--blue)" />
      ))}

      {/* X labels */}
      {xLabelIdx.map(i => (
        <text key={i} x={xAt(i)} y={H - 6} fontSize="8.5" fill="#6b7280" textAnchor="middle">
          {data[i].date.slice(5).replace('-', '/')}
        </text>
      ))}

      {/* Unit label */}
      <text x={padL - 5} y={padT - 3} fontSize="8" fill="#6b7280" textAnchor="end">{unit}</text>
    </svg>
  )
}