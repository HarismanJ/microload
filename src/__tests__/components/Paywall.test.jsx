import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Capacitor } from '@capacitor/core'

import Paywall from '../../components/Paywall.jsx'
import { getOfferings, purchasePackage, restorePurchases } from '../../lib/purchases'

vi.mock('../../lib/purchases', () => ({
  getOfferings: vi.fn(),
  purchasePackage: vi.fn(),
  restorePurchases: vi.fn(),
}))

const annualPackage = {
  identifier: 'annual',
  packageType: 'ANNUAL',
  product: { price: 59.99, priceString: '$59.99' },
}

const monthlyPackage = {
  identifier: 'monthly',
  packageType: 'MONTHLY',
  product: { price: 9.99, priceString: '$9.99' },
}

function offering(packages = [annualPackage, monthlyPackage]) {
  return { availablePackages: packages }
}

function renderPaywall(props = {}) {
  return render(<Paywall onClose={vi.fn()} onPurchaseSuccess={vi.fn()} {...props} />)
}

beforeEach(() => {
  vi.useRealTimers()
  getOfferings.mockResolvedValue(offering())
  purchasePackage.mockResolvedValue(true)
  restorePurchases.mockResolvedValue(true)
  Capacitor.isNativePlatform.mockReturnValue(false)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Paywall', () => {
  it('shows a loading state while offerings are pending', () => {
    getOfferings.mockReturnValue(new Promise(() => {}))

    renderPaywall()

    expect(screen.getByText('Loading plans…')).toBeTruthy()
  })

  it('renders annual and monthly packages, defaults to annual, and shows savings', async () => {
    renderPaywall()

    await screen.findByText('Annual')

    expect(screen.getByText('$59.99')).toBeTruthy()
    expect(screen.getByText('Monthly')).toBeTruthy()
    expect(screen.getByText('$9.99')).toBeTruthy()
    expect(screen.getByText('Save 50%')).toBeTruthy()
    expect(document.body.querySelector('.paywall-pkg--selected')?.textContent).toContain('Annual')
    expect(screen.getByText('Subscribe — $59.99')).toBeTruthy()
  })

  it('purchases the selected package, emits the premium event, calls success, and closes after the animation', async () => {
    const onClose = vi.fn()
    const onPurchaseSuccess = vi.fn()
    const premiumListener = vi.fn()
    window.addEventListener('liftlog:premium-purchased', premiumListener)

    renderPaywall({ onClose, onPurchaseSuccess })
    await screen.findByText('Annual')
    vi.useFakeTimers()

    await act(async () => {
      fireEvent.click(screen.getByText('Subscribe — $59.99'))
    })

    expect(purchasePackage).toHaveBeenCalledWith(annualPackage)
    expect(premiumListener).toHaveBeenCalledTimes(1)
    expect(onPurchaseSuccess).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(340)
    })

    expect(onClose).toHaveBeenCalledTimes(1)
    window.removeEventListener('liftlog:premium-purchased', premiumListener)
  })

  it('shows a friendly purchase error when RevenueCat fails for a non-cancel reason', async () => {
    purchasePackage.mockRejectedValue(new Error('network down'))

    renderPaywall()
    await screen.findByText('Annual')

    await act(async () => {
      fireEvent.click(screen.getByText('Subscribe — $59.99'))
    })

    expect(screen.getByText('Purchase failed. Please try again.')).toBeTruthy()
  })

  it('restores an active subscription and closes after the animation', async () => {
    const onClose = vi.fn()
    const onPurchaseSuccess = vi.fn()

    renderPaywall({ onClose, onPurchaseSuccess })
    await screen.findByText('Annual')
    vi.useFakeTimers()

    await act(async () => {
      fireEvent.click(screen.getByText('Restore purchases'))
    })

    expect(restorePurchases).toHaveBeenCalledTimes(1)
    expect(onPurchaseSuccess).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(340)
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows restore and availability errors for free/web/native edge states', async () => {
    restorePurchases.mockResolvedValue(false)

    renderPaywall()
    await screen.findByText('Annual')

    await act(async () => {
      fireEvent.click(screen.getByText('Restore purchases'))
    })

    expect(screen.getByText('No active subscription found for this Apple ID.')).toBeTruthy()

    getOfferings.mockResolvedValueOnce(null)
    const webView = renderPaywall()
    await waitFor(() => {
      expect(webView.getByText('Subscriptions are only available on iOS and Android.')).toBeTruthy()
    })
    webView.unmount()

    Capacitor.isNativePlatform.mockReturnValue(true)
    getOfferings.mockResolvedValueOnce(null)
    const nativeView = renderPaywall()
    await waitFor(() => {
      expect(nativeView.getByText('Could not load plans. Check your connection and try again.')).toBeTruthy()
    })
  })
})
