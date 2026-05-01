import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Plate } from './Plate'

describe('Plate', () => {
  it('renders children content', () => {
    render(
      <Plate>
        <div>Test content</div>
      </Plate>
    )
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders the Gutter component', () => {
    render(
      <Plate>
        <div>Content</div>
      </Plate>
    )
    expect(screen.getByText('CATALOG')).toBeInTheDocument()
  })

  it('has proper layout structure with flex', () => {
    const { container } = render(
      <Plate>
        <div>Content</div>
      </Plate>
    )
    const wrapper = container.querySelector('.flex')
    expect(wrapper).toBeInTheDocument()
    expect(wrapper).toHaveClass('min-h-screen', 'bg-paper')
  })

  it('wraps content in main element', () => {
    const { container } = render(
      <Plate>
        <div>Content</div>
      </Plate>
    )
    const main = container.querySelector('main')
    expect(main).toBeInTheDocument()
  })

  it('applies correct spacing classes to main content', () => {
    const { container } = render(
      <Plate>
        <div>Content</div>
      </Plate>
    )
    const main = container.querySelector('main')
    expect(main).toHaveClass('flex-1', 'max-w-plate', 'mx-auto', 'px-page', 'py-page')
  })

  it('has 96px width gutter on the left', () => {
    const { container } = render(
      <Plate>
        <div>Content</div>
      </Plate>
    )
    const gutter = container.querySelector('[role="complementary"]')
    expect(gutter).toHaveClass('w-margin') // 96px
  })

  it('displays children in the main content area', () => {
    const { container } = render(
      <Plate>
        <span>Main content</span>
      </Plate>
    )
    const main = container.querySelector('main')
    expect(main).toHaveTextContent('Main content')
  })
})
