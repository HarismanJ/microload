const COLORS = {
  Unranked:    '#4b5563',
  Iron:        '#6b7280',
  Bronze:      '#cd7f32',
  Silver:      '#94a3b8',
  Gold:        '#f59e0b',
  Platinum:    '#22d3ee',
  Diamond:     '#3b9eff',
  Master:      '#8b5cf6',
  Grandmaster: '#ec4899',
  Elite:       '#f97316',
}

function Unranked({ c }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <circle cx="24" cy="24" r="18" fill={c + '18'} stroke={c} strokeWidth="1.8" strokeDasharray="4 3"/>
      <text x="24" y="32" textAnchor="middle" fill={c} fontSize="24" fontWeight="700" fontFamily="system-ui, sans-serif">?</text>
    </svg>
  )
}

// Shield path used for Iron–Gold
const SHIELD = 'M24 5 L40 13 L40 29 Q40 41 24 46 Q8 41 8 29 L8 13 Z'

function Iron({ c }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <path d={SHIELD} fill={c + '18'} stroke={c} strokeWidth="1.8"/>
      <line x1="15" y1="21" x2="33" y2="21" stroke={c} strokeWidth="1.8" strokeLinecap="round" opacity="0.9"/>
      <line x1="15" y1="27" x2="33" y2="27" stroke={c} strokeWidth="1.8" strokeLinecap="round" opacity="0.9"/>
      <line x1="15" y1="33" x2="33" y2="33" stroke={c} strokeWidth="1.8" strokeLinecap="round" opacity="0.9"/>
    </svg>
  )
}

function Bronze({ c }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <path d={SHIELD} fill={c + '18'} stroke={c} strokeWidth="1.8"/>
      <polyline points="15,31 24,21 33,31"
        fill="none" stroke={c} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function Silver({ c }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <path d={SHIELD} fill={c + '18'} stroke={c} strokeWidth="1.8"/>
      <polyline points="15,33 24,24 33,33"
        fill="none" stroke={c} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="15,25 24,16 33,25"
        fill="none" stroke={c} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function Gold({ c }) {
  // 5-point star centered at (24,27), outer r=10, inner r=4
  const star = '24,17 26.35,23.76 32.56,24.22 27.80,28.24 29.29,35.28 24,31 18.71,35.28 20.20,28.24 15.44,24.22 21.65,23.76'
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <path d={SHIELD} fill={c + '18'} stroke={c} strokeWidth="1.8"/>
      <polygon points={star} fill={c} opacity="0.9"/>
    </svg>
  )
}

function Platinum({ c }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      {/* Outer hexagon */}
      <polygon points="24,4 40,13 40,31 24,40 8,31 8,13"
        fill={c + '18'} stroke={c} strokeWidth="1.8"/>
      {/* Inner hexagon */}
      <polygon points="24,12 34,18 34,30 24,36 14,30 14,18"
        fill="none" stroke={c} strokeWidth="1.4" opacity="0.55"/>
      {/* Center dot */}
      <circle cx="24" cy="24" r="3.5" fill={c}/>
      {/* Spokes */}
      <line x1="24" y1="20.5" x2="24" y2="12" stroke={c} strokeWidth="1" opacity="0.4"/>
      <line x1="27" y1="22" x2="34" y2="18" stroke={c} strokeWidth="1" opacity="0.4"/>
      <line x1="27" y1="26" x2="34" y2="30" stroke={c} strokeWidth="1" opacity="0.4"/>
      <line x1="24" y1="27.5" x2="24" y2="36" stroke={c} strokeWidth="1" opacity="0.4"/>
      <line x1="21" y1="26" x2="14" y2="30" stroke={c} strokeWidth="1" opacity="0.4"/>
      <line x1="21" y1="22" x2="14" y2="18" stroke={c} strokeWidth="1" opacity="0.4"/>
    </svg>
  )
}

