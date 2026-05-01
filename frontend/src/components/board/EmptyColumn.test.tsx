import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyColumn } from './EmptyColumn'

describe('EmptyColumn', () => {
  it('renders empty state indicator glyph and message', () => {
    render(<EmptyColumn />)
    expect(screen.getByText('\u25c7 no specimens')).toBeInTheDocument()
  })

  it('renders secondary message', () => {
    render(<EmptyColumn />)
    expect(screen.getByText('nothing has been filed in this column.')).toBeInTheDocument()
  })

  it('displays primary text with correct styling', () => {
    const { container } = render(<EmptyColumn />)
    const primary = screen.getByText('\u25c7 no specimens')
    expect(primary).toHaveClass('text-body')
    expect(primary).toHaveClass('text-ink3')
  })

  it('displays secondary text in bodysm', () => {
    const { container } = render(<EmptyColumn />)
    const secondary = screen.getByText('nothing has been filed in this column.')
    expect(secondary).toHaveClass('text-bodysm')
    expect(secondary).toHaveClass('text-ink3')
  })

  it('wraps content vertically', () => {
    const { container } = render(<EmptyColumn />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('text-center')
    expect(wrapper).toHaveClass('py-gutter')
  })
})
