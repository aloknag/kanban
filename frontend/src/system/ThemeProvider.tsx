/**
 * ThemeProvider — Application theme management
 *
 * Per FrontEngDesign.md §8:
 * - Light theme (default)
 * - Dark theme variant ([data-theme="dark"])
 * - Persisted in localStorage.theme
 * - Respects system preference via prefers-color-scheme
 * - Provides useTheme hook for theme toggle
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react'

export type ThemeType = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: ThemeType
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

/**
 * useTheme — Hook to access theme and toggle function
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

/**
 * ThemeProvider — Provider component that manages theme state and DOM attribute
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeType>(() => {
    // 1. Try localStorage
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored as ThemeType
    }

    // 2. Default to system
    return 'system'
  })

  // Initialize document attribute on mount and listen to system preference changes
  useEffect(() => {
    const updateDocumentTheme = (event?: MediaQueryListEvent) => {
      let themeToApply = theme

      // If system mode, resolve to actual color scheme
      if (theme === 'system') {
        // Use event.matches if available (from change event), otherwise query current state
        let isDark: boolean
        if (event !== undefined) {
          isDark = event.matches
        } else {
          isDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
        }
        themeToApply = isDark ? 'dark' : 'light'
      }

      document.documentElement.setAttribute('data-theme', themeToApply)
    }

    updateDocumentTheme()

    // Listen for system preference changes when in system mode
    if (theme === 'system') {
      const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)')
      if (mediaQuery) {
        mediaQuery.addEventListener('change', updateDocumentTheme)
        return () => mediaQuery.removeEventListener('change', updateDocumentTheme)
      }
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      // Toggle between light and dark, treating system as light
      let newTheme: ThemeType
      if (current === 'dark') {
        newTheme = 'light'
      } else {
        // Both 'system' and 'light' toggle to 'dark'
        newTheme = 'dark'
      }
      localStorage.setItem('theme', newTheme)
      return newTheme
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
