import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { UserProvider } from '../../context/UserContext.jsx'
import Profile from '../../components/Profile.jsx'
import { clearAccountDeletionLocalData, clearCache, getCached, invalidateCache, setCached } from '../../lib/cache'
import { markIntentionalLogout, refreshPremiumStatus } from '../../lib/purchases'
import { saveThemeForUser } from '../../lib/theme'
import { supabase } from '../../lib/supabase'

const supabaseMock = vi.hoisted(() => {
  const state = {
    profileUpdateResponse: {
      data: {
        id: 'user-1',
        username: 'alice2',
        full_name: 'Alice Updated',
        age: 31,
        gender: 'Female',
        unit_preference: 'kg',
        default_rest_seconds: 120,
      },
      error: null,
    },
    profileUpdates: [],
    bugCount: 0,
    bugInsertError: null,
    functionResponse: { data: { success: true }, error: null },
  }

  function createQuery(table) {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      gte: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(payload => {
        state.profileUpdates.push({ table, payload })
        return query
      }),
      insert: vi.fn(() => Promise.resolve({ data: null, error: state.bugInsertError })),
      single: vi.fn(() => Promise.resolve(table === 'profiles'
        ? state.profileUpdateResponse
        : { data: null, error: null })),
      then: (onFulfilled, onRejected) => {
        const response = table === 'bug_reports'
          ? { data: [], count: state.bugCount, error: null }
          : { data: [], error: null }
        return Promise.resolve(response).then(onFulfilled, onRejected)
      },
      catch: onRejected => Promise.resolve({ data: [], error: null }).catch(onRejected),
    }
    return query
  }

  return {
    state,
    from: vi.fn(table => createQuery(table)),
    auth: { signOut: vi.fn(() => Promise.resolve({ error: null })) },
    functions: { invoke: vi.fn(() => Promise.resolve(state.functionResponse)) },
  }
})

const cacheMock = vi.hoisted(() => ({
  cachedProfile: null,
  getCached: vi.fn(() => cacheMock.cachedProfile),
  setCached: vi.fn(),
  invalidateCache: vi.fn(),
  clearCache: vi.fn(),
  clearAccountDeletionLocalData: vi.fn(),
}))

const themeMock = vi.hoisted(() => ({
  switchTheme: vi.fn(),
  previewTheme: vi.fn(),
  saveThemeForUser: vi.fn(() => Promise.resolve()),
}))

const purchaseMock = vi.hoisted(() => ({
  isPremium: false,
  refreshPremiumStatus: vi.fn(() => Promise.resolve(purchaseMock.isPremium)),
  isPremiumSync: vi.fn(() => purchaseMock.isPremium),
  markIntentionalLogout: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: supabaseMock,
}))

vi.mock('../../lib/cache', () => cacheMock)

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({
    themeId: 'dark',
    switchTheme: themeMock.switchTheme,
    previewTheme: themeMock.previewTheme,
    themes: [
      { id: 'dark', name: 'Dark', vars: { '--surface2': '#111' }, accent: '#fff' },
      { id: 'light', name: 'Light', vars: { '--surface2': '#eee' }, accent: '#111' },
    ],
  }),
}))

vi.mock('../../lib/theme', async () => {
  const actual = await vi.importActual('../../lib/theme')
  return {
    ...actual,
    saveThemeForUser: themeMock.saveThemeForUser,
  }
})

vi.mock('../../lib/purchases', () => purchaseMock)

vi.mock('../../lib/restNotification', () => ({
  cancelRestNotification: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../components/RestWheelPicker.jsx', () => ({
  default: ({ value, onChange }) => (
    <button type="button" onClick={() => onChange(120)}>Rest {value}</button>
  ),
}))

vi.mock('../../components/profile/WeightChart.jsx', () => ({
  default: () => <div>Weight chart</div>,
}))

vi.mock('../../components/profile/FriendsSection.jsx', () => ({
  default: () => <div>Friends section</div>,
}))

vi.mock('../../components/profile/FriendProfileDetail.jsx', () => ({
  default: () => <div>Friend detail</div>,
}))

vi.mock('../../components/profile/WorkoutDayDetail.jsx', () => ({
  default: () => <div>Workout day detail</div>,
}))

vi.mock('../../components/Achievements.jsx', () => ({
  default: () => <div>Achievements view</div>,
}))

vi.mock('../../components/Paywall.jsx', () => ({
  default: ({ onClose, onPurchaseSuccess }) => (
    <div>
      <div>Mock Paywall</div>
      <button onClick={onPurchaseSuccess}>Complete Purchase</button>
      <button onClick={onClose}>Close Paywall</button>
    </div>
  ),
}))

const cachedProfile = {
  id: 'user-1',
  username: 'alice',
  full_name: 'Alice Lifter',
  age: 30,
  gender: 'Female',
  unit_preference: 'kg',
  default_rest_seconds: 90,
  bodyweight: 70,
  theme: 'dark',
}

function renderProfile(props = {}) {
  return render(
    <UserProvider user={{ id: 'user-1', email: 'alice@example.com' }}>
      <Profile onChallenge={vi.fn()} onWorkoutDeleted={vi.fn()} onBodyweightChanged={vi.fn()} onProfileSaved={vi.fn()} {...props} />
    </UserProvider>,
  )
}

