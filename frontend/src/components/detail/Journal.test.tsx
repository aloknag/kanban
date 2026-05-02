import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Journal } from './Journal';
import * as api from '../../lib/api';

vi.mock('../../lib/api');

describe('Journal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const mockComments = [
    {
      id: 3,
      author: 'claude-code',
      body: 'Acknowledged. Adding `test_symlink_escape_resolves_strict`.',
      created_at: '2026-05-01T14:22:30Z',
    },
    {
      id: 2,
      author: 'alok',
      body: 'Add a regression test for the symlink case before merging.',
      created_at: '2026-05-01T14:21:44Z',
    },
    {
      id: 1,
      author: 'claude-code',
      body: 'Started extraction. Tests still green.',
      created_at: '2026-05-01T14:18:09Z',
    },
  ];

  it('renders JOURNAL header in mono uppercase with entry count', async () => {
    vi.mocked(api.getTaskComments).mockResolvedValue(mockComments);

    render(
      <QueryClientProvider client={queryClient}>
        <Journal entityType="task" entityId={1} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('JOURNAL')).toBeInTheDocument();
      expect(screen.getByText('JOURNAL')).toHaveClass('font-mono', 'uppercase');
      expect(screen.getByText('3 entries')).toBeInTheDocument();
    });
  });

  it('displays comments in reverse chronological order (newest first)', async () => {
    vi.mocked(api.getTaskComments).mockResolvedValue(mockComments);

    render(
      <QueryClientProvider client={queryClient}>
        <Journal entityType="task" entityId={1} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      const entries = screen.getAllByText(/claude-code|alok/);
      // First entry should be claude-code (newest: 14:22:30)
      expect(entries[0]).toHaveTextContent('claude-code');
      expect(entries[0].closest('[data-testid="journal-entry"]')).toHaveTextContent(
        '2026-05-01 14:22:30'
      );
    });
  });

  it('marks the latest entry with a ▪ glyph', async () => {
    vi.mocked(api.getTaskComments).mockResolvedValue(mockComments);

    render(
      <QueryClientProvider client={queryClient}>
        <Journal entityType="task" entityId={1} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      const marker = screen.getByText('▪');
      expect(marker).toBeInTheDocument();
      // Marker should be in the first (latest) entry
      const firstEntry = screen.getAllByTestId('journal-entry')[0];
      expect(firstEntry).toHaveTextContent('▪');
    });
  });

  it('shows no marker on older entries', async () => {
    vi.mocked(api.getTaskComments).mockResolvedValue(mockComments);

    render(
      <QueryClientProvider client={queryClient}>
        <Journal entityType="task" entityId={1} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      const entries = screen.getAllByTestId('journal-entry');
      // Second and third entries should not have markers
      expect(entries[1].textContent).not.toContain('▪');
      expect(entries[2].textContent).not.toContain('▪');
    });
  });

  it('shows loading state while data is being fetched', async () => {
    // Mock a delayed response to observe loading state
    vi.mocked(api.getTaskComments).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve([]), 500)
        )
    );

    render(
      <QueryClientProvider client={queryClient}>
        <Journal entityType="task" entityId={1} />
      </QueryClientProvider>
    );

    // Initially should show loading message
    expect(screen.getByText('loading…')).toBeInTheDocument();

    // Should not show empty state while loading
    expect(screen.queryByText('_no entries yet_')).not.toBeInTheDocument();

    // After loading completes, empty state should appear
    await waitFor(() => {
      expect(screen.queryByText('loading…')).not.toBeInTheDocument();
      expect(screen.getByText('_no entries yet_')).toBeInTheDocument();
    });
  });

  it('shows empty state when no comments exist', async () => {
    vi.mocked(api.getTaskComments).mockResolvedValue([]);

    render(
      <QueryClientProvider client={queryClient}>
        <Journal entityType="task" entityId={1} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('JOURNAL')).toBeInTheDocument();
      expect(screen.getByText('0 entries')).toBeInTheDocument();
      expect(screen.getByText('_no entries yet_')).toBeInTheDocument();
    });
  });

  it('uses getTaskComments for task entities', async () => {
    vi.mocked(api.getTaskComments).mockResolvedValue([]);

    render(
      <QueryClientProvider client={queryClient}>
        <Journal entityType="task" entityId={42} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(api.getTaskComments).toHaveBeenCalledWith(42);
    });
  });

  it('uses getEpicComments for epic entities', async () => {
    vi.mocked(api.getEpicComments).mockResolvedValue([]);

    render(
      <QueryClientProvider client={queryClient}>
        <Journal entityType="epic" entityId={42} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(api.getEpicComments).toHaveBeenCalledWith(42);
    });
  });

  it('renders all comment bodies', async () => {
    vi.mocked(api.getTaskComments).mockResolvedValue(mockComments);

    render(
      <QueryClientProvider client={queryClient}>
        <Journal entityType="task" entityId={1} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByText('Acknowledged. Adding `test_symlink_escape_resolves_strict`.')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Add a regression test for the symlink case before merging.')
      ).toBeInTheDocument();
      expect(screen.getByText('Started extraction. Tests still green.')).toBeInTheDocument();
    });
  });

});
