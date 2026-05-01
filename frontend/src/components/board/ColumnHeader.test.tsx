import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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
})
