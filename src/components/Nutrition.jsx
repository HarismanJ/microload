import { useState, useEffect, useMemo, useEffectEvent } from 'react'
import { supabase } from '../lib/supabase'
import { getCached, setCached, invalidateCache } from '../lib/cache'
import { useCurrentUserId } from '../context/UserContext'
import NutritionFoodPicker from './nutrition/NutritionFoodPicker'
import LoadingSpinner from './LoadingSpinner'
import { NUTRITION_FIELD_LIMITS, validateNumber } from '../lib/inputValidation'
import { fmtCompact } from '../lib/liftMath'
import '../styles/Nutrition.css'

const FEED_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'calories', label: 'Kcal' },
  { id: 'protein', label: 'Protein' },
  { id: 'fat', label: 'Fat' },
  { id: 'carbs', label: 'Carbs' },
]

const DEFAULT_GOALS = {
  calories: 2000, protein: 150, carbs: 200, fat: 65,
  fiber: 30, sugar: 50, saturated_fat: 20,
  sodium: 2300, potassium: 3500, cholesterol: 300,
  calcium: 1000, iron: 18, magnesium: 400, zinc: 11,
  vitamin_a: 900, vitamin_c: 90, vitamin_d: 15,
}

const NUTRITION_LOG_SELECT = [
  'id',
  'created_at',
  'food_name',
  'servings',
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
  'calcium',
  'iron',
  'magnesium',
  'zinc',
  'vitamin_a',
  'vitamin_c',
  'vitamin_d',
].join(', ')

const GOAL_FIELD_RULES = {
  calories_goal: { ...NUTRITION_FIELD_LIMITS.calories, min: 1, label: 'Calories goal' },
  protein_goal: { ...NUTRITION_FIELD_LIMITS.protein, min: 1, label: 'Protein goal' },
  carbs_goal: { ...NUTRITION_FIELD_LIMITS.carbs, min: 1, label: 'Carbs goal' },
  fat_goal: { ...NUTRITION_FIELD_LIMITS.fat, min: 1, label: 'Fat goal' },
  fiber_goal: { ...NUTRITION_FIELD_LIMITS.fiber, label: 'Fiber goal' },
  sugar_goal: { ...NUTRITION_FIELD_LIMITS.sugar, label: 'Sugar goal' },
  saturated_fat_goal: { ...NUTRITION_FIELD_LIMITS.saturated_fat, label: 'Saturated fat goal' },
  sodium_goal: { ...NUTRITION_FIELD_LIMITS.sodium, label: 'Sodium goal' },
  potassium_goal: { ...NUTRITION_FIELD_LIMITS.potassium, label: 'Potassium goal' },
  cholesterol_goal: { ...NUTRITION_FIELD_LIMITS.cholesterol, label: 'Cholesterol goal' },
  calcium_goal: { ...NUTRITION_FIELD_LIMITS.calcium, label: 'Calcium goal' },
  iron_goal: { ...NUTRITION_FIELD_LIMITS.iron, label: 'Iron goal' },
  magnesium_goal: { ...NUTRITION_FIELD_LIMITS.magnesium, label: 'Magnesium goal' },
  zinc_goal: { ...NUTRITION_FIELD_LIMITS.zinc, label: 'Zinc goal' },
  vitamin_a_goal: { ...NUTRITION_FIELD_LIMITS.vitamin_a, label: 'Vitamin A goal' },
  vitamin_c_goal: { ...NUTRITION_FIELD_LIMITS.vitamin_c, label: 'Vitamin C goal' },
  vitamin_d_goal: { ...NUTRITION_FIELD_LIMITS.vitamin_d, label: 'Vitamin D goal' },
}

function goalInputProps(key) {
  const rules = GOAL_FIELD_RULES[key] || {}
  return {
    min: rules.min ?? 0,
    max: rules.max,
    step: rules.decimals === 0 ? 1 : 0.01,
    inputMode: 'decimal',
  }
}

function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function today() { return localDate() }

function offsetDate(dateStr, delta) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  return localDate(d)
}

