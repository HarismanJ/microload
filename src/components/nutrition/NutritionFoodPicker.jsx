import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react'
import { push as pushBack, remove as removeBack } from '../../lib/backStack'
import { showRewardedAd } from '../../lib/admob'
import { isPremiumSync, refreshPremiumStatus } from '../../lib/purchases'
import Paywall from '../Paywall'
import { supabase } from '../../lib/supabase'
import { getCached, invalidateCache, setCached } from '../../lib/cache'
import { useCurrentUserId } from '../../context/UserContext'
import {
  EMPTY_FOOD_FORM,
  foodFromFormValues,
  foodToFormValues,
  getFoodFormError,
  buildFoodPayload,
} from '../../lib/foodEditor'
import { VALIDATION_LIMITS, validateNumber } from '../../lib/inputValidation'
import { searchUsdaFoods } from '../../lib/usdaFoods'
import { searchOffFoods } from '../../lib/offFoods'
import { getScansRemaining, incrementScanCount } from '../../lib/scanQuota'
import {
  buildFoodSearchKey,
  matchesStoredFood,
  mergeFoodSearchResults,
  normalizeSearchValue,
} from '../../lib/foodSearch'
import CreateFood from './CreateFood'
import FoodEditorFields from './FoodEditorFields'
import LoadingSpinner from '../LoadingSpinner'

const BarcodeScanner = lazy(() => import('./BarcodeScanner'))
const USDA_SEARCH_CACHE_TTL_MS = 10 * 60 * 1000
const USER_FOODS_CACHE_TTL_MS = 5 * 60 * 1000
const OFF_FALLBACK_THRESHOLD = 8
const OFF_SEARCH_CACHE_TTL_MS = 10 * 60 * 1000

