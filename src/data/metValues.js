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

// Returns the strength MET tier based on total muscle involvement.
// These are whole-session METs (rest time included) from the Compendium,
// so they must be applied to total session duration, not per-set time.
export function getMuscleCountMET(exercise) {
  const total = (exercise.primary_muscles?.length || 0) + (exercise.secondary_muscles?.length || 0)
  if (total >= 5) return 5.5  // compound: squat, deadlift, clean…
  if (total >= 3) return 4.5  // moderate: bench, row, OHP…
  return 3.5                  // isolation: curl, lateral raise…
}
