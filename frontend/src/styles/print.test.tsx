/**
 * Print stylesheet regression tests
 *
 * Per FrontEngDesign.md §13 #5:
 * - @media print renders the full board as a B&W report
 * - All collapsed sections (Done columns) expand for archival
 * - Output is suitable for A4 printing
 * - Removes interactive UI elements (buttons, etc.) WITHOUT hiding the
 *   content those elements sit inside (e.g. a column header)
 *
 * These tests parse the *actual* index.css print rules (not hand-typed
 * copies of the selectors) and check them against real rendered DOM,
 * including elements dnd-kit decorates with `role="button"` — so a
 * selector that's too broad (like a bare `[role="button"]`) gets caught
 * here instead of only showing up in a print preview.
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { DndContext } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import postcss from 'postcss'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { Column } from '../components/board/Column'
import { SortableColumn } from '../components/board/SortableColumn'
import { SortableTaskCard } from '../components/board/SortableTaskCard'
import { Column as ColumnType, Task } from '../lib/api'

/**
 * Extract every selector from `display: none !important` rules inside
 * @media print in the real stylesheet — these are the rules meant to hide
 * interactive chrome when printing.
 */
const indexCssPath = path.resolve(process.cwd(), 'src/styles/index.css')
const indexCss = readFileSync(indexCssPath, 'utf-8')

function printHideSelectors(): string[] {
  const root = postcss.parse(indexCss)
  const selectors: string[] = []

  root.walkAtRules('media', (atRule) => {
    if (!atRule.params.includes('print')) return

    atRule.walkRules((rule) => {
      rule.walkDecls('display', (decl) => {
        if (decl.value.trim() === 'none' && decl.important) {
          selectors.push(...rule.selector.split(',').map((s) => s.trim()))
        }
      })
    })
  })

  return selectors
}

function matchesAnyHideSelector(el: Element, selectors: string[]): string | undefined {
  return selectors.find((selector) => {
    try {
      return el.matches(selector)
    } catch {
      return false
    }
  })
}

describe('Print stylesheet — hides chrome controls without hiding their containers', () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const mockColumn: ColumnType = { id: 1, name: 'Todo', position: 0 }
  const mockTask: Task = {
    id: 101,
    slug: 'TASK-001',
    title: 'Task 1',
    excerpt: 'Description',
    assignee: 'agent-1',
    column_id: 1,
    epic_id: null,
    updated_at: '2026-05-01T12:00:00Z',
  }

  const renderWithDnd = (component: React.ReactElement) =>
    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <DndContext>
            <SortableContext items={[mockColumn.id]} strategy={verticalListSortingStrategy}>
              {component}
            </SortableContext>
          </DndContext>
        </QueryClientProvider>
      </BrowserRouter>
    )

  it('the real collapse <button> is targeted by a print hide rule (positive control)', () => {
    const { container } = renderWithDnd(
      <SortableColumn
        column={mockColumn}
        tasks={[mockTask]}
        isCollapsible={true}
        isCollapsed={false}
        onToggleCollapse={() => {}}
      />
    )

    const collapseButton = container.querySelector('header button') as HTMLElement
    expect(collapseButton).toBeInTheDocument()

    const match = matchesAnyHideSelector(collapseButton, printHideSelectors())
    expect(match).toBeDefined()
  })

  it('does NOT hide the draggable column header — only the collapse control inside it', () => {
    // dnd-kit's useSortable() spreads role="button" onto the whole header
    // for keyboard-drag accessibility (see SortableColumn.test.tsx: "the
    // header which is also a button via DnD"). A print rule that hides
    // [role="button"] wholesale would hide the column title + specimen
    // count along with the collapse control.
    const { container } = renderWithDnd(
      <SortableColumn
        column={mockColumn}
        tasks={[mockTask]}
        isCollapsible={true}
        isCollapsed={false}
        onToggleCollapse={() => {}}
      />
    )

    const header = container.querySelector('header[data-testid="column-header"]') as HTMLElement
    expect(header).toBeInTheDocument()
    expect(header.getAttribute('role')).toBe('button') // confirms the dnd-kit hazard is real

    const match = matchesAnyHideSelector(header, printHideSelectors())
    expect(match, `header matched print-hide selector "${match}"`).toBeUndefined()
  })

  it('does NOT hide a draggable task card — dnd-kit also puts role="button" on its wrapper', () => {
    const { container } = renderWithDnd(<SortableTaskCard task={mockTask} />)

    const wrapper = container.querySelector(`[data-draggable-id="task-${mockTask.id}"]`) as HTMLElement
    expect(wrapper).toBeInTheDocument()
    expect(wrapper.getAttribute('role')).toBe('button')

    const match = matchesAnyHideSelector(wrapper, printHideSelectors())
    expect(match, `task card wrapper matched print-hide selector "${match}"`).toBeUndefined()

    const article = container.querySelector(`article[data-task-id="${mockTask.id}"]`) as HTMLElement
    expect(article).toBeInTheDocument()
    const articleMatch = matchesAnyHideSelector(article, printHideSelectors())
    expect(articleMatch, `task card matched print-hide selector "${articleMatch}"`).toBeUndefined()
  })
})

describe('Print stylesheet — collapsed columns expand for archival', () => {
  const mockColumn: ColumnType = { id: 1, name: 'Todo', position: 0 }
  const mockTask: Task = {
    id: 101,
    slug: 'TASK-001',
    title: 'Task 1',
    excerpt: 'Description',
    assignee: 'agent-1',
    column_id: 1,
    epic_id: null,
    updated_at: '2026-05-01T12:00:00Z',
  }

  it('CSS selector section[data-column-id] > div matches the collapsed content wrapper in Column', () => {
    const { container } = render(
      <BrowserRouter>
        <Column column={mockColumn} tasks={[mockTask]} isCollapsible={true} isCollapsed={true} />
      </BrowserRouter>
    )

    const section = container.querySelector('section[data-column-id]') as HTMLElement
    const wrapper = section?.querySelector(':scope > div') as HTMLElement

    expect(wrapper?.style.display).toBe('none')
    expect(section?.querySelector(':scope > div')).toBe(wrapper)
  })
})
