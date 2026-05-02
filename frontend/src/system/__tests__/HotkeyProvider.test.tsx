/**
 * HotkeyProvider Tests
 *
 * Per TDD.md and superpowers:test-driven-development:
 * Write failing tests first, verify failure, then implement minimal code.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { HotkeyProvider, useHotkeys } from '../HotkeyProvider'

describe('HotkeyProvider', () => {
  /**
   * Test 1: HotkeyProvider can be instantiated
   */
  it('renders children', () => {
    render(
      <HotkeyProvider>
        <div data-testid="test-child">Test Content</div>
      </HotkeyProvider>
    )
    expect(screen.getByTestId('test-child')).toBeInTheDocument()
  })

  /**
   * Test 2: Dispatches action on single-key hotkey (j)
   */
  it('dispatches action when single-key hotkey is pressed', async () => {
    const mockDispatch = vi.fn()

    function TestComponent() {
      useHotkeys({ j: () => mockDispatch('nav-down') })
      return <div data-testid="test-component">Test</div>
    }

    render(
      <HotkeyProvider>
        <TestComponent />
      </HotkeyProvider>
    )

    const event = new KeyboardEvent('keydown', { key: 'j' })
    document.dispatchEvent(event)

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith('nav-down')
    })
  })

  /**
   * Test 3: Handles two-key sequences (g b)
   */
  it('handles two-key sequence (g b) with 1.5s timeout', async () => {
    const mockDispatch = vi.fn()

    function TestComponent() {
      useHotkeys({
        'g b': () => mockDispatch('go-board'),
      })
      return <div data-testid="test-component">Test</div>
    }

    render(
      <HotkeyProvider>
        <TestComponent />
      </HotkeyProvider>
    )

    // Press 'g'
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }))

    // Press 'b' within timeout
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }))

    await waitFor(
      () => {
        expect(mockDispatch).toHaveBeenCalledWith('go-board')
      },
      { timeout: 2000 }
    )
  })

  /**
   * Test 4: Two-key sequence resets after timeout
   */
  it('resets two-key sequence if second key not pressed within 1.5s', async () => {
    const mockDispatch = vi.fn()

    function TestComponent() {
      useHotkeys({
        'g b': () => mockDispatch('go-board'),
      })
      return <div data-testid="test-component">Test</div>
    }

    vi.useFakeTimers()

    render(
      <HotkeyProvider>
        <TestComponent />
      </HotkeyProvider>
    )

    // Press 'g'
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }))

    // Wait for timeout to exceed 1.5s
    vi.advanceTimersByTime(1600)

    // Press 'b' after timeout
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }))

    expect(mockDispatch).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  /**
   * Test 5: Ignores hotkeys when input is focused
   */
  it('ignores hotkeys when input or textarea is focused', async () => {
    const mockDispatch = vi.fn()

    function TestComponent() {
      useHotkeys({ j: () => mockDispatch('nav-down') })
      return (
        <>
          <input data-testid="test-input" />
          <div data-testid="test-component">Test</div>
        </>
      )
    }

    render(
      <HotkeyProvider>
        <TestComponent />
      </HotkeyProvider>
    )

    const input = screen.getByTestId('test-input') as HTMLInputElement
    input.focus()

    const event = new KeyboardEvent('keydown', { key: 'j' })
    document.dispatchEvent(event)

    // Give some time for the handler to run
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(mockDispatch).not.toHaveBeenCalled()
  })

  /**
   * Test 6: Multiple hotkeys can be registered
   */
  it('handles multiple hotkeys', async () => {
    const mockDispatch = vi.fn()

    function TestComponent() {
      useHotkeys({
        j: () => mockDispatch('nav-down'),
        k: () => mockDispatch('nav-up'),
        n: () => mockDispatch('new'),
      })
      return <div data-testid="test-component">Test</div>
    }

    render(
      <HotkeyProvider>
        <TestComponent />
      </HotkeyProvider>
    )

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }))

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenNthCalledWith(1, 'nav-down')
      expect(mockDispatch).toHaveBeenNthCalledWith(2, 'nav-up')
    })
  })
})
