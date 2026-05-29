import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Capacitor } from '@capacitor/core'
import { getOfferings, purchasePackage, restorePurchases } from '../lib/purchases'
import '../styles/Paywall.css'

const BENEFITS = [
  'No ads — ever',
  'Unlimited barcode scanner uses',
  'Start training plans instantly',
  'Use the Progression Engine without ads',
]

export default function Paywall({ onClose, onPurchaseSuccess }) {
  const [offering, setOffering] = useState(null)
  const [selectedPkg, setSelectedPkg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState('')
  const [closing, setClosing] = useState(false)
  const overlayRef = useRef()
  const modalRef = useRef()
  const closeTimerRef = useRef(null)

  useEffect(() => {
    getOfferings().then(current => {
      setOffering(current)
      if (current?.availablePackages?.length) {
        const annual = current.availablePackages.find(p => p.packageType === 'ANNUAL')
        setSelectedPkg(annual ?? current.availablePackages[0])
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    modalRef.current?.focus()
  }, [loading])

  useEffect(() => () => {
    clearTimeout(closeTimerRef.current)
  }, [])

  const closeAnimated = () => {
    if (closing) return
    setClosing(true)
    clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      onClose?.()
    }, 340)
  }

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) closeAnimated()
  }

  const handlePurchase = async () => {
    if (!selectedPkg || purchasing) return
    setPurchasing(true)
    setError('')
    try {
      const isPremium = await purchasePackage(selectedPkg)
      if (isPremium) {
        window.dispatchEvent(new CustomEvent('liftlog:premium-purchased'))
        onPurchaseSuccess?.()
        closeAnimated()
      } else {
        setError('Purchase completed but premium not activated. Try restoring.')
      }
    } catch (e) {
      if (!e?.message?.toLowerCase().includes('cancel')) {
        setError('Purchase failed. Please try again.')
      }
    } finally {
      setPurchasing(false)
    }
  }

  const handleRestore = async () => {
    setRestoring(true)
    setError('')
    try {
      const isPremium = await restorePurchases()
      if (isPremium) {
        window.dispatchEvent(new CustomEvent('liftlog:premium-purchased'))
        onPurchaseSuccess?.()
        closeAnimated()
      } else {
        setError('No active subscription found for this Apple ID.')
      }
    } catch {
      setError('Restore failed. Please try again.')
    } finally {
      setRestoring(false)
    }
  }

  const annualPkg = offering?.availablePackages?.find(p => p.packageType === 'ANNUAL')
  const monthlyPkg = offering?.availablePackages?.find(p => p.packageType === 'MONTHLY')

  const savings = annualPkg && monthlyPkg
    ? Math.round((1 - (annualPkg.product.price / 12) / monthlyPkg.product.price) * 100)
    : null

  return createPortal(
    <div
      className={`paywall-overlay${closing ? ' paywall-overlay--closing' : ''}`}
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <div className="paywall-modal" ref={modalRef} tabIndex={-1}>
        <button className="paywall-close" onClick={closeAnimated} aria-label="Close">✕</button>

        <div className="paywall-header">
          <div className="paywall-logo-wrap">
            <svg className="paywall-sparkle paywall-sparkle-1" width="12" height="12" viewBox="-6 -6 12 12" aria-hidden="true">
              <path d="M0-5L1.2-1.2L5 0L1.2 1.2L0 5L-1.2 1.2L-5 0L-1.2-1.2Z" fill="#fde68a"/>
            </svg>
            <svg className="paywall-sparkle paywall-sparkle-2" width="8" height="8" viewBox="-4 -4 8 8" aria-hidden="true">
              <path d="M0-3.5L0.8-0.8L3.5 0L0.8 0.8L0 3.5L-0.8 0.8L-3.5 0L-0.8-0.8Z" fill="#f0c040"/>
            </svg>
            <svg className="paywall-sparkle paywall-sparkle-3" width="10" height="10" viewBox="-5 -5 10 10" aria-hidden="true">
              <path d="M0-4L1-1L4 0L1 1L0 4L-1 1L-4 0L-1-1Z" fill="#fde68a"/>
            </svg>
            <svg className="paywall-sparkle paywall-sparkle-4" width="7" height="7" viewBox="-3.5 -3.5 7 7" aria-hidden="true">
              <path d="M0-3L0.7-0.7L3 0L0.7 0.7L0 3L-0.7 0.7L-3 0L-0.7-0.7Z" fill="#f0c040"/>
            </svg>
            <svg className="paywall-sparkle paywall-sparkle-5" width="9" height="9" viewBox="-4.5 -4.5 9 9" aria-hidden="true">
              <path d="M0-3.8L0.9-0.9L3.8 0L0.9 0.9L0 3.8L-0.9 0.9L-3.8 0L-0.9-0.9Z" fill="#fde68a"/>
            </svg>
            <svg className="paywall-golden-logo" viewBox="252 200 520 624" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <linearGradient id="pwGold" x1="0.5" y1="0" x2="0.5" y2="1">
                  <stop offset="0%" stopColor="#fde68a"/>
                  <stop offset="40%" stopColor="#f0c040"/>
                  <stop offset="100%" stopColor="#b8720a"/>
                </linearGradient>
                <clipPath id="pwBarsClip">
                  <rect x="272" y="386" width="72" height="252" rx="28"/>
                  <rect x="374" y="290" width="72" height="444" rx="28"/>
                  <rect x="476" y="220" width="72" height="584" rx="28"/>
                  <rect x="578" y="290" width="72" height="444" rx="28"/>
                  <rect x="680" y="386" width="72" height="252" rx="28"/>
                </clipPath>
                <linearGradient id="pwShimmerGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(255,255,255,0)"/>
                  <stop offset="35%" stopColor="rgba(255,255,255,0)"/>
                  <stop offset="50%" stopColor="rgba(255,255,255,0.5)"/>
                  <stop offset="65%" stopColor="rgba(255,255,255,0)"/>
                  <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
                </linearGradient>
              </defs>
              <rect x="272" y="386" width="72" height="252" rx="28" fill="url(#pwGold)"/>
              <rect x="374" y="290" width="72" height="444" rx="28" fill="url(#pwGold)"/>
              <rect x="476" y="220" width="72" height="584" rx="28" fill="url(#pwGold)"/>
              <rect x="578" y="290" width="72" height="444" rx="28" fill="url(#pwGold)"/>
              <rect x="680" y="386" width="72" height="252" rx="28" fill="url(#pwGold)"/>
              <rect x="-520" y="200" width="1040" height="624" fill="url(#pwShimmerGrad)" clipPath="url(#pwBarsClip)">
                <animateTransform attributeName="transform" type="translate" from="-520 0" to="1040 0" dur="2.5s" repeatCount="indefinite"/>
              </rect>
            </svg>
          </div>
          <h2 id="paywall-title" className="paywall-title">microload Pro</h2>
          <p className="paywall-subtitle">Train without interruption</p>
        </div>

        <ul className="paywall-benefits">
          {BENEFITS.map(b => (
            <li key={b} className="paywall-benefit">
              <span className="paywall-check">✓</span>
              {b}
            </li>
          ))}
        </ul>

        {loading && <div className="paywall-loading">Loading plans…</div>}

        {!loading && offering && (
          <div className="paywall-packages">
            {annualPkg && (
              <button
                className={`paywall-pkg ${selectedPkg?.identifier === annualPkg.identifier ? 'paywall-pkg--selected' : ''}`}
                onClick={() => setSelectedPkg(annualPkg)}
              >
                <div className="paywall-pkg-left">
                  <span className="paywall-pkg-name">Annual</span>
                  {savings > 0 && <span className="paywall-pkg-badge">Save {savings}%</span>}
                </div>
                <div className="paywall-pkg-right">
                  <span className="paywall-pkg-price">{annualPkg.product.priceString}</span>
                  <span className="paywall-pkg-period">/ year</span>
                </div>
              </button>
            )}
            {monthlyPkg && (
              <button
                className={`paywall-pkg ${selectedPkg?.identifier === monthlyPkg.identifier ? 'paywall-pkg--selected' : ''}`}
                onClick={() => setSelectedPkg(monthlyPkg)}
              >
                <div className="paywall-pkg-left">
                  <span className="paywall-pkg-name">Monthly</span>
                </div>
                <div className="paywall-pkg-right">
                  <span className="paywall-pkg-price">{monthlyPkg.product.priceString}</span>
                  <span className="paywall-pkg-period">/ month</span>
                </div>
              </button>
            )}
          </div>
        )}

        {!loading && !offering && !Capacitor.isNativePlatform() && (
          <p className="paywall-unavailable">Subscriptions are only available on iOS and Android.</p>
        )}

        {!loading && !offering && Capacitor.isNativePlatform() && (
          <p className="paywall-unavailable">Could not load plans. Check your connection and try again.</p>
        )}

        {error && <p className="paywall-error">{error}</p>}

        {!loading && offering && (
          <button
            className="paywall-cta"
            onClick={handlePurchase}
            disabled={!selectedPkg || purchasing || restoring}
          >
            {purchasing ? 'Processing…' : `Subscribe — ${selectedPkg?.product?.priceString ?? ''}`}
          </button>
        )}

        <button
          className="paywall-restore"
          onClick={handleRestore}
          disabled={restoring || purchasing}
        >
          {restoring ? 'Restoring…' : 'Restore purchases'}
        </button>

        <p className="paywall-legal">
          Subscriptions renew automatically. Cancel anytime in your App Store or Play Store settings.
        </p>
      </div>
    </div>,
    document.body
  )
}
