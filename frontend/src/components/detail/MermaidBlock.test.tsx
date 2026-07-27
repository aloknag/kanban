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

describe('MermaidBlock — resolves --c-* tokens to concrete colors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Simulate the app's :root token values (light theme) being applied
    // to <html>, the way index.css actually does it.
    document.documentElement.style.setProperty('--c-paper', '#F8F6F1')
    document.documentElement.style.setProperty('--c-card', '#FFFFFF')
    document.documentElement.style.setProperty('--c-ink', '#11151C')
    document.documentElement.style.setProperty('--c-ink-2', 'rgba(17, 21, 28, .64)')
    document.documentElement.style.setProperty('--f-mono', '"JetBrains Mono Variable", ui-monospace, monospace')
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    document.documentElement.removeAttribute('style')
    document.documentElement.removeAttribute('data-theme')
  })

  it('passes resolved concrete color values to mermaid.initialize, never var(...) strings', async () => {
    render(<MermaidBlock code="graph TD\nA[Start]" figureNumber={1} />)

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mermaid.initialize).toHaveBeenCalled()
    const call = vi.mocked(mermaid.initialize).mock.calls.at(-1)![0] as any
    const themeVariables = call.themeVariables

    expect(themeVariables.background).toBe('#F8F6F1')
    expect(themeVariables.primaryColor).toBe('#FFFFFF')
    expect(themeVariables.primaryTextColor).toBe('#11151C')

    for (const value of Object.values(themeVariables)) {
      expect(String(value)).not.toContain('var(')
    }
  })

  it('re-initializes and re-renders when data-theme flips on <html>', async () => {
    render(<MermaidBlock code="graph TD\nA[Start]" figureNumber={1} />)
    await new Promise(resolve => setTimeout(resolve, 50))

    const initialRenderCalls = vi.mocked(mermaid.render).mock.calls.length
    const initialInitCalls = vi.mocked(mermaid.initialize).mock.calls.length

    // Flip to dark theme values, the way ThemeProvider does
    document.documentElement.style.setProperty('--c-paper', '#0E0F11')
    document.documentElement.style.setProperty('--c-card', '#1A1C1F')
    document.documentElement.style.setProperty('--c-ink', '#EDE8DA')
    document.documentElement.setAttribute('data-theme', 'dark')

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(vi.mocked(mermaid.initialize).mock.calls.length).toBeGreaterThan(initialInitCalls)
    expect(vi.mocked(mermaid.render).mock.calls.length).toBeGreaterThan(initialRenderCalls)

    const lastInitCall = vi.mocked(mermaid.initialize).mock.calls.at(-1)![0] as any
    expect(lastInitCall.themeVariables.background).toBe('#0E0F11')
  })
})
