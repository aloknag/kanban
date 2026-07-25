/**
 * Bug #56 — DELETE /api/columns/{id} returns HTTP 500 Internal Server Error
 * when the column still contains tasks, instead of a clean 4xx (e.g. 409
 * Conflict) response.
 *
 * Steps to reproduce:
 * 1. Create a column
 * 2. Create a task inside that column
 * 3. DELETE the column while the task still references it
 * 4. Expect a 4xx error with a helpful message; observed 500 instead
 */

const { test, expect } = require('@playwright/test');

const API = 'http://localhost:8000';

test('deleting a column that still has tasks returns a 4xx, not a 500', async ({ request }) => {
  const colRes = await request.post(`${API}/api/columns`, {
    data: { name: 'QA-Repro-56', position: 99 },
  });
  const col = await colRes.json();

  const taskRes = await request.post(`${API}/api/tasks`, {
    data: {
      title: 'QA Repro 56 Task',
      column_id: col.id,
      content_path: 'tasks/qa-repro-56.md',
    },
  });
  const task = await taskRes.json();

  const deleteRes = await request.delete(`${API}/api/columns/${col.id}`);
  expect(deleteRes.status(), 'expected a 4xx conflict, not a 500 crash').toBeLessThan(500);

  // cleanup regardless of outcome
  await request.delete(`${API}/api/tasks/${task.id}`).catch(() => {});
  await request.delete(`${API}/api/columns/${col.id}`).catch(() => {});
});
