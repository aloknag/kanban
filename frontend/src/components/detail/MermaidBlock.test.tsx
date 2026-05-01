import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { MermaidBlock } from './MermaidBlock'
import mermaid from 'mermaid'

// Mock mermaid module
vi.mock('mermaid', () => ({
  default: {
    render: vi.fn((_id: string, _code: string) =>
      Promise.resolve({ svg: '<svg data-testid="rendered-svg"></svg>' })
    ),
    initialize: vi.fn(),
  },
}))

describe('MermaidBlock component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders a figure element with semantic HTML', async () => {
    const { container } = render(
      <MermaidBlock code="graph TD\nA[Start]" figureNumber={1} />
    )
    const figureEl = container.querySelector('figure')
    expect(figureEl).toBeInTheDocument()
    expect(figureEl?.className).toContain('border')
    expect(figureEl?.className).toContain('border-hair')
  })

  it('calls mermaid.render on mount', async () => {
    render(
      <MermaidBlock code="graph TD\nA[Start]" figureNumber={1} />
    )

    // Wait for the async mermaid.render to complete
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mermaid.render).toHaveBeenCalledWith(
      expect.stringContaining('mermaid-'),
      expect.stringContaining('graph TD')
    )
  })

  it('includes data-mermaid attribute on figure element', () => {
    const { container } = render(
      <MermaidBlock code="graph TD\nA[Start]" figureNumber={1} />
    )
    const figureEl = container.querySelector('figure')
    expect(figureEl).toBeInTheDocument()
    expect(figureEl?.getAttribute('data-mermaid')).toBeDefined()
    expect(figureEl?.getAttribute('data-figure')).toBe('1')
  })

  it('stores the figure number in data attribute', () => {
    const codeContent = 'graph TD\nA[Start]-->B[End]'
    const { container } = render(
      <MermaidBlock code={codeContent} figureNumber={2} />
    )
    const figureEl = container.querySelector('figure')
    expect(figureEl?.getAttribute('data-figure')).toBe('2')
  })

  it('has a figure with proper padding and margin', () => {
    const { container } = render(
      <MermaidBlock code="graph TD\nA[Start]" figureNumber={1} />
    )
    const figureEl = container.querySelector('figure')
    expect(figureEl?.className).toContain('p-card')
    expect(figureEl?.className).toContain('mb-card')
  })
})
