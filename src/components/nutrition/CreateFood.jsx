import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getCached, invalidateCache, setCached } from '../../lib/cache'
import { searchUsdaFoods } from '../../lib/usdaFoods'
import { buildFoodSearchKey, mergeFoodSearchResults, normalizeSearchValue } from '../../lib/foodSearch'

const UNITS = ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece', 'slice', 'scoop', 'bar', 'serving']
const USDA_SEARCH_CACHE_TTL_MS = 10 * 60 * 1000
const USER_FOODS_CACHE_TTL_MS = 5 * 60 * 1000

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
}

const initialRecipeForm = {
  name: '',
  servings: '1',
}

const RECIPE_NUMERIC_FIELDS = [
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'sugar',
  'saturated_fat',
  'sodium',
  'potassium',
  'cholesterol',
  'vitamin_a',
  'vitamin_c',
  'calcium',
  'iron',
]

const RECIPE_MICRO_ITEMS = [
  { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'sugar', label: 'Sugar', unit: 'g' },
  { key: 'saturated_fat', label: 'Saturated Fat', unit: 'g' },
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
  { key: 'potassium', label: 'Potassium', unit: 'mg' },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg' },
  { key: 'vitamin_a', label: 'Vitamin A', unit: 'mcg' },
  { key: 'vitamin_c', label: 'Vitamin C', unit: 'mg' },
  { key: 'calcium', label: 'Calcium', unit: 'mg' },
  { key: 'iron', label: 'Iron', unit: 'mg' },
]

function Field({ label, value, onChange, placeholder = '0', type = 'number', unit, required }) {
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
          min={type === 'number' ? '0' : undefined}
          step={type === 'number' ? 'any' : undefined}
        />
        {unit && <span className="cf-unit">{unit}</span>}
      </div>
    </div>
  )
}

