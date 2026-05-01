import { describe, it, expect } from 'vitest'
import { render, screen } from '../../test/test-utils'
import { Column } from './Column'

describe('Column', () => {
  it('renders with column data-testid', () => {
    render(<Column title="To Do" />)
    const column = screen.getByTestId('column')
    expect(column).toBeInTheDocument()
  })

  it('renders column header with data-testid', () => {
    render(<Column title="To Do" />)
    const header = screen.getByTestId('column-header')
    expect(header).toBeInTheDocument()
    expect(header).toHaveTextContent('To Do')
  })

  it('renders task cards with data-testid', () => {
    const tasks = [
      { id: '1', title: 'Task 1' },
      { id: '2', title: 'Task 2' },
    ]
    render(<Column title="To Do" tasks={tasks} />)
    const taskCards = screen.getAllByTestId('task-card')
    expect(taskCards).toHaveLength(2)
  })

  it('displays empty state when no tasks', () => {
    render(<Column title="To Do" />)
    expect(screen.getByText('No tasks')).toBeInTheDocument()
  })

  it('displays task titles', () => {
    const tasks = [
      { id: '1', title: 'Implement feature' },
      { id: '2', title: 'Fix bug' },
    ]
    render(<Column title="To Do" tasks={tasks} />)
    expect(screen.getByText('Implement feature')).toBeInTheDocument()
    expect(screen.getByText('Fix bug')).toBeInTheDocument()
  })

  it('renders multiple columns independently', () => {
    const { rerender } = render(<Column title="To Do" />)
    const firstColumn = screen.getByTestId('column-header')
    expect(firstColumn).toHaveTextContent('To Do')

    rerender(<Column title="Done" />)
    const secondColumn = screen.getByTestId('column-header')
    expect(secondColumn).toHaveTextContent('Done')
  })
})
