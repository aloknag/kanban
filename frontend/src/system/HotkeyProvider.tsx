/**
 * HotkeyProvider — Document-level keyboard shortcut handler
 *
 * Per FrontEngDesign.md §7: vim-style j/k navigation, g b/g e for routes,
 * Enter/Esc, n to compose, c to collapse, / for filter, ? for help, t for theme
 *
 * Two-key sequences (g b, g e) handled with 1.5s timeout.
 * Hotkeys ignored when input/textarea focused.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
} from 'react'

interface HotkeyMap {
  [key: string]: () => void
}

interface HotkeyContextType {
  registerHotkeys: (hotkeys: HotkeyMap) => () => void
}

const HotkeyContext = createContext<HotkeyContextType | null>(null)

/**
 * Custom hook to register hotkey handlers in a component.
 * Returns a cleanup function automatically on unmount.
 */
export function useHotkeys(hotkeys: HotkeyMap) {
  const context = useContext(HotkeyContext)
  if (!context) {
    throw new Error('useHotkeys must be used within HotkeyProvider')
  }

  useEffect(() => {
    return context.registerHotkeys(hotkeys)
  }, [hotkeys, context])
}

/**
 * HotkeyProvider — Provider component that listens at document level
 * and dispatches to registered hotkey handlers.
 */
export function HotkeyProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef<HotkeyMap>({})
  const pendingFirstKeyRef = useRef<string | null>(null)
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null)

  const registerHotkeys = useCallback((hotkeys: HotkeyMap) => {
    handlersRef.current = {
      ...handlersRef.current,
      ...hotkeys,
    }

    // Return cleanup function
    return () => {
      Object.keys(hotkeys).forEach(key => {
        delete handlersRef.current[key]
      })
    }
  }, [])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore hotkeys when typing in input or textarea
    const target = event.target as HTMLElement
    const focusedElement = document.activeElement

    // Check both the event target and the actively focused element
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      focusedElement?.tagName === 'INPUT' ||
      focusedElement?.tagName === 'TEXTAREA'
    ) {
      return
    }

    const key = event.key.toLowerCase()

    // Check if this could be a two-key sequence
    const handlers = handlersRef.current

    // Look for two-key sequences starting with current pending key
    if (pendingFirstKeyRef.current) {
      const combinedKey = `${pendingFirstKeyRef.current} ${key}`

      // Clear the timeout
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
        timeoutIdRef.current = null
      }

      // Check if this combination exists
      if (handlers[combinedKey]) {
        event.preventDefault()
        handlers[combinedKey]()
        pendingFirstKeyRef.current = null
        return
      }

      // Not a valid combination, reset
      pendingFirstKeyRef.current = null
    }

    // Check for single-key hotkey
    if (handlers[key]) {
      event.preventDefault()
      handlers[key]()
      return
    }

    // Check if this could be the start of a two-key sequence
    // Look for any handler that starts with this key
    const hasSequenceStarting = Object.keys(handlers).some(
      h => h.startsWith(key + ' ')
    )

    if (hasSequenceStarting) {
      pendingFirstKeyRef.current = key

      // Set timeout to reset after 1.5s
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
      }
      timeoutIdRef.current = setTimeout(() => {
        pendingFirstKeyRef.current = null
        timeoutIdRef.current = null
      }, 1500)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
      }
    }
  }, [handleKeyDown])

  return (
    <HotkeyContext.Provider value={{ registerHotkeys }}>
      {children}
    </HotkeyContext.Provider>
  )
}
