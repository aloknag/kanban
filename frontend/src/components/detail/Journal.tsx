/**
 * Journal — Comment section renamed as "Journal" for narrative feel
 *
 * Per FrontEngDesign.md §6.5:
 * - Fetches comments via useQuery with getTaskComments/getEpicComments
 * - Section header: "JOURNAL" in mono uppercase, right-aligned count
 * - Entries in reverse chronological order (newest first)
 * - Latest entry marked with ▪ glyph
 * - Empty state: "_no entries yet_" message
 * - Polling: 5000ms refetch interval
 */

import { useQuery } from '@tanstack/react-query';
import { getTaskComments, getEpicComments } from '../../lib/api';
import { JournalEntry } from './JournalEntry';
import { JournalCompose } from './JournalCompose';

type Props = {
  entityType: 'task' | 'epic';
  entityId: number;
};

export function Journal({ entityType, entityId }: Props) {
  const {
    data: comments = [],
    isLoading,
  } = useQuery({
    queryKey: [entityType, entityId, 'comments'],
    queryFn: () =>
      entityType === 'task'
        ? getTaskComments(entityId)
        : getEpicComments(entityId),
    refetchInterval: 5000,
  });

  // Sort comments in reverse chronological order (newest first)
  const sortedComments = [...comments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const latestCommentId = sortedComments[0]?.id;

  return (
    <section className="mt-gutter pt-gutter border-t border-ink3">
      {/* Header: "JOURNAL" label with entry count */}
      <div className="flex items-baseline justify-between mb-card">
        <h2 className="font-mono uppercase text-label text-ink tracking-widest">
          JOURNAL
        </h2>
        <span className="font-mono text-meta text-ink3">
          {sortedComments.length} entries
        </span>
      </div>

      {/* Loading state (shown when data is loading and no entries yet) */}
      {isLoading && sortedComments.length === 0 ? (
        <div className="py-gutter text-ink3 font-mono text-body">
          loading…
        </div>
      ) : sortedComments.length === 0 ? (
        /* Empty state (only shown when not loading and no entries) */
        <div className="py-gutter text-center text-ink3 font-mono text-body">
          _no entries yet_
        </div>
      ) : (
        /* Entries list */
        <div className="space-y-card">
          {sortedComments.map((comment) => (
            <JournalEntry
              key={comment.id}
              comment={comment}
              isLatest={comment.id === latestCommentId}
            />
          ))}
        </div>
      )}

      {/* Compose box pinned to bottom */}
      <JournalCompose entityType={entityType} entityId={entityId} />
    </section>
  );
}
