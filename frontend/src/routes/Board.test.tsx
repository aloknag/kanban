import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Board } from './Board'

describe('Board', () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>)
  }

  it('renders the TopRule component', () => {
    renderWithRouter(<Board />)
    expect(screen.getByText(/▢ AGENTBOARD/)).toBeInTheDocument()
  })

  it('renders the Plate component with Gutter', () => {
    renderWithRouter(<Board />)
    expect(screen.getByText('CATALOG')).toBeInTheDocument()
  })

  it('renders the main heading', () => {
    renderWithRouter(<Board />)
    const heading = screen.getByRole('heading', { name: /Board/ })
    expect(heading).toBeInTheDocument()
  })

  it('has proper semantic structure', () => {
    const { container } = renderWithRouter(<Board />)
    const banner = container.querySelector('[role="banner"]')
    const main = container.querySelector('main')
    const sidebar = container.querySelector('[role="complementary"]')
    
    expect(banner).toBeInTheDocument()
    expect(main).toBeInTheDocument()
    expect(sidebar).toBeInTheDocument()
  })

  it('displays the main flex layout', () => {
    const { container } = renderWithRouter(<Board />)
    const flexContainer = container.querySelector('.flex.flex-col.min-h-screen')
    expect(flexContainer).toBeInTheDocument()
  })

  it('has navigation links', () => {
    renderWithRouter(<Board />)
    const boardLink = screen.getByRole('link', { name: /Board/ })
    const epicsLink = screen.getByRole('link', { name: /Epics/ })
    expect(boardLink).toBeInTheDocument()
    expect(epicsLink).toBeInTheDocument()
  })
})