beforeEach(() => {
  cacheMock.cachedProfile = { email: 'alice@example.com', profile: cachedProfile }
  purchaseMock.isPremium = false
  supabaseMock.state.profileUpdates = []
  supabaseMock.state.bugCount = 0
  supabaseMock.state.bugInsertError = null
  supabaseMock.state.functionResponse = { data: { success: true }, error: null }
})

describe('Profile', () => {
  it('loads cached profile data and renders the profile shell', async () => {
    renderProfile()

    await waitFor(() => {
      expect(screen.getByText('Alice Lifter')).toBeTruthy()
    })

    expect(screen.getByText('alice@example.com')).toBeTruthy()
    expect(screen.getByText('Go Premium')).toBeTruthy()
    expect(screen.getByText('Friends section')).toBeTruthy()
    expect(getCached).toHaveBeenCalledWith('profile')
  })

  it('validates edit form input before saving and saves valid profile changes', async () => {
    const onProfileSaved = vi.fn()
    const { container } = renderProfile({ onProfileSaved })
    await screen.findByText('Alice Lifter')

    fireEvent.click(screen.getByText('Edit Profile'))
    fireEvent.change(screen.getByPlaceholderText('@username'), { target: { value: '@ab' } })

    await act(async () => {
      fireEvent.click(screen.getByText('Save Changes'))
    })

    expect(container.querySelector('.profile-save-error')?.textContent).toContain('Username')
    expect(supabaseMock.state.profileUpdates).toHaveLength(0)

    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Alice Updated' } })
    fireEvent.change(screen.getByPlaceholderText('@username'), { target: { value: '@alice2' } })

    await act(async () => {
      fireEvent.click(screen.getByText('Save Changes'))
    })

    expect(supabaseMock.state.profileUpdates[0]).toEqual({
      table: 'profiles',
      payload: expect.objectContaining({
        username: 'alice2',
        full_name: 'Alice Updated',
        default_rest_seconds: 90,
      }),
    })
    expect(invalidateCache).toHaveBeenCalledWith('profile', 'home', 'ranks')
    expect(onProfileSaved).toHaveBeenCalledTimes(1)
  })

  it('allows saving with an empty full name (name is optional)', async () => {
    const { container } = renderProfile()
    await screen.findByText('Alice Lifter')

    fireEvent.click(screen.getByText('Edit Profile'))
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: '' } })

    await act(async () => {
      fireEvent.click(screen.getByText('Save Changes'))
    })

    expect(container.querySelector('.profile-save-error')).toBeNull()
    expect(supabaseMock.state.profileUpdates[0].payload).toEqual(expect.objectContaining({ full_name: null }))
  })

  it('saves preferred theme through the theme service', async () => {
    renderProfile()
    await screen.findByText('Alice Lifter')

    await act(async () => {
      fireEvent.click(screen.getByText('Set as preferred colour'))
    })

    expect(saveThemeForUser).toHaveBeenCalledWith('dark', 'user-1')
    expect(setCached).toHaveBeenCalledWith('profile', expect.objectContaining({
      profile: expect.objectContaining({ id: 'user-1' }),
    }))
  })

  it('opens the paywall and switches to the active subscription card after purchase success', async () => {
    renderProfile()
    await screen.findByText('Go Premium')

    fireEvent.click(screen.getByText('Go Premium'))
    expect(screen.getByText('Mock Paywall')).toBeTruthy()

    fireEvent.click(screen.getByText('Complete Purchase'))
    expect(screen.getByText('Active subscription')).toBeTruthy()
    expect(refreshPremiumStatus).toHaveBeenCalled()
  })

  it('signs out through Supabase after clearing local session state', async () => {
    renderProfile()
    await screen.findByText('Sign Out')

    await act(async () => {
      fireEvent.click(screen.getByText('Sign Out'))
    })

    expect(clearCache).toHaveBeenCalledTimes(1)
    expect(markIntentionalLogout).toHaveBeenCalledTimes(1)
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
  })

  it('rate-limits bug reports and submits when under the limit', async () => {
    renderProfile()
    await screen.findByText('Report a Bug')

    fireEvent.click(screen.getByText('Report a Bug'))
    fireEvent.change(screen.getByPlaceholderText('Describe what happened...'), {
      target: { value: 'The workout timer stopped responding after resume.' },
    })
    supabaseMock.state.bugCount = 10

    await act(async () => {
      fireEvent.click(screen.getByText('Submit'))
    })

    expect(screen.getByText(/10 reports in the last 24 hours/)).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText('Describe what happened...'), {
      target: { value: 'The nutrition search froze on cached results.' },
    })
    supabaseMock.state.bugCount = 0

    await act(async () => {
      fireEvent.click(screen.getByText('Submit'))
    })

    expect(screen.getByText('Thanks!')).toBeTruthy()
  })

  it('guards account deletion until DELETE is typed, then invokes deletion cleanup', async () => {
    renderProfile()
    await screen.findByText('Alice Lifter')

    fireEvent.click(screen.getAllByText('Delete Account').find(element => element.tagName === 'BUTTON'))
    const deleteForever = screen.getByText('Delete Forever')

    expect(deleteForever.disabled).toBe(true)

    fireEvent.change(screen.getByPlaceholderText('DELETE'), { target: { value: 'DELETE' } })

    await act(async () => {
      fireEvent.click(deleteForever)
    })

    expect(supabase.functions.invoke).toHaveBeenCalledWith('delete-account')
    expect(clearAccountDeletionLocalData).toHaveBeenCalledWith('user-1')
    expect(markIntentionalLogout).toHaveBeenCalled()
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })
})
