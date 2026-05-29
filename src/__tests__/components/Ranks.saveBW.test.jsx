import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearCache } from '../../lib/cache.js'
import { UserProvider } from '../../context/UserContext.jsx'
import Ranks from '../../components/Ranks.jsx'

const supabaseMock = vi.hoisted(() => {
  const state = {
    responses: new Map(),
    defaultResponse: Promise.resolve({ data: null, error: null }),
  }

  function tableResponse(table) {
    const response = state.responses.get(table)
    return typeof response === 'function'
      ? response()
      : response || state.defaultResponse
  }

  function createQuery(table) {
    let promise = null
    const getPromise = () => {
      if (!promise) promise = Promise.resolve(tableResponse(table))
      return promise
    }

    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      not: vi.fn(() => query),
      gte: vi.fn(() => query),
      lt: vi.fn(() => query),
      lte: vi.fn(() => query),
      order: vi.fn(() => query),
      insert: vi.fn(() => query),
      update: vi.fn(() => query),
      delete: vi.fn(() => query),
      single: vi.fn(() => getPromise()),
      maybeSingle: vi.fn(() => getPromise()),
      then: (onFulfilled, onRejected) => getPromise().then(onFulfilled, onRejected),
      catch: onRejected => getPromise().catch(onRejected),
      finally: onFinally => getPromise().finally(onFinally),
    }

    return query
  }

  return {
    state,
    from: vi.fn(table => createQuery(table)),
  }
})

vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    from: supabaseMock.from,
  },
}))

vi.mock('../../data/exercises.js', () => ({
  fetchExercises: vi.fn(() => Promise.resolve([])),
}))

vi.mock('../../data/rankStates.js', () => ({
  fetchExerciseRankStates: vi.fn(() => Promise.resolve([])),
  mapExerciseRankStates: vi.fn(() => new Map()),
  upsertExerciseRankStates: vi.fn(() => Promise.resolve()),
}))

vi.mock('react-body-highlighter', () => ({
  default: () => <div data-testid="muscle-model" />,
}))

beforeEach(() => {
  clearCache()
  supabaseMock.state.responses.clear()
  supabaseMock.state.defaultResponse = Promise.resolve({ data: null, error: null })
})

function setupProfileWithoutBodyweight() {
  supabaseMock.state.responses.set('profiles', Promise.resolve({
    data: { gender: 'male', bodyweight: null, unit_preference: 'kg' },
    error: null,
  }))
  supabaseMock.state.responses.set('exercise_prs', Promise.resolve({
    data: [],
    error: null,
  }))
}

function renderRanks(props = {}) {
  return render(
    <UserProvider user={{ id: 'user-1' }}>
      <Ranks refreshTick={0} {...props} />
    </UserProvider>
  )
}

describe('Ranks saveBW → onBodyweightChanged callback', () => {
  it('invokes onBodyweightChanged after a successful bodyweight save', async () => {
    setupProfileWithoutBodyweight()
    const onBodyweightChanged = vi.fn()
    renderRanks({ onBodyweightChanged })

    const input = await screen.findByPlaceholderText('e.g. 80')
    fireEvent.change(input, { target: { value: '80' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(onBodyweightChanged).toHaveBeenCalledTimes(1)
    })
  })

  it('does not invoke onBodyweightChanged when the value fails validation', async () => {
    setupProfileWithoutBodyweight()
    const onBodyweightChanged = vi.fn()
    renderRanks({ onBodyweightChanged })

    const input = await screen.findByPlaceholderText('e.g. 80')
    fireEvent.change(input, { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByText(/Bodyweight must be between/)
    expect(onBodyweightChanged).not.toHaveBeenCalled()
  })

  it('does not invoke onBodyweightChanged when the Supabase save fails', async () => {
    setupProfileWithoutBodyweight()
    supabaseMock.state.defaultResponse = Promise.resolve({
      data: null,
      error: new Error('network down'),
    })
    supabaseMock.state.responses.set('profiles', Promise.resolve({
      data: { gender: 'male', bodyweight: null, unit_preference: 'kg' },
      error: null,
    }))

    const onBodyweightChanged = vi.fn()
    renderRanks({ onBodyweightChanged })

    const input = await screen.findByPlaceholderText('e.g. 80')
    fireEvent.change(input, { target: { value: '80' } })

    supabaseMock.state.responses.set('profiles', Promise.resolve({
      data: null,
      error: new Error('network down'),
    }))

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByText('network down')
    expect(onBodyweightChanged).not.toHaveBeenCalled()
  })

  it('does not throw when onBodyweightChanged prop is omitted', async () => {
    setupProfileWithoutBodyweight()
    renderRanks()

    const input = await screen.findByPlaceholderText('e.g. 80')
    fireEvent.change(input, { target: { value: '80' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.queryByText('Set your bodyweight to unlock ranks')).toBeNull()
    })
  })
})
