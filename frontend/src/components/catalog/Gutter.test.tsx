import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Gutter } from './Gutter'

describe('Gutter', () => {
  it('renders the CATALOG heading', () => {
    render(<Gutter />)
    expect(screen.getByText('CATALOG')).toBeInTheDocument()
  })

  it('has proper semantic markup', () => {
    const { container } = render(<Gutter />)
    const sidebar = container.querySelector('[role="complementary"]')
    expect(sidebar).toBeInTheDocument()
  })

  it('applies correct styling classes', () => {
    const { container } = render(<Gutter />)
    const sidebar = container.querySelector('[role="complementary"]')
    expect(sidebar).toHaveClass('w-margin', 'flex-shrink-0', 'border-r')
  })

  it('uses Tailwind font classes for typography', () => {
    const { container } = render(<Gutter />)
    const heading = container.querySelector('.text-label.font-mono')
    expect(heading).toBeInTheDocument()
  })

  it('has 96px width via w-margin class', () => {
    const { container } = render(<Gutter />)
    const sidebar = container.querySelector('[role="complementary"]')
    expect(sidebar).toHaveClass('w-margin')
    // w-margin = 96px (from tailwind config)
  })

  it('has right border', () => {
    const { container } = render(<Gutter />)
    const sidebar = container.querySelector('[role="complementary"]')
    expect(sidebar).toHaveClass('border-r', 'border-hair', 'border-ink3')
  })
})
