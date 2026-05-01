import React from 'react'
import ReactDOM from 'react-dom/client'
import mermaid from 'mermaid'
import { App } from './App'
import './styles/index.css'

// Initialize mermaid with custom theme using design tokens
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    background: 'var(--c-paper)',
    primaryColor: 'var(--c-card)',
    primaryTextColor: 'var(--c-ink)',
    primaryBorderColor: 'var(--c-ink)',
    lineColor: 'var(--c-ink-2)',
    fontFamily: 'var(--f-mono)',
    fontSize: '12px',
  },
  flowchart: { curve: 'linear', htmlLabels: false },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
