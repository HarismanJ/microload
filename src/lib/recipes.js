// Recipe persistence + adapters between the editor's in-memory ingredient entries,
// the JSONB stored on public.recipes, and the food shape that the diary logger expects.
import { supabase } from './supabase'
import { getCached, setCached, invalidateCache } from './cache'
import {
  RECIPE_NUMERIC_FIELDS,
  numberOrZero,
  getIngredientMultiplier,
  buildScaledNutrients,
  computePerServingNutrition,
} from './recipeMath'

const RECIPES_CACHE_TTL_MS = 5 * 60 * 1000
const recipesCacheKey = userId => `recipes:${userId}`

// Editor entry → lean stored record: the ingredient food's identity, its scaling basis
// (serving_size/unit + per-serving nutrients), and the chosen amount. Scaled values are
// always recomputed from this, never persisted stale.
export function serializeIngredient(entry) {
  const food = entry?.food || {}
  const stored = {
    food_id: food.id ?? null,
    name: String(food.name || '').slice(0, 120),
    brand: food.brand ? String(food.brand).slice(0, 80) : null,
    serving_size: numberOrZero(food.serving_size),
    serving_unit: String(food.serving_unit || 'g'),
    amountMode: entry?.amountMode === 'direct' ? 'direct' : 'servings',
    amount: numberOrZero(entry?.amount),
    amountUnit: entry?.amountUnit || 'g',
    servings: numberOrZero(entry?.servings) || 1,
  }
  for (const key of RECIPE_NUMERIC_FIELDS) {
    stored[key] = numberOrZero(food[key])
  }
  return stored
}

// Stored record → editor-ready entry, recomputing multiplier + scaled nutrients.
export function hydrateIngredient(stored, index = 0) {
  const food = {
    id: stored?.food_id ?? null,
    name: stored?.name || '',
    brand: stored?.brand || null,
    serving_size: numberOrZero(stored?.serving_size),
    serving_unit: stored?.serving_unit || 'g',
  }
  for (const key of RECIPE_NUMERIC_FIELDS) {
    food[key] = numberOrZero(stored?.[key])
  }
  const amountMode = stored?.amountMode === 'direct' ? 'direct' : 'servings'
  const multiplier = getIngredientMultiplier(food, amountMode, stored?.amount, stored?.servings)
  return {
    id: `${stored?.food_id ?? 'ing'}:${index}`,
    food,
    amountMode,
    amount: amountMode === 'direct' ? numberOrZero(stored?.amount) : 0,
    amountUnit: stored?.amountUnit || 'g',
    servings: numberOrZero(stored?.servings) || 1,
    multiplier,
    nutrients: buildScaledNutrients(food, multiplier),
  }
}

export function hydrateRecipeIngredients(recipe) {
  const list = Array.isArray(recipe?.ingredients) ? recipe.ingredients : []
  return list.map((stored, index) => hydrateIngredient(stored, index))
}

// Editor state → the row written to public.recipes (used for both insert and update).
export function buildRecipePayload(userId, form, ingredients = []) {
  const servings = Math.max(0.01, numberOrZero(form?.servings) || 1)
  const perServing = computePerServingNutrition(ingredients, servings)
  const payload = {
    user_id: userId,
    name: String(form?.name || '').trim(),
    servings,
    ingredients: ingredients.map(serializeIngredient),
  }
  for (const key of RECIPE_NUMERIC_FIELDS) {
    payload[key] = numberOrZero(perServing[key])
  }
  return payload
}

// Recipe row → a food-shaped object so it flows through addLog(food, servings) unchanged.
// food_id stays null (a recipe id is not a foods id); the per-serving snapshot is carried through.
export function recipeToLoggableFood(recipe) {
  const food = {
    id: null,
    recipe_id: recipe?.id ?? null,
    name: recipe?.name || 'Recipe',
    brand: null,
    serving_size: 1,
    serving_unit: 'serving',
    isRecipe: true,
  }
  for (const key of RECIPE_NUMERIC_FIELDS) {
    food[key] = numberOrZero(recipe?.[key])
  }
  return food
}

export async function listRecipes(userId) {
  if (!userId) return []
  const cacheKey = recipesCacheKey(userId)
  const cached = getCached(cacheKey)
  if (cached) return cached

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(200)
  if (error) throw error

  const recipes = data || []
  setCached(cacheKey, recipes, RECIPES_CACHE_TTL_MS)
  return recipes
}

export async function createRecipe(payload) {
  const { data, error } = await supabase
    .from('recipes')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  if (payload?.user_id) invalidateCache(recipesCacheKey(payload.user_id))
  return data
}

export async function updateRecipe(id, userId, patch) {
  const { data, error } = await supabase
    .from('recipes')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  if (userId) invalidateCache(recipesCacheKey(userId))
  return data
}

export async function deleteRecipe(id, userId) {
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', id)
  if (error) throw error
  if (userId) invalidateCache(recipesCacheKey(userId))
}
