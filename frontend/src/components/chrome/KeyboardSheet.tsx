/**
 * KeyboardSheet — Keyboard shortcut reference modal
 *
 * Per FrontEngDesign.md §7:
 * Shows when ? is pressed, closes on Esc.
 * Uses monospace font for shortcuts, styled as a ruled dialog.
 */

import { useEffect } from 'react'

interface KeyboardSheetProps {
  open: boolean
  onClose: () => void
}

const SHORTCUTS = [
  { key: 'j / k', desc: 'Move focus to next / previous card' },
  { key: 'g b', desc: 'Go to Board' },
  { key: 'g e', desc: 'Go to Epics' },
  { key: 'Enter', desc: 'Open focused card' },
  { key: 'Esc', desc: 'Close detail / modal / cancel drag' },
  { key: 'n', desc: 'New journal entry (open compose)' },
  { key: 'c', desc: 'Collapse / expand focused column' },
  { key: '/', desc: 'Focus filter input' },
  { key: '?', desc: 'Show keyboard shortcuts' },
  { key: 't', desc: 'Toggle theme (light ↔ dark)' },
]

export function KeyboardSheet({ open, onClose }: KeyboardSheetProps) {
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <dialog
      open={open}
      className="fixed inset-0 z-50 bg-black/50 p-0 rounded-none"
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
        <div className="max-w-2xl w-full mx-4 bg-card border border-ink3 pointer-events-auto">
          <div className="border-b border-ink3">
            <div className="p-card">
              <h2 className="text-h2 font-display text-ink">Keyboard Shortcuts</h2>
              <p className="text-bodysm text-ink2 mt-snug">
                Live in the app without touching the mouse
              </p>
            </div>
          </div>

          <div className="p-card max-h-[70vh] overflow-y-auto">
            <table className="w-full">
              <tbody>
                {SHORTCUTS.map((shortcut, idx) => (
                  <tr
                    key={idx}
                    className={[
                      'border-b border-ink4',
                      idx === SHORTCUTS.length - 1 ? 'border-b-0' : '',
                    ].join(' ')}
                  >
                    <td className="py-tight pr-card font-mono text-meta text-ink font-bold">
                      {shortcut.key}
                    </td>
                    <td className="py-tight text-body text-ink">
                      {shortcut.desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-ink3 p-card bg-paper-2">
            <p className="text-bodysm text-ink3">
              Press <code className="font-mono text-ink2">Esc</code> to close
            </p>
          </div>
        </div>
      </div>
    </dialog>
  )
}
