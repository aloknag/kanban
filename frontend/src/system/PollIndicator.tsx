/**
 * PollIndicator — Polls for new data and pulses the glyph
 *
 * Per FrontEngDesign.md §3.1:
 * - Subscribes to useIsFetching() from TanStack Query
 * - Detects edge transitions (1 → 0) indicating poll completion with new data
 * - Emits a one-shot CSS class on the ◇ glyph that flashes --c-signal for 80ms
 * - Uses --m-fast motion token (80ms ease-out)
 */

import { useEffect, useRef } from 'react'
import { useIsFetching } from '@tanstack/react-query'

type Props = {
  glyphRef: React.RefObject<HTMLElement>
}

export function PollIndicator({ glyphRef }: Props) {
  const isFetching = useIsFetching({ queryKey: ['tasks'] })
  const wasFetchingRef = useRef(isFetching > 0)

  useEffect(() => {
    // Detect transition from fetching (1+) to not fetching (0)
    const isFetchingNow = isFetching > 0
    const wasFetching = wasFetchingRef.current

    if (wasFetching && !isFetchingNow && glyphRef.current) {
      // Transition 1 → 0: add pulse class
      glyphRef.current.classList.add('animate-poll-pulse')

      // Remove after 80ms (--m-fast)
      const timer = setTimeout(() => {
        glyphRef.current?.classList.remove('animate-poll-pulse')
      }, 80)

      return () => clearTimeout(timer)
    }

    wasFetchingRef.current = isFetchingNow
  }, [isFetching, glyphRef])

  // This component doesn't render anything; it's purely behavioral
  return <div style={{ display: 'none' }} role="generic" />
}
