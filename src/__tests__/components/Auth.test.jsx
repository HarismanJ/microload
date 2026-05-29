import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import Auth from '../../components/Auth.jsx'

const supabaseMock = vi.hoisted(() => ({
  auth: {
    resetPasswordForEmail: vi.fn(),
    signInWithIdToken: vi.fn(),
    signInWithOAuth: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    updateUser: vi.fn(),
  },
}))

vi.mock('../../lib/supabase.js', () => ({
  supabase: supabaseMock,
}))

vi.mock('@capgo/capacitor-social-login', () => ({
  SocialLogin: {
    initialize: vi.fn(),
    login: vi.fn(),
  },
}))

function fillResetPasswords(password = 'Password123') {
  fireEvent.change(screen.getByPlaceholderText('Password'), {
    target: { value: password },
  })
  fireEvent.change(screen.getByPlaceholderText('Confirm Password'), {
    target: { value: password },
  })
}

describe('Auth password recovery', () => {
  beforeEach(() => {
    supabaseMock.auth.updateUser.mockResolvedValue({ error: null })
  })

  it('clears pending recovery after a successful password update', async () => {
    const onRecoveryDone = vi.fn()
    localStorage.setItem('microload:pendingRecovery', '1')

    render(<Auth recoveryMode onRecoveryDone={onRecoveryDone} />)
    fillResetPasswords()
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }))

    await waitFor(() => {
      expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({ password: 'Password123' })
    })
    expect(localStorage.getItem('microload:pendingRecovery')).toBeNull()
    expect(onRecoveryDone).toHaveBeenCalledTimes(1)
  })

  it('keeps pending recovery when password update fails', async () => {
    const onRecoveryDone = vi.fn()
    supabaseMock.auth.updateUser.mockResolvedValue({ error: new Error('reset failed') })
    localStorage.setItem('microload:pendingRecovery', '1')

    render(<Auth recoveryMode onRecoveryDone={onRecoveryDone} />)
    fillResetPasswords()
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }))

    expect(await screen.findByText('reset failed')).toBeTruthy()
    expect(localStorage.getItem('microload:pendingRecovery')).toBe('1')
    expect(onRecoveryDone).not.toHaveBeenCalled()
  })
})
