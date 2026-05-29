import { render, screen, fireEvent } from '@testing-library/react'
import { useRef } from 'react'
import { useFocusTrap } from '../../lib/useFocusTrap'

function Trap({ active = true, onEscape, children }) {
  const ref = useRef(null)
  useFocusTrap(ref, { active, onEscape })
  return <div data-testid="trap" ref={ref}>{children}</div>
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useFocusTrap', () => {
  it('does not auto-focus when inactive', () => {
    render(
      <Trap active={false}>
        <button data-testid="btn">Button</button>
      </Trap>
    )
    expect(document.activeElement).not.toBe(screen.getByTestId('btn'))
  })

  it('focuses the first focusable element on mount', () => {
    render(
      <Trap>
        <button data-testid="btn1">First</button>
        <button data-testid="btn2">Second</button>
      </Trap>
    )
    expect(document.activeElement).toBe(screen.getByTestId('btn1'))
  })

  it('wraps Tab forward from the last focusable to the first', () => {
    render(
      <Trap>
        <button data-testid="btn1">First</button>
        <button data-testid="btn2">Last</button>
      </Trap>
    )
    screen.getByTestId('btn2').focus()
    fireEvent.keyDown(screen.getByTestId('trap'), { key: 'Tab', shiftKey: false })
    expect(document.activeElement).toBe(screen.getByTestId('btn1'))
  })

  it('wraps Shift+Tab backward from the first focusable to the last', () => {
    render(
      <Trap>
        <button data-testid="btn1">First</button>
        <button data-testid="btn2">Last</button>
      </Trap>
    )
    screen.getByTestId('btn1').focus()
    fireEvent.keyDown(screen.getByTestId('trap'), { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(screen.getByTestId('btn2'))
  })

  it('calls onEscape when Escape is pressed', () => {
    const onEscape = vi.fn()
    render(
      <Trap onEscape={onEscape}>
        <button>Button</button>
      </Trap>
    )
    fireEvent.keyDown(screen.getByTestId('trap'), { key: 'Escape' })
    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('does not throw when Escape is pressed with no onEscape handler', () => {
    render(
      <Trap>
        <button>Button</button>
      </Trap>
    )
    expect(() => {
      fireEvent.keyDown(screen.getByTestId('trap'), { key: 'Escape' })
    }).not.toThrow()
  })

  it('restores focus to the previously focused element on unmount', () => {
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()
    expect(document.activeElement).toBe(outside)

    const { unmount } = render(
      <Trap>
        <button>Inside</button>
      </Trap>
    )
    unmount()
    expect(document.activeElement).toBe(outside)
  })

  it('does not crash when there are no focusable elements and Tab is pressed', () => {
    render(
      <Trap>
        <span>No buttons here</span>
      </Trap>
    )
    expect(() => {
      fireEvent.keyDown(screen.getByTestId('trap'), { key: 'Tab' })
    }).not.toThrow()
  })

  it('ignores non-Tab non-Escape keys', () => {
    const onEscape = vi.fn()
    render(
      <Trap onEscape={onEscape}>
        <button data-testid="btn">Button</button>
      </Trap>
    )
    fireEvent.keyDown(screen.getByTestId('trap'), { key: 'Enter' })
    expect(onEscape).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByTestId('btn'))
  })
})
