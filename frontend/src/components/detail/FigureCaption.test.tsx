import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { FigureCaption } from './FigureCaption'

describe('FigureCaption component', () => {
  it('renders figure caption with correct number', () => {
    const { container } = render(<FigureCaption figureNumber={1} />)
    const caption = container.querySelector('[data-figure-caption]')
    expect(caption).toBeInTheDocument()
    expect(caption?.textContent).toBe('FIG. 1')
  })

  it('renders with mono font', () => {
    const { container } = render(<FigureCaption figureNumber={2} />)
    const caption = container.querySelector('[data-figure-caption]')
    expect(caption?.className).toContain('font-mono')
  })

  it('renders with label text style per design spec', () => {
    const { container } = render(<FigureCaption figureNumber={3} />)
    const caption = container.querySelector('[data-figure-caption]')
    expect(caption?.className).toContain('text-label')
  })

  it('aligns caption to the right', () => {
    const { container } = render(<FigureCaption figureNumber={1} />)
    const caption = container.querySelector('[data-figure-caption]')
    expect(caption?.className).toContain('text-right')
  })

  it('uses ink color (not tertiary) for label text', () => {
    const { container } = render(<FigureCaption figureNumber={1} />)
    const caption = container.querySelector('[data-figure-caption]')
    expect(caption?.className).toContain('text-ink')
    expect(caption?.className).not.toContain('text-ink3')
  })

  it('applies uppercase class for label typography', () => {
    const { container } = render(<FigureCaption figureNumber={1} />)
    const caption = container.querySelector('[data-figure-caption]')
    expect(caption?.className).toContain('uppercase')
  })

  it('has top margin for spacing', () => {
    const { container } = render(<FigureCaption figureNumber={1} />)
    const caption = container.querySelector('[data-figure-caption]')
    expect(caption?.className).toContain('mt-')
  })

  it('formats multiple figure numbers correctly in uppercase', () => {
    const { rerender, container } = render(<FigureCaption figureNumber={5} />)
    expect(container.textContent).toBe('FIG. 5')

    rerender(<FigureCaption figureNumber={42} />)
    expect(container.textContent).toBe('FIG. 42')
  })
})
