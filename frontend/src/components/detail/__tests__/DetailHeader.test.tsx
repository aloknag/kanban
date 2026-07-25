import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { DetailHeader } from '../DetailHeader'
import type { TaskDetail, EpicDetail } from '../../../lib/api'

const mockTask: TaskDetail = {
  id: 14,
  slug: 'TASK-014',
  title: 'Refactor path validator into a service',
  assignee: 'claude-code',
  column_id: 1,
  epic_id: 2,
  created_at: '2026-05-01T14:10:32Z',
  updated_at: '2026-05-01T14:18:07Z',
  content: 'Task content here',
}

const mockEpic: EpicDetail = {
  id: 2,
  slug: 'EPIC-002',
  title: 'Frontend shell',
  assignee: 'claude-code',
  column_id: 1,
  task_count: 8,
  done_count: 3,
  created_at: '2026-04-30T10:00:00Z',
  updated_at: '2026-05-01T14:18:07Z',
  content: 'Epic content here',
}

describe('DetailHeader', () => {
  it('renders back link to board', () => {
    render(
      <BrowserRouter>
        <DetailHeader entity={mockTask} parentEpic={undefined} isLoading={false} isNotFound={false} />
      </BrowserRouter>
    )

    const backLink = screen.getByRole('link', { name: /back to board/i })
    expect(backLink).toBeInTheDocument()
    expect(backLink).toHaveAttribute('href', '/')
  })

  it('renders task slug in correct font and color', () => {
    render(
      <BrowserRouter>
        <DetailHeader entity={mockTask} parentEpic={undefined} isLoading={false} isNotFound={false} />
      </BrowserRouter>
    )

    expect(screen.getByText('TASK-014')).toBeInTheDocument()
  })

  it('renders title in h1 style', () => {
    render(
      <BrowserRouter>
        <DetailHeader entity={mockTask} parentEpic={undefined} isLoading={false} isNotFound={false} />
      </BrowserRouter>
    )

    const title = screen.getByText('Refactor path validator into a service')
    expect(title).toBeInTheDocument()
    expect(title.tagName).toBe('H1')
  })

  it('renders parent epic slug and progress when epic is provided', () => {
    render(
      <BrowserRouter>
        <DetailHeader entity={mockTask} parentEpic={mockEpic} isLoading={false} isNotFound={false} />
      </BrowserRouter>
    )

    expect(screen.getByText(/EPIC-002/)).toBeInTheDocument()
    expect(screen.getByText(/3\/8/)).toBeInTheDocument()
  })

  it('renders meta line with agent, created, and updated timestamps', () => {
    render(
      <BrowserRouter>
        <DetailHeader entity={mockTask} parentEpic={undefined} isLoading={false} isNotFound={false} />
      </BrowserRouter>
    )

    expect(screen.getByText(/agent: claude-code/)).toBeInTheDocument()
    expect(screen.getByText(/created 2026-05-01 14:10/)).toBeInTheDocument()
    expect(screen.getByText(/updated 2026-05-01 14:18/)).toBeInTheDocument()
  })

  it('renders loading state when isLoading is true', () => {
    render(
      <BrowserRouter>
        <DetailHeader entity={mockTask} parentEpic={undefined} isLoading={true} isNotFound={false} />
      </BrowserRouter>
    )

    expect(screen.getByText('loading…')).toBeInTheDocument()
  })

  it('renders not found state when isNotFound is true', () => {
    render(
      <BrowserRouter>
        <DetailHeader entity={mockTask} parentEpic={undefined} isLoading={false} isNotFound={true} />
      </BrowserRouter>
    )

    expect(screen.getByText('not found')).toBeInTheDocument()
  })

  it('renders file_missing warning chip when content_error is present', () => {
    const taskWithMissingFile: TaskDetail = {
      ...mockTask,
      content_error: 'file_missing',
    }

    render(
      <BrowserRouter>
        <DetailHeader entity={taskWithMissingFile} parentEpic={undefined} isLoading={false} isNotFound={false} />
      </BrowserRouter>
    )

    expect(screen.getByText(/source file missing on disk/)).toBeInTheDocument()
  })

  it('does not render parent epic info when epic_id is null', () => {
    const taskWithoutEpic: TaskDetail = {
      ...mockTask,
      epic_id: null,
    }

    render(
      <BrowserRouter>
        <DetailHeader entity={taskWithoutEpic} parentEpic={undefined} isLoading={false} isNotFound={false} />
      </BrowserRouter>
    )

    expect(screen.queryByText(/EPIC-002/)).not.toBeInTheDocument()
    expect(screen.queryByText(/3\/8/)).not.toBeInTheDocument()
  })

  it('renders epic detail header correctly', () => {
    render(
      <BrowserRouter>
        <DetailHeader entity={mockEpic} parentEpic={undefined} isLoading={false} isNotFound={false} />
      </BrowserRouter>
    )

    expect(screen.getByText(/EPIC-002/)).toBeInTheDocument()
    expect(screen.getByText('Frontend shell')).toBeInTheDocument()
    expect(screen.getByText(/agent: claude-code/)).toBeInTheDocument()
  })
})
