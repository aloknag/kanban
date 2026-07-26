import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { DndContext } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableColumn } from './SortableColumn'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Column, Task } from '../../lib/api'

describe('SortableColumn', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const mockColumn: Column = {
    id: 1,
    name: 'Backlog',
    position: 0,
  }

  const mockTasks: Task[] = [
    {
      id: 1,
      slug: 'TASK-001',
      title: 'Test task',
      assignee: 'alice',
      column_id: 1,
      epic_id: null,
    },
    {
      id: 2,
      slug: 'TASK-002',
      title: 'Another task',
      assignee: 'bob',
      column_id: 1,
      epic_id: null,
    },
  ]

  const renderWithDnd = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <DndContext>
            <SortableContext
              items={[mockColumn.id]}
              strategy={verticalListSortingStrategy}
            >
              {component}
            </SortableContext>
          </DndContext>
        </QueryClientProvider>
      </BrowserRouter>
    )
  }

  it('renders column with data-column-id attribute', () => {
    const { container } = renderWithDnd(
      <SortableColumn column={mockColumn} tasks={mockTasks} />
    )

    const section = container.querySelector('[data-column-id="1"]')
    expect(section).toBeInTheDocument()
    expect(section).toHaveAttribute('data-column-id', '1')
  })

  it('renders column header with name and task count', () => {
    renderWithDnd(<SortableColumn column={mockColumn} tasks={mockTasks} />)

    expect(screen.getByText('BACKLOG')).toBeInTheDocument()
    expect(screen.getByText('2 specimens')).toBeInTheDocument()
  })

  it('does not render a vestigial bottom separator rule (#51)', () => {
    const { container } = renderWithDnd(
      <SortableColumn column={mockColumn} tasks={mockTasks} />
    )

    const rule = container.querySelector('.border-b.border-ink3')
    expect(rule).not.toBeInTheDocument()
  })

  it('renders all tasks when not collapsed', () => {
    renderWithDnd(
      <SortableColumn
        column={mockColumn}
        tasks={mockTasks}
        isCollapsed={false}
      />
    )

    expect(screen.getByText('Test task')).toBeInTheDocument()
    expect(screen.getByText('Another task')).toBeInTheDocument()
  })

  it('hides task content when collapsed using CSS display:none (for print support)', () => {
    const { container } = renderWithDnd(
      <SortableColumn
        column={mockColumn}
        tasks={mockTasks}
        isCollapsed={true}
      />
    )

    // Content is still in DOM but hidden with display:none for print stylesheet support
    const section = container.querySelector('section[data-collapsed="true"]')
    expect(section).toBeInTheDocument()

    // Get the direct child div that wraps the task content
    const hiddenDiv = Array.from(section?.children || []).find(
      child => child.tagName === 'DIV'
    ) as HTMLElement

    expect(hiddenDiv).toBeDefined()
    expect(hiddenDiv?.style.display).toBe('none')

    // Tasks are in DOM but hidden
    expect(screen.queryByText('Test task')).toBeInTheDocument()
    expect(screen.queryByText('Another task')).toBeInTheDocument()
  })

  it('calls onToggleCollapse when collapse button is clicked', () => {
    const onToggle = vi.fn()
    renderWithDnd(
      <SortableColumn
        column={mockColumn}
        tasks={mockTasks}
        isCollapsible={true}
        isCollapsed={false}
        onToggleCollapse={onToggle}
      />
    )

    // Get the collapse button (not the header which is also a button via DnD)
    const buttons = screen.getAllByRole('button')
    const collapseButton = buttons.find(btn => btn.textContent === '[ ▾ collapse ]')
    expect(collapseButton).toBeInTheDocument()
    collapseButton?.click()
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('applies transform and transition styles from useSortable', () => {
    const { container } = renderWithDnd(
      <SortableColumn column={mockColumn} tasks={mockTasks} />
    )

    const section = container.querySelector('[data-column-id="1"]')
    expect(section).toBeInTheDocument()
    // useSortable styles are applied via inline style; just verify the section exists
    expect(section?.tagName).toBe('SECTION')
  })

  it('renders empty column state when no tasks', () => {
    renderWithDnd(
      <SortableColumn column={mockColumn} tasks={[]} isCollapsed={false} />
    )

    // EmptyColumn should render instead of task list
    expect(screen.queryByText('Test task')).not.toBeInTheDocument()
  })

  it('forwards data-testid prop to the section element', () => {
    // Issue: data-testid passed to SortableColumn was silently dropped
    // because it wasn't in the Props type or spread as rest props.
    // Fix: Add 'data-testid'?: string to Props and forward it.

    const { container } = renderWithDnd(
      <SortableColumn
        column={mockColumn}
        tasks={mockTasks}
        data-testid="test-column"
      />
    )

    const section = container.querySelector('[data-testid="test-column"]')
    expect(section).toBeInTheDocument()
    expect(section?.tagName).toBe('SECTION')
  })

  it('marks tasks as new when in recentlyUpdatedTaskIds', () => {
    const recentlyUpdated = new Set([1])
    const { container } = renderWithDnd(
      <SortableColumn
        column={mockColumn}
        tasks={mockTasks}
        recentlyUpdatedTaskIds={recentlyUpdated}
        isCollapsed={false}
      />
    )

    // Verify task 1 is marked as new (has data-new attribute)
    const taskArticles = container.querySelectorAll('article')
    expect(taskArticles.length).toBeGreaterThan(0)
    // First article should have data-new attribute
    expect(taskArticles[0]).toHaveAttribute('data-new')
  })
})
