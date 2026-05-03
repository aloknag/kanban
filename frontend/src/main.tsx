import React from 'react'
import ReactDOM from 'react-dom/client'
import mermaid from 'mermaid'
import { App } from './App'
import './styles/index.css'

// CSS custom properties cannot be resolved at mermaid init time (before the DOM exists).
// Passing var(--x) as themeVariables causes mermaid to throw "Unsupported color format"
// and crash before ReactDOM.createRoot() runs, leaving a blank page.
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    fontSize: '12px',
  },
  flowchart: { curve: 'linear', htmlLabels: false },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
