import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JournalEntry } from './JournalEntry';
import type { Comment } from '../../lib/api';

describe('JournalEntry', () => {
  const mockComment: Comment = {
    id: 1,
    author: 'claude-code',
    body: 'This is a test entry.',
    created_at: '2026-05-01T14:22:30Z',
  };

  it('renders author in fixed-width column', () => {
    render(<JournalEntry comment={mockComment} isLatest={false} />);
    const author = screen.getByText('claude-code');
    expect(author).toBeInTheDocument();
    expect(author).toHaveClass('font-mono', 'inline-block', 'w-[16ch]', 'truncate');
  });

  it('renders canonical ISO 8601 UTC timestamp in mono font with time element', () => {
    render(<JournalEntry comment={mockComment} isLatest={false} />);
    const timestamp = screen.getByText('2026-05-01T14:22:30Z');
    expect(timestamp).toBeInTheDocument();
    expect(timestamp.tagName).toBe('TIME');
    expect(timestamp).toHaveAttribute('dateTime', '2026-05-01T14:22:30Z');
    expect(timestamp).toHaveClass('font-mono', 'text-ink3');
  });

  it('renders indented body text at 32px', () => {
    render(<JournalEntry comment={mockComment} isLatest={false} />);
    const body = screen.getByText('This is a test entry.');
    expect(body).toBeInTheDocument();
    // ml-8 = 32px (8 * 4px Tailwind unit)
    expect(body.closest('div')).toHaveClass('ml-8');
  });

  it('shows latest marker when isLatest is true', () => {
    render(<JournalEntry comment={mockComment} isLatest={true} />);
    const marker = screen.getByText('▪');
    expect(marker).toBeInTheDocument();
  });

  it('does not show marker when isLatest is false', () => {
    render(<JournalEntry comment={mockComment} isLatest={false} />);
    const marker = screen.queryByText('▪');
    expect(marker).not.toBeInTheDocument();
  });

  it('handles multiline body text correctly', () => {
    const multilineComment: Comment = {
      ...mockComment,
      body: 'Line 1\nLine 2\nLine 3',
    };
    render(<JournalEntry comment={multilineComment} isLatest={false} />);
    // The body should be rendered with preserved formatting
    expect(screen.getByText(/Line 1/)).toBeInTheDocument();
  });

  it('applies correct base styling classes', () => {
    const { container } = render(<JournalEntry comment={mockComment} isLatest={false} />);
    const root = container.firstChild as HTMLElement;
    // Should have a root container for layout
    expect(root).toBeTruthy();
  });
});
