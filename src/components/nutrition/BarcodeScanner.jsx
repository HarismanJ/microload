import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../../lib/supabase'
import LoadingSpinner from '../LoadingSpinner'

const FIELDS = [
  { key: 'name',          label: 'Name',          unit: '',     type: 'text',   required: true },
  { key: 'brand',         label: 'Brand',          unit: '',     type: 'text'  },
  { key: 'serving_size',  label: 'Serving Size',   unit: '',     type: 'number', required: true },
  { key: 'serving_unit',  label: 'Serving Unit',   unit: '',     type: 'text'  },
  { key: 'calories',      label: 'Calories',       unit: 'kcal', type: 'number', required: true },
  { key: 'protein',       label: 'Protein',        unit: 'g',    type: 'number' },
  { key: 'carbs',         label: 'Carbs',          unit: 'g',    type: 'number' },
  { key: 'fat',           label: 'Fat',            unit: 'g',    type: 'number' },
  { key: 'fiber',         label: 'Fiber',          unit: 'g',    type: 'number' },
  { key: 'sugar',         label: 'Sugar',          unit: 'g',    type: 'number' },
  { key: 'saturated_fat', label: 'Saturated Fat',  unit: 'g',    type: 'number' },
  { key: 'sodium',        label: 'Sodium',         unit: 'mg',   type: 'number' },
  { key: 'potassium',     label: 'Potassium',      unit: 'mg',   type: 'number' },
  { key: 'cholesterol',   label: 'Cholesterol',    unit: 'mg',   type: 'number' },
  { key: 'vitamin_a',     label: 'Vitamin A',      unit: 'mcg',  type: 'number' },
  { key: 'vitamin_c',     label: 'Vitamin C',      unit: 'mg',   type: 'number' },
  { key: 'calcium',       label: 'Calcium',        unit: 'mg',   type: 'number' },
  { key: 'iron',          label: 'Iron',           unit: 'mg',   type: 'number' },
]

function parseOFF(product) {
  const n = product.nutriments || {}
  const per = n['energy-kcal_serving'] ? 'serving' : '100g'
  const suffix = per === 'serving' ? '_serving' : '_100g'

  const kcal = n[`energy-kcal${suffix}`] || n['energy-kcal'] || 0
  const serving_size = product.serving_quantity || 100
  const serving_unit = product.serving_quantity_unit || 'g'

  return {
    name: product.product_name || '',
    brand: product.brands?.split(',')[0]?.trim() || '',
    serving_size: String(serving_size),
    serving_unit: serving_unit || 'g',
    calories:      String(Math.round(kcal)),
    protein:       String(+(n[`proteins${suffix}`] || n.proteins || 0).toFixed(1)),
    carbs:         String(+(n[`carbohydrates${suffix}`] || n.carbohydrates || 0).toFixed(1)),
    fat:           String(+(n[`fat${suffix}`] || n.fat || 0).toFixed(1)),
    fiber:         String(+(n[`fiber${suffix}`] || n.fiber || 0).toFixed(1)),
    sugar:         String(+(n[`sugars${suffix}`] || n.sugars || 0).toFixed(1)),
    saturated_fat: String(+(n[`saturated-fat${suffix}`] || n['saturated-fat'] || 0).toFixed(1)),
    sodium:        String(Math.round((n[`sodium${suffix}`] || n.sodium || 0) * 1000)),
    potassium:     String(Math.round((n[`potassium${suffix}`] || n.potassium || 0) * 1000)),
    cholesterol:   String(Math.round((n[`cholesterol${suffix}`] || n.cholesterol || 0) * 1000)),
    vitamin_a:     String(+(n[`vitamin-a${suffix}`] || n['vitamin-a'] || 0).toFixed(1)),
    vitamin_c:     String(+(n[`vitamin-c${suffix}`] || n['vitamin-c'] || 0).toFixed(1)),
    calcium:       String(Math.round((n[`calcium${suffix}`] || n.calcium || 0) * 1000)),
    iron:          String(+(n[`iron${suffix}`] || n.iron || 0).toFixed(2)),
  }
}

