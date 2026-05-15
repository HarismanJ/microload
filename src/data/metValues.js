// MET values from the Compendium of Physical Activities (Ainsworth et al.)
// Used for per-set calorie estimation in cardio exercises.
export const CARDIO_MET = {
  'Running':           9.8,
  'Jogging':           7.0,
  'Walking':           3.5,
  'Hiking':            5.3,
  'Trail Running':     9.0,
  'Sprinting':        14.0,
  'Cycling':           8.0,
  'Jump Rope':        11.8,
  'Jumping Jacks':     7.7,
  'Burpees':           8.0,
  'Mountain Climbers': 8.0,
  'High Knees':        7.0,
  'Swimming':          6.0,
  'HIIT':              8.0,
  'Tabata':            8.0,
  'Circuit Training':  8.0,
  'Shadow Boxing':     7.8,
  'Boxing':            9.8,
  'Kickboxing':        9.0,
  'Dance Cardio':      6.5,
  'Aerobics':          6.5,
  'Zumba':             5.5,
  'Step Aerobics':     7.5,
  'Treadmill':         8.0,
  'Stationary Bike':   6.8,
  'Spin Bike':        10.0,
  'Rowing Machine':    7.0,
  'Elliptical':        5.0,
  'Stair Climber':     9.0,
  'Assault Bike':     11.0,
  'Ski Erg':           8.0,
  'Versa Climber':    11.0,
  'Battle Ropes':     10.0,
}

// Relative caloric cost per muscle group, normalised to Biceps = 1.0.
// Derived from published segment-mass data (De Leva 1996; Winter 1990) combined
// with fibre-type modifiers (Type II > Type I energy cost per gram).
// Secondary muscles are weighted at 0.5× — synergists do roughly half the work
// of primary movers.
const MUSCLE_MASS_WEIGHT = {
  'Quads':         4.2,
  'Glutes':        3.8,
  'Hamstrings':    3.0,
  'Adductors':     2.2,
  'Lats':          2.0,
  'Upper Back':    1.9,
  'Chest':         1.8,
  'Traps':         1.8,
  'Lower Back':    1.7,
  'Calves':        1.5,  // large mass but ~80% Type I (soleus) — lower energy/gram
  'Upper Chest':   1.5,
  'Core':          1.4,  // ~60% Type I postural fibres
  'Triceps':       1.4,
  'Lower Chest':   1.4,
  'Forearms':      1.3,
  'Obliques':      1.1,
  'Biceps':        1.0,  // baseline
  'Abductors':     0.9,
  'Rhomboids':     0.8,
  'Front Delts':   0.5,
  'Lateral Delts': 0.5,
  'Rear Delts':    0.5,
  'Neck':          0.4,
}
const FALLBACK_MUSCLE_WEIGHT = 1.0

// Returns a whole-session strength MET for the exercise (rest time included),
// calibrated to the Compendium of Physical Activities resistance-training range
// (3.5–6.0 MET).
//
// Weighted score = Σ(primary weights) + 0.5 × Σ(secondary weights).
// MET is mapped via a saturation curve so it scales continuously rather than
// jumping between three tiers:
//   score ≈ 1  (bicep curl)   → MET ≈ 3.75
//   score ≈ 3  (bench press)  → MET ≈ 4.5
//   score ≈ 11 (squat)        → MET ≈ 5.4
//   score ≈ 13 (deadlift)     → MET ≈ 5.4
export function getMuscleCountMET(exercise) {
  const primary   = exercise.primary_muscles   || []
  const secondary = exercise.secondary_muscles || []

  const score =
    primary.reduce((s, m) => s + (MUSCLE_MASS_WEIGHT[m] ?? FALLBACK_MUSCLE_WEIGHT), 0) +
    secondary.reduce((s, m) => s + 0.5 * (MUSCLE_MASS_WEIGHT[m] ?? FALLBACK_MUSCLE_WEIGHT), 0)

  if (score === 0) return 4.0   // no muscle data — use generic strength MET

  // Michaelis–Menten saturation: asymptotes toward 6.0; k=3 calibrated to Compendium
  return Math.min(6.0, 3.0 + (score / (score + 3)) * 3.0)
}
