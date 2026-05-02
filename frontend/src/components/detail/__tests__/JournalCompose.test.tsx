import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JournalCompose } from '../JournalCompose';
import * as api from '../../../lib/api';

vi.mock('../../../lib/api');

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

describe('JournalCompose', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  describe('author field', () => {
    it('reads author from localStorage on mount', () => {
      localStorage.setItem('author', 'test-user');

      render(
        <QueryClientProvider client={queryClient}>
          <JournalCompose entityType="task" entityId={1} />
        </QueryClientProvider>
      );

      // When author is set, the compose box should be rendered (not the author prompt)
      const textarea = screen.getByPlaceholderText('add journal entry');
      expect(textarea).toBeInTheDocument();
    });

    it('shows inline author prompt if localStorage.author is empty', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <JournalCompose entityType="task" entityId={1} />
        </QueryClientProvider>
      );

      // Should show a "who are you?" input instead of the normal compose box
      const promptInput = screen.getByPlaceholderText('who are you?');
      expect(promptInput).toBeInTheDocument();
    });

    it('sets localStorage.author when first-time author is entered', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <JournalCompose entityType="task" entityId={1} />
        </QueryClientProvider>
      );

      const promptInput = screen.getByPlaceholderText('who are you?');
      await user.type(promptInput, 'alice');
      await user.keyboard('{Enter}');

      expect(localStorage.getItem('author')).toBe('alice');
    });

    it('shows compose textarea after author is set', async () => {
      const user = userEvent.setup();
      vi.mocked(api.postTaskComment).mockResolvedValue({
        id: 1,
        author: 'alice',
        body: 'test',
        created_at: '2026-05-01T14:00:00Z',
      });

      render(
        <QueryClientProvider client={queryClient}>
          <JournalCompose entityType="task" entityId={1} />
        </QueryClientProvider>
      );

      const promptInput = screen.getByPlaceholderText('who are you?');
      await user.type(promptInput, 'alice');
      await user.keyboard('{Enter}');

      // Author should now be in localStorage
      expect(localStorage.getItem('author')).toBe('alice');

      // Textarea should appear
      const textarea = screen.getByPlaceholderText('add journal entry');
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('compose box', () => {
    beforeEach(() => {
      localStorage.setItem('author', 'test-user');
    });

    it('renders textarea with placeholder', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <JournalCompose entityType="task" entityId={1} />
        </QueryClientProvider>
      );

      const textarea = screen.getByPlaceholderText('add journal entry');
      expect(textarea).toBeInTheDocument();
    });

    it('renders post button', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <JournalCompose entityType="task" entityId={1} />
        </QueryClientProvider>
      );

      const button = screen.getByRole('button', { name: /post/i });
      expect(button).toBeInTheDocument();
    });

    it('disables post button when textarea is empty', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <JournalCompose entityType="task" entityId={1} />
        </QueryClientProvider>
      );

      const button = screen.getByRole('button', { name: /post/i });
      expect(button).toBeDisabled();
    });

    it('enables post button when textarea has content', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <JournalCompose entityType="task" entityId={1} />
        </QueryClientProvider>
      );

      const textarea = screen.getByPlaceholderText('add journal entry');
      const button = screen.getByRole('button', { name: /post/i });

      await user.type(textarea, 'some comment');

      expect(button).not.toBeDisabled();
    });
  });

  describe('submit behavior', () => {
    beforeEach(() => {
      localStorage.setItem('author', 'test-user');
    });

    it('POSTs to /api/tasks/{id}/comments with author and body', async () => {
      const user = userEvent.setup();
      vi.mocked(api.postTaskComment).mockResolvedValue({
        id: 1,
        author: 'test-user',
        body: 'test comment',
        created_at: '2026-05-01T14:00:00Z',
      });

      render(
        <QueryClientProvider client={queryClient}>
          <JournalCompose entityType="task" entityId={42} />
        </QueryClientProvider>
      );

      const textarea = screen.getByPlaceholderText('add journal entry');
      await user.type(textarea, 'test comment');

      const button = screen.getByRole('button', { name: /post/i });
      await user.click(button);

      await waitFor(() => {
        expect(api.postTaskComment).toHaveBeenCalledWith(42, 'test-user', 'test comment');
      });
    });

    it('POSTs to /api/epics/{id}/comments for epic entities', async () => {
      const user = userEvent.setup();
      vi.mocked(api.postEpicComment).mockResolvedValue({
        id: 1,
        author: 'test-user',
        body: 'test comment',
        created_at: '2026-05-01T14:00:00Z',
      });

      render(
        <QueryClientProvider client={queryClient}>
          <JournalCompose entityType="epic" entityId={42} />
        </QueryClientProvider>
      );

      const textarea = screen.getByPlaceholderText('add journal entry');
      await user.type(textarea, 'test comment');

      const button = screen.getByRole('button', { name: /post/i });
      await user.click(button);

      await waitFor(() => {
        expect(api.postEpicComment).toHaveBeenCalledWith(42, 'test-user', 'test comment');
      });
    });

    it('submits on Ctrl+Enter (Windows/Linux)', async () => {
      const user = userEvent.setup();
      vi.mocked(api.postTaskComment).mockResolvedValue({
        id: 1,
        author: 'test-user',
        body: 'test comment',
        created_at: '2026-05-01T14:00:00Z',
      });

      render(
        <QueryClientProvider client={queryClient}>
          <JournalCompose entityType="task" entityId={42} />
        </QueryClientProvider>
      );

      const textarea = screen.getByPlaceholderText('add journal entry');
      await user.type(textarea, 'test comment');
      await user.keyboard('{Control>}{Enter}{/Control}');

      await waitFor(() => {
        expect(api.postTaskComment).toHaveBeenCalledWith(42, 'test-user', 'test comment');
      });
    });

    it('submits on Cmd+Enter (macOS)', async () => {
      const user = userEvent.setup();
      vi.mocked(api.postTaskComment).mockResolvedValue({
        id: 1,
        author: 'test-user',
        body: 'test comment',
        created_at: '2026-05-01T14:00:00Z',
      });

      render(
        <QueryClientProvider client={queryClient}>
          <JournalCompose entityType="task" entityId={42} />
        </QueryClientProvider>
      );

      const textarea = screen.getByPlaceholderText('add journal entry');
      await user.type(textarea, 'test comment');
      await user.keyboard('{Meta>}{Enter}{/Meta}');

      await waitFor(() => {
        expect(api.postTaskComment).toHaveBeenCalledWith(42, 'test-user', 'test comment');
      });
    });

    it('clears textarea after successful submit', async () => {
      const user = userEvent.setup();
      vi.mocked(api.postTaskComment).mockResolvedValue({
        id: 1,
        author: 'test-user',
        body: 'test comment',
        created_at: '2026-05-01T14:00:00Z',
      });

      render(
        <QueryClientProvider client={queryClient}>
          <JournalCompose entityType="task" entityId={42} />
        </QueryClientProvider>
      );

      const textarea = screen.getByPlaceholderText(
        'add journal entry'
      ) as HTMLTextAreaElement;
      await user.type(textarea, 'test comment');

      const button = screen.getByRole('button', { name: /post/i });
      await user.click(button);

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });

    it('invalidates query cache on successful submit', async () => {
      const user = userEvent.setup();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      vi.mocked(api.postTaskComment).mockResolvedValue({
        id: 1,
        author: 'test-user',
        body: 'test comment',
        created_at: '2026-05-01T14:00:00Z',
      });

      render(
        <QueryClientProvider client={queryClient}>
          <JournalCompose entityType="task" entityId={42} />
        </QueryClientProvider>
      );

      const textarea = screen.getByPlaceholderText('add journal entry');
      await user.type(textarea, 'test comment');

      const button = screen.getByRole('button', { name: /post/i });
      await user.click(button);

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['task', 42, 'comments'],
        });
      });
    });

    it('optimistically updates the query cache with new entry before server response', async () => {
      const user = userEvent.setup();
      const initialComments = [
        {
          id: 1,
          author: 'existing-user',
          body: 'existing comment',
          created_at: '2026-05-01T14:00:00Z',
        },
      ];

      // Set up initial data in the query cache
      queryClient.setQueryData(['task', 42, 'comments'], initialComments);

      // Mock the API call with a delay to see optimistic update
      vi.mocked(api.postTaskComment).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  id: 2,
                  author: 'test-user',
                  body: 'new comment',
                  created_at: '2026-05-01T14:01:00Z',
                }),
              100
            )
          )
      );

      render(
        <QueryClientProvider client={queryClient}>
          <JournalCompose entityType="task" entityId={42} />
        </QueryClientProvider>
      );

      const textarea = screen.getByPlaceholderText('add journal entry');
      await user.type(textarea, 'new comment');

      const button = screen.getByRole('button', { name: /post/i });
      await user.click(button);

      // Wrap in waitFor to ensure onMutate microtask has flushed before assertion
      await waitFor(() => {
        const cachedData = queryClient.getQueryData<
          Array<{ id: number; author: string; body: string; created_at: string }>
        >(['task', 42, 'comments']);

        expect(cachedData).toHaveLength(2);
        expect(cachedData?.[0].body).toBe('new comment');
        expect(cachedData?.[0].author).toBe('test-user');
      });
    });

    it('rolls back optimistic update on error', async () => {
      const user = userEvent.setup();
      const initialComments = [
        {
          id: 1,
          author: 'existing-user',
          body: 'existing comment',
          created_at: '2026-05-01T14:00:00Z',
        },
      ];

      // Set up initial data in the query cache
      queryClient.setQueryData(['task', 42, 'comments'], initialComments);

      vi.mocked(api.postTaskComment).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(
        <QueryClientProvider client={queryClient}>
          <JournalCompose entityType="task" entityId={42} />
        </QueryClientProvider>
      );

      const textarea = screen.getByPlaceholderText('add journal entry');
      await user.type(textarea, 'new comment');

      const button = screen.getByRole('button', { name: /post/i });
      await user.click(button);

      // Wait for error to be handled
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      // Check that the cache was rolled back to original state
      const cachedData = queryClient.getQueryData<
        Array<{ id: number; author: string; body: string; created_at: string }>
      >(['task', 42, 'comments']);

      expect(cachedData).toHaveLength(1);
      expect(cachedData?.[0].id).toBe(1);
      expect(cachedData?.[0].body).toBe('existing comment');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      localStorage.setItem('author', 'test-user');
    });

    it('shows error message on failed POST', async () => {
      const user = userEvent.setup();
      vi.mocked(api.postTaskComment).mockRejectedValue(
        new Error('Network error')
      );

      render(
        <QueryClientProvider client={queryClient}>
          <JournalCompose entityType="task" entityId={42} />
        </QueryClientProvider>
      );

      const textarea = screen.getByPlaceholderText('add journal entry');
      await user.type(textarea, 'test comment');

      const button = screen.getByRole('button', { name: /post/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('does not clear textarea on error', async () => {
      const user = userEvent.setup();
      vi.mocked(api.postTaskComment).mockRejectedValue(
        new Error('Network error')
      );

      render(
        <QueryClientProvider client={queryClient}>
          <JournalCompose entityType="task" entityId={42} />
        </QueryClientProvider>
      );

      const textarea = screen.getByPlaceholderText(
        'add journal entry'
      ) as HTMLTextAreaElement;
      await user.type(textarea, 'test comment');

      const button = screen.getByRole('button', { name: /post/i });
      await user.click(button);

      await waitFor(() => {
        expect(textarea.value).toBe('test comment');
      });
    });
  });
});
