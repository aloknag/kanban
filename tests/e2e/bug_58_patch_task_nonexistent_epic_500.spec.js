/**
 * Bug #58 — PATCH /api/tasks/{id} with a non-existent epic_id returns
 * HTTP 500 Internal Server Error instead of a validation error (4xx).
 *
 * Steps to reproduce:
 * 1. PATCH an existing task with epic_id: 9999 (does not exist)
 * 2. Expect a 4xx error; observed 500 instead
 */

const { test, expect } = require('@playwright/test');

const API = 'http://localhost:8000';

test('PATCH task with non-existent epic_id returns a 4xx, not a 500', async ({ request }) => {
  const tasksRes = await request.get(`${API}/api/tasks`);
  const tasks = await tasksRes.json();
  const task = tasks[0];
  const originalEpicId = task.epic_id;

  const patchRes = await request.patch(`${API}/api/tasks/${task.id}`, {
    data: { epic_id: 999999 },
  });
  expect(patchRes.status(), 'expected a 4xx validation error, not a 500 crash').toBeLessThan(500);

  // Verify the task's epic_id was not corrupted by the failed request
  const check = await request.get(`${API}/api/tasks/${task.id}`);
  const checked = await check.json();
  expect(checked.epic_id).toBe(originalEpicId);
});
