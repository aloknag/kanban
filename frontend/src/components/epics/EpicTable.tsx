import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProgressSparkbar } from './ProgressSparkbar';
import { Epic } from '../../lib/api';

type SortColumn = 'epic' | 'title' | 'assignee' | 'progress' | null;
type SortDirection = 'asc' | 'desc' | null;

type Props = {
  epics: Epic[];
};

export function EpicTable({ epics }: Props) {
  const navigate = useNavigate();
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleColumnHeaderClick = (column: SortColumn) => {
    if (sortColumn === column) {
      // Cycle: asc → desc → null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedEpics = useMemo(() => {
    if (!sortColumn || !sortDirection) {
      // Default sort by position (or by ID if position not available)
      return [...epics].sort((a, b) => {
        const aPos = a.position ?? a.id;
        const bPos = b.position ?? b.id;
        return aPos - bPos;
      });
    }

    const sorted = [...epics].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortColumn) {
        case 'epic':
          aVal = a.slug;
          bVal = b.slug;
          break;
        case 'title':
          aVal = a.title;
          bVal = b.title;
          break;
        case 'assignee':
          aVal = a.assignee || '';
          bVal = b.assignee || '';
          break;
        case 'progress':
          aVal = a.done_count / a.task_count;
          bVal = b.done_count / b.task_count;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [epics, sortColumn, sortDirection]);

  return (
    <div className="w-full">
      <div className="mb-card text-label font-mono text-ink3 uppercase tracking-wide">
        SHOWING {epics.length} OF {epics.length}
      </div>

      <table className="w-full border-hair border-ink3">
        <thead>
          <tr className="border-b-hair border-ink3">
            <th
              className="p-card text-label font-mono uppercase text-ink3 text-left cursor-pointer hover:text-ink transition-colors duration-fast"
              onClick={() => handleColumnHeaderClick('epic')}
              data-sort-direction={sortColumn === 'epic' ? sortDirection : undefined}
            >
              EPIC {sortColumn === 'epic' && sortDirection === 'asc' && '↑'}
              {sortColumn === 'epic' && sortDirection === 'desc' && '↓'}
            </th>
            <th
              className="p-card text-label font-mono uppercase text-ink3 text-left cursor-pointer hover:text-ink transition-colors duration-fast"
              onClick={() => handleColumnHeaderClick('title')}
              data-sort-direction={sortColumn === 'title' ? sortDirection : undefined}
            >
              TITLE {sortColumn === 'title' && sortDirection === 'asc' && '↑'}
              {sortColumn === 'title' && sortDirection === 'desc' && '↓'}
            </th>
            <th
              className="p-card text-label font-mono uppercase text-ink3 text-left cursor-pointer hover:text-ink transition-colors duration-fast"
              onClick={() => handleColumnHeaderClick('assignee')}
              data-sort-direction={sortColumn === 'assignee' ? sortDirection : undefined}
            >
              ASSIGNEE {sortColumn === 'assignee' && sortDirection === 'asc' && '↑'}
              {sortColumn === 'assignee' && sortDirection === 'desc' && '↓'}
            </th>
            <th
              className="p-card text-label font-mono uppercase text-ink3 text-left cursor-pointer hover:text-ink transition-colors duration-fast"
              onClick={() => handleColumnHeaderClick('progress')}
              data-sort-direction={sortColumn === 'progress' ? sortDirection : undefined}
            >
              PROGRESS {sortColumn === 'progress' && sortDirection === 'asc' && '↑'}
              {sortColumn === 'progress' && sortDirection === 'desc' && '↓'}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedEpics.map((epic) => (
            <tr
              key={epic.id}
              data-epic-id={epic.id}
              onClick={() => navigate(`/epics/${epic.id}`)}
              className="cursor-pointer border-b-hair border-ink3 hover:bg-paper2 transition-colors duration-fast"
            >
              <td className="p-card text-body-sm font-mono text-ink">{epic.slug}</td>
              <td className="p-card text-body-sm text-ink">{epic.title}</td>
              <td className="p-card text-body-sm text-ink3">
                {epic.assignee || '—'}
              </td>
              <td className="p-card text-body-sm">
                <ProgressSparkbar done={epic.done_count} total={epic.task_count} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