function Diamond({ c }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      {/* Gem outline */}
      <polygon points="24,3 43,21 24,45 5,21"
        fill={c + '18'} stroke={c} strokeWidth="1.8"/>
      {/* Top-left facet */}
      <polygon points="24,3 5,21 24,21"
        fill={c} opacity="0.15"/>
      {/* Top-right facet */}
      <polygon points="24,3 43,21 24,21"
        fill={c} opacity="0.28"/>
      {/* Girdle line */}
      <line x1="5" y1="21" x2="43" y2="21" stroke={c} strokeWidth="1.2" opacity="0.6"/>
      {/* Top ridge lines */}
      <line x1="24" y1="3" x2="5" y2="21" stroke={c} strokeWidth="0.8" opacity="0.35"/>
      <line x1="24" y1="3" x2="43" y2="21" stroke={c} strokeWidth="0.8" opacity="0.35"/>
      {/* Bottom facet lines from girdle corners */}
      <line x1="13" y1="21" x2="24" y2="45" stroke={c} strokeWidth="0.8" opacity="0.3"/>
      <line x1="35" y1="21" x2="24" y2="45" stroke={c} strokeWidth="0.8" opacity="0.3"/>
    </svg>
  )
}

function Master({ c }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      {/* Crown body — 3 points */}
      <path d="M7 36 L7 21 L16 30 L24 10 L32 30 L41 21 L41 36 Z"
        fill={c + '20'} stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
      {/* Crown base band */}
      <rect x="7" y="36" width="34" height="6" rx="2" fill={c} opacity="0.75"/>
      {/* Gems on points */}
      <circle cx="24" cy="11" r="3" fill={c}/>
      <circle cx="7"  cy="22" r="2.2" fill={c}/>
      <circle cx="41" cy="22" r="2.2" fill={c}/>
    </svg>
  )
}

function Grandmaster({ c }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      {/* Crown body — 5 points */}
      <path d="M5 37 L5 23 L11 30 L17 14 L24 6 L31 14 L37 30 L43 23 L43 37 Z"
        fill={c + '20'} stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
      {/* Crown base band */}
      <rect x="5" y="37" width="38" height="6" rx="2" fill={c} opacity="0.75"/>
      {/* Top diamond gem */}
      <polygon points="24,3 27,8 24,11 21,8" fill={c}/>
      {/* Side gems */}
      <circle cx="17" cy="15" r="2" fill={c}/>
      <circle cx="31" cy="15" r="2" fill={c}/>
      <circle cx="5"  cy="24" r="2" fill={c}/>
      <circle cx="43" cy="24" r="2" fill={c}/>
    </svg>
  )
}

function Elite({ c }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      {/* Left wing */}
      <path d="M23 22 C20 18 14 15 8 16 C10 12 14 10 18 12 C16 9 16 5 20 5 C21 8 22 12 23 16"
        fill={c + '22'} stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Right wing */}
      <path d="M25 22 C28 18 34 15 40 16 C38 12 34 10 30 12 C32 9 32 5 28 5 C27 8 26 12 25 16"
        fill={c + '22'} stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Center flame */}
      <path d="M24 5 C27 9 28 14 24 19 C20 14 21 9 24 5 Z" fill={c} opacity="0.85"/>
      {/* Stem */}
      <path d="M20 22 Q24 28 28 22 L28 32 Q24 38 20 32 Z"
        fill={c + '28'} stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>
      {/* Base pedestal */}
      <rect x="18" y="38" width="12" height="4" rx="2" fill={c} opacity="0.8"/>
      <rect x="15" y="42" width="18" height="3" rx="1.5" fill={c} opacity="0.5"/>
    </svg>
  )
}

const BADGE_COMPONENTS = { Unranked, Iron, Bronze, Silver, Gold, Platinum, Diamond, Master, Grandmaster, Elite }

export default function RankBadge({ tier, size = 44 }) {
  const Comp = BADGE_COMPONENTS[tier]
  const c = COLORS[tier]
  if (!Comp) return null
  return (
    <div style={{ width: size, height: size, flexShrink: 0 }}>
      <Comp c={c} />
    </div>
  )
}