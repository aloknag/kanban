/**
 * JournalEntry — Single comment entry in the Journal section
 *
 * Per FrontEngDesign.md §6.5:
 * - Author in mono, fixed-width 16ch column
 * - Timestamp in ISO 8601 UTC (never relative)
 * - Body indented 32px with mono label separator
 * - Latest entry marked with ▪ glyph (far right)
 */

import type { Comment } from '../../lib/api';

type Props = {
  comment: Comment;
  isLatest: boolean;
};

export function JournalEntry({ comment, isLatest }: Props) {
  // Format timestamp as ISO 8601: "2026-05-01 14:22:30"
  const timestamp = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(comment.created_at));

  return (
    <div data-testid="journal-entry">
      {/* Header line: author, timestamp, latest marker */}
      <div className="flex gap-card py-snug">
        {/* Author: fixed-width 16ch mono column */}
        <span
          data-author
          className="font-mono inline-block w-[16ch] truncate text-ink"
        >
          {comment.author}
        </span>

        {/* Timestamp: ISO 8601 UTC, no relative times */}
        <time
          dateTime={comment.created_at}
          className="font-mono text-ink3 flex-shrink-0"
        >
          {timestamp}
        </time>

        {/* Latest marker: ▪ glyph far right */}
        {isLatest && <span className="ml-auto text-ink3">▪</span>}
      </div>

      {/* Body: indented 32px (ml-8), rendered in prose */}
      <div
        data-body
        className="ml-8 text-body text-ink"
      >
        {comment.body}
      </div>
    </div>
  );
}
