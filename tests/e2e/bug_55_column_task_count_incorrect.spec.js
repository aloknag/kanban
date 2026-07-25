/**
 * Bug #55 — GET /api/columns "task_count" field does not match the actual
 * number of tasks per column.
 *
 * Steps to reproduce:
 * 1. GET /api/columns -> note task_count per column
 * 2. GET /api/tasks -> count tasks by column_id client-side
 * 3. The two disagree (observed: API reports {1:1, 2:0, 3:1} while the
 *    real distribution is {1:2, 2:2, 3:4})
 */

const { test, expect } = require('@playwright/test');

const API = 'http://localhost:8000';

test('columns task_count matches actual per-column task counts', async ({ request }) => {
  const [colsRes, tasksRes] = await Promise.all([
    request.get(`${API}/api/columns`),
    request.get(`${API}/api/tasks`),
  ]);
  const columns = await colsRes.json();
  const tasks = await tasksRes.json();

  const actualCounts = {};
  for (const t of tasks) {
    actualCounts[t.column_id] = (actualCounts[t.column_id] || 0) + 1;
  }

  for (const col of columns) {
    const actual = actualCounts[col.id] || 0;
    expect(col.task_count, `column ${col.id} (${col.name}) task_count`).toBe(actual);
  }
});