export default function NutritionFoodPicker({
  onAdd,
  onClose,
  heading,
  submitLabel,
}) {
  const userId = useCurrentUserId()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [recent, setRecent] = useState([])
  const [selected, setSelected] = useState(null)
  const [editingSelectedFood, setEditingSelectedFood] = useState(false)
  const [selectedFoodForm, setSelectedFoodForm] = useState(EMPTY_FOOD_FORM)
  const [selectedFoodError, setSelectedFoodError] = useState('')
  const [amountMode, setAmountMode] = useState('grams')
  const [grams, setGrams] = useState('')
  const [servings, setServings] = useState('1')
  const [searching, setSearching] = useState(false)
  const [searchFailed, setSearchFailed] = useState(false)
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [creating, setCreating] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanKey, setScanKey] = useState(0)
  const [scanAdLoading, setScanAdLoading] = useState(false)
  const [scanAdPrompt, setScanAdPrompt] = useState(false)
  const [scanAdStuck, setScanAdStuck] = useState(false)
  const [showScanPaywall, setShowScanPaywall] = useState(false)
  const [pendingScanPaywall, setPendingScanPaywall] = useState(false)
  const [adding, setAdding] = useState(false)
  const searchTimer = useRef()
  const scanAdStateRef = useRef(null)
  const localFoodsRef = useRef([])

  const showScanPaywallAfterRender = useCallback(() => {
    const show = () => setShowScanPaywall(true)
    if (typeof requestAnimationFrame !== 'function') {
      setTimeout(show, 0)
      return
    }
    requestAnimationFrame(() => requestAnimationFrame(show))
  }, [])

  const handleScanPress = useCallback(() => {
    if (isPremiumSync()) {
      setScanning(true)
      return
    }
    if (getScansRemaining() === 0) {
      showScanPaywallAfterRender()
      return
    }
    setScanAdPrompt(true)
  }, [showScanPaywallAfterRender])

  const handleScanAdConfirm = useCallback(async () => {
    if (scanAdLoading) return
    setScanAdPrompt(false)
    setScanAdLoading(true)
    setScanAdStuck(false)

    const state = { done: false, stuckTimerId: null }
    state.stuckTimerId = setTimeout(() => setScanAdStuck(true), 20_000)
    scanAdStateRef.current = state

    let rewarded = false
    try {
      rewarded = await showRewardedAd()
    } catch {
      // showRewardedAd() already returns false on failure, but guard defensively
    }

    if (!state.done) {
      state.done = true
      clearTimeout(state.stuckTimerId)
      scanAdStateRef.current = null
      setScanAdLoading(false)
      setScanAdStuck(false)
      if (rewarded) {
        incrementScanCount()
        setPendingScanPaywall(true)
        setScanning(true)
      } else {
        showScanPaywallAfterRender()
      }
    }
  }, [showScanPaywallAfterRender, scanAdLoading])

  const handleScanAdContinue = useCallback(() => {
    const state = scanAdStateRef.current
    if (!state || state.done) return
    state.done = true
    clearTimeout(state.stuckTimerId)
    scanAdStateRef.current = null
    setScanAdLoading(false)
    setScanAdStuck(false)
    showScanPaywallAfterRender()  // user didn't watch the ad — fall back to paywall
  }, [showScanPaywallAfterRender])

  const handleScannerReviewReady = useCallback(() => {
    if (!pendingScanPaywall) return
    setPendingScanPaywall(false)
    showScanPaywallAfterRender()
  }, [pendingScanPaywall, showScanPaywallAfterRender])

  const scanPaywall = showScanPaywall ? (
    <Paywall
      onClose={() => setShowScanPaywall(false)}
      onPurchaseSuccess={() => { refreshPremiumStatus() }}
    />
  ) : null

  const pickerTitle = heading || 'Add Food'
  const pickerSubmitLabel = submitLabel || 'Add to Log'

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

  const loadRecent = useCallback(async (isCancelled) => {
    if (!userId) {
      if (!isCancelled()) setLoadingRecent(false)
      return
    }
    if (isCancelled()) return
    const cacheKey = `recent_foods:${userId}`
    const cached = getCached(cacheKey)
    if (cached) {
      setRecent(cached)
      setLoadingRecent(false)
      return
    }

    const { data, error: recentError } = await supabase
      .from('nutrition_logs')
      .select('food_id, food_name, foods(id, name, brand, serving_size, serving_unit, calories, protein, carbs, fat, fiber, sugar, saturated_fat, sodium, potassium, cholesterol, calcium, iron, vitamin_a, vitamin_c, vitamin_d, magnesium, zinc, folate, vitamin_b12, vitamin_b6)')
      .eq('user_id', userId)
      .not('food_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30)
    if (isCancelled()) return
    if (recentError) {
      setLoadingRecent(false)
      return
    }
    const seen = new Set()
    const unique = (data || []).filter(r => {
      if (!r.foods || seen.has(r.food_id)) return false
      seen.add(r.food_id)
      return true
    }).map(r => r.foods)
    const recent = unique.slice(0, 10)
    setCached(cacheKey, recent, 5 * 60 * 1000)
    setRecent(recent)
    setLoadingRecent(false)
  }, [userId])

  useEffect(() => {
    setLoadingRecent(true)
    let cancelled = false
    const isCancelled = () => cancelled
    const timer = setTimeout(() => { loadRecent(isCancelled) }, 0)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [loadRecent])

  // Prevent stale timer + state updates if the component unmounts mid-ad flow.
  useEffect(() => {
    return () => {
      const state = scanAdStateRef.current
      if (state) {
        state.done = true
        clearTimeout(state.stuckTimerId)
        scanAdStateRef.current = null
      }
    }
  }, [])

  // Scroll to top whenever the active view changes
  useEffect(() => {
    document.querySelector('.content')?.scrollTo(0, 0)
  }, [selected, editingSelectedFood, creating, scanning])

  useEffect(() => {
    if (!scanning) return
    const id = pushBack(() => {
      setPendingScanPaywall(false)
      setScanning(false)
    })
    return () => removeBack(id)
  }, [scanning])

  // Load local foods once on mount (and when userId changes).
  // Cleared immediately on userId change so a new user never sees stale data.
  useEffect(() => {
    if (!userId) { localFoodsRef.current = []; return }
    let cancelled = false
    localFoodsRef.current = []
    loadUserFoods(userId)
      .then(foods => { if (!cancelled) localFoodsRef.current = foods })
      .catch(() => {})
    return () => { cancelled = true }
  }, [userId])

  // Re-read local foods after any save that invalidates the cache.
  const refreshLocalFoods = useCallback(() => {
    if (!userId) return
    loadUserFoods(userId)
      .then(foods => { localFoodsRef.current = foods })
      .catch(() => {})
  }, [userId])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    let cancelled = false
    const controller = new AbortController()
    let statusTimer

    if (!userId) {
      statusTimer = setTimeout(() => { setResults([]); setSearching(false) }, 0)
      return () => clearTimeout(statusTimer)
    }
    if (!search.trim()) {
      statusTimer = setTimeout(() => { setResults([]); setSearching(false) }, 0)
      return () => clearTimeout(statusTimer)
    }

    // Win #1 — instant cache display.
    // If the USDA cache is warm, render immediately (no 300ms wait).
    // Three sub-cases:
    //   a) USDA is full (≥ threshold): show and return early — no OFI needed.
    //   b) USDA sparse + OFF also cached: merge both, show and return early.
    //   c) USDA sparse + OFF not cached: show USDA now, then silently fetch OFI
    //      in the background without showing the search spinner again.
    const normalized = normalizeSearchValue(search)
    const usdaCacheKey = `usda_food_search:${normalized}`
    const cachedUsda = getCached(usdaCacheKey)
    if (cachedUsda) {
      const offCacheKey = `off_food_search:${normalized}`
      const cachedOff = cachedUsda.length < OFF_FALLBACK_THRESHOLD
        ? getCached(offCacheKey)
        : null
      const remote = cachedOff ? [...cachedUsda, ...cachedOff] : cachedUsda
      setSearchFailed(false)
      setResults(mergeFoodSearchResults(localFoodsRef.current, remote, search).slice(0, 30))
      setSearching(false)

      // Cases a & b — fully cached, nothing left to fetch
      if (cachedUsda.length >= OFF_FALLBACK_THRESHOLD || cachedOff) return () => {}

      // Case c — USDA sparse, OFF not cached: silently fetch OFI and update results
      searchTimer.current = setTimeout(async () => {
        if (cancelled) return
        const offFoods = await searchOffFoods(search, { signal: controller.signal, pageSize: 20 }).catch(() => [])
        if (!cancelled && offFoods.length > 0) {
          setCached(offCacheKey, offFoods, OFF_SEARCH_CACHE_TTL_MS, { bucket: 'search' })
          setResults(mergeFoodSearchResults(localFoodsRef.current, [...cachedUsda, ...offFoods], search).slice(0, 30))
        }
      }, 300)
      return () => { cancelled = true; clearTimeout(searchTimer.current); controller.abort() }
    }

    statusTimer = setTimeout(() => { setSearching(true); setSearchFailed(false) }, 0)

    searchTimer.current = setTimeout(async () => {
      try {
        if (cancelled) return

        // Win #3 — show local matches instantly while the network request is in flight
        const localInstant = mergeFoodSearchResults(localFoodsRef.current, [], search)
        if (localInstant.length > 0 && !cancelled) setResults(localInstant.slice(0, 30))

        // Fetch USDA
        const usdaFoods = await searchUsdaFoods(search, { signal: controller.signal, pageSize: 25 })
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
            offFoods = await searchOffFoods(search, { signal: controller.signal, pageSize: 20 }).catch(() => [])
            if (offFoods.length > 0) setCached(offCacheKey, offFoods, OFF_SEARCH_CACHE_TTL_MS, { bucket: 'search' })
          }
        }

        if (cancelled) return
        setResults(mergeFoodSearchResults(localFoodsRef.current, [...usdaFoods, ...offFoods], search).slice(0, 30))
      } catch (error) {
        if (cancelled || error?.name === 'AbortError') return
        console.error('Food search failed:', error)
        setSearchFailed(true)
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
  }, [search, userId])

  function selectFood(food) {
    setSelected(food)
    setEditingSelectedFood(false)
    setSelectedFoodForm(foodToFormValues(food))
    setSelectedFoodError('')
    setServings('1')
    const servingSize = Number(food?.serving_size) || 0
    setGrams(servingSize > 0 ? String(servingSize) : '100')
    setAmountMode((food?.serving_unit || '').toLowerCase() === 'g' ? 'grams' : 'servings')
  }

  function updateSelectedFoodField(key, value) {
    setSelectedFoodForm(current => ({ ...current, [key]: value }))
    setSelectedFoodError('')
  }

  function openSelectedFoodEditor() {
    if (!selected) return
    setSelectedFoodForm(foodToFormValues(selected))
    setSelectedFoodError('')
    setEditingSelectedFood(true)
  }

  function saveSelectedFoodEdits() {
    if (!selected) return
    const formError = getFoodFormError(selectedFoodForm)
    if (formError) {
      setSelectedFoodError(formError)
      return
    }

    const currentForm = foodToFormValues(selected)
    const didChange = JSON.stringify(currentForm) !== JSON.stringify(selectedFoodForm)
    if (!didChange) {
      setEditingSelectedFood(false)
      return
    }

    setSelected(foodFromFormValues(selectedFoodForm, selected, { persistAsNew: true }))
    setEditingSelectedFood(false)
  }

  function getAmountMultiplier(food) {
    if (!food) return 0
    const servingSize = Number(food.serving_size) || 0
    if (amountMode === 'grams') {
      const gramValue = Number.parseFloat(grams)
      if (!Number.isFinite(gramValue) || gramValue <= 0 || servingSize <= 0) return 0
      return gramValue / servingSize
    }
    const servingsVal = Number.parseFloat(servings)
    return Number.isFinite(servingsVal) && servingsVal > 0 ? servingsVal : 0
  }

  async function ensureFoodRecord(food) {
    if (food?.id && !food?.persistAsNew) return food
    if (!userId) throw new Error('You need to be signed in to add foods.')

    if (!food?.persistAsNew) {
      const { data: existingRows, error: existingError } = await supabase
        .from('foods')
        .select('*')
        .eq('user_id', userId)
        .eq('name', String(food?.name || '').trim())
        .limit(20)

      if (!existingError) {
        const existingMatch = (existingRows || []).find(row => matchesStoredFood(row, food))
        if (existingMatch) return existingMatch
      }
    }

    const payload = buildFoodPayload(foodToFormValues(food), userId)

    const { data, error } = await supabase
      .from('foods')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    invalidateCache(`user_foods:${userId}`)
    refreshLocalFoods()
    return data
  }

  async function handleAdd() {
    const amountError = amountMode === 'grams'
      ? validateNumber(grams, { label: 'Grams', min: 0.01, max: VALIDATION_LIMITS.nutritionAmountMax, required: true, decimals: 2 })
      : validateNumber(servings, { label: 'Servings', min: 0.01, max: VALIDATION_LIMITS.nutritionAmountMax, required: true, decimals: 2 })
    if (amountError) {
      setSelectedFoodError(amountError)
      return
    }
    const amountMultiplier = getAmountMultiplier(selected)
    if (!selected || amountMultiplier <= 0 || adding) return

    setAdding(true)
    try {
      const storedFood = await ensureFoodRecord(selected)
      onAdd({ ...selected, ...storedFood, id: storedFood.id }, amountMultiplier)
    } catch (error) {
      console.error('Could not persist selected food before logging:', error)
      const fallbackFood = selected?.persistAsNew
        ? { ...selected, id: null }
        : selected
      onAdd(fallbackFood, amountMultiplier)
    }
  }

  if (creating) {
    return (
      <CreateFood
        onSave={food => { setCreating(false); selectFood(food); refreshLocalFoods() }}
        onBack={() => setCreating(false)}
      />
    )
  }

  if (scanning) {
    return (
      <>
      <Suspense fallback={<div className="nut-empty">Opening scanner...</div>}>
	        <BarcodeScanner
	          key={scanKey}
	          onSave={food => {
	            setScanning(false)
	            selectFood(food)
	            setAmountMode('servings')
	          }}
	          onBack={() => { setPendingScanPaywall(false); setScanning(false) }}
	          onRetry={() => setScanKey(k => k + 1)}
	          onReviewReady={handleScannerReviewReady}
	        />
      </Suspense>
      {scanPaywall}
      </>
    )
  }

  if (selected && editingSelectedFood) {
    return (
      <div className="nut-picker-screen">
        <div className="nut-picker-header">
          <button className="back-btn" onClick={() => { setEditingSelectedFood(false); setSelectedFoodError('') }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <span className="picker-title">Edit Nutrition</span>
        </div>
        <div className="bs-verify-note">
          Adjust the food details before adding it to your log. Your edited version will be saved as a custom food when you add it.
        </div>
        {selectedFoodError && <div className="bs-not-found-note">{selectedFoodError}</div>}
        <FoodEditorFields form={selectedFoodForm} onFieldChange={updateSelectedFoodField} />
        <button className="nut-add-to-log-btn" onClick={saveSelectedFoodEdits}>
          Save Changes
        </button>
      </div>
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
      calcium: Math.round((selected.calcium || 0) * m),
      iron: +((selected.iron || 0) * m).toFixed(1),
      magnesium: Math.round((selected.magnesium || 0) * m),
      zinc: +((selected.zinc || 0) * m).toFixed(1),
      vitamin_a: +((selected.vitamin_a || 0) * m).toFixed(1),
      vitamin_c: +((selected.vitamin_c || 0) * m).toFixed(1),
      vitamin_d: +((selected.vitamin_d || 0) * m).toFixed(1),
      vitamin_b6: +((selected.vitamin_b6 || 0) * m).toFixed(1),
      vitamin_b12: +((selected.vitamin_b12 || 0) * m).toFixed(1),
      folate: Math.round((selected.folate || 0) * m),
    }
    const micros = [
      { label: 'Fiber', val: n.fiber, unit: 'g', show: selected.fiber > 0 },
      { label: 'Sugar', val: n.sugar, unit: 'g', show: selected.sugar > 0 },
      { label: 'Saturated Fat', val: n.saturated_fat, unit: 'g', show: selected.saturated_fat > 0 },
      { label: 'Sodium', val: n.sodium, unit: 'mg', show: selected.sodium > 0 },
      { label: 'Potassium', val: n.potassium, unit: 'mg', show: selected.potassium > 0 },
      { label: 'Cholesterol', val: n.cholesterol, unit: 'mg', show: selected.cholesterol > 0 },
      { label: 'Calcium', val: n.calcium, unit: 'mg', show: selected.calcium > 0 },
      { label: 'Iron', val: n.iron, unit: 'mg', show: selected.iron > 0 },
      { label: 'Magnesium', val: n.magnesium, unit: 'mg', show: selected.magnesium > 0 },
      { label: 'Zinc', val: n.zinc, unit: 'mg', show: selected.zinc > 0 },
      { label: 'Vitamin A', val: n.vitamin_a, unit: 'mcg', show: selected.vitamin_a > 0 },
      { label: 'Vitamin C', val: n.vitamin_c, unit: 'mg', show: selected.vitamin_c > 0 },
      { label: 'Vitamin D', val: n.vitamin_d, unit: 'mcg', show: selected.vitamin_d > 0 },
      { label: 'Vitamin B6', val: n.vitamin_b6, unit: 'mg', show: selected.vitamin_b6 > 0 },
      { label: 'Vitamin B12', val: n.vitamin_b12, unit: 'mcg', show: selected.vitamin_b12 > 0 },
      { label: 'Folate', val: n.folate, unit: 'mcg', show: selected.folate > 0 },
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
                min="0.01"
                max={VALIDATION_LIMITS.nutritionAmountMax}
                step="0.01"
                inputMode="decimal"
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
              <button className="rtp-btn" onClick={() => setServings(s => {
                const n = Number.parseFloat(s)
                return String(Number.isFinite(n) ? Math.max(0.25, +Math.max(0.25, n - 0.25).toFixed(2)) : 0.25)
              })}>−</button>
              <input
                className="nut-serving-input"
                type="number"
                value={servings}
                min="0.01"
                max={VALIDATION_LIMITS.nutritionAmountMax}
                step="0.01"
                inputMode="decimal"
                onChange={e => setServings(e.target.value)}
                onBlur={e => {
                  const n = Number.parseFloat(e.target.value)
                  setServings(Number.isFinite(n) && n > 0 ? String(+Math.max(0.25, n).toFixed(2)) : '0.25')
                }}
              />
              <button className="rtp-btn" onClick={() => setServings(s => {
                const n = Number.parseFloat(s)
                return String(Number.isFinite(n) ? +(n + 0.25).toFixed(2) : 1)
              })}>+</button>
            </div>
          )}
          <div className="nut-serving-note">
            {amountMode === 'grams'
              ? `${grams || '0'}g selected`
              : `${servings} serving${Number.parseFloat(servings) === 1 ? '' : 's'} selected`}
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

        {selected.persistAsNew && (
          <div className="nut-edited-note">
            This edited version will be saved as a custom food when you add it.
          </div>
        )}
        {selectedFoodError && <div className="bs-not-found-note">{selectedFoodError}</div>}

        <div className="nut-detail-actions">
          <button className="nut-detail-edit-btn" onClick={openSelectedFoodEditor}>
            Edit Nutrition
          </button>
          <button className="nut-add-to-log-btn" onClick={handleAdd} disabled={adding} style={adding ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
            {pickerSubmitLabel}
          </button>
        </div>
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
        maxLength={VALIDATION_LIMITS.searchMaxLength}
        autoFocus
      />

      <button className="nut-scan-banner" onClick={handleScanPress} disabled={scanAdLoading}>
        <div className="nut-scan-banner-icon">
          {scanAdLoading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9V5a2 2 0 0 1 2-2h4"/><path d="M15 3h4a2 2 0 0 1 2 2v4"/>
              <path d="M21 15v4a2 2 0 0 1-2 2h-4"/><path d="M9 21H5a2 2 0 0 1-2-2v-4"/>
              <line x1="7" y1="12" x2="7" y2="12.01"/><line x1="10" y1="8" x2="10" y2="16"/>
              <line x1="13" y1="10" x2="13" y2="14"/><line x1="16" y1="8" x2="16" y2="16"/>
            </svg>
          )}
        </div>
        <div className="nut-scan-banner-text">
          <span className="nut-scan-banner-title">Scan Barcode</span>
          <span className="nut-scan-banner-sub">Watch a short ad to scan</span>
        </div>
        {!scanAdLoading && <svg className="nut-scan-banner-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>}
      </button>

      {showRecent && <div className="nut-list-label">Recent</div>}

      <div className="nut-search-list">
        {(searching || (showRecent && loadingRecent)) && <LoadingSpinner fullPage />}
        {!searching && !loadingRecent && list.length === 0 && (
          <div className="nut-empty">
            {searchFailed ? 'Search failed — please try again' : search.trim() ? 'No foods found — try creating one' : 'No recent foods'}
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

      {(scanAdPrompt || scanAdLoading) && (
        <div className="rest-done-overlay scan-ad-overlay">
          <div className="rest-done-modal scan-ad-modal">
            {scanAdLoading && (
              <div className="ad-gate-spinner-overlay">
                <LoadingSpinner size="md" />
                {scanAdStuck && (
                  <div className="ad-gate-stuck">
                    <p className="ad-gate-stuck-msg">Ad couldn&apos;t load. Check your connection.</p>
                    <button className="ad-gate-stuck-btn" onClick={handleScanAdContinue}>
                      Continue →
                    </button>
                  </div>
                )}
              </div>
            )}
            <div style={{ visibility: scanAdLoading ? 'hidden' : 'visible', display: 'contents' }}>
              <div className="rest-done-icon scan-ad-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9V5a2 2 0 0 1 2-2h4"/><path d="M15 3h4a2 2 0 0 1 2 2v4"/>
                  <path d="M21 15v4a2 2 0 0 1-2 2h-4"/><path d="M9 21H5a2 2 0 0 1-2-2v-4"/>
                  <line x1="10" y1="8" x2="10" y2="16"/><line x1="13" y1="10" x2="13" y2="14"/><line x1="16" y1="8" x2="16" y2="16"/>
                </svg>
              </div>
              <div className="rest-done-title">Scan Barcode</div>
              <div className="rest-done-body" style={{ textAlign: 'center', lineHeight: 1.5 }}>
                Watch a short ad to unlock the barcode scanner and instantly log any packaged food.
              </div>
              <div className="scan-ad-quota">
                {getScansRemaining()} scan{getScansRemaining() !== 1 ? 's' : ''} left today
              </div>
              <button className="rest-done-btn" onClick={handleScanAdConfirm} disabled={scanAdLoading}>
                {scanAdLoading ? <LoadingSpinner size="xs" color="currentColor" /> : 'Watch Ad & Scan'}
              </button>
              <button className="scan-ad-cancel-btn" onClick={() => setScanAdPrompt(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {scanPaywall}
    </div>
  )
}
