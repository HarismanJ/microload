export const TIER_GROUPS = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Elite']
export const TIERS = TIER_GROUPS.flatMap(g => [`${g} I`, `${g} II`, `${g} III`])

export const TIER_COLORS = {
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

export const tierGroup = (tier) => tier.split(' ')[0]
export const tierColor = (tier) => TIER_COLORS[tierGroup(tier)]

// ── Anchor templates (male) ────────────────────────────────────────────────
// 10 points: [Iron start, Bronze, Silver, Gold, Platinum, Diamond, Master, Grandmaster, Elite, cap]
// Each value is a 1RM / bodyweight ratio

const T = {
  // Compound barbell legs
  deadlift:    [0, 0.70, 1.05, 1.35, 1.65, 1.95, 2.30, 2.65, 3.05, 3.80],
  sumo:        [0, 0.65, 1.00, 1.28, 1.57, 1.86, 2.18, 2.52, 2.90, 3.62],
  squat:       [0, 0.55, 0.85, 1.15, 1.45, 1.75, 2.05, 2.40, 2.80, 3.50],
  front_squat: [0, 0.42, 0.67, 0.90, 1.13, 1.37, 1.60, 1.87, 2.17, 2.72],
  hip_thrust:  [0, 0.60, 0.95, 1.28, 1.62, 1.95, 2.28, 2.62, 3.02, 3.78],
  rdl:         [0, 0.55, 0.85, 1.10, 1.40, 1.65, 1.95, 2.25, 2.60, 3.20],
  good_morning:[0, 0.28, 0.46, 0.63, 0.80, 0.97, 1.14, 1.32, 1.52, 1.90],
  lunge_bar:   [0, 0.33, 0.55, 0.75, 0.95, 1.15, 1.35, 1.55, 1.78, 2.23],
  leg_press:   [0, 0.90, 1.40, 1.88, 2.37, 2.85, 3.33, 3.83, 4.42, 5.52],
  hack_squat:  [0, 0.58, 0.92, 1.25, 1.58, 1.92, 2.25, 2.58, 2.98, 3.72],
  pendulum:    [0, 0.55, 0.87, 1.18, 1.50, 1.82, 2.13, 2.45, 2.83, 3.54],

  // Compound upper push
  bench:       [0, 0.40, 0.65, 0.90, 1.15, 1.40, 1.65, 1.90, 2.20, 2.80],
  incline:     [0, 0.30, 0.50, 0.70, 0.90, 1.10, 1.30, 1.50, 1.75, 2.20],
  decline:     [0, 0.42, 0.68, 0.93, 1.18, 1.43, 1.68, 1.93, 2.23, 2.80],
  cgbp:        [0, 0.32, 0.52, 0.72, 0.92, 1.12, 1.32, 1.52, 1.75, 2.20],
  ohp:         [0, 0.22, 0.38, 0.52, 0.67, 0.82, 0.97, 1.12, 1.30, 1.65],
  landmine_p:  [0, 0.18, 0.30, 0.42, 0.53, 0.65, 0.76, 0.88, 1.01, 1.27],
  jm_press:    [0, 0.28, 0.46, 0.63, 0.80, 0.97, 1.14, 1.32, 1.52, 1.90],

  // Compound upper pull
  row_bar:     [0, 0.32, 0.55, 0.75, 0.95, 1.15, 1.35, 1.55, 1.80, 2.20],
  // Bodyweight pull — total load ratio (BW + added) / BW; Iron I = 1.00 = unweighted rep
  pullup:      [0, 1.00, 1.07, 1.14, 1.22, 1.30, 1.40, 1.52, 1.67, 2.10],
  chinup:      [0, 1.00, 1.08, 1.17, 1.26, 1.36, 1.48, 1.63, 1.82, 2.28],
  lat_pull:    [0, 0.32, 0.52, 0.70, 0.87, 1.05, 1.23, 1.42, 1.63, 2.04],
  shrug:       [0, 0.60, 0.95, 1.28, 1.62, 1.95, 2.28, 2.62, 3.02, 3.78],
  upright_row: [0, 0.22, 0.36, 0.48, 0.61, 0.74, 0.87, 1.00, 1.16, 1.45],

  // Dumbbell compound
  db_press:    [0, 0.35, 0.57, 0.78, 0.98, 1.18, 1.38, 1.59, 1.83, 2.29],
  db_inc:      [0, 0.27, 0.44, 0.61, 0.77, 0.94, 1.10, 1.27, 1.47, 1.84],
  db_dec:      [0, 0.37, 0.60, 0.82, 1.03, 1.25, 1.47, 1.69, 1.95, 2.44],
  db_ohp:      [0, 0.18, 0.30, 0.42, 0.53, 0.65, 0.76, 0.88, 1.01, 1.27],
  db_row:      [0, 0.28, 0.47, 0.64, 0.81, 0.98, 1.15, 1.32, 1.53, 1.91],
  db_shrug:    [0, 0.35, 0.57, 0.78, 0.98, 1.18, 1.38, 1.59, 1.83, 2.29],
  db_pullover: [0, 0.20, 0.33, 0.45, 0.57, 0.68, 0.80, 0.92, 1.06, 1.33],

  // Single-arm dumbbell (roughly half two-arm)
  sa_db_press: [0, 0.17, 0.28, 0.38, 0.49, 0.59, 0.69, 0.79, 0.92, 1.15],
  sa_db_row:   [0, 0.14, 0.23, 0.32, 0.40, 0.49, 0.57, 0.66, 0.76, 0.95],

  // Isolation push — triceps
  skull:       [0, 0.18, 0.30, 0.42, 0.53, 0.65, 0.76, 0.88, 1.01, 1.27],
  pushdown:    [0, 0.18, 0.30, 0.42, 0.53, 0.65, 0.76, 0.88, 1.01, 1.27],
  db_tri_ext:  [0, 0.12, 0.20, 0.27, 0.34, 0.41, 0.48, 0.56, 0.64, 0.80],
  sa_tri_ext:  [0, 0.06, 0.10, 0.14, 0.17, 0.21, 0.24, 0.28, 0.32, 0.40],
  kickback:    [0, 0.06, 0.10, 0.14, 0.17, 0.21, 0.24, 0.28, 0.32, 0.40],
  tate:        [0, 0.11, 0.18, 0.25, 0.32, 0.38, 0.45, 0.52, 0.60, 0.75],

  // Isolation push — chest
  fly:         [0, 0.15, 0.25, 0.35, 0.44, 0.53, 0.62, 0.72, 0.83, 1.04],
  pec_deck:    [0, 0.15, 0.25, 0.35, 0.44, 0.53, 0.62, 0.72, 0.83, 1.04],
  svend:       [0, 0.04, 0.07, 0.10, 0.13, 0.16, 0.18, 0.21, 0.24, 0.30],

  // Isolation push — shoulders
  lateral:     [0, 0.07, 0.12, 0.16, 0.21, 0.25, 0.30, 0.34, 0.40, 0.50],
  front_raise: [0, 0.07, 0.12, 0.16, 0.21, 0.25, 0.30, 0.34, 0.40, 0.50],
  sa_lateral:  [0, 0.04, 0.06, 0.08, 0.10, 0.12, 0.15, 0.17, 0.20, 0.25],

  // Isolation pull — biceps
  curl_bar:    [0, 0.20, 0.33, 0.45, 0.57, 0.68, 0.80, 0.92, 1.06, 1.33],
  ez_curl:     [0, 0.18, 0.30, 0.42, 0.53, 0.65, 0.76, 0.88, 1.01, 1.27],
  preacher:    [0, 0.15, 0.25, 0.35, 0.44, 0.53, 0.62, 0.72, 0.83, 1.04],
  db_curl:     [0, 0.10, 0.17, 0.23, 0.29, 0.35, 0.41, 0.47, 0.54, 0.68],
  sa_curl:     [0, 0.05, 0.08, 0.11, 0.14, 0.17, 0.20, 0.23, 0.27, 0.34],
  conc_curl:   [0, 0.08, 0.13, 0.18, 0.22, 0.27, 0.31, 0.36, 0.42, 0.52],

  // Isolation pull — rear delt / back
  face_pull:   [0, 0.12, 0.20, 0.27, 0.34, 0.41, 0.48, 0.56, 0.64, 0.80],
  rear_fly:    [0, 0.06, 0.10, 0.13, 0.17, 0.20, 0.24, 0.27, 0.32, 0.40],
  str_pull:    [0, 0.18, 0.30, 0.42, 0.53, 0.65, 0.76, 0.88, 1.01, 1.27],
  rev_curl:    [0, 0.13, 0.21, 0.29, 0.37, 0.45, 0.52, 0.60, 0.69, 0.87],
  wrist_curl:  [0, 0.09, 0.15, 0.21, 0.26, 0.32, 0.37, 0.43, 0.50, 0.62],

  // Compound legs — machine / specialty
  leg_ext:     [0, 0.30, 0.50, 0.68, 0.86, 1.03, 1.21, 1.40, 1.61, 2.02],
  leg_curl:    [0, 0.25, 0.42, 0.57, 0.72, 0.87, 1.02, 1.18, 1.36, 1.70],
  calf_raise:  [0, 0.50, 0.80, 1.08, 1.37, 1.65, 1.93, 2.22, 2.56, 3.20],
  glute_ham:   [0, 0.15, 0.25, 0.35, 0.44, 0.53, 0.62, 0.72, 0.83, 1.04],
  back_ext:    [0, 0.20, 0.33, 0.45, 0.57, 0.68, 0.80, 0.92, 1.06, 1.33],
  abduction:   [0, 0.20, 0.33, 0.45, 0.57, 0.68, 0.80, 0.92, 1.06, 1.33],

  // Bodyweight (total load ratio: (BW + added) / BW)
  // Iron I = 1.00 (unweighted), Platinum I ≈ 2-year intermediate with added weight
  pullup_bw:   [0, 1.00, 1.07, 1.14, 1.22, 1.30, 1.40, 1.52, 1.67, 2.10],
  dips_bw:     [0, 1.00, 1.10, 1.20, 1.32, 1.45, 1.60, 1.78, 2.00, 2.55],
  muscle_up:   [0, 1.00, 1.05, 1.11, 1.18, 1.26, 1.36, 1.48, 1.64, 2.06],
  hspu:        [0, 1.00, 1.08, 1.17, 1.27, 1.38, 1.52, 1.69, 1.90, 2.40],
  bw_squat:    [0, 1.00, 1.04, 1.09, 1.15, 1.22, 1.31, 1.43, 1.58, 2.00],
  push_up:     [0, 1.00, 1.06, 1.12, 1.19, 1.27, 1.36, 1.47, 1.60, 2.00],
  bw_hip:      [0, 1.00, 1.08, 1.16, 1.25, 1.35, 1.47, 1.62, 1.80, 2.25],
  bw_core:     [0, 1.00, 1.03, 1.06, 1.09, 1.13, 1.18, 1.24, 1.32, 1.65],
  bw_rollout:  [0, 1.00, 1.06, 1.12, 1.20, 1.28, 1.38, 1.51, 1.66, 2.08],
  nordic:      [0, 1.00, 1.05, 1.10, 1.16, 1.23, 1.31, 1.41, 1.54, 1.93],

  // Core (weight of added load)
  ab_rollout:  [0, 0.22, 0.38, 0.52, 0.67, 0.82, 0.97, 1.12, 1.30, 1.63],
  cable_crunch:[0, 0.25, 0.42, 0.57, 0.72, 0.87, 1.02, 1.18, 1.36, 1.70],
  hanging_lr:  [0, 0.05, 0.10, 0.17, 0.25, 0.35, 0.45, 0.57, 0.72, 0.95],

  // Kettlebell
  kb_swing:    [0, 0.25, 0.42, 0.57, 0.72, 0.87, 1.02, 1.18, 1.36, 1.70],
  kb_press:    [0, 0.18, 0.30, 0.42, 0.53, 0.65, 0.76, 0.88, 1.01, 1.27],
  kb_snatch:   [0, 0.20, 0.33, 0.45, 0.57, 0.68, 0.80, 0.92, 1.06, 1.33],
  tgu:         [0, 0.12, 0.20, 0.27, 0.34, 0.41, 0.48, 0.56, 0.64, 0.80],
}

// Scale helper: multiply all non-zero values by factor, round to 2 dp
function s(base, factor) {
  return base.map((v, i) => i === 0 ? 0 : Math.round(v * factor * 100) / 100)
}

// Scale helper for BW-ratio templates: scales only the delta above 1.0
function sBW(base, factor) {
  return base.map((v, i) => i === 0 ? 0 : Math.round((1 + (v - 1) * factor) * 1000) / 1000)
}

const F = 0.65 // general female/male strength ratio

// ── ANCHORS ────────────────────────────────────────────────────────────────
export const ANCHORS = {
  male: {
    // ── Barbell Push ──────────────────────────────────────────────────
    'Bench Press':                    T.bench,
    'Incline Bench Press':            T.incline,
    'Decline Bench Press':            T.decline,
    'Close Grip Bench Press':         T.cgbp,
    'Overhead Press':                 T.ohp,
    'Landmine Press':                 T.landmine_p,
    'JM Press':                       T.jm_press,
    'California Press':               T.jm_press,
    'Barbell Rollout':                T.ab_rollout,

    // ── Barbell Pull ──────────────────────────────────────────────────
    'Barbell Row':                    T.row_bar,
    'Pendlay Row':                    T.row_bar,
    'Seal Row':                       T.row_bar,
    'Underhand Barbell Row':          T.row_bar,
    'Meadows Row':                    s(T.row_bar, 0.88),
    'Chest Supported T-Bar Row':      s(T.row_bar, 0.92),
    'T-Bar Row':                      s(T.row_bar, 0.95),
    'Barbell Curl':                   T.curl_bar,
    'Barbell Reverse Curl':           T.rev_curl,
    'Barbell Drag Curl':              s(T.curl_bar, 0.88),
    'Barbell Wrist Curl':             T.wrist_curl,
    'Barbell Shrug':                  T.shrug,
    'Barbell Upright Row':            T.upright_row,

    // ── Barbell Legs ──────────────────────────────────────────────────
    'Squat':                          T.squat,
    'Front Squat':                    T.front_squat,
    'Deadlift':                       T.deadlift,
    'Sumo Deadlift':                  T.sumo,
    'Romanian Deadlift':              T.rdl,
    'Good Morning':                   T.good_morning,
    'Barbell Lunge':                  T.lunge_bar,
    'Barbell Hip Thrust':             T.hip_thrust,
    'Barbell Step Up':                s(T.squat, 0.65),
    'Landmine Squat':                 s(T.squat, 0.65),
    'Landmine Romanian Deadlift':     s(T.rdl, 0.82),
    'Landmine Row':                   s(T.row_bar, 0.88),
    'Landmine Lateral Raise':         T.sa_lateral,

    // ── Dumbbell Push ─────────────────────────────────────────────────
    'Dumbbell Press':                 T.db_press,
    'Incline Dumbbell Press':         T.db_inc,
    'Decline Dumbbell Press':         T.db_dec,
    'Dumbbell Fly':                   T.fly,
    'Incline Dumbbell Fly':           s(T.fly, 0.88),
    'Dumbbell Shoulder Press':        T.db_ohp,
    'Lateral Raise':                  T.lateral,
    'Front Raise':                    T.front_raise,
    'Dumbbell Tricep Extension':      T.db_tri_ext,
    'Dumbbell Kickback':              T.kickback,
    'Tate Press':                     T.tate,
    'Svend Press':                    T.svend,
    'Dumbbell Upright Row':           s(T.upright_row, 0.82),
    'Dumbbell Wrist Curl':            T.wrist_curl,
    'Dumbbell Reverse Curl':          T.rev_curl,
    'Single Arm Dumbbell Press':      T.sa_db_press,
    'Single Arm Incline Dumbbell Press': s(T.sa_db_press, 0.88),
    'Single Arm Overhead Tricep Extension': T.sa_tri_ext,
    'Single Arm Lateral Raise':       T.sa_lateral,
    'Single Arm Rear Delt Fly':       s(T.rear_fly, 0.80),

    // ── Dumbbell Pull ─────────────────────────────────────────────────
    'Dumbbell Row':                   T.db_row,
    'Single Arm Dumbbell Row':        T.sa_db_row,
    'Dumbbell Curl':                  T.db_curl,
    'Hammer Curl':                    T.db_curl,
    'Concentration Curl':             T.conc_curl,
    'Incline Dumbbell Curl':          s(T.db_curl, 0.90),
    'Prone Incline Curl':             s(T.db_curl, 0.90),
    'Spider Curl':                    s(T.db_curl, 0.92),
    'Drag Curl':                      s(T.db_curl, 0.92),
    'Lying Dumbbell Curl':            s(T.db_curl, 0.90),
    'Single Arm Dumbbell Curl':       T.sa_curl,
    'Single Arm Hammer Curl':         T.sa_curl,
    'Rear Delt Fly':                  T.rear_fly,
    'Dumbbell Shrug':                 T.db_shrug,
    'Dumbbell Pullover':              T.db_pullover,

    // ── Dumbbell Legs ─────────────────────────────────────────────────
    'Goblet Squat':                   s(T.squat, 0.55),
    'Kettlebell Goblet Squat':        s(T.squat, 0.55),
    'Dumbbell Lunge':                 s(T.lunge_bar, 0.72),
    'Bodyweight Lunge':               T.bw_squat,
    'Bulgarian Split Squat':          s(T.squat, 0.58),
    'Dumbbell Romanian Deadlift':     s(T.rdl, 0.82),
    'Dumbbell Hip Thrust':            s(T.hip_thrust, 0.72),
    'Dumbbell Step Up':               s(T.squat, 0.58),
    'Dumbbell Calf Raise':            s(T.calf_raise, 0.55),
    'Dumbbell Deadlift':              s(T.deadlift, 0.82),

    // ── Cable ─────────────────────────────────────────────────────────
    'Cable Row':                      T.row_bar,
    'Seated Cable Row':               T.row_bar,
    'Wide Grip Seated Cable Row':     s(T.row_bar, 0.92),
    'Chest Supported Row':            s(T.row_bar, 0.88),
    'Lat Pulldown':                   T.lat_pull,
    'Close Grip Lat Pulldown':        s(T.lat_pull, 0.95),
    'Underhand Lat Pulldown':         s(T.lat_pull, 0.95),
    'Single Arm Lat Pulldown':        s(T.lat_pull, 0.58),
    'Straight Arm Pulldown':          T.str_pull,
    'Cable Curl':                     T.db_curl,
    'Cable Hammer Curl':              T.db_curl,
    'Cable Rope Curl':                T.db_curl,
    'Single Arm Cable Curl':          T.sa_curl,
    'Single Arm Cable Hammer Curl':   T.sa_curl,
    'Cable Overhead Curl':            T.sa_curl,
    'Cable Reverse Curl':             T.rev_curl,
    'Face Pull':                      T.face_pull,
    'Cable Rear Delt Fly':            T.rear_fly,
    'Reverse Pec Deck':               s(T.rear_fly, 1.20),
    'Single Arm Reverse Pec Deck':    s(T.rear_fly, 0.65),
    'Cable Upright Row':              T.upright_row,
    'Tricep Pushdown':                T.pushdown,
    'Cable Rope Pushdown':            T.pushdown,
    'Single Arm Cable Pushdown':      s(T.pushdown, 0.55),
    'Overhead Tricep Extension':      s(T.skull, 0.88),
    'Single Arm Cable Kickback':      T.kickback,
    'Cable Fly':                      T.fly,
    'High Cable Fly':                 T.fly,
    'Low Cable Fly':                  T.fly,
    'Single Arm Cable Fly':           s(T.fly, 0.55),
    'Cable Lateral Raise':            T.lateral,
    'Cable Front Raise':              T.front_raise,
    'Single Arm Cable Lateral Raise': T.sa_lateral,
    'Single Arm Cable Row':           T.sa_db_row,
    'Cable Crunch':                   T.cable_crunch,
    'Cable Pull Through':             s(T.hip_thrust, 0.72),
    'Cable Hip Abduction':            T.abduction,
    'Cable Kickback':                 T.kickback,

    // ── Machine ───────────────────────────────────────────────────────
    'Leg Press':                      T.leg_press,
    'Single Leg Leg Press':           s(T.leg_press, 0.58),
    'Hack Squat':                     T.hack_squat,
    'Pendulum Squat':                 T.pendulum,
    'Belt Squat':                     T.pendulum,
    'Smith Machine Squat':            s(T.squat, 0.92),
    'Leg Extension':                  T.leg_ext,
    'Single Leg Leg Extension':       s(T.leg_ext, 0.58),
    'Leg Curl':                       T.leg_curl,
    'Lying Leg Curl':                 T.leg_curl,
    'Seated Leg Curl':                T.leg_curl,
    'Single Leg Lying Leg Curl':      s(T.leg_curl, 0.58),
    'Calf Raise':                     T.calf_raise,
    'Seated Calf Raise':              s(T.calf_raise, 0.65),
    'Seated Calf Press':              s(T.calf_raise, 0.75),
    'Donkey Calf Raise':              s(T.calf_raise, 0.82),
    'Bodyweight Calf Raise':          T.bw_squat,
    'Glute Ham Raise':                T.glute_ham,
    'Reverse Hyperextension':         T.back_ext,
    'Back Extension':                 T.back_ext,
    'Hip Extension Machine':          s(T.back_ext, 1.15),
    'Hip Abduction':                  T.abduction,
    'Hip Adduction':                  T.abduction,
    'Chest Press Machine':            s(T.bench, 0.88),
    'Incline Press Machine':          s(T.incline, 0.88),
    'Decline Press Machine':          s(T.decline, 0.88),
    'Converging Chest Press':         s(T.bench, 0.88),
    'Pec Deck':                       T.pec_deck,
    'Shoulder Press Machine':         s(T.ohp, 0.88),
    'Shoulder Press (Plate Loaded)':  s(T.ohp, 0.88),
    'Lat Pulldown Machine':           T.lat_pull,
    'Hammer Strength Pulldown':       s(T.lat_pull, 0.92),
    'Seated Row Machine':             T.row_bar,
    'Hammer Strength Row':            s(T.row_bar, 0.92),
    'Tricep Extension Machine':       T.pushdown,
    'Preacher Curl Machine':          T.preacher,

    // ── EZ Bar ────────────────────────────────────────────────────────
    'EZ Bar Curl':                    T.ez_curl,
    'Preacher Curl':                  T.preacher,
    'Skullcrusher':                   T.skull,
    'EZ Bar Overhead Extension':      s(T.skull, 0.88),

    // ── Kettlebell ────────────────────────────────────────────────────
    'Kettlebell Swing':               T.kb_swing,
    'Kettlebell Clean':               T.kb_swing,
    'Kettlebell Press':               T.kb_press,
    'Kettlebell Row':                 s(T.kb_swing, 0.95),
    'Kettlebell Snatch':              T.kb_snatch,
    'Turkish Get Up':                 T.tgu,

    // ── Bodyweight Push ───────────────────────────────────────────────
    'Push Up':                        T.push_up,
    'Wide Push Up':                   T.push_up,
    'Diamond Push Up':                T.push_up,
    'Close Grip Push Up':             T.push_up,
    'Decline Push Up':                T.push_up,
    'Incline Push Up':                T.push_up,
    'Pike Push Up':                   T.push_up,
    'Handstand Push Up':              T.hspu,
    'Archer Push Up':                 T.push_up,
    'Planche Push Up':                T.push_up,
    'Ring Push Up':                   T.push_up,
    'Dips':                           T.dips_bw,
    'Ring Dips':                      T.dips_bw,
    'Bench Dips':                     T.dips_bw,
    'Back Lever':                     T.pullup_bw,

    // ── Bodyweight Pull ───────────────────────────────────────────────
    'Pull Ups':                       T.pullup_bw,
    'Chin Ups':                       T.pullup_bw,
    'Neutral Grip Pull Up':           T.pullup_bw,
    'Wide Grip Pull Up':              T.pullup_bw,
    'Inverted Row':                   T.pullup_bw,
    'Ring Row':                       T.pullup_bw,
    'Muscle Up':                      T.muscle_up,
    'Ring Muscle Up':                 T.muscle_up,
    'Archer Pull Up':                 T.pullup_bw,
    'Typewriter Pull Up':             T.pullup_bw,
    'Commando Pull Up':               T.pullup_bw,
    'Front Lever':                    T.pullup_bw,

    // ── Bodyweight Legs ───────────────────────────────────────────────
    'Jump Squat':                     T.bw_squat,
    'Pistol Squat':                   T.bw_squat,
    'Box Jump':                       T.bw_squat,
    'Step Up':                        T.bw_squat,
    'Sissy Squat':                    T.bw_squat,
    'Reverse Nordic Curl':            T.bw_squat,
    'Cossack Squat':                  T.bw_squat,
    'Nordic Curl':                    T.nordic,
    'Glute Bridge':                   T.bw_hip,
    'Single Leg Glute Bridge':        T.bw_hip,
    'Hip Thrust':                     T.bw_hip,
    'Good Morning (Bodyweight)':      T.bw_core,

    // ── Core ──────────────────────────────────────────────────────────
    'Plank':                          T.bw_core,
    'Side Plank':                     T.bw_core,
    'Hollow Body Hold':               T.bw_core,
    'L-Sit':                          T.bw_core,
    'Hanging Leg Raise':              T.bw_core,
    'Hanging Knee Raise':             T.bw_core,
    'Toes to Bar':                    T.bw_core,
    'Ab Rollout':                     T.bw_rollout,
    'Cable Crunch':                   T.cable_crunch,
    'Dragon Flag':                    T.bw_core,
    'V-Up':                           T.bw_core,
    'Crunch':                         T.bw_core,
    'Bicycle Crunch':                 T.bw_core,
    'Leg Raise':                      T.bw_core,
    'Russian Twist':                  T.bw_core,
    'Burpee':                         T.bw_core,
    'Mountain Climber':               T.bw_core,
    'Dead Bug':                       T.bw_core,
    'Copenhagen Plank':               T.bw_core,
    'Superman Hold':                  T.bw_core,
    'Barbell Rollout':                T.ab_rollout,
  },

  female: {
    // ── Barbell Push ──────────────────────────────────────────────────
    'Bench Press':                    [0, 0.25, 0.40, 0.57, 0.73, 0.90, 1.05, 1.22, 1.42, 1.80],
    'Incline Bench Press':            [0, 0.18, 0.32, 0.47, 0.62, 0.77, 0.92, 1.07, 1.25, 1.55],
    'Decline Bench Press':            s(T.decline, F),
    'Close Grip Bench Press':         s(T.cgbp, F),
    'Overhead Press':                 [0, 0.13, 0.23, 0.33, 0.43, 0.53, 0.63, 0.73, 0.85, 1.10],
    'Landmine Press':                 s(T.landmine_p, F),
    'JM Press':                       s(T.jm_press, F),
    'California Press':               s(T.jm_press, F),
    'Barbell Rollout':                s(T.ab_rollout, F),

    // ── Barbell Pull ──────────────────────────────────────────────────
    'Barbell Row':                    [0, 0.20, 0.35, 0.50, 0.65, 0.80, 0.95, 1.10, 1.28, 1.60],
    'Pendlay Row':                    [0, 0.20, 0.35, 0.50, 0.65, 0.80, 0.95, 1.10, 1.28, 1.60],
    'Seal Row':                       s(T.row_bar, F),
    'Underhand Barbell Row':          s(T.row_bar, F),
    'Meadows Row':                    s(T.row_bar, F * 0.88),
    'Chest Supported T-Bar Row':      s(T.row_bar, F * 0.92),
    'T-Bar Row':                      s(T.row_bar, F * 0.95),
    'Barbell Curl':                   s(T.curl_bar, F),
    'Barbell Reverse Curl':           s(T.rev_curl, F),
    'Barbell Drag Curl':              s(T.curl_bar, F * 0.88),
    'Barbell Wrist Curl':             s(T.wrist_curl, F),
    'Barbell Shrug':                  s(T.shrug, F),
    'Barbell Upright Row':            s(T.upright_row, F),

    // ── Barbell Legs ──────────────────────────────────────────────────
    'Squat':                          [0, 0.38, 0.60, 0.82, 1.05, 1.28, 1.50, 1.75, 2.05, 2.55],
    'Front Squat':                    s(T.front_squat, F),
    'Deadlift':                       [0, 0.50, 0.75, 0.97, 1.20, 1.43, 1.68, 1.95, 2.25, 2.80],
    'Sumo Deadlift':                  s(T.sumo, F),
    'Romanian Deadlift':              [0, 0.38, 0.60, 0.80, 1.02, 1.23, 1.45, 1.68, 1.95, 2.40],
    'Good Morning':                   s(T.good_morning, F),
    'Barbell Lunge':                  s(T.lunge_bar, F),
    'Barbell Hip Thrust':             s(T.hip_thrust, F),
    'Barbell Step Up':                s(T.squat, F * 0.65),
    'Landmine Squat':                 s(T.squat, F * 0.65),
    'Landmine Romanian Deadlift':     s(T.rdl, F * 0.82),
    'Landmine Row':                   s(T.row_bar, F * 0.88),
    'Landmine Lateral Raise':         s(T.sa_lateral, F),

    // ── Dumbbell Push ─────────────────────────────────────────────────
    'Dumbbell Press':                 s(T.db_press, F),
    'Incline Dumbbell Press':         s(T.db_inc, F),
    'Decline Dumbbell Press':         s(T.db_dec, F),
    'Dumbbell Fly':                   s(T.fly, F),
    'Incline Dumbbell Fly':           s(T.fly, F * 0.88),
    'Dumbbell Shoulder Press':        s(T.db_ohp, F),
    'Lateral Raise':                  s(T.lateral, F),
    'Front Raise':                    s(T.front_raise, F),
    'Dumbbell Tricep Extension':      s(T.db_tri_ext, F),
    'Dumbbell Kickback':              s(T.kickback, F),
    'Tate Press':                     s(T.tate, F),
    'Svend Press':                    s(T.svend, F),
    'Dumbbell Upright Row':           s(T.upright_row, F * 0.82),
    'Dumbbell Wrist Curl':            s(T.wrist_curl, F),
    'Dumbbell Reverse Curl':          s(T.rev_curl, F),
    'Single Arm Dumbbell Press':      s(T.sa_db_press, F),
    'Single Arm Incline Dumbbell Press': s(T.sa_db_press, F * 0.88),
    'Single Arm Overhead Tricep Extension': s(T.sa_tri_ext, F),
    'Single Arm Lateral Raise':       s(T.sa_lateral, F),
    'Single Arm Rear Delt Fly':       s(T.rear_fly, F * 0.80),

    // ── Dumbbell Pull ─────────────────────────────────────────────────
    'Dumbbell Row':                   s(T.db_row, F),
    'Single Arm Dumbbell Row':        s(T.sa_db_row, F),
    'Dumbbell Curl':                  s(T.db_curl, F),
    'Hammer Curl':                    s(T.db_curl, F),
    'Concentration Curl':             s(T.conc_curl, F),
    'Incline Dumbbell Curl':          s(T.db_curl, F * 0.90),
    'Prone Incline Curl':             s(T.db_curl, F * 0.90),
    'Spider Curl':                    s(T.db_curl, F * 0.92),
    'Drag Curl':                      s(T.db_curl, F * 0.92),
    'Lying Dumbbell Curl':            s(T.db_curl, F * 0.90),
    'Single Arm Dumbbell Curl':       s(T.sa_curl, F),
    'Single Arm Hammer Curl':         s(T.sa_curl, F),
    'Rear Delt Fly':                  s(T.rear_fly, F),
    'Dumbbell Shrug':                 s(T.db_shrug, F),
    'Dumbbell Pullover':              s(T.db_pullover, F),

    // ── Dumbbell Legs ─────────────────────────────────────────────────
    'Goblet Squat':                   s(T.squat, F * 0.55),
    'Kettlebell Goblet Squat':        s(T.squat, F * 0.55),
    'Dumbbell Lunge':                 s(T.lunge_bar, F * 0.72),
    'Bodyweight Lunge':               sBW(T.bw_squat, F),
    'Bulgarian Split Squat':          s(T.squat, F * 0.58),
    'Dumbbell Romanian Deadlift':     s(T.rdl, F * 0.82),
    'Dumbbell Hip Thrust':            s(T.hip_thrust, F * 0.72),
    'Dumbbell Step Up':               s(T.squat, F * 0.58),
    'Dumbbell Calf Raise':            s(T.calf_raise, F * 0.55),
    'Dumbbell Deadlift':              s(T.deadlift, F * 0.82),

    // ── Cable ─────────────────────────────────────────────────────────
    'Cable Row':                      [0, 0.20, 0.35, 0.50, 0.65, 0.80, 0.95, 1.10, 1.28, 1.60],
    'Seated Cable Row':               s(T.row_bar, F),
    'Wide Grip Seated Cable Row':     s(T.row_bar, F * 0.92),
    'Chest Supported Row':            s(T.row_bar, F * 0.88),
    'Lat Pulldown':                   [0, 0.20, 0.33, 0.47, 0.60, 0.73, 0.87, 1.02, 1.20, 1.50],
    'Close Grip Lat Pulldown':        s(T.lat_pull, F * 0.95),
    'Underhand Lat Pulldown':         s(T.lat_pull, F * 0.95),
    'Single Arm Lat Pulldown':        s(T.lat_pull, F * 0.58),
    'Straight Arm Pulldown':          s(T.str_pull, F),
    'Cable Curl':                     s(T.db_curl, F),
    'Cable Hammer Curl':              s(T.db_curl, F),
    'Cable Rope Curl':                s(T.db_curl, F),
    'Single Arm Cable Curl':          s(T.sa_curl, F),
    'Single Arm Cable Hammer Curl':   s(T.sa_curl, F),
    'Cable Overhead Curl':            s(T.sa_curl, F),
    'Cable Reverse Curl':             s(T.rev_curl, F),
    'Face Pull':                      s(T.face_pull, F),
    'Cable Rear Delt Fly':            s(T.rear_fly, F),
    'Reverse Pec Deck':               s(T.rear_fly, F * 1.20),
    'Single Arm Reverse Pec Deck':    s(T.rear_fly, F * 0.65),
    'Cable Upright Row':              s(T.upright_row, F),
    'Tricep Pushdown':                s(T.pushdown, F),
    'Cable Rope Pushdown':            s(T.pushdown, F),
    'Single Arm Cable Pushdown':      s(T.pushdown, F * 0.55),
    'Overhead Tricep Extension':      s(T.skull, F * 0.88),
    'Single Arm Cable Kickback':      s(T.kickback, F),
    'Cable Fly':                      s(T.fly, F),
    'High Cable Fly':                 s(T.fly, F),
    'Low Cable Fly':                  s(T.fly, F),
    'Single Arm Cable Fly':           s(T.fly, F * 0.55),
    'Cable Lateral Raise':            s(T.lateral, F),
    'Cable Front Raise':              s(T.front_raise, F),
    'Single Arm Cable Lateral Raise': s(T.sa_lateral, F),
    'Single Arm Cable Row':           s(T.sa_db_row, F),
    'Cable Crunch':                   s(T.cable_crunch, F),
    'Cable Pull Through':             s(T.hip_thrust, F * 0.72),
    'Cable Hip Abduction':            s(T.abduction, F),
    'Cable Kickback':                 s(T.kickback, F),

    // ── Machine ───────────────────────────────────────────────────────
    'Leg Press':                      s(T.leg_press, F),
    'Single Leg Leg Press':           s(T.leg_press, F * 0.58),
    'Hack Squat':                     s(T.hack_squat, F),
    'Pendulum Squat':                 s(T.pendulum, F),
    'Belt Squat':                     s(T.pendulum, F),
    'Smith Machine Squat':            s(T.squat, F * 0.92),
    'Leg Extension':                  s(T.leg_ext, F),
    'Single Leg Leg Extension':       s(T.leg_ext, F * 0.58),
    'Leg Curl':                       s(T.leg_curl, F),
    'Lying Leg Curl':                 s(T.leg_curl, F),
    'Seated Leg Curl':                s(T.leg_curl, F),
    'Single Leg Lying Leg Curl':      s(T.leg_curl, F * 0.58),
    'Calf Raise':                     s(T.calf_raise, F),
    'Seated Calf Raise':              s(T.calf_raise, F * 0.65),
    'Seated Calf Press':              s(T.calf_raise, F * 0.75),
    'Donkey Calf Raise':              s(T.calf_raise, F * 0.82),
    'Bodyweight Calf Raise':          sBW(T.bw_squat, F),
    'Glute Ham Raise':                s(T.glute_ham, F),
    'Reverse Hyperextension':         s(T.back_ext, F),
    'Back Extension':                 s(T.back_ext, F),
    'Hip Extension Machine':          s(T.back_ext, F * 1.15),
    'Hip Abduction':                  s(T.abduction, F),
    'Hip Adduction':                  s(T.abduction, F),
    'Chest Press Machine':            s(T.bench, F * 0.88),
    'Incline Press Machine':          s(T.incline, F * 0.88),
    'Decline Press Machine':          s(T.decline, F * 0.88),
    'Converging Chest Press':         s(T.bench, F * 0.88),
    'Pec Deck':                       s(T.pec_deck, F),
    'Shoulder Press Machine':         s(T.ohp, F * 0.88),
    'Shoulder Press (Plate Loaded)':  s(T.ohp, F * 0.88),
    'Lat Pulldown Machine':           s(T.lat_pull, F),
    'Hammer Strength Pulldown':       s(T.lat_pull, F * 0.92),
    'Seated Row Machine':             s(T.row_bar, F),
    'Hammer Strength Row':            s(T.row_bar, F * 0.92),
    'Tricep Extension Machine':       s(T.pushdown, F),
    'Preacher Curl Machine':          s(T.preacher, F),

    // ── EZ Bar ────────────────────────────────────────────────────────
    'EZ Bar Curl':                    s(T.ez_curl, F),
    'Preacher Curl':                  s(T.preacher, F),
    'Skullcrusher':                   s(T.skull, F),
    'EZ Bar Overhead Extension':      s(T.skull, F * 0.88),

    // ── Kettlebell ────────────────────────────────────────────────────
    'Kettlebell Swing':               s(T.kb_swing, F),
    'Kettlebell Clean':               s(T.kb_swing, F),
    'Kettlebell Press':               s(T.kb_press, F),
    'Kettlebell Row':                 s(T.kb_swing, F * 0.95),
    'Kettlebell Snatch':              s(T.kb_snatch, F),
    'Turkish Get Up':                 s(T.tgu, F),

    // ── Bodyweight Push ───────────────────────────────────────────────
    'Push Up':                        sBW(T.push_up, F),
    'Wide Push Up':                   sBW(T.push_up, F),
    'Diamond Push Up':                sBW(T.push_up, F),
    'Close Grip Push Up':             sBW(T.push_up, F),
    'Decline Push Up':                sBW(T.push_up, F),
    'Incline Push Up':                sBW(T.push_up, F),
    'Pike Push Up':                   sBW(T.push_up, F),
    'Handstand Push Up':              sBW(T.hspu, F),
    'Archer Push Up':                 sBW(T.push_up, F),
    'Planche Push Up':                sBW(T.push_up, F),
    'Ring Push Up':                   sBW(T.push_up, F),
    'Dips':                           sBW(T.dips_bw, F),
    'Ring Dips':                      sBW(T.dips_bw, F),
    'Bench Dips':                     sBW(T.dips_bw, F),
    'Back Lever':                     sBW(T.pullup_bw, F),

    // ── Bodyweight Pull ───────────────────────────────────────────────
    'Pull Ups':                       sBW(T.pullup_bw, F),
    'Chin Ups':                       sBW(T.pullup_bw, F),
    'Neutral Grip Pull Up':           sBW(T.pullup_bw, F),
    'Wide Grip Pull Up':              sBW(T.pullup_bw, F),
    'Inverted Row':                   sBW(T.pullup_bw, F),
    'Ring Row':                       sBW(T.pullup_bw, F),
    'Muscle Up':                      sBW(T.muscle_up, F),
    'Ring Muscle Up':                 sBW(T.muscle_up, F),
    'Archer Pull Up':                 sBW(T.pullup_bw, F),
    'Typewriter Pull Up':             sBW(T.pullup_bw, F),
    'Commando Pull Up':               sBW(T.pullup_bw, F),
    'Front Lever':                    sBW(T.pullup_bw, F),

    // ── Bodyweight Legs ───────────────────────────────────────────────
    'Jump Squat':                     sBW(T.bw_squat, F),
    'Pistol Squat':                   sBW(T.bw_squat, F),
    'Box Jump':                       sBW(T.bw_squat, F),
    'Step Up':                        sBW(T.bw_squat, F),
    'Sissy Squat':                    sBW(T.bw_squat, F),
    'Reverse Nordic Curl':            sBW(T.bw_squat, F),
    'Cossack Squat':                  sBW(T.bw_squat, F),
    'Nordic Curl':                    sBW(T.nordic, F),
    'Glute Bridge':                   sBW(T.bw_hip, F),
    'Single Leg Glute Bridge':        sBW(T.bw_hip, F),
    'Hip Thrust':                     sBW(T.bw_hip, F),
    'Good Morning (Bodyweight)':      sBW(T.bw_core, F),

    // ── Core ──────────────────────────────────────────────────────────
    'Plank':                          sBW(T.bw_core, F),
    'Side Plank':                     sBW(T.bw_core, F),
    'Hollow Body Hold':               sBW(T.bw_core, F),
    'L-Sit':                          sBW(T.bw_core, F),
    'Hanging Leg Raise':              sBW(T.bw_core, F),
    'Hanging Knee Raise':             sBW(T.bw_core, F),
    'Toes to Bar':                    sBW(T.bw_core, F),
    'Ab Rollout':                     sBW(T.bw_rollout, F),
    'Cable Crunch':                   s(T.cable_crunch, F),
    'Dragon Flag':                    sBW(T.bw_core, F),
    'V-Up':                           sBW(T.bw_core, F),
    'Crunch':                         sBW(T.bw_core, F),
    'Bicycle Crunch':                 sBW(T.bw_core, F),
    'Leg Raise':                      sBW(T.bw_core, F),
    'Russian Twist':                  sBW(T.bw_core, F),
    'Burpee':                         sBW(T.bw_core, F),
    'Mountain Climber':               sBW(T.bw_core, F),
    'Dead Bug':                       sBW(T.bw_core, F),
    'Copenhagen Plank':               sBW(T.bw_core, F),
    'Superman Hold':                  sBW(T.bw_core, F),
    'Barbell Rollout':                s(T.ab_rollout, F),
  },
}

export function expandAnchors(anchors) {
  const thresholds = []
  for (let i = 0; i < 9; i++) {
    const low = anchors[i]
    const step = (anchors[i + 1] - low) / 3
    thresholds.push(Math.round(low * 1000) / 1000)
    thresholds.push(Math.round((low + step) * 1000) / 1000)
    thresholds.push(Math.round((low + step * 2) * 1000) / 1000)
  }
  return thresholds
}

export function getTierIdx(ratio, thresholds) {
  let idx = 0
  for (let i = 0; i < thresholds.length; i++) {
    if (ratio >= thresholds[i]) idx = i
  }
  return idx
}

export function getProgress(ratio, thresholds, tierIdx) {
  if (tierIdx >= TIERS.length - 1) return 100
  const low = thresholds[tierIdx]
  const high = thresholds[tierIdx + 1]
  return Math.min(100, Math.max(0, Math.round(((ratio - low) / (high - low)) * 100)))
}

// Inverse of calculateORM: weight needed at `reps` to hit `targetOrm`
export function weightForOrm(targetOrm, reps) {
  if (reps === 1) return targetOrm
  const factor = (36 / (37 - reps) + 1 + reps / 30) / 2
  return Math.round((targetOrm / factor) * 2) / 2
}
