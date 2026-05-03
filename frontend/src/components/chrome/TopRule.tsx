/**
 * TopRule — Application chrome top bar
 * 
 * Per FrontEngDesign.md §3.1:
 * - 48px tall top rule strip
 * - Left: wordmark "▢ AGENTBOARD" in mono uppercase
 * - Center: route tabs (Board, Epics) with active state
 * - Right: UTC clock and poll indicator glyph
 */

import { useLocation, Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../../system/ThemeProvider'
import { PollIndicator } from '../../system/PollIndicator'

export function TopRule() {
  const location = useLocation()
  const { toggleTheme } = useTheme()
  const [time, setTime] = useState<string>('')
  const glyphRef = useRef<HTMLSpanElement>(null)

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const iso = now.toISOString().replace('T', ' ').slice(0, 19)
      setTime(iso)
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const isBoard = location.pathname === '/'
  const isEpics = location.pathname === '/epics'

  return (
    <div
      className="h-page flex items-center justify-between border-b border-hair border-ink3 bg-paper px-page"
      role="banner"
    >
      {/* Left: Wordmark */}
      <div className="font-mono text-label text-ink font-semibold tracking-widest">
        ▢ AGENTBOARD
      </div>

      {/* Center: Route tabs */}
      <div className="flex gap-gutter">
        <Link
          to="/"
          className={`text-label font-mono transition-colors duration-fast ${
            isBoard ? 'text-ink' : 'text-ink3 hover:text-ink'
          }`}
          aria-current={isBoard ? 'page' : undefined}
        >
          Board
        </Link>
        <span className="text-ink3 font-mono">·</span>
        <Link
          to="/epics"
          className={`text-label font-mono transition-colors duration-fast ${
            isEpics ? 'text-ink' : 'text-ink3 hover:text-ink'
          }`}
          aria-current={isEpics ? 'page' : undefined}
        >
          Epics
        </Link>
      </div>

      {/* Right: Clock, poll indicator, theme toggle, and close */}
      <div className="flex items-center gap-tight font-mono text-meta text-ink2">
        <span>{time || '··:··:··'}</span>
        <span
          ref={glyphRef}
          className="text-signal transition-colors duration-fast"
          aria-label="poll indicator"
        >
          ◇
        </span>
        <PollIndicator glyphRef={glyphRef} />
        <button
          onClick={toggleTheme}
          className="text-ink3 cursor-pointer hover:text-ink transition-colors bg-transparent border-0 p-0"
          aria-label="theme toggle"
          title="Toggle theme (t)"
        >
          ◑
        </button>
        <span className="text-ink3 cursor-pointer hover:text-ink transition-colors" aria-label="close">
          ✕
        </span>
      </div>
    </div>
  )
}
