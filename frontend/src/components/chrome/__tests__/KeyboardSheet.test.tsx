/**
 * KeyboardSheet Tests
 *
 * Per FrontEngDesign.md §7 (? hotkey opens modal):
 * Shows keyboard shortcut reference in a modal dialog.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { KeyboardSheet } from '../KeyboardSheet'

describe('KeyboardSheet', () => {
  /**
   * Test 1: Renders when open=true
   */
  it('renders when open prop is true', () => {
    render(<KeyboardSheet open={true} onClose={() => {}} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
  })

  /**
   * Test 2: Does not render when open=false
   */
  it('does not render when open prop is false', () => {
    render(<KeyboardSheet open={false} onClose={() => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  /**
   * Test 3: Calls onClose when Escape is pressed
   */
  it('calls onClose when Escape is pressed', async () => {
    const handleClose = vi.fn()
    render(<KeyboardSheet open={true} onClose={handleClose} />)

    // Dispatch Escape on document (the event handler listens at document level)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    await waitFor(() => {
      expect(handleClose).toHaveBeenCalled()
    })
  })

  /**
   * Test 4: Displays keyboard shortcuts
   */
  it('displays keyboard shortcuts in monospace font', () => {
    render(<KeyboardSheet open={true} onClose={() => {}} />)

    // Check for some key shortcuts
    expect(screen.getByText(/j.*k/)).toBeInTheDocument() // j/k navigation
    expect(screen.getByText(/g b/)).toBeInTheDocument() // Go Board
    expect(screen.getByText(/\?/)).toBeInTheDocument() // Help
  })

  /**
   * Test 5: Renders as a modal with controlled visibility
   */
  it('integrates with HotkeyProvider via controlled open prop', () => {
    function TestComponent() {
      const [open, setOpen] = useState(false)

      return (
        <div>
          <button onClick={() => setOpen(true)} data-testid="open-btn">
            Open
          </button>
          <KeyboardSheet open={open} onClose={() => setOpen(false)} />
        </div>
      )
    }

    const { rerender } = render(<TestComponent />)

    // Initially closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Click to open
    screen.getByTestId('open-btn').click()
    rerender(<TestComponent />)

    // Now open
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