function formatDateLabel(dateStr) {
  const t = today()
  if (dateStr === t) return 'Today'
  if (dateStr === offsetDate(t, -1)) return 'Yesterday'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtVal(v, unit) {
  if (unit === 'g') return v < 10 ? v.toFixed(1) : Math.round(v)
  return Math.round(v)
}

function formatFoodLogTime(timestamp) {
  if (!timestamp) return 'Logged today'
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

let _animIdx = 0
const DETAIL_RENDER_SECTIONS = [
  {
    title: 'Macros',
    items: [
      { label: 'Calories', key: 'calories', unit: 'kcal', color: 'var(--blue)' },
      { label: 'Protein', key: 'protein', unit: 'g', color: 'var(--blue)' },
      { label: 'Carbohydrates', key: 'carbs', unit: 'g', color: 'var(--blue)' },
      { label: 'Fat', key: 'fat', unit: 'g', color: 'var(--blue)' },
      { label: 'Fiber', key: 'fiber', unit: 'g', color: '#22c55e', type: 'target' },
      { label: 'Sugar', key: 'sugar', unit: 'g', color: '#f43f5e', type: 'max' },
      { label: 'Saturated Fat', key: 'saturated_fat', unit: 'g', color: '#f43f5e', type: 'max' },
    ],
  },
  {
    title: 'Electrolytes & Minerals',
    items: [
      { label: 'Sodium', key: 'sodium', unit: 'mg', type: 'max' },
      { label: 'Potassium', key: 'potassium', unit: 'mg', type: 'target' },
      { label: 'Calcium', key: 'calcium', unit: 'mg', type: 'target' },
      { label: 'Iron', key: 'iron', unit: 'mg', type: 'target' },
      { label: 'Magnesium', key: 'magnesium', unit: 'mg', type: 'target' },
      { label: 'Zinc', key: 'zinc', unit: 'mg', type: 'target' },
      { label: 'Cholesterol', key: 'cholesterol', unit: 'mg', type: 'max' },
    ],
  },
  {
    title: 'Vitamins',
    items: [
      { label: 'Vitamin A', key: 'vitamin_a', unit: 'mcg' },
      { label: 'Vitamin C', key: 'vitamin_c', unit: 'mg' },
      { label: 'Vitamin D', key: 'vitamin_d', unit: 'mcg' },
    ],
  },
].map(section => ({
  ...section,
  animationIndex: _animIdx++,
  items: section.items.map(item => ({ ...item, animationIndex: _animIdx++ })),
}))

export default function Nutrition({ openAddFoodTick = 0 }) {
  const userId = useCurrentUserId()
  const [date, setDate] = useState(today)
  const [logs, setLogs] = useState([])
  const [goals, setGoals] = useState(DEFAULT_GOALS)
  const [exerciseCalories, setExerciseCalories] = useState(0)
  const [loading, setLoading] = useState(true)
  const [addingFood, setAddingFood] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [editingGoals, setEditingGoals] = useState(false)
  const [goalsForm, setGoalsForm] = useState(null)
  const [goalsError, setGoalsError] = useState('')
  const [savingGoals, setSavingGoals] = useState(false)
  const [feedFilter, setFeedFilter] = useState('all')
  const [feedSortDirection, setFeedSortDirection] = useState('desc')
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [viewingLog, setViewingLog] = useState(null)
  const [logError, setLogError] = useState('')

  useEffect(() => {
    if (openAddFoodTick === 0) return
    setAddingFood(true)
  }, [openAddFoodTick])

  async function load() {
    if (!userId) return
    setLoading(true)
    setLogError('')
    const cacheKey = `nut_${date}`
    try {
      const cached = getCached(cacheKey)
      if (cached) {
        setLogs(cached.logs)
        setGoals(cached.goals)
        setExerciseCalories(cached.exerciseCalories || 0)
        return
      }

      const dayStart = new Date(date + 'T00:00:00').toISOString()
      const dayEnd   = new Date(date + 'T23:59:59.999').toISOString()
      const [{ data: logData, error: logsError }, { data: prof, error: profileError }, { data: sessionRows, error: sessionsError }] = await Promise.all([
        supabase
          .from('nutrition_logs')
          .select(NUTRITION_LOG_SELECT)
          .eq('user_id', userId)
          .eq('log_date', date)
          .order('created_at'),
        supabase.from('profiles').select('calories_goal,protein_goal,carbs_goal,fat_goal,fiber_goal,sugar_goal,saturated_fat_goal,sodium_goal,potassium_goal,cholesterol_goal,calcium_goal,iron_goal,magnesium_goal,zinc_goal,vitamin_a_goal,vitamin_c_goal,vitamin_d_goal').eq('id', userId).single(),
        supabase.from('workout_sessions').select('calories_burned').eq('user_id', userId).not('finished_at', 'is', null).gte('finished_at', dayStart).lte('finished_at', dayEnd),
      ])
      const loadError = logsError || profileError || sessionsError
      if (loadError) throw loadError

      const resolvedGoals = prof ? {
        calories:      prof.calories_goal      || DEFAULT_GOALS.calories,
        protein:       prof.protein_goal       || DEFAULT_GOALS.protein,
        carbs:         prof.carbs_goal         || DEFAULT_GOALS.carbs,
        fat:           prof.fat_goal           || DEFAULT_GOALS.fat,
        fiber:         prof.fiber_goal         || DEFAULT_GOALS.fiber,
        sugar:         prof.sugar_goal         || DEFAULT_GOALS.sugar,
        saturated_fat: prof.saturated_fat_goal || DEFAULT_GOALS.saturated_fat,
        sodium:        prof.sodium_goal        || DEFAULT_GOALS.sodium,
        potassium:     prof.potassium_goal     || DEFAULT_GOALS.potassium,
        cholesterol:   prof.cholesterol_goal   || DEFAULT_GOALS.cholesterol,
        calcium:       prof.calcium_goal       || DEFAULT_GOALS.calcium,
        iron:          prof.iron_goal          || DEFAULT_GOALS.iron,
        magnesium:     prof.magnesium_goal     || DEFAULT_GOALS.magnesium,
        zinc:          prof.zinc_goal          || DEFAULT_GOALS.zinc,
        vitamin_a:     prof.vitamin_a_goal     || DEFAULT_GOALS.vitamin_a,
        vitamin_c:     prof.vitamin_c_goal     || DEFAULT_GOALS.vitamin_c,
        vitamin_d:     prof.vitamin_d_goal     || DEFAULT_GOALS.vitamin_d,
      } : DEFAULT_GOALS

      const burnedKcal = (sessionRows || []).reduce((sum, s) => sum + (s.calories_burned || 0), 0)
      setCached(cacheKey, { logs: logData || [], goals: resolvedGoals, exerciseCalories: burnedKcal })
      setLogs(logData || [])
      setGoals(resolvedGoals)
      setExerciseCalories(burnedKcal)
    } catch (error) {
      setLogError(error?.message || 'Could not load nutrition. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadLatest = useEffectEvent(() => { load() })

  useEffect(() => {
    const timer = setTimeout(() => { loadLatest() }, 0)
    return () => clearTimeout(timer)
  }, [date, userId])

  async function addLog(food, servings) {
    if (!userId) return
    setLogError('')
    const m = servings
    const n = k => +((food[k] || 0) * m).toFixed(2)
    const entry = {
      user_id: userId, food_id: food.id || null,
      log_date: date, servings: m, food_name: food.name,
      calories: Math.round(food.calories * m),
      protein: n('protein'), carbs: n('carbs'), fat: n('fat'),
      fiber: n('fiber'), sugar: n('sugar'), saturated_fat: n('saturated_fat'),
      sodium: Math.round((food.sodium || 0) * m),
      potassium: Math.round((food.potassium || 0) * m),
      cholesterol: Math.round((food.cholesterol || 0) * m),
      calcium: Math.round((food.calcium || 0) * m),
      iron: n('iron'), magnesium: Math.round((food.magnesium || 0) * m),
      zinc: n('zinc'), vitamin_a: Math.round((food.vitamin_a || 0) * m),
      vitamin_c: n('vitamin_c'), vitamin_d: n('vitamin_d'),
    }
    const { data, error } = await supabase
      .from('nutrition_logs')
      .insert(entry)
      .select(NUTRITION_LOG_SELECT)
      .single()
    if (error) { setAddingFood(false); setLogError('Failed to add food. Please try again.'); return }
    if (data) setLogs(prev => [...prev, data])
    invalidateCache('home', `nut_${date}`, `cal_${date.slice(0, 7)}`, `recent_foods:${userId}`)
    setAddingFood(false)
  }

  async function removeLog(id) {
    setLogError('')
    const { error } = await supabase.from('nutrition_logs').delete().eq('id', id)
    if (error) { setLogError('Failed to remove food. Please try again.'); return }
    setLogs(prev => prev.filter(l => l.id !== id))
    invalidateCache('home', `nut_${date}`, `cal_${date.slice(0, 7)}`)
  }

  const sum = key => logs.reduce((a, l) => a + (l[key] || 0), 0)

  const totals = {
    calories: sum('calories'), protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat'),
    fiber: sum('fiber'), sugar: sum('sugar'), saturated_fat: sum('saturated_fat'),
    sodium: sum('sodium'), potassium: sum('potassium'), cholesterol: sum('cholesterol'),
    calcium: sum('calcium'), iron: sum('iron'), magnesium: sum('magnesium'), zinc: sum('zinc'),
    vitamin_a: sum('vitamin_a'), vitamin_c: sum('vitamin_c'), vitamin_d: sum('vitamin_d'),
  }

  function openGoalsEdit() {
    setGoalsForm({ ...goals,
      calories_goal: goals.calories, protein_goal: goals.protein,
      carbs_goal: goals.carbs, fat_goal: goals.fat,
      fiber_goal: goals.fiber, sugar_goal: goals.sugar,
      saturated_fat_goal: goals.saturated_fat, sodium_goal: goals.sodium,
      potassium_goal: goals.potassium, cholesterol_goal: goals.cholesterol,
      calcium_goal: goals.calcium, iron_goal: goals.iron,
      magnesium_goal: goals.magnesium, zinc_goal: goals.zinc,
      vitamin_a_goal: goals.vitamin_a, vitamin_c_goal: goals.vitamin_c,
      vitamin_d_goal: goals.vitamin_d,
    })
    setEditingGoals(true)
  }

  async function saveGoals() {
    if (!goalsForm || !userId) return
    for (const [key, rules] of Object.entries(GOAL_FIELD_RULES)) {
      const error = validateNumber(goalsForm[key], { ...rules, required: true })
      if (error) {
        setGoalsError(error)
        return
      }
    }
    setSavingGoals(true)
    setGoalsError('')
    const n = k => +goalsForm[k] || 0
    const nMacro = k => Math.max(1, +goalsForm[k] || 0)
    const updates = {
      calories_goal: nMacro('calories_goal'), protein_goal: nMacro('protein_goal'),
      carbs_goal: nMacro('carbs_goal'), fat_goal: nMacro('fat_goal'),
      fiber_goal: n('fiber_goal'), sugar_goal: n('sugar_goal'),
      saturated_fat_goal: n('saturated_fat_goal'), sodium_goal: n('sodium_goal'),
      potassium_goal: n('potassium_goal'), cholesterol_goal: n('cholesterol_goal'),
      calcium_goal: n('calcium_goal'), iron_goal: n('iron_goal'),
      magnesium_goal: n('magnesium_goal'), zinc_goal: n('zinc_goal'),
      vitamin_a_goal: n('vitamin_a_goal'), vitamin_c_goal: n('vitamin_c_goal'),
      vitamin_d_goal: n('vitamin_d_goal'),
    }
    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
      if (error) throw error
      setGoals({
        calories: updates.calories_goal, protein: updates.protein_goal,
        carbs: updates.carbs_goal, fat: updates.fat_goal,
        fiber: updates.fiber_goal, sugar: updates.sugar_goal,
        saturated_fat: updates.saturated_fat_goal, sodium: updates.sodium_goal,
        potassium: updates.potassium_goal, cholesterol: updates.cholesterol_goal,
        calcium: updates.calcium_goal, iron: updates.iron_goal,
        magnesium: updates.magnesium_goal, zinc: updates.zinc_goal,
        vitamin_a: updates.vitamin_a_goal, vitamin_c: updates.vitamin_c_goal,
        vitamin_d: updates.vitamin_d_goal,
      })
      invalidateCache('profile', 'home', `nut_${date}`)
      setEditingGoals(false)
    } catch (error) {
      setGoalsError(error?.message || 'Could not save nutrition goals.')
    } finally {
      setSavingGoals(false)
    }
  }

  const remaining = goals.calories - Math.round(totals.calories) + exerciseCalories
  const R = 52, C = 2 * Math.PI * R
  const dash = (Math.min(1, totals.calories / goals.calories)) * C
  const feedLogs = useMemo(() => {
    const items = [...logs]
    const directionMultiplier = feedSortDirection === 'asc' ? 1 : -1
    const dateDiff = (a, b) => {
      const timeA = new Date(a.created_at || 0).getTime()
      const timeB = new Date(b.created_at || 0).getTime()
      return (timeA - timeB) * directionMultiplier
    }

    if (feedFilter === 'all') {
      return items.sort((a, b) => dateDiff(a, b) || ((a.id || 0) - (b.id || 0)) * directionMultiplier)
    }

    return items.sort((a, b) => (
      ((Number(a[feedFilter]) || 0) - (Number(b[feedFilter]) || 0)) * directionMultiplier ||
      dateDiff(a, b) ||
      ((a.id || 0) - (b.id || 0)) * directionMultiplier
    ))
  }, [logs, feedFilter, feedSortDirection])

  const feedListKey = `${date}-${feedFilter}-${feedSortDirection}-${logs.length}`

  if (viewingLog) {
    const log = viewingLog
    const micros = [
      { label: 'Fiber',         val: +(log.fiber || 0).toFixed(1),         unit: 'g'   },
      { label: 'Sugar',         val: +(log.sugar || 0).toFixed(1),         unit: 'g'   },
      { label: 'Saturated Fat', val: +(log.saturated_fat || 0).toFixed(1), unit: 'g'   },
      { label: 'Sodium',        val: Math.round(log.sodium || 0),          unit: 'mg'  },
      { label: 'Potassium',     val: Math.round(log.potassium || 0),       unit: 'mg'  },
      { label: 'Cholesterol',   val: Math.round(log.cholesterol || 0),     unit: 'mg'  },
      { label: 'Calcium',       val: Math.round(log.calcium || 0),         unit: 'mg'  },
      { label: 'Iron',          val: +(log.iron || 0).toFixed(2),          unit: 'mg'  },
      { label: 'Magnesium',     val: Math.round(log.magnesium || 0),       unit: 'mg'  },
      { label: 'Zinc',          val: +(log.zinc || 0).toFixed(1),          unit: 'mg'  },
      { label: 'Vitamin A',     val: Math.round(log.vitamin_a || 0),       unit: 'mcg' },
      { label: 'Vitamin C',     val: +(log.vitamin_c || 0).toFixed(1),     unit: 'mg'  },
      { label: 'Vitamin D',     val: +(log.vitamin_d || 0).toFixed(1),     unit: 'mcg' },
    ].filter(m => m.val > 0)

    return (
      <div className="nut-picker-screen">
        <div className="nut-picker-header">
          <button className="back-btn" onClick={() => setViewingLog(null)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div>
            <div className="picker-title">{log.food_name}</div>
            <div className="nut-detail-brand">
              {log.servings !== 1 ? `${log.servings}× servings` : '1 serving'} · {formatFoodLogTime(log.created_at)}
            </div>
          </div>
        </div>

        <div className="nut-preview-card">
          <div className="nut-preview-cal">{Math.round(log.calories)} <span>kcal</span></div>
          <div className="nut-preview-macros">
            <div className="nut-preview-macro" style={{ '--mc': '#a855f7' }}>
              <span>{(log.protein || 0).toFixed(1)}g</span><span>Protein</span>
            </div>
            <div className="nut-preview-macro" style={{ '--mc': '#f97316' }}>
              <span>{(log.carbs || 0).toFixed(1)}g</span><span>Carbs</span>
            </div>
            <div className="nut-preview-macro" style={{ '--mc': '#eab308' }}>
              <span>{(log.fat || 0).toFixed(1)}g</span><span>Fat</span>
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
      </div>
    )
  }

  if (addingFood) {
    return (
      <NutritionFoodPicker
        onAdd={addLog}
        onClose={() => setAddingFood(false)}
        heading="Add Food"
        submitLabel="Add to Log"
      />
    )
  }

  return (
    <div className="nutrition-screen">
      {/* Date nav */}
      <div className="nut-date-nav">
        <button className="nut-date-btn" onClick={() => setDate(d => offsetDate(d, -1))}>‹</button>
        <span className="nut-date-label">{formatDateLabel(date)}</span>
        <button className="nut-date-btn" onClick={() => setDate(d => offsetDate(d, 1))} disabled={date === today()} style={{ opacity: date === today() ? 0.3 : 1 }}>›</button>
        <button className={`nut-goals-btn ${editingGoals ? 'active' : ''}`} onClick={() => editingGoals ? setEditingGoals(false) : openGoalsEdit()}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
          </svg>
          Goals
        </button>
      </div>

      {logError && (
        <div style={{ margin: '8px 16px 0', padding: '10px 14px', background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 8, color: '#ff6b6b', fontSize: 13 }}>
          {logError}
        </div>
      )}

      {/* Goals editor */}
      {editingGoals && goalsForm && (
        <div className="nut-goals-panel">
          <div className="nut-goals-section-title">Macros</div>
          <div className="nut-goals-grid">
            {[
              { key: 'calories_goal', label: 'Calories', unit: 'kcal' },
              { key: 'protein_goal',  label: 'Protein',  unit: 'g'    },
              { key: 'carbs_goal',    label: 'Carbs',    unit: 'g'    },
              { key: 'fat_goal',      label: 'Fat',      unit: 'g'    },
            ].map(({ key, label, unit }) => (
              <div key={key} className="nut-goals-field">
                <label className="nut-goals-label">{label}</label>
                <div className="nut-goals-input-wrap">
                  <input className="nut-goals-input" type="number" value={goalsForm[key]}
                    {...goalInputProps(key)}
                    onChange={e => { setGoalsError(''); setGoalsForm(f => ({ ...f, [key]: e.target.value })) }} />
                  <span className="nut-goals-unit">{unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="nut-goals-section-title">Macro Detail</div>
          <div className="nut-goals-grid">
            {[
              { key: 'fiber_goal',         label: 'Fiber',          unit: 'g'  },
              { key: 'sugar_goal',         label: 'Sugar (max)',    unit: 'g'  },
              { key: 'saturated_fat_goal', label: 'Sat. Fat (max)', unit: 'g'  },
              { key: 'cholesterol_goal',   label: 'Chol. (max)',    unit: 'mg' },
            ].map(({ key, label, unit }) => (
              <div key={key} className="nut-goals-field">
                <label className="nut-goals-label">{label}</label>
                <div className="nut-goals-input-wrap">
                  <input className="nut-goals-input" type="number" value={goalsForm[key]}
                    {...goalInputProps(key)}
                    onChange={e => { setGoalsError(''); setGoalsForm(f => ({ ...f, [key]: e.target.value })) }} />
                  <span className="nut-goals-unit">{unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="nut-goals-section-title">Electrolytes & Minerals</div>
          <div className="nut-goals-grid">
            {[
              { key: 'sodium_goal',    label: 'Sodium (max)', unit: 'mg' },
              { key: 'potassium_goal', label: 'Potassium',    unit: 'mg' },
              { key: 'calcium_goal',   label: 'Calcium',      unit: 'mg' },
              { key: 'iron_goal',      label: 'Iron',         unit: 'mg' },
              { key: 'magnesium_goal', label: 'Magnesium',    unit: 'mg' },
              { key: 'zinc_goal',      label: 'Zinc',         unit: 'mg' },
            ].map(({ key, label, unit }) => (
              <div key={key} className="nut-goals-field">
                <label className="nut-goals-label">{label}</label>
                <div className="nut-goals-input-wrap">
                  <input className="nut-goals-input" type="number" value={goalsForm[key]}
                    {...goalInputProps(key)}
                    onChange={e => { setGoalsError(''); setGoalsForm(f => ({ ...f, [key]: e.target.value })) }} />
                  <span className="nut-goals-unit">{unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="nut-goals-section-title">Vitamins</div>
          <div className="nut-goals-grid">
            {[
              { key: 'vitamin_a_goal', label: 'Vitamin A', unit: 'mcg' },
              { key: 'vitamin_c_goal', label: 'Vitamin C', unit: 'mg'  },
              { key: 'vitamin_d_goal', label: 'Vitamin D', unit: 'mcg' },
            ].map(({ key, label, unit }) => (
              <div key={key} className="nut-goals-field">
                <label className="nut-goals-label">{label}</label>
                <div className="nut-goals-input-wrap">
                  <input className="nut-goals-input" type="number" value={goalsForm[key]}
                    {...goalInputProps(key)}
                    onChange={e => { setGoalsError(''); setGoalsForm(f => ({ ...f, [key]: e.target.value })) }} />
                  <span className="nut-goals-unit">{unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="nut-goals-actions">
            {goalsError && <div className="cf-error">{goalsError}</div>}
            <button className="nut-goals-cancel" onClick={() => setEditingGoals(false)}>Cancel</button>
            <button className="nut-goals-save" onClick={saveGoals} disabled={savingGoals}>
              {savingGoals ? 'Saving...' : 'Save Goals'}
            </button>
          </div>
        </div>
      )}

      {/* Summary — tap to expand full breakdown */}
      <div className="nut-summary" onClick={() => setShowDetail(s => !s)} style={{ cursor: 'pointer' }}>
        <div className="nut-ring-wrap">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="9"/>
            <circle cx="60" cy="60" r={R} fill="none" stroke="var(--blue)" strokeWidth="9"
              strokeDasharray={`${dash} ${C}`} strokeLinecap="round" transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          </svg>
          <div className="nut-ring-center">
            <div className="nut-ring-cal">{fmtCompact(Math.round(totals.calories))}</div>
            <div className="nut-ring-label">kcal</div>
          </div>
        </div>

        <div className="nut-macros">
          {[
            { label: 'Protein', key: 'protein', color: 'var(--blue)' },
            { label: 'Carbs',   key: 'carbs',   color: 'var(--blue)' },
            { label: 'Fat',     key: 'fat',      color: 'var(--blue)' },
          ].map(m => (
            <div key={m.label} className="nut-macro-row">
              <div className="nut-macro-header">
                <span className="nut-macro-label">{m.label}</span>
                <span className="nut-macro-val">{totals[m.key].toFixed(0)}<span className="nut-macro-goal">/{goals[m.key]}g</span></span>
              </div>
              <div className="nut-macro-track">
                <div className="nut-macro-fill" style={{ width: `${Math.min(100, (totals[m.key] / goals[m.key]) * 100)}%`, background: m.color }}/>
              </div>
            </div>
          ))}
          <div className="nut-remaining" style={{ color: remaining < 0 ? '#ef4444' : 'var(--muted)' }}>
            {remaining > 0 ? `${remaining} kcal remaining` : `${Math.abs(remaining)} kcal over goal`}
          </div>
          {exerciseCalories > 0 && (
            <div className="nut-burned-row">
              ~{exerciseCalories} kcal burned today
            </div>
          )}
          <div className="nut-expand-hint">
            <span>{showDetail ? 'Hide breakdown' : 'Full breakdown'}</span>
            <svg className={`nut-expand-chevron ${showDetail ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Full nutrition breakdown */}
      <div className={`nut-detail-wrap ${showDetail ? 'expanded' : ''}`}>
        <div className="nut-detail-wrap-inner">
          <div className="nut-detail-card">
            {DETAIL_RENDER_SECTIONS.map(section => (
              <div key={section.title} className="nut-detail-section">
                <div className="nut-detail-section-title" style={{ '--detail-index': section.animationIndex }}>
                  {section.title}
                </div>
                {section.items.map(({ label, key, unit, color, type, animationIndex }) => {
                  const val = totals[key] || 0
                  const goal = goals[key] || 1
                  const over = type === 'max' && val > goal
                  const pct = Math.min(100, (val / goal) * 100)
                  const barColor = type === 'max'
                    ? (over ? '#ef4444' : '#22c55e')
                    : (color || (pct >= 100 ? '#22c55e' : 'var(--blue)'))
                  return (
                    <div key={key} className="nut-detail-row" style={{ '--detail-index': animationIndex }}>
                      <div className="nut-detail-row-header">
                        <span className="nut-detail-label">
                          {label}
                          {section.title === 'Electrolytes & Minerals' && type === 'max' ? ' (max)' : ''}
                        </span>
                        <span className="nut-detail-val" style={{ color: over ? '#ef4444' : 'var(--text)' }}>
                          {fmtVal(val, unit)}<span className="nut-detail-goal">/{goal}{unit}</span>
                        </span>
                      </div>
                      <div className="nut-micro-track">
                        <div className="nut-micro-fill" style={{ width: `${pct}%`, background: barColor }}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="nut-feed-section">
        <div className="nut-feed-header">
          <div>
            <div className="nut-feed-title">Food Log</div>
            <div className="nut-feed-subtitle">
              {logs.length
                ? `${logs.length} ${logs.length === 1 ? 'food' : 'foods'} tracked today`
                : 'Track everything you eat in one running feed.'}
            </div>
          </div>
          <button className="nut-feed-add-btn" onClick={() => setAddingFood(true)}>
            <span>+</span>
            <span>Add Food</span>
          </button>
        </div>

        <div className="nut-feed-controls">
          <div className="nut-feed-filters">
            {FEED_FILTERS.map(filter => (
              <button
                key={filter.id}
                className={`nut-feed-filter ${feedFilter === filter.id ? 'active' : ''}`}
                onClick={() => setFeedFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="nut-feed-order" role="group" aria-label="Sort order">
            <button
              className={`nut-feed-order-btn ${feedSortDirection === 'asc' ? 'active' : ''}`}
              onClick={() => setFeedSortDirection('asc')}
              aria-label="Sort ascending"
              title="Sort ascending"
            >
              ↑
            </button>
            <button
              className={`nut-feed-order-btn ${feedSortDirection === 'desc' ? 'active' : ''}`}
              onClick={() => setFeedSortDirection('desc')}
              aria-label="Sort descending"
              title="Sort descending"
            >
              ↓
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner fullPage />
        ) : logs.length > 0 ? (
          <div key={feedListKey} className="nut-feed-list nut-feed-list-animated">
            {feedLogs.map((log, index) => (
              <div key={log.id} className="nut-feed-item" style={{ '--feed-index': index }}>
                <div className="nut-feed-rail" aria-hidden="true">
                  <span className="nut-feed-dot" />
                  {index < feedLogs.length - 1 && <span className="nut-feed-line" />}
                </div>
                <div className="nut-feed-card" onClick={() => { setDeleteTargetId(null); setViewingLog(log) }} style={{ cursor: 'pointer' }}>
                  <div className="nut-feed-card-top">
                    <div className="nut-feed-copy">
                      <div className="nut-feed-food">{log.food_name}</div>
                      <div className="nut-feed-meta">
                        {log.servings !== 1 ? `${log.servings}× servings` : '1 serving'} · {formatFoodLogTime(log.created_at)}
                      </div>
                    </div>
                    <div className="nut-feed-kcal">{Math.round(log.calories)} kcal</div>
                  </div>

                  <div className="nut-feed-footer">
                    <div className="nut-feed-pills">
                      <span className="nut-feed-pill nut-feed-pill-protein">P {Math.round(log.protein || 0)}g</span>
                      <span className="nut-feed-pill nut-feed-pill-carbs">C {Math.round(log.carbs || 0)}g</span>
                      <span className="nut-feed-pill nut-feed-pill-fat">F {Math.round(log.fat || 0)}g</span>
                    </div>
                    {deleteTargetId === log.id ? (
                      <div className="nut-feed-delete-confirm" onClick={e => e.stopPropagation()}>
                        <span className="nut-feed-delete-confirm-text">Remove this entry?</span>
                        <button className="nut-feed-delete-cancel-btn" onClick={() => setDeleteTargetId(null)}>Cancel</button>
                        <button className="nut-feed-remove-btn nut-feed-remove-btn-confirm" onClick={() => { removeLog(log.id); setDeleteTargetId(null) }}>Delete</button>
                      </div>
                    ) : (
                      <button className="nut-feed-remove-btn" onClick={e => { e.stopPropagation(); setDeleteTargetId(log.id) }}>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="nut-feed-empty">
            <div className="nut-feed-empty-title">No food tracked yet</div>
            <button className="nut-feed-add-btn nut-feed-add-btn-inline" onClick={() => setAddingFood(true)}>
              <span>+</span>
              <span>Add your first food</span>
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
