/**
 * PollIndicator — Polls for new data and pulses the glyph
 *
 * Per FrontEngDesign.md §3.1:
 * - Subscribes to useIsFetching() from TanStack Query
 * - Detects edge transitions (1 → 0) indicating poll completion
 * - Pulses only when the completed poll actually returned NEW data
 *   (compares the resolved ['tasks'] query data against the previous cycle)
 * - Emits a one-shot CSS class on the ◇ glyph that flashes --c-signal for 80ms
 * - Uses --m-fast motion token (80ms ease-out)
 */

import { useEffect, useRef } from 'react'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'

type Props = {
  glyphRef: React.RefObject<HTMLElement>
}

export function PollIndicator({ glyphRef }: Props) {
  const isFetching = useIsFetching({ queryKey: ['tasks'] })
  const queryClient = useQueryClient()
  const wasFetchingRef = useRef(isFetching > 0)
  const previousDataRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    // Detect transition from fetching (1+) to not fetching (0)
    const isFetchingNow = isFetching > 0
    const wasFetching = wasFetchingRef.current
    wasFetchingRef.current = isFetchingNow

    // A fetch is still in flight; nothing resolved to compare yet.
    if (isFetchingNow) return

    // dataUpdatedAt bumps on every fetch regardless of content, so compare
    // a serialized snapshot of the resolved data instead.
    const serializedData = JSON.stringify(queryClient.getQueryData(['tasks']))

    if (!wasFetching) {
      // Not a poll completion (initial mount, or already idle) — just
      // record the baseline to compare the next cycle against.
      previousDataRef.current = serializedData
      return
    }

    // Transition 1 → 0: only pulse if the resolved data actually changed
    // from the last completed cycle.
    const hasNewData =
      previousDataRef.current !== undefined && serializedData !== previousDataRef.current
    previousDataRef.current = serializedData

    if (hasNewData && glyphRef.current) {
      glyphRef.current.classList.add('animate-poll-pulse')

      // Remove after 80ms (--m-fast)
      const timer = setTimeout(() => {
        glyphRef.current?.classList.remove('animate-poll-pulse')
      }, 80)

      return () => clearTimeout(timer)
    }
  }, [isFetching, glyphRef, queryClient])

  // This component doesn't render anything; it's purely behavioral
  return <div style={{ display: 'none' }} role="generic" />
}
