const LIMIT = 5
const key = () => `liftlog:scanCount:${new Date().toISOString().slice(0, 10)}`

export const getScansRemaining = () => Math.max(0, LIMIT - Number(localStorage.getItem(key()) || 0))
export const incrementScanCount = () => localStorage.setItem(key(), Number(localStorage.getItem(key()) || 0) + 1)