export default function BarcodeScanner({ onSave, onBack }) {
  const [phase, setPhase] = useState('scanning') // scanning | loading | confirm | error | saving
  const [errorMsg, setErrorMsg] = useState('')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const scannerRef = useRef(null)
  const scannedRef = useRef(false)

  useEffect(() => {
    const scanner = new Html5Qrcode('barcode-reader')
    scannerRef.current = scanner
    let running = false

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 280, height: 140 } },
      async (barcode) => {
        if (scannedRef.current) return
        scannedRef.current = true
        running = false
        await scanner.stop()
        // Release camera tracks so iOS doesn't leave the stream open
        document.querySelectorAll('video').forEach(v => {
          v.srcObject?.getTracks().forEach(t => t.stop())
          v.srcObject = null
        })
        lookup(barcode)
      },
      () => {}
    ).then(() => { running = true })
     .catch(() => {
      setErrorMsg('Camera access denied. Please allow camera access and try again.')
      setPhase('error')
    })

    return () => {
      if (running) {
        scanner.stop().catch(() => {})
      }
      // Always release any lingering camera tracks on unmount
      document.querySelectorAll('video').forEach(v => {
        v.srcObject?.getTracks().forEach(t => t.stop())
        v.srcObject = null
      })
    }
  }, [])

  async function lookup(barcode) {
    setPhase('loading')
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, { signal: controller.signal })
      clearTimeout(timeout)
      const json = await res.json()
      if (json.status !== 1 || !json.product) {
        setErrorMsg('Product not found. You can enter details manually.')
        setForm({ name: '', brand: '', serving_size: '100', serving_unit: 'g', calories: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '', saturated_fat: '', sodium: '', potassium: '', cholesterol: '', vitamin_a: '', vitamin_c: '', calcium: '', iron: '' })
        setPhase('confirm')
        return
      }
      setForm(parseOFF(json.product))
      setPhase('confirm')
    } catch (e) {
      if (e.name === 'AbortError') {
        setErrorMsg('Lookup timed out. You can enter details manually.')
        setForm({ name: '', brand: '', serving_size: '100', serving_unit: 'g', calories: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '', saturated_fat: '', sodium: '', potassium: '', cholesterol: '', vitamin_a: '', vitamin_c: '', calcium: '', iron: '' })
        setPhase('confirm')
      } else {
        setErrorMsg('Network error. Check your connection.')
        setPhase('error')
      }
    }
  }

  async function save() {
    if (!form?.name?.trim() || !form?.calories) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const n = v => v === '' ? 0 : +v
    const { data, error } = await supabase.from('foods').insert({
      user_id: user.id,
      name: form.name.trim(),
      brand: form.brand?.trim() || null,
      serving_size: +form.serving_size || 100,
      serving_unit: form.serving_unit || 'g',
      calories: n(form.calories),
      protein: n(form.protein), carbs: n(form.carbs), fat: n(form.fat),
      fiber: n(form.fiber), sugar: n(form.sugar), saturated_fat: n(form.saturated_fat),
      sodium: n(form.sodium), potassium: n(form.potassium), cholesterol: n(form.cholesterol),
      vitamin_a: n(form.vitamin_a), vitamin_c: n(form.vitamin_c),
      calcium: n(form.calcium), iron: n(form.iron),
    }).select().single()
    setSaving(false)
    if (error) { setErrorMsg(error.message); return }
    onSave(data)
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  if (phase === 'scanning') {
    return (
      <div className="bs-screen">
        <div className="bs-header">
          <button className="back-btn" onClick={onBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <span className="picker-title">Scan Barcode</span>
        </div>
        <div className="bs-viewfinder">
          <div id="barcode-reader" className="bs-reader" />
          <div className="bs-overlay">
            <div className="bs-target" />
          </div>
          <div className="bs-hint">Point at a food barcode</div>
        </div>
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="bs-screen bs-center">
        <LoadingSpinner size="lg" />
        <div className="bs-loading-text">Looking up product…</div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="bs-screen bs-center">
        <div className="bs-error-msg">{errorMsg}</div>
        <button className="nut-add-to-log-btn" onClick={onBack}>Go Back</button>
      </div>
    )
  }

  // confirm phase
  const valid = form?.name?.trim() && form?.calories !== ''
  return (
    <div className="bs-screen">
      <div className="bs-header">
        <button className="back-btn" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <span className="picker-title">Confirm Food</span>
      </div>
      {errorMsg && <div className="bs-not-found-note">{errorMsg}</div>}
      <div className="cf-section">
        <div className="cf-section-title">Food Info</div>
        {FIELDS.slice(0, 4).map(f => (
          <div key={f.key} className="cf-field">
            <label className="cf-label">{f.label}{f.required && <span className="cf-required"> *</span>}</label>
            <div className="cf-input-wrap">
              <input className="cf-input" type={f.type} value={form[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} />
            </div>
          </div>
        ))}
      </div>
      <div className="cf-section">
        <div className="cf-section-title">Macros <span className="cf-section-note">per serving</span></div>
        {FIELDS.slice(4, 8).map(f => (
          <div key={f.key} className="cf-field">
            <label className="cf-label">{f.required && <span className="cf-required">* </span>}{f.label}</label>
            <div className="cf-input-wrap">
              <input className="cf-input" type="number" min="0" step="any" value={form[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} />
              {f.unit && <span className="cf-unit">{f.unit}</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="cf-section">
        <div className="cf-section-title">More Nutrition <span className="cf-section-note">(optional)</span></div>
        {FIELDS.slice(8).map(f => (
          <div key={f.key} className="cf-field">
            <label className="cf-label">{f.label}</label>
            <div className="cf-input-wrap">
              <input className="cf-input" type="number" min="0" step="any" value={form[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} />
              {f.unit && <span className="cf-unit">{f.unit}</span>}
            </div>
          </div>
        ))}
      </div>
      <button className="nut-add-to-log-btn" onClick={save} disabled={saving || !valid}>
        {saving ? 'Saving…' : 'Add Food'}
      </button>
    </div>
  )
}
