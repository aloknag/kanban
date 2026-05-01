import { PropsWithChildren, useRef, useEffect, HTMLAttributes } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Components } from 'react-markdown'
import type { Element as HastElement } from 'hast'
import { MermaidBlock } from './MermaidBlock'

interface MarkdownProps {
  source: string
}

// Type for code handler props - includes inline flag specific to code elements
interface CodeHandlerProps extends HTMLAttributes<HTMLElement> {
  node?: HastElement
  inline?: boolean
  children?: React.ReactNode
}

// Type for pre handler props - provides access to AST node for code language extraction
interface PreHandlerProps extends HTMLAttributes<HTMLElement> {
  node?: HastElement
  children?: React.ReactNode
}

// Type for input handler props - includes type attribute specific to input elements
interface InputHandlerProps extends HTMLAttributes<HTMLInputElement> {
  node?: HastElement
  type?: string
  children?: React.ReactNode
}

// Helper to extract code language from className
function extractLanguage(className: string): string {
  const match = className?.match(/language-(\w+)/)
  return match ? match[1] : 'text'
}

// Inline code wrapper
function InlineCode({ children }: PropsWithChildren) {
  return (
    <code className="font-mono text-sm bg-ink4 px-tight py-0">
      {children}
    </code>
  )
}


export function Markdown({ source }: MarkdownProps) {
  // Track h1 count and figure count during parsing
  // Use useRef to maintain stable counters across re-renders of the same source
  const h1CountRef = useRef(0)
  const figureCountRef = useRef(0)

  // Reset counters when source changes
  useEffect(() => {
    h1CountRef.current = 0
    figureCountRef.current = 0
  }, [source])

  // Custom component map for rendering
  const components: Components = {
    h1: ({ node, ...props }) => {
      h1CountRef.current += 1
      const sectionNumber = h1CountRef.current
      return (
        <h1
          className="font-display text-h1 text-ink border-b border-hair border-ink3 mb-card"
          data-section={sectionNumber}
          {...props}
        >
          §{sectionNumber} {props.children}
        </h1>
      )
    },

  h2: ({ node, ...props }) => {
    return (
      <h2
        className="font-display text-h2 text-ink mt-gutter mb-snug"
        {...props}
      />
    )
  },

  p: ({ node, ...props }) => {
    return (
      <p
        className="text-body text-ink font-body max-w-prose mb-card"
        {...props}
      />
    )
  },

  code: ({ node, inline, ...props }: CodeHandlerProps) => {
    if (inline) {
      return <InlineCode {...props} />
    }
    return <code {...props} />
  },

  pre: ({ node, children, ...props }: PreHandlerProps) => {
    // Check if this is a mermaid block
    // node.children contains AST nodes, meta and value are dynamic properties from remark AST
    const codeNode = node?.children?.[0] as (HastElement & { value?: string; meta?: string }) | undefined
    const codeNodeMeta = codeNode?.meta
    const codeNodeClassName = codeNode?.properties?.className as string[] | undefined
    const codeContent = codeNode?.value || ''
    const language = codeNodeMeta || extractLanguage(codeNodeClassName?.[0] || '')

    if (language === 'mermaid') {
      figureCountRef.current += 1
      return <MermaidBlock code={codeContent} figureNumber={figureCountRef.current} />
    }

    return (
      <pre
        className="font-mono bg-paper2 border border-hair border-ink3 overflow-x-auto p-card mb-card relative"
        data-language={language}
        {...props}
      >
        <div
          className="absolute top-card right-card text-meta text-ink3 font-mono uppercase"
          data-language={language}
        >
          {language}
        </div>
        {children}
      </pre>
    )
  },

  blockquote: ({ node, ...props }) => {
    return (
      <blockquote
        className="border-l border-signal pl-card text-ink2 italic font-display mb-card"
        {...props}
      />
    )
  },

  ul: ({ node, ...props }) => {
    return (
      <ul className="text-ink3 mb-card list-disc list-outside pl-gutter" {...props} />
    )
  },

  ol: ({ node, ...props }) => {
    return (
      <ol className="text-ink mb-card list-decimal list-outside pl-gutter" {...props} />
    )
  },

  table: ({ node, ...props }) => {
    return (
      <table className="border border-hair border-ink3 mb-card" {...props} />
    )
  },

  th: ({ node, ...props }) => {
    return (
      <th className="font-mono text-label uppercase text-ink border border-hair border-ink3 p-snug" {...props} />
    )
  },

  td: ({ node, ...props }) => {
    return (
      <td className="border border-hair border-ink3 p-snug" {...props} />
    )
  },

    input: ({ node, ...props }: InputHandlerProps) => {
      if (props.type === 'checkbox') {
        return (
          <input
            type="checkbox"
            className="w-3 h-3 border border-hair border-ink3 mr-tight"
            {...props}
            disabled
          />
        )
      }
      return <input {...props} />
    },
  }

  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
        {source}
      </ReactMarkdown>
    </div>
  )
}