function numberOrZero(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function roundNumber(value, decimals = 1) {
  const factor = 10 ** decimals
  return Math.round((numberOrZero(value) + Number.EPSILON) * factor) / factor
}

function supportsDirectAmount(food) {
  const unit = String(food?.serving_unit || '').trim().toLowerCase()
  return unit === 'g' || unit === 'ml'
}

function getDirectAmountUnit(food) {
  return String(food?.serving_unit || '').trim().toLowerCase() === 'ml' ? 'ml' : 'g'
}

function getIngredientDefaults(food) {
  if (supportsDirectAmount(food)) {
    const servingSize = numberOrZero(food?.serving_size) || 100
    return {
      amountMode: 'direct',
      amount: String(roundNumber(servingSize, 1)),
      servings: 1,
    }
  }

  return {
    amountMode: 'servings',
    amount: '',
    servings: 1,
  }
}

function getIngredientMultiplier(food, amountMode, amount, servings) {
  if (!food) return 0

  if (amountMode === 'direct') {
    const directAmount = Number.parseFloat(amount)
    const servingSize = numberOrZero(food?.serving_size)
    if (!Number.isFinite(directAmount) || directAmount <= 0 || servingSize <= 0) return 0
    return directAmount / servingSize
  }

  const servingCount = Number.parseFloat(servings)
  if (!Number.isFinite(servingCount) || servingCount <= 0) return 0
  return servingCount
}

function buildScaledNutrients(food, multiplier) {
  return {
    calories: Math.round(numberOrZero(food?.calories) * multiplier),
    protein: roundNumber(numberOrZero(food?.protein) * multiplier, 1),
    carbs: roundNumber(numberOrZero(food?.carbs) * multiplier, 1),
    fat: roundNumber(numberOrZero(food?.fat) * multiplier, 1),
    fiber: roundNumber(numberOrZero(food?.fiber) * multiplier, 1),
    sugar: roundNumber(numberOrZero(food?.sugar) * multiplier, 1),
    saturated_fat: roundNumber(numberOrZero(food?.saturated_fat) * multiplier, 1),
    sodium: Math.round(numberOrZero(food?.sodium) * multiplier),
    potassium: Math.round(numberOrZero(food?.potassium) * multiplier),
    cholesterol: Math.round(numberOrZero(food?.cholesterol) * multiplier),
    vitamin_a: Math.round(numberOrZero(food?.vitamin_a) * multiplier),
    vitamin_c: roundNumber(numberOrZero(food?.vitamin_c) * multiplier, 1),
    calcium: Math.round(numberOrZero(food?.calcium) * multiplier),
    iron: roundNumber(numberOrZero(food?.iron) * multiplier, 2),
  }
}

function formatIngredientAmount(entry) {
  if (entry.amountMode === 'direct') {
    return `${roundNumber(entry.amount, 1)}${entry.amountUnit}`
  }

  const servings = roundNumber(entry.servings, 2)
  return `${servings} serving${servings === 1 ? '' : 's'}`
}

function buildRecipePayload(userId, recipeForm, totalsPerServing) {
  return {
    user_id: userId,
    name: recipeForm.name.trim(),
    brand: null,
    serving_size: 1,
    serving_unit: 'serving',
    calories: numberOrZero(totalsPerServing.calories),
    protein: numberOrZero(totalsPerServing.protein),
    carbs: numberOrZero(totalsPerServing.carbs),
    fat: numberOrZero(totalsPerServing.fat),
    fiber: numberOrZero(totalsPerServing.fiber),
    sugar: numberOrZero(totalsPerServing.sugar),
    saturated_fat: numberOrZero(totalsPerServing.saturated_fat),
    sodium: numberOrZero(totalsPerServing.sodium),
    potassium: numberOrZero(totalsPerServing.potassium),
    cholesterol: numberOrZero(totalsPerServing.cholesterol),
    vitamin_a: numberOrZero(totalsPerServing.vitamin_a),
    vitamin_c: numberOrZero(totalsPerServing.vitamin_c),
    calcium: numberOrZero(totalsPerServing.calcium),
    iron: numberOrZero(totalsPerServing.iron),
  }
}

export default function CreateFood({ onSave, onBack }) {
  const [mode, setMode] = useState('food')
  const [form, setForm] = useState(initialForm)
  const [recipeForm, setRecipeForm] = useState(initialRecipeForm)
  const [recipeIngredients, setRecipeIngredients] = useState([])
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [ingredientResults, setIngredientResults] = useState([])
  const [ingredientRecent, setIngredientRecent] = useState([])
  const [ingredientCandidate, setIngredientCandidate] = useState(null)
  const [ingredientAmountMode, setIngredientAmountMode] = useState('servings')
  const [ingredientAmount, setIngredientAmount] = useState('')
  const [ingredientServings, setIngredientServings] = useState(1)
  const [localFoods, setLocalFoods] = useState([])
  const [userId, setUserId] = useState(null)
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

  const recipeTotals = useMemo(() => {
    return recipeIngredients.reduce((totals, ingredient) => {
      for (const key of RECIPE_NUMERIC_FIELDS) {
        totals[key] += numberOrZero(ingredient.nutrients[key])
      }
      return totals
    }, Object.fromEntries(RECIPE_NUMERIC_FIELDS.map(key => [key, 0])))
  }, [recipeIngredients])

  const recipePerServing = useMemo(() => {
    return RECIPE_NUMERIC_FIELDS.reduce((totals, key) => {
      const value = recipeTotals[key] / recipeYield
      if (['calories', 'sodium', 'potassium', 'cholesterol', 'vitamin_a', 'calcium'].includes(key)) {
        totals[key] = Math.round(value)
      } else if (key === 'iron') {
        totals[key] = roundNumber(value, 2)
      } else {
        totals[key] = roundNumber(value, 1)
      }
      return totals
    }, {})
  }, [recipeTotals, recipeYield])

  const manualValid = form.name.trim() && form.calories !== '' && form.serving_size !== ''
  const recipeValid = recipeForm.name.trim() && recipeIngredients.length > 0 && recipeYield > 0
  const valid = mode === 'recipe' ? recipeValid : manualValid
  const ingredientList = ingredientSearch.trim() ? ingredientResults : ingredientRecent

  useEffect(() => {
    setError('')
  }, [mode])

  useEffect(() => {
    if (mode !== 'recipe' || userId) return undefined

    let cancelled = false

    async function loadRecipeFoodSources() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      setUserId(user.id)
      const userFoodsCacheKey = `user_foods:${user.id}`
      const recentFoodsCacheKey = `recent_foods:${user.id}`
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
            .eq('user_id', user.id)
            .order('id', { ascending: false })
            .limit(200),
        cachedRecent
          ? Promise.resolve({ data: cachedRecent.map(food => ({ food_id: food?.id, foods: food })) })
          : supabase
            .from('nutrition_logs')
            .select('food_id, foods(*)')
            .eq('user_id', user.id)
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

    setSearchingIngredients(true)

    ingredientSearchTimer.current = setTimeout(async () => {
      const normalized = normalizeSearchValue(ingredientSearch)
      const usdaCacheKey = `usda_food_search:${normalized}`

      try {
        const remoteFoods = await (() => {
          const cachedUsda = getCached(usdaCacheKey)
          if (cachedUsda) return Promise.resolve(cachedUsda)

          return searchUsdaFoods(ingredientSearch, { signal: controller.signal, pageSize: 30 })
            .then(foods => {
              setCached(usdaCacheKey, foods, USDA_SEARCH_CACHE_TTL_MS)
              return foods
            })
        })()

        if (cancelled) return

        setIngredientResults(mergeFoodSearchResults(localFoods, remoteFoods, ingredientSearch).slice(0, 30))
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

  async function save() {
    if (!valid) {
      setError(mode === 'recipe' ? 'Recipe name and ingredients are required' : 'Name and calories are required')
      return
    }

    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      setError('You need to be signed in to save foods')
      return
    }

    const payload = mode === 'recipe'
      ? buildRecipePayload(user.id, recipeForm, recipePerServing)
      : {
        user_id: user.id,
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        serving_size: numberOrZero(form.serving_size) || 100,
        serving_unit: form.serving_unit,
        calories: numberOrZero(form.calories),
        protein: numberOrZero(form.protein),
        carbs: numberOrZero(form.carbs),
        fat: numberOrZero(form.fat),
        fiber: numberOrZero(form.fiber),
        sugar: numberOrZero(form.sugar),
        saturated_fat: numberOrZero(form.saturated_fat),
        sodium: numberOrZero(form.sodium),
        potassium: numberOrZero(form.potassium),
        cholesterol: numberOrZero(form.cholesterol),
        vitamin_a: numberOrZero(form.vitamin_a),
        vitamin_c: numberOrZero(form.vitamin_c),
        calcium: numberOrZero(form.calcium),
        iron: numberOrZero(form.iron),
      }

    const { data, error: saveError } = await supabase
      .from('foods')
      .insert(payload)
      .select()
      .single()

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    invalidateCache(`recent_foods:${user.id}`, `user_foods:${user.id}`)
    onSave(data)
  }

  return (
    <div className="cf-screen">
      <div className="nut-picker-header">
        <button className="back-btn" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h2 className="picker-title">Create Food</h2>
      </div>

      <div className="cf-mode-toggle" role="tablist" aria-label="Create mode">
        <button
          type="button"
          className={`cf-mode-toggle-btn ${mode === 'food' ? 'active' : ''}`}
          onClick={() => setMode('food')}
        >
          Single Food
        </button>
        <button
          type="button"
          className={`cf-mode-toggle-btn ${mode === 'recipe' ? 'active' : ''}`}
          onClick={() => setMode('recipe')}
        >
          Recipe
        </button>
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
            />
            <div className="cf-row">
              <Field
                label="Servings Made"
                value={recipeForm.servings}
                onChange={value => setRecipe('servings', value)}
                placeholder="1"
                unit="servings"
                required
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
            />

            {!ingredientSearch.trim() && ingredientRecent.length > 0 && (
              <div className="nut-list-label">Recent</div>
            )}

            <div className="cf-search-results">
              {searchingIngredients && <div className="nut-empty">Searching...</div>}
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
                      min="1"
                      step="1"
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
                      min="0.25"
                      step="0.25"
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
                      <button
                        type="button"
                        className="cf-remove-btn"
                        onClick={() => removeIngredient(ingredient.id)}
                      >
                        Remove
                      </button>
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
            <Field label="Name" value={form.name} onChange={value => set('name', value)} placeholder="e.g. Chicken Breast" type="text" required />
            <Field label="Brand" value={form.brand} onChange={value => set('brand', value)} placeholder="Optional" type="text" />
            <div className="cf-row">
              <Field label="Serving Size" value={form.serving_size} onChange={value => set('serving_size', value)} placeholder="100" required />
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
            <Field label="Calories" value={form.calories} onChange={value => set('calories', value)} unit="kcal" required />
            <div className="cf-row">
              <Field label="Protein" value={form.protein} onChange={value => set('protein', value)} unit="g" />
              <Field label="Carbs" value={form.carbs} onChange={value => set('carbs', value)} unit="g" />
              <Field label="Fat" value={form.fat} onChange={value => set('fat', value)} unit="g" />
            </div>
          </div>

          <button type="button" className="cf-toggle-micros" onClick={() => setShowFoodMicros(current => !current)}>
            {showFoodMicros ? '▾' : '▸'} Micronutrients <span className="cf-section-note">(optional)</span>
          </button>

          {showFoodMicros && (
            <div className="cf-section">
              <div className="cf-row">
                <Field label="Fiber" value={form.fiber} onChange={value => set('fiber', value)} unit="g" />
                <Field label="Sugar" value={form.sugar} onChange={value => set('sugar', value)} unit="g" />
              </div>
              <div className="cf-row">
                <Field label="Saturated Fat" value={form.saturated_fat} onChange={value => set('saturated_fat', value)} unit="g" />
                <Field label="Cholesterol" value={form.cholesterol} onChange={value => set('cholesterol', value)} unit="mg" />
              </div>
              <div className="cf-row">
                <Field label="Sodium" value={form.sodium} onChange={value => set('sodium', value)} unit="mg" />
                <Field label="Potassium" value={form.potassium} onChange={value => set('potassium', value)} unit="mg" />
              </div>
              <div className="cf-row">
                <Field label="Vitamin A" value={form.vitamin_a} onChange={value => set('vitamin_a', value)} unit="mcg" />
                <Field label="Vitamin C" value={form.vitamin_c} onChange={value => set('vitamin_c', value)} unit="mg" />
              </div>
              <div className="cf-row">
                <Field label="Calcium" value={form.calcium} onChange={value => set('calcium', value)} unit="mg" />
                <Field label="Iron" value={form.iron} onChange={value => set('iron', value)} unit="mg" />
              </div>
            </div>
          )}
        </>
      )}

      {error && <div className="cf-error">{error}</div>}

      <button className="nut-add-to-log-btn" onClick={save} disabled={saving || !valid}>
        {saving ? 'Saving...' : mode === 'recipe' ? 'Save Recipe' : 'Save Food'}
      </button>
    </div>
  )
}
