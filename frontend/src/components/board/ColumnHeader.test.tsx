import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ColumnHeader } from './ColumnHeader'
import { Column } from '../../lib/api'

describe('ColumnHeader', () => {
  const mockColumn: Column = {
    id: 1,
    name: 'Todo',
    position: 0,
  }

  it('renders column name in uppercase', () => {
    render(<ColumnHeader column={mockColumn} taskCount={3} />)
    expect(screen.getByText('TODO')).toBeInTheDocument()
  })

  it('displays task count', () => {
    render(<ColumnHeader column={mockColumn} taskCount={3} />)
    expect(screen.getByText('3 specimens')).toBeInTheDocument()
  })

  it('displays singular "specimen"', () => {
    render(<ColumnHeader column={mockColumn} taskCount={1} />)
    expect(screen.getByText('1 specimen')).toBeInTheDocument()
  })

  it('displays em-dash separator', () => {
    const { container } = render(
      <ColumnHeader column={mockColumn} taskCount={2} />
    )
    expect(container.textContent).toContain('—')
  })

  it('renders heading with correct font styling', () => {
    const { container } = render(
      <ColumnHeader column={mockColumn} taskCount={2} />
    )
    const heading = container.querySelector('h2')
    expect(heading).toHaveClass('text-label', 'font-mono', 'text-ink', 'uppercase')
  })

  it('shows chevron when isCollapsible and onToggleCollapse are provided', () => {
    render(
      <ColumnHeader
        column={mockColumn}
        taskCount={3}
        isCollapsible={true}
        isCollapsed={false}
        onToggleCollapse={() => {}}
      />
    )
    expect(screen.getByText('▾')).toBeInTheDocument()
  })

  it('calls onToggleCollapse when chevron is clicked', () => {
    const onToggle = vi.fn()
    render(
      <ColumnHeader
        column={mockColumn}
        taskCount={3}
        isCollapsible={true}
        isCollapsed={false}
        onToggleCollapse={onToggle}
      />
    )
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('shows collapsed state styling when isCollapsed is true', () => {
    const { container } = render(
      <ColumnHeader
        column={mockColumn}
        taskCount={3}
        isCollapsible={true}
        isCollapsed={true}
        onToggleCollapse={() => {}}
      />
    )
    const button = container.querySelector('button')
    expect(button).toHaveClass('opacity-50')
  })
})
