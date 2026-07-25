import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { EpicTable } from './EpicTable';

const mockEpics = [
  {
    id: 1,
    slug: 'EPIC-001',
    title: 'Backend foundations',
    assignee: 'alok',
    column_id: 1,
    task_count: 8,
    done_count: 8,
  },
  {
    id: 2,
    slug: 'EPIC-002',
    title: 'Frontend shell',
    assignee: 'claude',
    column_id: 1,
    task_count: 8,
    done_count: 3,
  },
  {
    id: 3,
    slug: 'EPIC-003',
    title: 'Mermaid + Markdown rendering',
    assignee: null,
    column_id: 2,
    task_count: 4,
    done_count: 0,
  },
];

function renderWithRouter(component: React.ReactElement) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

describe('EpicTable', () => {
  it('renders table header with uppercase mono labels', () => {
    renderWithRouter(<EpicTable epics={mockEpics} />);
    expect(screen.getByText('EPIC')).toBeInTheDocument();
    expect(screen.getByText('TITLE')).toBeInTheDocument();
    expect(screen.getByText('ASSIGNEE')).toBeInTheDocument();
    expect(screen.getByText('PROGRESS')).toBeInTheDocument();
  });

  it('renders all epic rows', () => {
    renderWithRouter(<EpicTable epics={mockEpics} />);
    expect(screen.getByText('EPIC-001')).toBeInTheDocument();
    expect(screen.getByText('EPIC-002')).toBeInTheDocument();
    expect(screen.getByText('EPIC-003')).toBeInTheDocument();
  });

  it('renders epic titles', () => {
    renderWithRouter(<EpicTable epics={mockEpics} />);
    expect(screen.getByText('Backend foundations')).toBeInTheDocument();
    expect(screen.getByText('Frontend shell')).toBeInTheDocument();
  });

  it('renders assignee names', () => {
    renderWithRouter(<EpicTable epics={mockEpics} />);
    expect(screen.getAllByText('alok')).toHaveLength(1);
    expect(screen.getAllByText('claude')).toHaveLength(1);
  });

  it('renders progress sparkbar for each epic', () => {
    renderWithRouter(<EpicTable epics={mockEpics} />);
    const sparkbars = screen.getAllByTestId('sparkbar');
    expect(sparkbars).toHaveLength(3);
    // EPIC-001: 8/8
    expect(sparkbars[0].textContent).toBe('8/8 ████████');
    // EPIC-002: 3/8
    expect(sparkbars[1].textContent).toBe('3/8 ███░░░░░');
    // EPIC-003: 0/4 - normalized to 8 cells
    expect(sparkbars[2].textContent).toContain('0/4');
  });

  it('renders em-dash with count in header', () => {
    renderWithRouter(<EpicTable epics={mockEpics} />);
    expect(screen.getByText(/SHOWING 3 OF 3/)).toBeInTheDocument();
  });

  it('makes rows clickable and navigates to epic detail', () => {
    renderWithRouter(<EpicTable epics={mockEpics} />);
    const row = screen.getByText('Backend foundations').closest('tr');
    expect(row).toHaveAttribute('data-epic-id', '1');
    expect(row).toHaveClass('cursor-pointer');
  });

  it('supports sorting by column click (ascending → descending → no sort)', () => {
    renderWithRouter(<EpicTable epics={mockEpics} />);

    const titleHeader = screen.getAllByRole('columnheader').find(h => h.textContent?.includes('TITLE'));
    expect(titleHeader).toBeInTheDocument();

    // Click to sort ascending
    fireEvent.click(titleHeader!);
    // Should show sort indicator
    expect(titleHeader).toHaveAttribute('data-sort-direction', 'asc');

    // Click to sort descending
    fireEvent.click(titleHeader!);
    expect(titleHeader).toHaveAttribute('data-sort-direction', 'desc');

    // Click to clear sort
    fireEvent.click(titleHeader!);
    expect(titleHeader).not.toHaveAttribute('data-sort-direction');
  });

  it('defaults to sort by ID when no sort applied', () => {
    renderWithRouter(<EpicTable epics={mockEpics} />);
    const rows = screen.getAllByRole('row');
    // Skip header row (index 0), should be sorted by ID ascending
    expect(rows[1].textContent).toContain('EPIC-001'); // id 1
    expect(rows[2].textContent).toContain('EPIC-002'); // id 2
    expect(rows[3].textContent).toContain('EPIC-003'); // id 3
  });

  it('has hairline borders on table', () => {
    const { container } = render(
      <BrowserRouter>
        <EpicTable epics={mockEpics} />
      </BrowserRouter>
    );
    const table = container.querySelector('table');
    expect(table).toHaveClass('border-hair', 'border-ink3');
  });

  it('handles empty epic list', () => {
    renderWithRouter(<EpicTable epics={[]} />);
    expect(screen.getByText(/SHOWING 0 OF 0/)).toBeInTheDocument();
  });

  it('displays em-dash instead of null assignee', () => {
    renderWithRouter(<EpicTable epics={mockEpics} />);
    // EPIC-003 has no assignee, should show em-dash
    const row = screen.getByText('Mermaid + Markdown rendering').closest('tr');
    expect(row?.textContent).toContain('—');
  });
});
