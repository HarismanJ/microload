import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { UserProvider } from '../../context/UserContext.jsx'
import NutritionFoodPicker from '../../components/nutrition/NutritionFoodPicker.jsx'

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(() => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      not: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      then: onFulfilled => Promise.resolve({ data: [], error: null }).then(onFulfilled),
    }
    return query
  }),
}))

vi.mock('../../lib/supabase.js', () => ({
  supabase: supabaseMock,
}))

vi.mock('../../lib/admob.js', () => ({
  showRewardedAd: vi.fn(() => Promise.resolve(true)),
}))

vi.mock('../../components/nutrition/BarcodeScanner.jsx', () => ({
  default: ({ onSave }) => (
    <button
      type="button"
      onClick={() => onSave({
        id: 'food-1',
        name: 'Scanned Cereal',
        brand: 'Test Brand',
        serving_size: 40,
        serving_unit: 'g',
        calories: 150,
        protein: 4,
        carbs: 28,
        fat: 2,
      })}
    >
      Mock scanner add
    </button>
  ),
}))

function renderPicker(props = {}) {
  return render(
    <UserProvider user={{ id: 'user-1' }}>
      <NutritionFoodPicker onAdd={vi.fn()} onClose={vi.fn()} {...props} />
    </UserProvider>,
  )
}

describe('NutritionFoodPicker barcode scanner flow', () => {
  it('opens the amount screen after scanner review before logging the food', async () => {
    const onAdd = vi.fn()
    renderPicker({ onAdd })

    fireEvent.click(screen.getByRole('button', { name: /Scan Barcode/i }))
    fireEvent.click(await screen.findByText('Watch Ad & Scan'))
    fireEvent.click(await screen.findByText('Mock scanner add'))

    expect(onAdd).not.toHaveBeenCalled()
    expect(await screen.findByText('Scanned Cereal')).toBeTruthy()
    expect(screen.getByText(/Amount/i)).toBeTruthy()
    expect(screen.getByText('1 serving selected')).toBeTruthy()

    fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add to Log' }))

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Scanned Cereal',
      }), 2)
    })
  })
})
