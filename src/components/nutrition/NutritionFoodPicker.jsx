import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { getCached, invalidateCache, setCached } from '../../lib/cache'
import { searchUsdaFoods } from '../../lib/usdaFoods'
import {
  buildFoodSearchKey,
  matchesStoredFood,
  mergeFoodSearchResults,
  normalizeSearchValue,
} from '../../lib/foodSearch'
import CreateFood from './CreateFood'

const BarcodeScanner = lazy(() => import('./BarcodeScanner'))
const USDA_SEARCH_CACHE_TTL_MS = 10 * 60 * 1000
const USER_FOODS_CACHE_TTL_MS = 5 * 60 * 1000

export default function NutritionFoodPicker({
  mealType = 'snacks',
  onAdd,
  onClose,
  heading,
  submitLabel,
}) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [recent, setRecent] = useState([])
  const [selected, setSelected] = useState(null)
  const [amountMode, setAmountMode] = useState('grams')
  const [grams, setGrams] = useState('')
  const [servings, setServings] = useState(1)
  const [searching, setSearching] = useState(false)
  const [creating, setCreating] = useState(false)
  const [scanning, setScanning] = useState(false)
  const searchTimer = useRef()

  const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1)
  const pickerTitle = heading || `Add to ${mealLabel}`
  const pickerSubmitLabel = submitLabel || `Add to ${mealLabel}`

  async function loadUserFoods(userId) {
    const cacheKey = `user_foods:${userId}`
    const cached = getCached(cacheKey)
    if (cached) return cached

    const { data, error } = await supabase
      .from('foods')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: false })
      .limit(200)

    if (error) throw error

    const foods = data || []
    setCached(cacheKey, foods, USER_FOODS_CACHE_TTL_MS)
    return foods
  }

  async function loadRecent() {
    const { data: { user } } = await supabase.auth.getUser()
    const cacheKey = `recent_foods:${user.id}`
    const cached = getCached(cacheKey)
    if (cached) {
      setRecent(cached)
      return
    }

    const { data } = await supabase
      .from('nutrition_logs')
      .select('food_id, food_name, foods(id, name, brand, serving_size, serving_unit, calories, protein, carbs, fat, fiber, sugar, saturated_fat, sodium, potassium, cholesterol)')
      .eq('user_id', user.id)
      .not('food_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30)
    const seen = new Set()
    const unique = (data || []).filter(r => {
      if (!r.foods || seen.has(r.food_id)) return false
      seen.add(r.food_id)
      return true
    }).map(r => r.foods)
    const recent = unique.slice(0, 10)
    setCached(cacheKey, recent, 5 * 60 * 1000)
    setRecent(recent)
  }

  useEffect(() => {
    const timer = setTimeout(() => { loadRecent() }, 0)
    return () => clearTimeout(timer)
  }, [])

  // Scroll to top whenever the active view changes
  useEffect(() => {
    document.querySelector('.content')?.scrollTo(0, 0)
  }, [selected, creating, scanning])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    let cancelled = false
    const controller = new AbortController()
    let statusTimer
    if (!search.trim()) {
      statusTimer = setTimeout(() => {
        setResults([])
        setSearching(false)
      }, 0)
      return () => clearTimeout(statusTimer)
    }
    statusTimer = setTimeout(() => {
      setSearching(true)
    }, 0)
    searchTimer.current = setTimeout(async () => {
      const normalized = normalizeSearchValue(search)
      const usdaCacheKey = `usda_food_search:${normalized}`

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (!cancelled) setResults([])
          return
        }

        const [localFoods, usdaFoods] = await Promise.all([
          loadUserFoods(user.id),
          (() => {
            const cachedUsda = getCached(usdaCacheKey)
            if (cachedUsda) return Promise.resolve(cachedUsda)

            return searchUsdaFoods(search, { signal: controller.signal, pageSize: 30 })
              .then(foods => {
                setCached(usdaCacheKey, foods, USDA_SEARCH_CACHE_TTL_MS)
                return foods
              })
          })(),
        ])

        if (cancelled) return

        setResults(mergeFoodSearchResults(localFoods, usdaFoods, search).slice(0, 30))
      } catch (error) {
        if (cancelled || error?.name === 'AbortError') return
        console.error('Food search failed:', error)
        setResults([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(statusTimer)
      clearTimeout(searchTimer.current)
      controller.abort()
    }
  }, [search])

  function selectFood(food) {
    setSelected(food)
    setServings(1)
    const servingSize = Number(food?.serving_size) || 0
    setGrams(servingSize > 0 ? String(servingSize) : '100')
    setAmountMode((food?.serving_unit || '').toLowerCase() === 'g' ? 'grams' : 'servings')
  }

  function getAmountMultiplier(food) {
    if (!food) return 0
    const servingSize = Number(food.serving_size) || 0
    if (amountMode === 'grams') {
      const gramValue = Number.parseFloat(grams)
      if (!Number.isFinite(gramValue) || gramValue <= 0 || servingSize <= 0) return 0
      return gramValue / servingSize
    }
    return servings > 0 ? servings : 0
  }

  async function ensureFoodRecord(food) {
    if (food?.id) return food

    const { data: { user } } = await supabase.auth.getUser()
    const { data: existingRows, error: existingError } = await supabase
      .from('foods')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', String(food?.name || '').trim())
      .limit(20)

    if (!existingError) {
      const existingMatch = (existingRows || []).find(row => matchesStoredFood(row, food))
      if (existingMatch) return existingMatch
    }

    const payload = {
      user_id: user.id,
      name: String(food?.name || '').trim(),
      brand: String(food?.brand || '').trim() || null,
      serving_size: Number(food?.serving_size) || 100,
      serving_unit: String(food?.serving_unit || 'g').trim() || 'g',
      calories: Number(food?.calories) || 0,
      protein: Number(food?.protein) || 0,
      carbs: Number(food?.carbs) || 0,
      fat: Number(food?.fat) || 0,
      fiber: Number(food?.fiber) || 0,
      sugar: Number(food?.sugar) || 0,
      saturated_fat: Number(food?.saturated_fat) || 0,
      sodium: Number(food?.sodium) || 0,
      potassium: Number(food?.potassium) || 0,
      cholesterol: Number(food?.cholesterol) || 0,
      calcium: Number(food?.calcium) || 0,
      iron: Number(food?.iron) || 0,
      vitamin_a: Number(food?.vitamin_a) || 0,
      vitamin_c: Number(food?.vitamin_c) || 0,
    }

    const { data, error } = await supabase
      .from('foods')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    invalidateCache(`user_foods:${user.id}`)
    return data
  }

  async function handleAdd() {
    const amountMultiplier = getAmountMultiplier(selected)
    if (!selected || amountMultiplier <= 0) return

    try {
      const storedFood = await ensureFoodRecord(selected)
      onAdd({ ...selected, ...storedFood, id: storedFood.id }, amountMultiplier, mealType)
    } catch (error) {
      console.error('Could not persist selected food before logging:', error)
      onAdd(selected, amountMultiplier, mealType)
    }
  }

  if (creating) {
    return (
      <CreateFood
        onSave={food => { setCreating(false); selectFood(food) }}
        onBack={() => setCreating(false)}
      />
    )
  }

  if (scanning) {
    return (
      <Suspense fallback={<div className="nut-empty">Opening scanner...</div>}>
        <BarcodeScanner
          onSave={food => { setScanning(false); selectFood(food) }}
          onBack={() => setScanning(false)}
        />
      </Suspense>
    )
  }

  // Food detail view
  if (selected) {
    const m = getAmountMultiplier(selected)
    const n = {
      calories: Math.round(selected.calories * m),
      protein: +((selected.protein || 0) * m).toFixed(1),
      carbs: +((selected.carbs || 0) * m).toFixed(1),
      fat: +((selected.fat || 0) * m).toFixed(1),
      fiber: +((selected.fiber || 0) * m).toFixed(1),
      sugar: +((selected.sugar || 0) * m).toFixed(1),
      saturated_fat: +((selected.saturated_fat || 0) * m).toFixed(1),
      sodium: Math.round((selected.sodium || 0) * m),
      potassium: Math.round((selected.potassium || 0) * m),
      cholesterol: Math.round((selected.cholesterol || 0) * m),
    }
    const micros = [
      { label: 'Fiber', val: n.fiber, unit: 'g', show: selected.fiber > 0 },
      { label: 'Sugar', val: n.sugar, unit: 'g', show: selected.sugar > 0 },
      { label: 'Saturated Fat', val: n.saturated_fat, unit: 'g', show: selected.saturated_fat > 0 },
      { label: 'Sodium', val: n.sodium, unit: 'mg', show: selected.sodium > 0 },
      { label: 'Potassium', val: n.potassium, unit: 'mg', show: selected.potassium > 0 },
      { label: 'Cholesterol', val: n.cholesterol, unit: 'mg', show: selected.cholesterol > 0 },
    ].filter(x => x.show)

    return (
      <div className="nut-picker-screen">
        <div className="nut-picker-header">
          <button className="back-btn" onClick={() => setSelected(null)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div>
            <div className="picker-title">{selected.name}</div>
            {selected.brand && <div className="nut-detail-brand">{selected.brand}</div>}
          </div>
        </div>

        <div className="nut-serving-card">
          <div className="nut-serving-label">Amount <span className="nut-serving-note">· 1 serving = {selected.serving_size}{selected.serving_unit}</span></div>
          <div className="nut-amount-toggle" role="tablist" aria-label="Food amount mode">
            <button
              type="button"
              className={`nut-amount-toggle-btn ${amountMode === 'grams' ? 'active' : ''}`}
              onClick={() => setAmountMode('grams')}
            >
              Grams
            </button>
            <button
              type="button"
              className={`nut-amount-toggle-btn ${amountMode === 'servings' ? 'active' : ''}`}
              onClick={() => setAmountMode('servings')}
            >
              Servings
            </button>
          </div>
          {amountMode === 'grams' ? (
            <div className="nut-serving-row">
              <button
                className="rtp-btn"
                onClick={() => setGrams(current => {
                  const numeric = Number.parseFloat(current)
                  const next = Number.isFinite(numeric) ? Math.max(1, Math.round((numeric - 10) * 10) / 10) : 1
                  return String(next)
                })}
              >
                −
              </button>
              <input
                className="nut-serving-input"
                type="number"
                value={grams}
                min="1"
                step="1"
                onChange={e => setGrams(e.target.value)}
              />
              <button
                className="rtp-btn"
                onClick={() => setGrams(current => {
                  const numeric = Number.parseFloat(current)
                  const next = Number.isFinite(numeric) ? Math.round((numeric + 10) * 10) / 10 : (Number(selected.serving_size) || 100)
                  return String(next)
                })}
              >
                +
              </button>
            </div>
          ) : (
            <div className="nut-serving-row">
              <button className="rtp-btn" onClick={() => setServings(s => Math.max(0.25, +(s - 0.25).toFixed(2)))}>−</button>
              <input
                className="nut-serving-input"
                type="number"
                value={servings}
                min="0.25"
                step="0.25"
                onChange={e => setServings(Math.max(0.25, +e.target.value))}
              />
              <button className="rtp-btn" onClick={() => setServings(s => +(s + 0.25).toFixed(2))}>+</button>
            </div>
          )}
          <div className="nut-serving-note">
            {amountMode === 'grams'
              ? `${grams || '0'}g selected`
              : `${servings} serving${servings === 1 ? '' : 's'} selected`}
          </div>
        </div>

        <div className="nut-preview-card">
          <div className="nut-preview-cal">{n.calories} <span>kcal</span></div>
          <div className="nut-preview-macros">
            <div className="nut-preview-macro" style={{ '--mc': '#a855f7' }}>
              <span>{n.protein}g</span><span>Protein</span>
            </div>
            <div className="nut-preview-macro" style={{ '--mc': '#f97316' }}>
              <span>{n.carbs}g</span><span>Carbs</span>
            </div>
            <div className="nut-preview-macro" style={{ '--mc': '#eab308' }}>
              <span>{n.fat}g</span><span>Fat</span>
            </div>
          </div>
        </div>

        {micros.length > 0 && (
          <div className="nut-micros-card">
            <div className="nut-micros-title">More Nutrition</div>
            {micros.map(mi => (
              <div key={mi.label} className="nut-micro-row">
                <span>{mi.label}</span>
                <span>{mi.val}{mi.unit}</span>
              </div>
            ))}
          </div>
        )}

        <button className="nut-add-to-log-btn" onClick={handleAdd}>
          {pickerSubmitLabel}
        </button>
      </div>
    )
  }

  // Search / recent view
  const list = search.trim() ? results : recent
  const showRecent = !search.trim()

  return (
    <div className="nut-picker-screen">
      <div className="nut-picker-header">
        <button className="back-btn" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h2 className="picker-title">{pickerTitle}</h2>
        <button className="nut-create-food-btn" onClick={() => setCreating(true)} title="Create food">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>

      <input
        className="picker-search"
        type="text"
        placeholder="Search foods..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        autoFocus
      />

      <button className="nut-scan-banner" onClick={() => setScanning(true)}>
        <div className="nut-scan-banner-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9V5a2 2 0 0 1 2-2h4"/><path d="M15 3h4a2 2 0 0 1 2 2v4"/>
            <path d="M21 15v4a2 2 0 0 1-2 2h-4"/><path d="M9 21H5a2 2 0 0 1-2-2v-4"/>
            <line x1="7" y1="12" x2="7" y2="12.01"/><line x1="10" y1="8" x2="10" y2="16"/>
            <line x1="13" y1="10" x2="13" y2="14"/><line x1="16" y1="8" x2="16" y2="16"/>
          </svg>
        </div>
        <div className="nut-scan-banner-text">
          <span className="nut-scan-banner-title">Scan Barcode</span>
          <span className="nut-scan-banner-sub">Instantly log any packaged food</span>
        </div>
        <svg className="nut-scan-banner-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>

      {showRecent && <div className="nut-list-label">Recent</div>}

      <div className="nut-search-list">
        {searching && <div className="nut-empty">Searching...</div>}
        {!searching && list.length === 0 && (
          <div className="nut-empty">
            {search.trim() ? 'No foods found — try creating one' : 'No recent foods'}
          </div>
        )}
        {list.map(food => (
          <div key={food.id ?? food.remoteKey ?? buildFoodSearchKey(food)} className="nut-search-item" onClick={() => selectFood(food)}>
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
    </div>
  )
}
