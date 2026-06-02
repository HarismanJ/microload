import { useEffect, useMemo, useRef, useState } from 'react'
import LoadingSpinner from '../LoadingSpinner'
import { supabase } from '../../lib/supabase'
import { getCached, invalidateCache, setCached } from '../../lib/cache'
import { useCurrentUserId } from '../../context/UserContext'
import { searchUsdaFoods } from '../../lib/usdaFoods'
import { searchOffFoods } from '../../lib/offFoods'
import { buildFoodSearchKey, mergeFoodSearchResults, normalizeSearchValue } from '../../lib/foodSearch'
import { NUTRITION_FIELD_LIMITS, VALIDATION_LIMITS, validateLength, validateNumber, validateNutritionForm } from '../../lib/inputValidation'
import { buildFoodPayload } from '../../lib/foodEditor'
import {
  RECIPE_MICRO_ITEMS,
  numberOrZero,
  roundNumber,
  supportsDirectAmount,
  getDirectAmountUnit,
  getIngredientDefaults,
  getIngredientMultiplier,
  buildScaledNutrients,
  formatIngredientAmount,
  sumRecipeTotals,
  perServingTotals,
} from '../../lib/recipeMath'
import { buildRecipePayload, createRecipe, updateRecipe, hydrateRecipeIngredients } from '../../lib/recipes'

const UNITS = ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece', 'slice', 'scoop', 'bar', 'serving']
const USDA_SEARCH_CACHE_TTL_MS = 10 * 60 * 1000
const USER_FOODS_CACHE_TTL_MS = 5 * 60 * 1000
const OFF_FALLBACK_THRESHOLD = 8
const OFF_SEARCH_CACHE_TTL_MS = 10 * 60 * 1000

const initialForm = {
  name: '',
  brand: '',
  serving_size: '100',
  serving_unit: 'g',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  sugar: '',
  saturated_fat: '',
  sodium: '',
  potassium: '',
  cholesterol: '',
  vitamin_a: '',
  vitamin_c: '',
  calcium: '',
  iron: '',
  vitamin_d: '',
  magnesium: '',
  zinc: '',
  folate: '',
  vitamin_b12: '',
  vitamin_b6: '',
}

const initialRecipeForm = {
  name: '',
  servings: '1',
}

function Field({ label, value, onChange, placeholder = '0', type = 'number', unit, required, maxLength, rules }) {
  return (
    <div className="cf-field">
      <label className="cf-label">
        {label}
        {required && <span className="cf-required"> *</span>}
      </label>
      <div className="cf-input-wrap">
        <input
          className="cf-input"
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          min={type === 'number' ? (rules?.min ?? 0) : undefined}
          max={type === 'number' ? rules?.max : undefined}
          step={type === 'number' ? (rules?.decimals === 0 ? 1 : 0.01) : undefined}
          inputMode={type === 'number' ? 'decimal' : undefined}
          maxLength={type === 'number' ? undefined : maxLength}
        />
        {unit && <span className="cf-unit">{unit}</span>}
      </div>
    </div>
  )
}

