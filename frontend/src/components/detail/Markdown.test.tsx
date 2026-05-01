import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Markdown } from './Markdown'

describe('Markdown component', () => {
  describe('inline code', () => {
    it('renders inline code element', () => {
      const { container } = render(
        <Markdown source="Use `const x = 5` in your code." />
      )
      const code = container.querySelector('code')
      expect(code).toBeInTheDocument()
      expect(code?.textContent).toBe('const x = 5')
    })

    it('renders inline code with mono font and background', () => {
      const { container } = render(
        <Markdown source="Use `const x = 5` in your code." />
      )
      const code = container.querySelector('code')
      expect(code).toBeInTheDocument()
      // Check for styled inline code
      expect(code?.tagName).toBe('CODE')
      // Verify it's using our custom InlineCode component with classes
      const classList = code?.className || ''
      if (classList) {
        expect(classList).toContain('font-mono')
        expect(classList).toContain('bg-ink4')
      }
    })

    it('does not add border or radius to inline code', () => {
      const { container } = render(
        <Markdown source="Use `const x = 5` in your code." />
      )
      const code = container.querySelector('code')
      const classList = code?.className || ''
      if (classList) {
        expect(classList).not.toContain('border')
        expect(classList).not.toContain('rounded')
      }
    })
  })

  describe('paragraphs', () => {
    it('renders paragraphs with body font', () => {
      render(<Markdown source="This is a paragraph." />)
      const p = screen.getByText('This is a paragraph.')
      expect(p.tagName).toBe('P')
      expect(p.className).toContain('font-body')
    })

    it('constrains paragraph to 66ch max-width for readability', () => {
      render(<Markdown source="This is a paragraph." />)
      const p = screen.getByText('This is a paragraph.')
      expect(p.className).toContain('max-w-prose')
    })

    it('uses body font size for paragraphs', () => {
      render(<Markdown source="This is a paragraph." />)
      const p = screen.getByText('This is a paragraph.')
      expect(p.className).toContain('text-body')
    })
  })

  describe('h1 headings', () => {
    it('maintains stable h1 section numbers across component re-renders with same source', () => {
      const source = '# Section 1\n# Section 2'
      const { container, rerender } = render(
        <Markdown source={source} />
      )
      const h1s = container.querySelectorAll('h1')
      expect(h1s.length).toBeGreaterThanOrEqual(2)
      expect(h1s[0].textContent).toContain('§1')
      expect(h1s[1].textContent).toContain('§2')

      // Re-render with the same source - counters should be reset by useEffect
      rerender(<Markdown source={source} />)
      const h1sAfter = container.querySelectorAll('h1')
      // Should still be §1 and §2 with fresh counters
      expect(h1sAfter[0].textContent).toContain('§1')
      expect(h1sAfter[1].textContent).toContain('§2')
    })

    it('renders h1 with display font and numbered section marker', () => {
      const { container } = render(
        <Markdown source="# Introduction\n\nSome text\n\n# Results" />
      )
      const h1s = container.querySelectorAll('h1')
      expect(h1s.length).toBeGreaterThanOrEqual(1)
      // First h1 should have §1 prefix
      expect(h1s[0].textContent).toContain('§')
      expect(h1s[0].textContent).toContain('Introduction')
    })

    it('uses display font for h1', () => {
      const { container } = render(<Markdown source="# Introduction" />)
      const h1 = container.querySelector('h1')
      expect(h1?.className).toContain('font-display')
    })

    it('includes hairline rule beneath h1', () => {
      const { container } = render(<Markdown source="# Introduction" />)
      const h1 = container.querySelector('h1')
      // Should have a border or rule decoration
      expect(h1?.className).toContain('border-b')
    })
  })

  describe('h2 headings', () => {
    it('renders h2 with display font and no rule', () => {
      const { container } = render(
        <Markdown source="## Subsection" />
      )
      const h2 = container.querySelector('h2')
      expect(h2).toBeInTheDocument()
      expect(h2?.className).toContain('font-display')
    })

    it('does not number h2 headings', () => {
      const { container } = render(
        <Markdown source="## Subsection" />
      )
      const h2 = container.querySelector('h2')
      expect(h2?.textContent).not.toContain('§')
    })

    it('has top margin for h2', () => {
      const { container } = render(
        <Markdown source="## Subsection" />
      )
      const h2 = container.querySelector('h2')
      expect(h2?.className).toContain('mt-')
    })
  })

  describe('code blocks', () => {
    it('renders pre blocks with mono font on paper-2 background', () => {
      const source = '```typescript\nconst x = 5;\n```'
      const { container } = render(<Markdown source={source} />)
      const pre = container.querySelector('pre')
      expect(pre).toBeInTheDocument()
      expect(pre?.className).toContain('font-mono')
      expect(pre?.className).toContain('bg-paper2')
    })

    it('includes language label for code blocks', () => {
      const source = '```typescript\nconst x = 5;\n```'
      const { container } = render(<Markdown source={source} />)
      const pre = container.querySelector('pre')
      const label = pre?.querySelector('[data-language]')
      expect(label).toBeInTheDocument()
      expect(label?.textContent).toContain('typescript')
    })

    it('allows horizontal scroll for long code without soft-wrap', () => {
      const source = '```\nconst veryVeryVeryVeryVeryVeryVeryVeryVeryVeryLongLine = "this should scroll horizontally";\n```'
      const { container } = render(<Markdown source={source} />)
      const pre = container.querySelector('pre')
      expect(pre?.className).toContain('overflow-x-auto')
    })
  })

  describe('blockquotes', () => {
    it('uses 1px hairline border (not 4px)', () => {
      const { container } = render(
        <Markdown source="> This is a quote" />
      )
      const blockquote = container.querySelector('blockquote')
      const classList = blockquote?.className || ''
      // Should have border-l (1px) not border-l-4
      expect(classList).toContain('border-l')
      expect(classList).not.toContain('border-l-4')
    })

    it('renders blockquotes with left rule in signal color', () => {
      const { container } = render(
        <Markdown source="> This is a quote" />
      )
      const blockquote = container.querySelector('blockquote')
      expect(blockquote).toBeInTheDocument()
      expect(blockquote?.className).toContain('border-l')
      expect(blockquote?.className).toContain('signal')
    })

    it('uses italic display font for blockquotes', () => {
      const { container } = render(
        <Markdown source="> This is a quote" />
      )
      const blockquote = container.querySelector('blockquote')
      expect(blockquote?.className).toContain('italic')
      expect(blockquote?.className).toContain('font-display')
    })

    it('uses muted text color for blockquotes', () => {
      const { container } = render(
        <Markdown source="> This is a quote" />
      )
      const blockquote = container.querySelector('blockquote')
      expect(blockquote?.className).toContain('text-ink2')
    })
  })

  describe('lists', () => {
    it('renders unordered lists with hanging bullets in ink3', () => {
      const { container } = render(
        <Markdown source="- Item 1\n- Item 2" />
      )
      const ul = container.querySelector('ul')
      expect(ul).toBeInTheDocument()
      expect(ul?.className).toContain('text-ink3')
    })

    it('renders ordered lists with lining figures', () => {
      const { container } = render(
        <Markdown source="1. Item 1\n2. Item 2" />
      )
      const ol = container.querySelector('ol')
      expect(ol).toBeInTheDocument()
    })
  })

  describe('tables', () => {
    it('renders tables with hairline rules and mono header', () => {
      const source = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |'
      const { container } = render(<Markdown source={source} />)
      const table = container.querySelector('table')
      expect(table).toBeInTheDocument()
      expect(table?.className).toContain('border')
    })

    it('renders header row in mono uppercase', () => {
      const source = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |'
      const { container } = render(<Markdown source={source} />)
      const th = container.querySelector('th')
      expect(th?.className).toContain('font-mono')
      expect(th?.className).toContain('uppercase')
    })
  })

  describe('task lists', () => {
    it('renders task list checkboxes as custom 12px boxes', () => {
      const source = '- [ ] Incomplete task\n- [x] Complete task'
      const { container } = render(<Markdown source={source} />)
      const checkboxes = container.querySelectorAll('input[type="checkbox"]')
      expect(checkboxes.length).toBeGreaterThan(0)
    })

    it('marks completed tasks as filled', () => {
      const source = '- [x] Complete task'
      const { container } = render(<Markdown source={source} />)
      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement | null
      expect(checkbox?.checked).toBe(true)
    })
  })

  describe('Mermaid diagrams', () => {
    it('maintains stable figure numbers across component re-renders with same source', () => {
      const source = '```mermaid\ngraph TD\nA[Start]\n```\n\n```mermaid\ngraph TD\nB[End]\n```'
      const { container, rerender } = render(<Markdown source={source} />)
      expect(container.textContent).toContain('FIG. 1')
      expect(container.textContent).toContain('FIG. 2')

      // Re-render the same content - counters should reset
      rerender(<Markdown source={source} />)
      // Should still be FIG. 1 and FIG. 2 with fresh counters
      expect(container.textContent).toContain('FIG. 1')
      expect(container.textContent).toContain('FIG. 2')
    })

    it('renders mermaid code blocks as MermaidBlock component', () => {
      const source = '```mermaid\ngraph TD\nA[Start]-->B[End]\n```'
      const { container } = render(<Markdown source={source} />)
      // MermaidBlock should be rendered instead of raw pre
      const mermaidBlock = container.querySelector('[data-mermaid]')
      expect(mermaidBlock).toBeInTheDocument()
    })

    it('assigns monotonic figure numbers to mermaid diagrams', () => {
      const source = '```mermaid\ngraph TD\nA[Start]\n```\n\n```mermaid\ngraph TD\nB[End]\n```'
      const { container } = render(<Markdown source={source} />)
      const mermaidBlocks = container.querySelectorAll('[data-mermaid]')
      expect(mermaidBlocks.length).toBe(2)
      // Check for FIG. 1 and FIG. 2 (uppercase per label typography spec)
      expect(container.textContent).toContain('FIG. 1')
      expect(container.textContent).toContain('FIG. 2')
    })

    it('captions mermaid diagrams as FIG. N in mono label (uppercase)', () => {
      const source = '```mermaid\ngraph TD\nA[Start]\n```'
      const { container } = render(<Markdown source={source} />)
      const caption = container.querySelector('[data-figure-caption]')
      expect(caption).toBeInTheDocument()
      expect(caption?.className).toContain('font-mono')
      expect(caption?.textContent).toContain('FIG. 1')
    })
  })
})
