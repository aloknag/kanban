/**
 * JournalCompose — Compose box for adding new journal entries
 *
 * Per FrontEngDesign.md §6.5:
 * - Single textarea pinned below journal list
 * - Author auto-filled from localStorage.author (set on first visit)
 * - Cmd/Ctrl+Enter submits
 * - POSTs to /api/{tasks|epics}/{id}/comments
 * - Optimistically adds entry, then refetches
 * - No formatting toolbar
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postTaskComment, postEpicComment } from '../../lib/api';
import { Button } from '../primitives/Button';

type Props = {
  entityType: 'task' | 'epic';
  entityId: number;
};

export function JournalCompose({ entityType, entityId }: Props) {
  // Lazy initializer: reads author synchronously on mount to avoid flash of prompt
  // and wraps in try/catch for Safari private browsing
  const [author, setAuthor] = useState<string | null>(() => {
    try {
      return localStorage.getItem('author') ?? null;
    } catch {
      return null;
    }
  });
  const [body, setBody] = useState('');
  const [authorPrompt, setAuthorPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Handle author prompt submission (first-time user)
  const handleAuthorPromptSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && authorPrompt.trim()) {
      try {
        localStorage.setItem('author', authorPrompt.trim());
      } catch {
        // Silently fail if localStorage is not available (e.g., Safari private mode)
      }
      setAuthor(authorPrompt.trim());
      setAuthorPrompt('');
    }
  };

  // Mutation for posting comments with optimistic updates
  const { mutate: submitComment, isPending } = useMutation({
    mutationFn: async () => {
      if (!author || !body.trim()) {
        throw new Error('Author and body are required');
      }

      if (entityType === 'task') {
        return await postTaskComment(entityId, author, body.trim());
      } else {
        return await postEpicComment(entityId, author, body.trim());
      }
    },
    onMutate: async () => {
      // Clear previous error before new attempt
      setError(null);

      // Cancel pending refetches to prevent them from overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: [entityType, entityId, 'comments'],
      });

      // Snapshot the previous comments
      const previousComments = queryClient.getQueryData<Array<{
        id: number;
        author: string;
        body: string;
        created_at: string;
      }>>([entityType, entityId, 'comments']);

      // Optimistically add the new entry to the beginning of the list
      const newEntry = {
        id: -1, // Temporary ID
        author,
        body: body.trim(),
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(
        [entityType, entityId, 'comments'],
        previousComments ? [newEntry, ...previousComments] : [newEntry]
      );

      return { previousComments };
    },
    onSuccess: async () => {
      // Clear textarea
      setBody('');
      setError(null);

      // Refetch to get the real entry from the server
      await queryClient.invalidateQueries({
        queryKey: [entityType, entityId, 'comments'],
      });
    },
    onError: (err, _, context) => {
      // Rollback to previous state on error
      if (context?.previousComments) {
        queryClient.setQueryData(
          [entityType, entityId, 'comments'],
          context.previousComments
        );
      }
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    },
  });

  // Handle textarea keyboard event for Cmd/Ctrl+Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (author && body.trim()) {
        submitComment();
      }
    }
  };

  // If author is not set, show author prompt
  if (!author) {
    return (
      <div className="mt-card pt-card border-t border-ink3">
        <div className="flex gap-tight items-center">
          <label className="font-mono text-label text-ink uppercase tracking-widest">
            Who are you?
          </label>
          <input
            type="text"
            placeholder="who are you?"
            value={authorPrompt}
            onChange={(e) => setAuthorPrompt(e.target.value)}
            onKeyDown={handleAuthorPromptSubmit}
            className="flex-1 px-snug py-snug font-mono text-body border border-hair border-ink3 rounded-sm focus:outline-none focus:ring-2 focus:ring-signal"
          />
        </div>
      </div>
    );
  }

  // Normal compose box
  return (
    <div className="mt-card pt-card border-t border-ink3">
      <div className="flex flex-col gap-card">
        <textarea
          placeholder="add journal entry"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[120px] px-card py-card font-body text-body border border-hair border-ink3 rounded-sm focus:outline-none focus:ring-2 focus:ring-signal resize-none"
        />

        <div className="flex gap-tight items-center justify-between">
          <div className="flex gap-tight">
            <Button
              variant="ghost"
              disabled={!body.trim() || isPending}
              onClick={() => submitComment()}
            >
              {isPending ? 'posting…' : 'post'}
            </Button>
          </div>

          {error && (
            <div className="text-warn text-body-sm font-mono">
              error: {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
