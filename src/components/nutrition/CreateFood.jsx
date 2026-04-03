import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const UNITS = ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece', 'slice', 'scoop', 'bar', 'serving']

const initialForm = {
  name: '', brand: '',
  serving_size: '100', serving_unit: 'g',
  calories: '', protein: '', carbs: '', fat: '',
  fiber: '', sugar: '', saturated_fat: '',
  sodium: '', potassium: '', cholesterol: '',
  vitamin_a: '', vitamin_c: '', calcium: '', iron: '',
}

function Field({ label, value, onChange, placeholder = '0', type = 'number', unit, required }) {
  return (
    <div className="cf-field">
      <label className="cf-label">{label}{required && <span className="cf-required"> *</span>}</label>
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

export default function CreateFood({ onSave, onBack }) {
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showMicros, setShowMicros] = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const valid = form.name.trim() && form.calories !== '' && form.serving_size !== ''

  async function save() {
    if (!valid) { setError('Name and calories are required'); return }
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const n = (v) => v === '' ? 0 : +v
    const { data, error: err } = await supabase
      .from('foods')
      .insert({
        user_id: user.id,
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        serving_size: +form.serving_size || 100,
        serving_unit: form.serving_unit,
        calories: n(form.calories),
        protein: n(form.protein),
        carbs: n(form.carbs),
        fat: n(form.fat),
        fiber: n(form.fiber),
        sugar: n(form.sugar),
        saturated_fat: n(form.saturated_fat),
        sodium: n(form.sodium),
        potassium: n(form.potassium),
        cholesterol: n(form.cholesterol),
        vitamin_a: n(form.vitamin_a),
        vitamin_c: n(form.vitamin_c),
        calcium: n(form.calcium),
        iron: n(form.iron),
      })
      .select()
      .single()
    setSaving(false)
    if (err) { setError(err.message); return }
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

      {/* Basic info */}
      <div className="cf-section">
        <div className="cf-section-title">Food Info</div>
        <Field label="Name" value={form.name} onChange={v => set('name', v)} placeholder="e.g. Chicken Breast" type="text" required />
        <Field label="Brand" value={form.brand} onChange={v => set('brand', v)} placeholder="Optional" type="text" />
        <div className="cf-row">
          <Field label="Serving Size" value={form.serving_size} onChange={v => set('serving_size', v)} placeholder="100" required />
          <div className="cf-field">
            <label className="cf-label">Unit</label>
            <select className="cf-select" value={form.serving_unit} onChange={e => set('serving_unit', e.target.value)}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Macros */}
      <div className="cf-section">
        <div className="cf-section-title">Macros <span className="cf-section-note">per serving</span></div>
        <Field label="Calories" value={form.calories} onChange={v => set('calories', v)} unit="kcal" required />
        <div className="cf-row">
          <Field label="Protein" value={form.protein} onChange={v => set('protein', v)} unit="g" />
          <Field label="Carbs" value={form.carbs} onChange={v => set('carbs', v)} unit="g" />
          <Field label="Fat" value={form.fat} onChange={v => set('fat', v)} unit="g" />
        </div>
      </div>

      {/* Micros toggle */}
      <button className="cf-toggle-micros" onClick={() => setShowMicros(s => !s)}>
        {showMicros ? '▾' : '▸'} Micronutrients <span className="cf-section-note">(optional)</span>
      </button>

      {showMicros && (
        <div className="cf-section">
          <div className="cf-row">
            <Field label="Fiber" value={form.fiber} onChange={v => set('fiber', v)} unit="g" />
            <Field label="Sugar" value={form.sugar} onChange={v => set('sugar', v)} unit="g" />
          </div>
          <div className="cf-row">
            <Field label="Saturated Fat" value={form.saturated_fat} onChange={v => set('saturated_fat', v)} unit="g" />
            <Field label="Cholesterol" value={form.cholesterol} onChange={v => set('cholesterol', v)} unit="mg" />
          </div>
          <div className="cf-row">
            <Field label="Sodium" value={form.sodium} onChange={v => set('sodium', v)} unit="mg" />
            <Field label="Potassium" value={form.potassium} onChange={v => set('potassium', v)} unit="mg" />
          </div>
          <div className="cf-row">
            <Field label="Vitamin A" value={form.vitamin_a} onChange={v => set('vitamin_a', v)} unit="mcg" />
            <Field label="Vitamin C" value={form.vitamin_c} onChange={v => set('vitamin_c', v)} unit="mg" />
          </div>
          <div className="cf-row">
            <Field label="Calcium" value={form.calcium} onChange={v => set('calcium', v)} unit="mg" />
            <Field label="Iron" value={form.iron} onChange={v => set('iron', v)} unit="mg" />
          </div>
        </div>
      )}

      {error && <div className="cf-error">{error}</div>}

      <button className="nut-add-to-log-btn" onClick={save} disabled={saving || !valid}>
        {saving ? 'Saving...' : 'Save Food'}
      </button>
    </div>
  )
}
