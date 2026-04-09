import { supabase } from './supabase'

export async function searchUsdaFoods(query, { signal, pageSize = 24 } = {}) {
  const trimmedQuery = String(query || '').trim()
  if (!trimmedQuery) return []

  const { data, error } = await supabase.functions.invoke('usda-food-search', {
    body: {
      query: trimmedQuery,
      pageSize,
    },
  })

  if (signal?.aborted) {
    const abortedError = new Error('USDA search aborted')
    abortedError.name = 'AbortError'
    throw abortedError
  }

  if (error) {
    throw new Error(error.message || 'USDA search failed')
  }

  return Array.isArray(data?.foods) ? data.foods : []
}
