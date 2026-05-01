import { describe, it, expect } from 'vitest'
import { render, screen } from '../test/test-utils'
import { Board } from './Board'

describe('Board', () => {

  it('renders with board-page data-testid', () => {
    render(<Board />)
    const boardPage = screen.getByTestId('board-page')
    expect(boardPage).toBeInTheDocument()
  })

  it('renders columns with data-testid', () => {
    render(<Board />)
    const columns = screen.getAllByTestId('column')
    expect(columns.length).toBeGreaterThan(0)
  })

  it('renders column headers with data-testid', () => {
    render(<Board />)
    const headers = screen.getAllByTestId('column-header')
    expect(headers.length).toBeGreaterThan(0)
  })

})
