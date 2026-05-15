import { normalizeSearchValue } from './exerciseSearch'

// Shared muscle workload buckets used by both the Home workload graph and plan generation.
export const MUSCLE_WORKLOAD_GROUPS = [
  { key: 'chest',          label: 'Chest',              muscles: ['Chest', 'Upper Chest', 'Lower Chest'],             chartMuscles: ['chest'],                          weeklyTargets: { strength: 5,  hypertrophy: 10, endurance: 16 } },
  { key: 'front-deltoids', label: 'Shoulders',           muscles: ['Front Delts', 'Lateral Delts', 'Rear Delts', 'Shoulders'], chartMuscles: ['front-deltoids', 'back-deltoids'], weeklyTargets: { strength: 4,  hypertrophy: 14, endurance: 18 } },
  { key: 'biceps',         label: 'Biceps',              muscles: ['Biceps'],                                          chartMuscles: ['biceps'],                         weeklyTargets: { strength: 4,  hypertrophy: 12, endurance: 16 } },
  { key: 'triceps',        label: 'Triceps',             muscles: ['Triceps'],                                         chartMuscles: ['triceps'],                        weeklyTargets: { strength: 5,  hypertrophy: 10, endurance: 14 } },
  { key: 'forearm',        label: 'Forearms',            muscles: ['Forearms'],                                        chartMuscles: ['forearm'],                        weeklyTargets: { strength: 3,  hypertrophy: 8,  endurance: 12 } },
  { key: 'abs',            label: 'Abs/Core',            muscles: ['Abs', 'Core'],                                     chartMuscles: ['abs'],                            weeklyTargets: { strength: 4,  hypertrophy: 12, endurance: 20 } },
  { key: 'obliques',       label: 'Obliques',            muscles: ['Obliques', 'Core'],                                chartMuscles: ['obliques'],                       weeklyTargets: { strength: 3,  hypertrophy: 8,  endurance: 12 } },
  { key: 'quadriceps',     label: 'Quads',               muscles: ['Quads', 'Hip Flexors'],                            chartMuscles: ['quadriceps'],                     weeklyTargets: { strength: 5,  hypertrophy: 12, endurance: 16 } },
  { key: 'adductor',       label: 'Adductors',           muscles: ['Adductors'],                                       chartMuscles: ['adductor'],                       weeklyTargets: { strength: 3,  hypertrophy: 8,  endurance: 10 } },
  { key: 'abductors',      label: 'Abductors',           muscles: ['Abductors'],                                       chartMuscles: ['abductors'],                      weeklyTargets: { strength: 3,  hypertrophy: 8,  endurance: 10 } },
  { key: 'calves',         label: 'Calves',              muscles: ['Calves', 'Shins'],                                 chartMuscles: ['calves'],                         weeklyTargets: { strength: 4,  hypertrophy: 12, endurance: 18 } },
  { key: 'gluteal',        label: 'Glutes',              muscles: ['Glutes'],                                          chartMuscles: ['gluteal'],                        weeklyTargets: { strength: 5,  hypertrophy: 8,  endurance: 14 } },
  { key: 'hamstring',      label: 'Hamstrings',          muscles: ['Hamstrings'],                                      chartMuscles: ['hamstring'],                      weeklyTargets: { strength: 5,  hypertrophy: 10, endurance: 14 } },
  { key: 'lower-back',     label: 'Lower Back',          muscles: ['Lower Back'],                                      chartMuscles: ['lower-back'],                     weeklyTargets: { strength: 3,  hypertrophy: 6,  endurance: 10 } },
  { key: 'trapezius',      label: 'Traps',               muscles: ['Traps'],                                           chartMuscles: ['trapezius'],                      weeklyTargets: { strength: 4,  hypertrophy: 12, endurance: 16 } },
  { key: 'upper-back',     label: 'Upper/Middle Back',   muscles: ['Upper Back', 'Lats', 'Rhomboids'],                 chartMuscles: ['upper-back'],                     weeklyTargets: { strength: 5,  hypertrophy: 14, endurance: 18 } },
  { key: 'neck',           label: 'Neck',                muscles: ['Neck'],                                            chartMuscles: ['neck'],                           weeklyTargets: { strength: 2,  hypertrophy: 6,  endurance: 10 } },
]

const WORKLOAD_GROUPS_BY_MUSCLE = MUSCLE_WORKLOAD_GROUPS.reduce((map, group) => {
  group.muscles.forEach(muscle => {
    const key = normalizeSearchValue(muscle)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(group)
  })
  return map
}, new Map())

export function getMuscleWorkloadGroupsForName(muscle) {
  const value = normalizeSearchValue(muscle)
  if (!value) return []
  const exact = WORKLOAD_GROUPS_BY_MUSCLE.get(value)
  if (exact?.length) return exact
  return MUSCLE_WORKLOAD_GROUPS.filter(group => {
    const label = normalizeSearchValue(group.label)
    return value.includes(label) || group.muscles.some(name => value.includes(normalizeSearchValue(name)))
  })
}
