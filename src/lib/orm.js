export function calculateORM(weight, reps) {
  if (reps === 1) return weight
  const brzycki = weight * (36 / (37 - reps))
  const epley = weight * (1 + reps / 30)
  return Math.round((brzycki + epley) / 2 * 10) / 10
}