import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

import { UserProvider } from '../../context/UserContext.jsx'
import BarcodeScanner from '../../components/nutrition/BarcodeScanner.jsx'

const nativeScannerMock = vi.hoisted(() => ({
  isSupported: vi.fn(() => Promise.resolve({ supported: true })),
  checkPermissions: vi.fn(() => Promise.resolve({ camera: 'granted' })),
  requestPermissions: vi.fn(() => Promise.resolve({ camera: 'granted' })),
  scan: vi.fn(() => Promise.resolve({
    barcodes: [{ rawValue: '0123456789012', format: 'ean_13' }],
  })),
  removeAllListeners: vi.fn(() => Promise.resolve()),
  stopScan: vi.fn(() => Promise.resolve()),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(() => 'ios'),
    isNativePlatform: vi.fn(() => true),
    registerPlugin: vi.fn(name => ({ name })),
  },
}))

vi.mock('@capacitor-mlkit/barcode-scanning', () => ({
  BarcodeFormat: {
    Ean13: 'ean_13',
    Ean8: 'ean_8',
    UpcA: 'upc_a',
    UpcE: 'upc_e',
  },
  BarcodeScanner: nativeScannerMock,
}))

vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('../../lib/usdaFoods.js', () => ({
  lookupUsdaBarcode: vi.fn(() => Promise.resolve({
    name: 'Scanned Yogurt',
    brand: 'Test Dairy',
    serving_size: 170,
    serving_unit: 'g',
    calories: 120,
    protein: 12,
    carbs: 14,
    fat: 2,
  })),
}))

describe('BarcodeScanner native flow', () => {
  beforeEach(() => {
    nativeScannerMock.isSupported.mockResolvedValue({ supported: true })
    nativeScannerMock.checkPermissions.mockResolvedValue({ camera: 'granted' })
    nativeScannerMock.requestPermissions.mockResolvedValue({ camera: 'granted' })
    nativeScannerMock.scan.mockResolvedValue({
      barcodes: [{ rawValue: '0123456789012', format: 'ean_13' }],
    })
    nativeScannerMock.removeAllListeners.mockResolvedValue()
    nativeScannerMock.stopScan.mockResolvedValue()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the confirm screen after a native barcode scan lookup succeeds', async () => {
    const onRetry = vi.fn()
    render(
      <UserProvider user={{ id: 'user-1' }}>
        <BarcodeScanner onSave={vi.fn()} onBack={vi.fn()} onRetry={onRetry} />
      </UserProvider>,
    )

    expect(await screen.findByText('Confirm Food')).toBeTruthy()
    expect(screen.getByDisplayValue('Scanned Yogurt')).toBeTruthy()
    fireEvent.click(screen.getByText('Retry Scan'))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(nativeScannerMock.scan).toHaveBeenCalled()
  })

  it('stops native scanning and re-enables retry when scan times out', async () => {
    vi.useFakeTimers()
    nativeScannerMock.scan.mockImplementation(() => new Promise(() => {}))

    render(
      <UserProvider user={{ id: 'user-1' }}>
        <BarcodeScanner onSave={vi.fn()} onBack={vi.fn()} onRetry={vi.fn()} />
      </UserProvider>,
    )

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    const openButton = screen.getByRole('button', { name: 'Opening…' })
    expect(openButton.disabled).toBe(true)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
      await Promise.resolve()
    })

    expect(screen.getByText('Camera scanner timed out. You can try again or enter the barcode manually.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Open Camera' }).disabled).toBe(false)
    expect(nativeScannerMock.stopScan).toHaveBeenCalled()
  })
})
