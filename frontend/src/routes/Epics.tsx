/**
 * Epics — Epics table route (/epics)
 *
 * Per FrontEngDesign.md §5:
 * - Displays all epics in a single ruled table
 * - Columns: EPIC, TITLE, ASSIGNEE, PROGRESS
 * - Progress shown as 8-cell monospace sparkbar
 * - Rows are sortable and clickable to navigate to epic detail
 * - Default sort by creation order (position or ID)
 */

import { useQuery } from '@tanstack/react-query';
import { TopRule } from '../components/chrome/TopRule';
import { Plate } from '../components/catalog/Plate';
import { EpicTable } from '../components/epics/EpicTable';
import { getEpics, Epic } from '../lib/api';

export function Epics() {
  const {
    data: epics = [],
    isLoading,
    error,
  } = useQuery<Epic[]>({
    queryKey: ['epics'],
    queryFn: () => getEpics(),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  return (
    <div className="flex flex-col min-h-screen bg-paper" data-testid="epics-page">
      <TopRule />
      <Plate>
        <div className="w-full">
          {/* Page heading */}
          <h1 className="text-h1 font-display text-ink mb-gutter">EPICS</h1>

          {/* Error state */}
          {error && (
            <div
              className="mb-page p-card bg-card border border-warn text-warn"
              role="alert"
            >
              <p className="text-body font-mono">
                Error loading epics: {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="text-center py-page">
              <p className="text-body text-ink3">loading…</p>
            </div>
          )}

          {/* Epics table */}
          {!isLoading && (
            <EpicTable epics={epics} />
          )}
        </div>
      </Plate>
    </div>
  );
}
