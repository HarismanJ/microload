// Simplified schematic muscle map — front & back views side by side
// viewBox: 0 0 180 162  |  Front centered at x=40, Back at x=130

export default function MuscleMap({ primaryMuscles = [], secondaryMuscles = [] }) {
  function fill(name) {
    if (primaryMuscles.includes(name))   return '#3b9eff'
    if (secondaryMuscles.includes(name)) return 'rgba(59,158,255,0.12)'
    return 'rgba(255,255,255,0.08)'
  }

  const bg = 'rgba(255,255,255,0.07)'

  return (
    <svg viewBox="0 0 180 162" width="100%" style={{ display: 'block' }}>

      {/* ── FRONT VIEW ─────────────────────────────────────── */}

      {/* Silhouette */}
      <circle cx="40" cy="10" r="8" fill={bg} />
      <rect x="36" y="18" width="8" height="7" rx="3" fill={bg} />
      <rect x="11" y="25" width="10" height="44" rx="5" fill={bg} />   {/* L arm */}
      <rect x="59" y="25" width="10" height="44" rx="5" fill={bg} />   {/* R arm */}
      <rect x="22" y="25" width="36" height="50" rx="6" fill={bg} />   {/* torso */}
      <rect x="20" y="73" width="40" height="12" rx="5" fill={bg} />   {/* hips */}
      <rect x="21" y="83" width="17" height="62" rx="6" fill={bg} />   {/* L leg */}
      <rect x="42" y="83" width="17" height="62" rx="6" fill={bg} />   {/* R leg */}

      {/* Front Delts */}
      <ellipse cx="16" cy="30" rx="7" ry="8" fill={fill('Front Delts')} />
      <ellipse cx="64" cy="30" rx="7" ry="8" fill={fill('Front Delts')} />

      {/* Upper Chest — rendered before Chest so Chest overlaps partially */}
      <rect x="22" y="25" width="36" height="14" rx="6" fill={fill('Upper Chest')} />

      {/* Chest */}
      <rect x="22" y="26" width="36" height="26" rx="6" fill={fill('Chest')} />

      {/* Biceps */}
      <rect x="12" y="31" width="9" height="24" rx="4" fill={fill('Biceps')} />
      <rect x="59" y="31" width="9" height="24" rx="4" fill={fill('Biceps')} />

      {/* Triceps (front-visible strip) */}
      <rect x="11" y="32" width="9" height="24" rx="4" fill={fill('Triceps')} />
      <rect x="60" y="32" width="9" height="24" rx="4" fill={fill('Triceps')} />

      {/* Core / Abs */}
      <rect x="22" y="51" width="36" height="22" rx="5" fill={fill('Core')} />

      {/* Quads */}
      <rect x="22" y="84" width="15" height="26" rx="5" fill={fill('Quads')} />
      <rect x="43" y="84" width="15" height="26" rx="5" fill={fill('Quads')} />

      {/* Calves (front) */}
      <rect x="22" y="112" width="15" height="20" rx="5" fill={fill('Calves')} />
      <rect x="43" y="112" width="15" height="20" rx="5" fill={fill('Calves')} />

      {/* Label */}
      <text x="40" y="157" textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.3)" fontWeight="600" letterSpacing="1.5">FRONT</text>


      {/* ── BACK VIEW (x offset +90) ─────────────────────── */}

      {/* Silhouette */}
      <circle cx="130" cy="10" r="8" fill={bg} />
      <rect x="126" y="18" width="8" height="7" rx="3" fill={bg} />
      <rect x="101" y="25" width="10" height="44" rx="5" fill={bg} />  {/* L arm */}
      <rect x="149" y="25" width="10" height="44" rx="5" fill={bg} />  {/* R arm */}
      <rect x="112" y="25" width="36" height="50" rx="6" fill={bg} />  {/* torso */}
      <rect x="110" y="73" width="40" height="12" rx="5" fill={bg} />  {/* hips */}
      <rect x="111" y="83" width="17" height="62" rx="6" fill={bg} />  {/* L leg */}
      <rect x="132" y="83" width="17" height="62" rx="6" fill={bg} />  {/* R leg */}

      {/* Rear Delts */}
      <ellipse cx="106" cy="30" rx="7" ry="8" fill={fill('Rear Delts')} />
      <ellipse cx="154" cy="30" rx="7" ry="8" fill={fill('Rear Delts')} />

      {/* Traps */}
      <path d="M113,25 L147,25 L145,40 L130,45 L115,40 Z" fill={fill('Traps')} />

      {/* Triceps (back) */}
      <rect x="101" y="32" width="9" height="24" rx="4" fill={fill('Triceps')} />
      <rect x="150" y="32" width="9" height="24" rx="4" fill={fill('Triceps')} />

      {/* Lats */}
      <path d="M113,38 Q102,57 104,73 L117,71 Q117,55 117,38 Z" fill={fill('Lats')} />
      <path d="M147,38 Q158,57 156,73 L143,71 Q143,55 143,38 Z" fill={fill('Lats')} />

      {/* Lower Back */}
      <rect x="118" y="66" width="24" height="14" rx="4" fill={fill('Lower Back')} />

      {/* Glutes */}
      <rect x="112" y="83" width="16" height="20" rx="6" fill={fill('Glutes')} />
      <rect x="132" y="83" width="16" height="20" rx="6" fill={fill('Glutes')} />

      {/* Hamstrings */}
      <rect x="112" y="101" width="16" height="22" rx="5" fill={fill('Hamstrings')} />
      <rect x="132" y="101" width="16" height="22" rx="5" fill={fill('Hamstrings')} />

      {/* Calves (back) */}
      <rect x="112" y="125" width="16" height="20" rx="5" fill={fill('Calves')} />
      <rect x="132" y="125" width="16" height="20" rx="5" fill={fill('Calves')} />

      {/* Label */}
      <text x="130" y="157" textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.3)" fontWeight="600" letterSpacing="1.5">BACK</text>

    </svg>
  )
}