export default function CreateFood({ onSave, onBack, recipe = null, initialMode = 'food' }) {
  const userId = useCurrentUserId()
  const editingRecipe = Boolean(recipe?.id)
  const [mode] = useState(recipe ? 'recipe' : (initialMode === 'recipe' ? 'recipe' : 'food'))
  const [form, setForm] = useState(initialForm)
  const [recipeForm, setRecipeForm] = useState(() => (recipe
    ? { name: recipe.name || '', servings: String(recipe.servings ?? '1') }
    : initialRecipeForm))
  const [recipeIngredients, setRecipeIngredients] = useState(() => (recipe ? hydrateRecipeIngredients(recipe) : []))
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [ingredientResults, setIngredientResults] = useState([])
  const [ingredientRecent, setIngredientRecent] = useState([])
  const [ingredientCandidate, setIngredientCandidate] = useState(null)
  const [ingredientAmountMode, setIngredientAmountMode] = useState('servings')
  const [ingredientAmount, setIngredientAmount] = useState('')
  const [ingredientServings, setIngredientServings] = useState(1)
  const [localFoods, setLocalFoods] = useState([])
  const [saving, setSaving] = useState(false)
  const [searchingIngredients, setSearchingIngredients] = useState(false)
  const [error, setError] = useState('')
  const [showFoodMicros, setShowFoodMicros] = useState(false)
  const [showRecipeMicros, setShowRecipeMicros] = useState(false)
  const ingredientSearchTimer = useRef()

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const setRecipe = (key, value) => setRecipeForm(current => ({ ...current, [key]: value }))

  const recipeYield = Math.max(1, Number.parseFloat(recipeForm.servings) || 1)
  const ingredientPreviewMultiplier = getIngredientMultiplier(
    ingredientCandidate,
    ingredientAmountMode,
    ingredientAmount,
    ingredientServings
  )
  const ingredientPreview = ingredientCandidate
    ? buildScaledNutrients(ingredientCandidate, ingredientPreviewMultiplier)
    : null

  const recipeTotals = useMemo(() => sumRecipeTotals(recipeIngredients), [recipeIngredients])
  const recipePerServing = useMemo(() => perServingTotals(recipeTotals, recipeYield), [recipeTotals, recipeYield])

  const manualValid = form.name.trim() && form.calories !== '' && form.serving_size !== ''
  const recipeValid = recipeForm.name.trim() && recipeIngredients.length > 0 && !validateNumber(recipeForm.servings, {
    label: 'Servings made', min: 0.01, max: VALIDATION_LIMITS.nutritionAmountMax, required: true, decimals: 2,
  })
  const valid = mode === 'recipe' ? recipeValid : manualValid
  const ingredientList = ingredientSearch.trim() ? ingredientResults : ingredientRecent

  useEffect(() => {
    setError('')
  }, [mode])

  useEffect(() => {
    if (mode !== 'recipe' || !userId) return undefined

    let cancelled = false

    async function loadRecipeFoodSources() {
      if (cancelled) return
      const userFoodsCacheKey = `user_foods:${userId}`
      const recentFoodsCacheKey = `recent_foods:${userId}`
      const cachedFoods = getCached(userFoodsCacheKey)
      const cachedRecent = getCached(recentFoodsCacheKey)

      if (cachedFoods) setLocalFoods(cachedFoods)
      if (cachedRecent) setIngredientRecent(cachedRecent)
      if (cachedFoods && cachedRecent) return

      const [foodsResponse, recentResponse] = await Promise.all([
        cachedFoods
          ? Promise.resolve({ data: cachedFoods })
          : supabase
            .from('foods')
            .select('*')
            .eq('user_id', userId)
            .order('id', { ascending: false })
            .limit(200),
        cachedRecent
          ? Promise.resolve({ data: cachedRecent.map(food => ({ food_id: food?.id, foods: food })) })
          : supabase
            .from('nutrition_logs')
            .select('food_id, foods(*)')
            .eq('user_id', userId)
            .not('food_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(40),
      ])

      if (cancelled) return

      const foods = foodsResponse.data || []
      const recentRows = recentResponse.data || []
      const recentSeen = new Set()
      const recentFoods = recentRows
        .filter(row => {
          if (!row?.foods || recentSeen.has(row.food_id)) return false
          recentSeen.add(row.food_id)
          return true
        })
        .map(row => row.foods)
        .slice(0, 10)

      setLocalFoods(foods)
      setIngredientRecent(recentFoods)
      setCached(userFoodsCacheKey, foods, USER_FOODS_CACHE_TTL_MS)
      setCached(recentFoodsCacheKey, recentFoods, 5 * 60 * 1000)
    }

    loadRecipeFoodSources().catch(loadError => {
      if (!cancelled) {
        console.error('Could not load recipe food sources:', loadError)
      }
    })

    return () => {
      cancelled = true
    }
  }, [mode, userId])

  useEffect(() => {
    if (mode !== 'recipe') return undefined

    clearTimeout(ingredientSearchTimer.current)
    let cancelled = false
    const controller = new AbortController()

    if (!ingredientSearch.trim()) {
      setIngredientResults([])
      setSearchingIngredients(false)
      return () => controller.abort()
    }

    // Win #1 — instant cache display.
    // Three sub-cases matching NutritionFoodPicker:
    //   a) USDA full (≥ threshold): show and return early.
    //   b) USDA sparse + OFF cached: merge, show and return early.
    //   c) USDA sparse + OFF not cached: show USDA now, silently fetch OFI in background.
    const normalized = normalizeSearchValue(ingredientSearch)
    const usdaCacheKey = `usda_food_search:${normalized}`
    const cachedUsda = getCached(usdaCacheKey)
    if (cachedUsda) {
      const offCacheKey = `off_food_search:${normalized}`
      const cachedOff = cachedUsda.length < OFF_FALLBACK_THRESHOLD
        ? getCached(offCacheKey)
        : null
      const remote = cachedOff ? [...cachedUsda, ...cachedOff] : cachedUsda
      setIngredientResults(mergeFoodSearchResults(localFoods, remote, ingredientSearch).slice(0, 30))
      setSearchingIngredients(false)

      // Cases a & b — fully cached, nothing left to fetch
      if (cachedUsda.length >= OFF_FALLBACK_THRESHOLD || cachedOff) return () => controller.abort()

      // Case c — USDA sparse, OFF not cached: silently fetch OFI and update results
      ingredientSearchTimer.current = setTimeout(async () => {
        if (cancelled) return
        const offFoods = await searchOffFoods(ingredientSearch, { signal: controller.signal, pageSize: 20 }).catch(() => [])
        if (!cancelled && offFoods.length > 0) {
          setCached(offCacheKey, offFoods, OFF_SEARCH_CACHE_TTL_MS, { bucket: 'search' })
          setIngredientResults(mergeFoodSearchResults(localFoods, [...cachedUsda, ...offFoods], ingredientSearch).slice(0, 30))
        }
      }, 300)
      return () => { cancelled = true; clearTimeout(ingredientSearchTimer.current); controller.abort() }
    }

    setSearchingIngredients(true)

    ingredientSearchTimer.current = setTimeout(async () => {
      try {
        // Fetch USDA
        const usdaFoods = await searchUsdaFoods(ingredientSearch, { signal: controller.signal, pageSize: 30 })
          .then(foods => {
            if (foods.length > 0) setCached(usdaCacheKey, foods, USDA_SEARCH_CACHE_TTL_MS, { bucket: 'search' })
            return foods
          })

        if (cancelled) return

        // OFI fallback — only fires when USDA is sparse
        let offFoods = []
        if (usdaFoods.length < OFF_FALLBACK_THRESHOLD) {
          const offCacheKey = `off_food_search:${normalized}`
          const cachedOff = getCached(offCacheKey)
          if (cachedOff) {
            offFoods = cachedOff
          } else {
            offFoods = await searchOffFoods(ingredientSearch, { signal: controller.signal, pageSize: 20 }).catch(() => [])
            if (offFoods.length > 0) setCached(offCacheKey, offFoods, OFF_SEARCH_CACHE_TTL_MS, { bucket: 'search' })
          }
        }

        if (cancelled) return
        setIngredientResults(mergeFoodSearchResults(localFoods, [...usdaFoods, ...offFoods], ingredientSearch).slice(0, 30))
      } catch (searchError) {
        if (!cancelled && searchError?.name !== 'AbortError') {
          console.error('Recipe ingredient search failed:', searchError)
          setIngredientResults([])
        }
      } finally {
        if (!cancelled) setSearchingIngredients(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(ingredientSearchTimer.current)
      controller.abort()
    }
  }, [ingredientSearch, localFoods, mode])

  function selectIngredient(food) {
    const defaults = getIngredientDefaults(food)
    setIngredientCandidate(food)
    setIngredientAmountMode(defaults.amountMode)
    setIngredientAmount(defaults.amount)
    setIngredientServings(defaults.servings)
    setError('')
  }

  function addIngredient() {
    const amountError = ingredientAmountMode === 'direct'
      ? validateNumber(ingredientAmount, { label: 'Ingredient amount', min: 0.01, max: VALIDATION_LIMITS.nutritionAmountMax, required: true, decimals: 2 })
      : validateNumber(ingredientServings, { label: 'Ingredient servings', min: 0.01, max: VALIDATION_LIMITS.nutritionAmountMax, required: true, decimals: 2 })
    if (amountError) {
      setError(amountError)
      return
    }
    const multiplier = getIngredientMultiplier(
      ingredientCandidate,
      ingredientAmountMode,
      ingredientAmount,
      ingredientServings
    )

    if (!ingredientCandidate || multiplier <= 0) {
      setError('Choose an ingredient and add a valid amount')
      return
    }

    const amountValue = ingredientAmountMode === 'direct' ? Number.parseFloat(ingredientAmount) : 0
    const directUnit = getDirectAmountUnit(ingredientCandidate)

    setRecipeIngredients(current => [
      ...current,
      {
        id: `${ingredientCandidate.id ?? ingredientCandidate.remoteKey ?? buildFoodSearchKey(ingredientCandidate)}:${Date.now()}`,
        food: ingredientCandidate,
        amountMode: ingredientAmountMode,
        amount: Number.isFinite(amountValue) ? amountValue : 0,
        amountUnit: directUnit,
        servings: Number.parseFloat(ingredientServings) || 1,
        multiplier,
        nutrients: buildScaledNutrients(ingredientCandidate, multiplier),
      },
    ])

    setIngredientSearch('')
    setIngredientResults([])
    setIngredientCandidate(null)
    setIngredientAmount('')
    setIngredientServings(1)
    setError('')
  }

  function removeIngredient(id) {
    setRecipeIngredients(current => current.filter(ingredient => ingredient.id !== id))
  }

  // Reopen an added ingredient in the builder pre-filled (replace-on-readd) so its
  // amount/serving size can be changed.
  function editIngredient(entry) {
    setIngredientCandidate(entry.food)
    setIngredientAmountMode(entry.amountMode)
    setIngredientAmount(entry.amountMode === 'direct' ? String(entry.amount) : '')
    setIngredientServings(entry.amountMode === 'direct' ? 1 : (entry.servings || 1))
    setRecipeIngredients(current => current.filter(item => item.id !== entry.id))
    setError('')
  }

  async function save() {
    const validationError = mode === 'recipe'
      ? validateRecipe()
      : validateNutritionForm(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')

    if (!userId) {
      setSaving(false)
      setError('You need to be signed in to save foods')
      return
    }

    try {
      if (mode === 'recipe') {
        const payload = buildRecipePayload(userId, recipeForm, recipeIngredients)
        const data = editingRecipe
          ? await updateRecipe(recipe.id, userId, payload)
          : await createRecipe(payload)
        onSave(data)
      } else {
        const payload = buildFoodPayload(form, userId)
        const { data, error: saveError } = await supabase
          .from('foods')
          .insert(payload)
          .select()
          .single()
        if (saveError) throw saveError
        invalidateCache(`recent_foods:${userId}`, `user_foods:${userId}`)
        onSave(data)
      }
    } catch (error) {
      setError(error?.message || 'Could not save this food. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  function validateRecipe() {
    const nameError = validateLength(recipeForm.name, {
      label: 'Recipe name',
      min: 1,
      max: VALIDATION_LIMITS.foodNameMaxLength,
      required: true,
    })
    if (nameError) return nameError
    const servingsError = validateNumber(recipeForm.servings, {
      label: 'Servings made',
      min: 0.01,
      max: VALIDATION_LIMITS.nutritionAmountMax,
      required: true,
      decimals: 2,
    })
    if (servingsError) return servingsError
    if (recipeIngredients.length === 0) return 'Add at least one ingredient.'
    return ''
  }

  return (
    <div className="cf-screen">
      <div className="nut-picker-header">
        <button className="back-btn" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h2 className="picker-title">{editingRecipe ? 'Edit Recipe' : mode === 'recipe' ? 'Create Recipe' : 'Create Food'}</h2>
      </div>

      {mode === 'recipe' ? (
        <>
          <div className="cf-section">
            <div className="cf-section-title">Recipe Info</div>
            <Field
              label="Recipe Name"
              value={recipeForm.name}
              onChange={value => setRecipe('name', value)}
              placeholder="e.g. Overnight Oats"
              type="text"
              required
              maxLength={VALIDATION_LIMITS.foodNameMaxLength}
            />
            <div className="cf-row">
              <Field
                label="Servings Made"
                value={recipeForm.servings}
                onChange={value => setRecipe('servings', value)}
                placeholder="1"
                unit="servings"
                required
                rules={{ min: 0.01, max: VALIDATION_LIMITS.nutritionAmountMax, decimals: 2 }}
              />
            </div>
          </div>

          <div className="cf-section">
            <div className="cf-section-title">Add Ingredients</div>
            <input
              className="picker-search"
              type="text"
              placeholder="Search foods to add..."
              value={ingredientSearch}
              onChange={e => setIngredientSearch(e.target.value)}
              maxLength={VALIDATION_LIMITS.searchMaxLength}
            />

            {!ingredientSearch.trim() && ingredientRecent.length > 0 && (
              <div className="nut-list-label">Recent</div>
            )}

            <div className="cf-search-results">
              {searchingIngredients && <div className="nut-empty"><LoadingSpinner size="sm" /></div>}
              {!searchingIngredients && ingredientList.length === 0 && (
                <div className="nut-empty">
                  {ingredientSearch.trim() ? 'No foods found' : 'Search to add ingredients'}
                </div>
              )}
              {ingredientList.map(food => (
                <div
                  key={food.id ?? food.remoteKey ?? buildFoodSearchKey(food)}
                  className={`nut-search-item ${ingredientCandidate === food ? 'selected' : ''}`}
                  onClick={() => selectIngredient(food)}
                >
                  <div className="nut-search-info">
                    <div className="nut-search-name">{food.name}</div>
                    {food.brand && <div className="nut-search-brand">{food.brand}</div>}
                    <div className="nut-search-macros">
                      P {(food.protein || 0).toFixed(0)}g · C {(food.carbs || 0).toFixed(0)}g · F {(food.fat || 0).toFixed(0)}g
                      <span className="nut-search-serving"> · per {food.serving_size}{food.serving_unit}</span>
                    </div>
                  </div>
                  <div className="nut-search-cal">{food.calories}<span> kcal</span></div>
                </div>
              ))}
            </div>

            {ingredientCandidate && (
              <div className="cf-ingredient-builder">
                <div className="cf-ingredient-header">
                  <div>
                    <div className="cf-ingredient-name">{ingredientCandidate.name}</div>
                    {ingredientCandidate.brand && <div className="cf-ingredient-brand">{ingredientCandidate.brand}</div>}
                  </div>
                  <div className="cf-ingredient-serving">
                    1 serving = {ingredientCandidate.serving_size}{ingredientCandidate.serving_unit}
                  </div>
                </div>

                <div className="cf-amount-toggle" role="tablist" aria-label="Ingredient amount mode">
                  {supportsDirectAmount(ingredientCandidate) && (
                    <button
                      type="button"
                      className={`cf-amount-toggle-btn ${ingredientAmountMode === 'direct' ? 'active' : ''}`}
                      onClick={() => setIngredientAmountMode('direct')}
                    >
                      {getDirectAmountUnit(ingredientCandidate)}
                    </button>
                  )}
                  <button
                    type="button"
                    className={`cf-amount-toggle-btn ${ingredientAmountMode === 'servings' ? 'active' : ''}`}
                    onClick={() => setIngredientAmountMode('servings')}
                  >
                    Servings
                  </button>
                </div>

                {ingredientAmountMode === 'direct' ? (
                  <div className="cf-amount-row">
                    <button
                      type="button"
                      className="rtp-btn"
                      onClick={() => setIngredientAmount(current => {
                        const numeric = Number.parseFloat(current)
                        const next = Number.isFinite(numeric) ? Math.max(1, roundNumber(numeric - 10, 1)) : 1
                        return String(next)
                      })}
                    >
                      −
                    </button>
                    <input
                      className="nut-serving-input"
                      type="number"
                      value={ingredientAmount}
                      min="0.01"
                      max={VALIDATION_LIMITS.nutritionAmountMax}
                      step="0.01"
                      inputMode="decimal"
                      onChange={e => setIngredientAmount(e.target.value)}
                    />
                    <button
                      type="button"
                      className="rtp-btn"
                      onClick={() => setIngredientAmount(current => {
                        const numeric = Number.parseFloat(current)
                        const next = Number.isFinite(numeric)
                          ? roundNumber(numeric + 10, 1)
                          : (numberOrZero(ingredientCandidate.serving_size) || 100)
                        return String(next)
                      })}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <div className="cf-amount-row">
                    <button
                      type="button"
                      className="rtp-btn"
                      onClick={() => setIngredientServings(current => Math.max(0.25, roundNumber(current - 0.25, 2)))}
                    >
                      −
                    </button>
                    <input
                      className="nut-serving-input"
                      type="number"
                      value={ingredientServings}
                      min="0.01"
                      max={VALIDATION_LIMITS.nutritionAmountMax}
                      step="0.01"
                      inputMode="decimal"
                      onChange={e => setIngredientServings(Math.max(0.25, Number.parseFloat(e.target.value) || 0.25))}
                    />
                    <button
                      type="button"
                      className="rtp-btn"
                      onClick={() => setIngredientServings(current => roundNumber(current + 0.25, 2))}
                    >
                      +
                    </button>
                  </div>
                )}

                {ingredientPreview && (
                  <div className="cf-ingredient-preview">
                    <div>{ingredientPreview.calories} kcal</div>
                    <div>P {ingredientPreview.protein}g</div>
                    <div>C {ingredientPreview.carbs}g</div>
                    <div>F {ingredientPreview.fat}g</div>
                  </div>
                )}

                <button type="button" className="nut-add-to-log-btn" onClick={addIngredient}>
                  Add Ingredient
                </button>
              </div>
            )}
          </div>

          <div className="cf-section">
            <div className="cf-section-title">Recipe Totals</div>
            {recipeIngredients.length === 0 ? (
              <div className="nut-empty">Add ingredients to build your recipe</div>
            ) : (
              <>
                <div className="cf-recipe-summary">
                  <div className="cf-summary-card">
                    <div className="cf-summary-label">Per Serving</div>
                    <div className="cf-summary-calories">{recipePerServing.calories}<span> kcal</span></div>
                    <div className="cf-summary-macros">
                      <span>P {recipePerServing.protein}g</span>
                      <span>C {recipePerServing.carbs}g</span>
                      <span>F {recipePerServing.fat}g</span>
                    </div>
                  </div>
                  <div className="cf-summary-card">
                    <div className="cf-summary-label">Whole Recipe</div>
                    <div className="cf-summary-calories">{Math.round(recipeTotals.calories)}<span> kcal</span></div>
                    <div className="cf-summary-macros">
                      <span>P {roundNumber(recipeTotals.protein, 1)}g</span>
                      <span>C {roundNumber(recipeTotals.carbs, 1)}g</span>
                      <span>F {roundNumber(recipeTotals.fat, 1)}g</span>
                    </div>
                  </div>
                </div>

                <div className="cf-recipe-list">
                  {recipeIngredients.map(ingredient => (
                    <div key={ingredient.id} className="cf-recipe-item">
                      <div className="cf-recipe-item-main">
                        <div className="cf-recipe-item-name">{ingredient.food.name}</div>
                        <div className="cf-recipe-item-meta">
                          {formatIngredientAmount(ingredient)} · {ingredient.nutrients.calories} kcal
                        </div>
                      </div>
                      <div className="cf-recipe-item-actions">
                        <button
                          type="button"
                          className="cf-edit-btn"
                          onClick={() => editIngredient(ingredient)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="cf-remove-btn"
                          onClick={() => removeIngredient(ingredient.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button type="button" className="cf-toggle-micros" onClick={() => setShowRecipeMicros(current => !current)}>
                  {showRecipeMicros ? '▾' : '▸'} More Nutrition <span className="cf-section-note">(per serving)</span>
                </button>

                {showRecipeMicros && (
                  <div className="cf-recipe-micros">
                    {RECIPE_MICRO_ITEMS
                      .filter(item => numberOrZero(recipePerServing[item.key]) > 0)
                      .map(item => (
                        <div key={item.key} className="cf-recipe-micro-row">
                          <span>{item.label}</span>
                          <span>{recipePerServing[item.key]}{item.unit}</span>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="cf-section">
            <div className="cf-section-title">Food Info</div>
            <Field label="Name" value={form.name} onChange={value => set('name', value)} placeholder="e.g. Chicken Breast" type="text" required maxLength={VALIDATION_LIMITS.foodNameMaxLength} />
            <Field label="Brand" value={form.brand} onChange={value => set('brand', value)} placeholder="Optional" type="text" maxLength={VALIDATION_LIMITS.foodBrandMaxLength} />
            <div className="cf-row">
              <Field label="Serving Size" value={form.serving_size} onChange={value => set('serving_size', value)} placeholder="100" required rules={NUTRITION_FIELD_LIMITS.serving_size} />
              <div className="cf-field">
                <label className="cf-label">Unit</label>
                <select className="cf-select" value={form.serving_unit} onChange={e => set('serving_unit', e.target.value)}>
                  {UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="cf-section">
            <div className="cf-section-title">Macros <span className="cf-section-note">per serving</span></div>
            <Field label="Calories" value={form.calories} onChange={value => set('calories', value)} unit="kcal" required rules={NUTRITION_FIELD_LIMITS.calories} />
            <div className="cf-row">
              <Field label="Protein" value={form.protein} onChange={value => set('protein', value)} unit="g" rules={NUTRITION_FIELD_LIMITS.protein} />
              <Field label="Carbs" value={form.carbs} onChange={value => set('carbs', value)} unit="g" rules={NUTRITION_FIELD_LIMITS.carbs} />
              <Field label="Fat" value={form.fat} onChange={value => set('fat', value)} unit="g" rules={NUTRITION_FIELD_LIMITS.fat} />
            </div>
          </div>

          <button type="button" className="cf-toggle-micros" onClick={() => setShowFoodMicros(current => !current)}>
            {showFoodMicros ? '▾' : '▸'} Micronutrients <span className="cf-section-note">(optional)</span>
          </button>

          {showFoodMicros && (
            <div className="cf-section">
              <div className="cf-row">
                <Field label="Fiber" value={form.fiber} onChange={value => set('fiber', value)} unit="g" rules={NUTRITION_FIELD_LIMITS.fiber} />
                <Field label="Sugar" value={form.sugar} onChange={value => set('sugar', value)} unit="g" rules={NUTRITION_FIELD_LIMITS.sugar} />
              </div>
              <div className="cf-row">
                <Field label="Saturated Fat" value={form.saturated_fat} onChange={value => set('saturated_fat', value)} unit="g" rules={NUTRITION_FIELD_LIMITS.saturated_fat} />
                <Field label="Cholesterol" value={form.cholesterol} onChange={value => set('cholesterol', value)} unit="mg" rules={NUTRITION_FIELD_LIMITS.cholesterol} />
              </div>
              <div className="cf-row">
                <Field label="Sodium" value={form.sodium} onChange={value => set('sodium', value)} unit="mg" rules={NUTRITION_FIELD_LIMITS.sodium} />
                <Field label="Potassium" value={form.potassium} onChange={value => set('potassium', value)} unit="mg" rules={NUTRITION_FIELD_LIMITS.potassium} />
              </div>
              <div className="cf-row">
                <Field label="Vitamin A" value={form.vitamin_a} onChange={value => set('vitamin_a', value)} unit="mcg" rules={NUTRITION_FIELD_LIMITS.vitamin_a} />
                <Field label="Vitamin C" value={form.vitamin_c} onChange={value => set('vitamin_c', value)} unit="mg" rules={NUTRITION_FIELD_LIMITS.vitamin_c} />
              </div>
              <div className="cf-row">
                <Field label="Calcium" value={form.calcium} onChange={value => set('calcium', value)} unit="mg" rules={NUTRITION_FIELD_LIMITS.calcium} />
                <Field label="Iron" value={form.iron} onChange={value => set('iron', value)} unit="mg" rules={NUTRITION_FIELD_LIMITS.iron} />
              </div>
              <div className="cf-row">
                <Field label="Vitamin D" value={form.vitamin_d} onChange={value => set('vitamin_d', value)} unit="mcg" rules={NUTRITION_FIELD_LIMITS.vitamin_d} />
                <Field label="Magnesium" value={form.magnesium} onChange={value => set('magnesium', value)} unit="mg" rules={NUTRITION_FIELD_LIMITS.magnesium} />
              </div>
              <div className="cf-row">
                <Field label="Zinc" value={form.zinc} onChange={value => set('zinc', value)} unit="mg" rules={NUTRITION_FIELD_LIMITS.zinc} />
                <Field label="Folate" value={form.folate} onChange={value => set('folate', value)} unit="mcg" rules={NUTRITION_FIELD_LIMITS.folate} />
              </div>
              <div className="cf-row">
                <Field label="Vitamin B12" value={form.vitamin_b12} onChange={value => set('vitamin_b12', value)} unit="mcg" rules={NUTRITION_FIELD_LIMITS.vitamin_b12} />
                <Field label="Vitamin B6" value={form.vitamin_b6} onChange={value => set('vitamin_b6', value)} unit="mg" rules={NUTRITION_FIELD_LIMITS.vitamin_b6} />
              </div>
            </div>
          )}
        </>
      )}

      {error && <div className="cf-error">{error}</div>}

      <button className="nut-add-to-log-btn" onClick={save} disabled={saving || !valid}>
        {saving ? <LoadingSpinner size="xs" color="currentColor" /> : editingRecipe ? 'Save Changes' : mode === 'recipe' ? 'Save Recipe' : 'Save Food'}
      </button>
    </div>
  )
}
