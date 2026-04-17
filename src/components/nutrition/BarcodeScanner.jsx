import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { BarcodeFormat, BarcodeScanner as NativeBarcodeScanner } from '@capacitor-mlkit/barcode-scanning'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../../lib/supabase'
import { invalidateCache } from '../../lib/cache'
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

// Native ML Kit is used on real phone builds.
// Browser BarcodeDetector/html5-qrcode stays as the web fallback.
const USE_NATIVE_PHONE_SCANNER = Capacitor.getPlatform() !== 'web'
const NATIVE_SCANNER = typeof window !== 'undefined' && 'BarcodeDetector' in window
const FOOD_BARCODE_PATTERN = /^\d{6,14}$/
const NATIVE_SCAN_FORMATS = [
  BarcodeFormat.Ean13,
  BarcodeFormat.Ean8,
  BarcodeFormat.UpcA,
  BarcodeFormat.UpcE,
]
const ACCEPTED_WEB_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e']

function getScannedValue(barcode) {
  return String(barcode?.rawValue || barcode?.displayValue || barcode || '').trim()
}

function isAcceptedFoodBarcode(barcode) {
  const value = getScannedValue(barcode)
  if (!FOOD_BARCODE_PATTERN.test(value)) return false

  const format = barcode?.format
  if (!format) return true

  return [
    BarcodeFormat.Ean13,
    BarcodeFormat.Ean8,
    BarcodeFormat.UpcA,
    BarcodeFormat.UpcE,
    ...ACCEPTED_WEB_FORMATS,
  ].includes(format)
}

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
  const [manualCode, setManualCode] = useState('')
  const [manualLooking, setManualLooking] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [nativeScanOpening, setNativeScanOpening] = useState(false)

  // html5-qrcode fallback refs
  const scannerRef = useRef(null)
  // native scanner refs
  const videoRef = useRef(null)
  const animFrameRef = useRef(null)
  // shared refs
  const scannedRef = useRef(false)
  const runningRef = useRef(false)
  const trackRef = useRef(null)

  function stopCamera() {
    runningRef.current = false
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {})
    }
    if (USE_NATIVE_PHONE_SCANNER) {
      NativeBarcodeScanner.removeAllListeners().catch(() => {})
      NativeBarcodeScanner.stopScan().catch(() => {})
    }
    // Stops tracks for both native <video> and html5-qrcode injected video
    document.querySelectorAll('video').forEach(v => {
      v.srcObject?.getTracks().forEach(t => t.stop())
      v.srcObject = null
    })
  }

  async function startNativePhoneScan() {
    if (!USE_NATIVE_PHONE_SCANNER || scannedRef.current || nativeScanOpening) return

    setNativeScanOpening(true)
    setErrorMsg('')

    try {
      const { supported } = await NativeBarcodeScanner.isSupported()
      if (!supported) {
        setErrorMsg('Barcode scanning is not supported on this device.')
        setPhase('error')
        return
      }

      const permissionState = await NativeBarcodeScanner.checkPermissions()
      let cameraPermission = permissionState.camera

      if (cameraPermission !== 'granted') {
        const requested = await NativeBarcodeScanner.requestPermissions()
        cameraPermission = requested.camera
      }

      if (cameraPermission !== 'granted') {
        setErrorMsg('Camera access denied. Please allow camera access and try again.')
        setPhase('error')
        return
      }

      const { barcodes } = await NativeBarcodeScanner.scan({
        formats: NATIVE_SCAN_FORMATS,
        autoZoom: true,
      })

      const acceptedBarcode = (barcodes || []).find(isAcceptedFoodBarcode)
      const rawValue = getScannedValue(acceptedBarcode)

      if (!rawValue) {
        setErrorMsg('Scan the numeric product barcode on the package, not a QR code or promo code.')
        return
      }

      scannedRef.current = true
      await lookup(rawValue)
    } catch (error) {
      const message = String(error?.message || error || '')
      const cancelled = /cancel|cancell|user.*closed|dismiss/i.test(message)

      if (!cancelled) {
        setErrorMsg('Could not start the camera scanner. You can still enter the barcode manually.')
      }
    } finally {
      setNativeScanOpening(false)
    }
  }

  function handleBack() {
    stopCamera()
    onBack()
  }

  useEffect(() => {
    if (USE_NATIVE_PHONE_SCANNER) {
      startNativePhoneScan()
      return () => {
        NativeBarcodeScanner.removeAllListeners().catch(() => {})
        NativeBarcodeScanner.stopScan().catch(() => {})
      }
    }

    if (NATIVE_SCANNER) {
      // ── Native BarcodeDetector path ─────────────────────────────────────
      // We own the getUserMedia call so we can request focus constraints
      // from the very start, rather than patching after the fact.
      let detector
      try {
        detector = new BarcodeDetector({
          formats: ACCEPTED_WEB_FORMATS,
        })
      } catch {
        // BarcodeDetector exists but constructor failed — fall through to html5-qrcode
        initFallback()
        return
      }

      runningRef.current = true

      async function start() {
        let stream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          })
        } catch {
          if (!runningRef.current) return
          setErrorMsg('Camera access denied. Please allow camera access and try again.')
          setPhase('error')
          return
        }

        // Component may have unmounted while getUserMedia was pending
        if (!runningRef.current) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        const video = videoRef.current
        if (!video) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        video.srcObject = stream

        const track = stream.getVideoTracks()[0]
        trackRef.current = track

        // Apply focus constraints only after the camera is fully running.
        // Calling applyConstraints before play() resolves means the hardware
        // hasn't initialised yet and the constraints are silently ignored.
        video.addEventListener('loadedmetadata', () => {
          const capabilities = track.getCapabilities?.() || {}
          if (capabilities.focusMode?.includes('continuous')) {
            track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {})
          }
          if (capabilities.torch) setTorchSupported(true)
        }, { once: true })

        try {
          await video.play()
        } catch {
          // Autoplay blocked — shouldn't happen with muted + playsInline but guard anyway
        }

        async function scan() {
          if (!runningRef.current || scannedRef.current) return
          // readyState >= 2 means we have at least the current frame
          if (video.readyState >= 2) {
            try {
              const barcodes = await detector.detect(video)
              const acceptedBarcode = barcodes.find(isAcceptedFoodBarcode)
              if (acceptedBarcode && !scannedRef.current) {
                scannedRef.current = true
                stopCamera()
                lookup(getScannedValue(acceptedBarcode))
                return
              }
            } catch {
              // detect() can throw if the video frame is not yet ready — just continue
            }
          }
          if (runningRef.current) {
            animFrameRef.current = requestAnimationFrame(scan)
          }
        }

        animFrameRef.current = requestAnimationFrame(scan)
      }

      start()
    } else {
      // ── html5-qrcode fallback (iOS Safari, Firefox) ─────────────────────
      initFallback()
    }

    function initFallback() {
      const scanner = new Html5Qrcode('barcode-reader')
      scannerRef.current = scanner
      scanner.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: { width: 280, height: 140 }, aspectRatio: 1.333 },
        async (barcode) => {
          if (scannedRef.current || !FOOD_BARCODE_PATTERN.test(getScannedValue(barcode))) return
          scannedRef.current = true
          runningRef.current = false
          await scanner.stop()
          document.querySelectorAll('video').forEach(v => {
            v.srcObject?.getTracks().forEach(t => t.stop())
            v.srcObject = null
          })
          lookup(getScannedValue(barcode))
        },
        () => {}
      ).then(() => {
        runningRef.current = true
        const video = document.querySelector('#barcode-reader video')
        if (video?.srcObject) {
          const track = video.srcObject.getVideoTracks()[0]
          if (track) {
            trackRef.current = track
            const capabilities = track.getCapabilities?.() || {}
            if (capabilities.focusMode?.includes('continuous')) {
              track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {})
            }
            if (capabilities.torch) setTorchSupported(true)
          }
        }
      }).catch(() => {
        setErrorMsg('Camera access denied. Please allow camera access and try again.')
        setPhase('error')
      })
    }

    return () => {
      runningRef.current = false
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
      document.querySelectorAll('video').forEach(v => {
        v.srcObject?.getTracks().forEach(t => t.stop())
        v.srcObject = null
      })
    }
  }, [])

  function handleTapFocus(e) {
    const track = trackRef.current
    if (!track) return
    const capabilities = track.getCapabilities?.() || {}
    if (!capabilities.focusMode?.includes('manual') && !capabilities.pointOfInterest) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const constraints = {}
    if (capabilities.pointOfInterest) constraints.pointOfInterest = { x, y }
    if (capabilities.focusMode?.includes('manual')) constraints.focusMode = 'manual'
    track.applyConstraints({ advanced: [constraints] }).then(() => {
      if (capabilities.focusMode?.includes('continuous')) {
        setTimeout(() => {
          track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {})
        }, 1500)
      }
    }).catch(() => {})
  }

  function toggleTorch() {
    const track = trackRef.current
    if (!track) return
    const next = !torchOn
    track.applyConstraints({ advanced: [{ torch: next }] })
      .then(() => setTorchOn(next))
      .catch(() => {})
  }

  async function handleManualLookup() {
    const code = manualCode.trim()
    if (!code) return
    scannedRef.current = true
    stopCamera()
    setManualLooking(true)
    await lookup(code)
    setManualLooking(false)
  }

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
    invalidateCache(`user_foods:${user.id}`)
    onSave(data)
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  if (phase === 'scanning') {
    return (
      <div className="bs-screen">
        <div className="bs-header">
          <button className="back-btn" onClick={handleBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <span className="picker-title">Scan Barcode</span>
        </div>
        {USE_NATIVE_PHONE_SCANNER ? (
          <div className="bs-native-shell">
            <div className="bs-native-icon">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5h2M19 5h2M3 19h2M19 19h2" />
                <path d="M5 3v4M19 3v4M5 17v4M19 17v4" />
                <path d="M8 10h8M8 14h8" />
              </svg>
            </div>
            <div className="bs-native-title">Native scanner ready</div>
            <div className="bs-native-sub">
              Your phone is using the native camera scanner for better focus and faster barcode detection.
            </div>
            <button className="bs-native-open-btn" onClick={startNativePhoneScan} disabled={nativeScanOpening || manualLooking}>
              {nativeScanOpening ? 'Opening…' : 'Open Camera'}
            </button>
            {errorMsg && <div className="bs-inline-error">{errorMsg}</div>}
          </div>
        ) : (
          <div className="bs-viewfinder" onClick={handleTapFocus}>
            {NATIVE_SCANNER
              ? <video ref={videoRef} className="bs-reader" autoPlay playsInline muted />
              : <div id="barcode-reader" className="bs-reader" />
            }
            <div className="bs-overlay">
              <div className="bs-target" />
            </div>
            {torchSupported && (
              <button className={`bs-torch-btn ${torchOn ? 'on' : ''}`} onClick={e => { e.stopPropagation(); toggleTorch() }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={torchOn ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 2h6l1 7H8L9 2z"/><path d="M8 9l-2 13h12L16 9"/><line x1="12" y1="13" x2="12" y2="17"/>
                </svg>
              </button>
            )}
            <div className="bs-hint">Tap to focus · Point at a food barcode</div>
          </div>
        )}
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
      <div className="bs-verify-note">
        Scanned nutrition data may not be fully accurate. Please verify the food details before adding it to your log.
      </div>
      <div className="bs-manual">
        <div className="bs-manual-label">Or enter barcode manually</div>
        <div className="bs-manual-row">
          <input
            className="bs-manual-input"
            type="number"
            placeholder="e.g. 0123456789012"
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleManualLookup()}
          />
          <button
            className="bs-manual-btn"
            onClick={handleManualLookup}
            disabled={!manualCode.trim() || manualLooking}
          >
            {manualLooking ? '…' : 'Look up'}
          </button>
        </div>
        <div className="bs-manual-hint">Type the numbers printed below the barcode on the packaging (including the numbers at each end)</div>
      </div>
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
