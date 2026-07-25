/**
 * Bug #57 — DELETE /api/epics/{id} returns HTTP 500 Internal Server Error
 * when the epic still has linked tasks, instead of a clean 4xx response.
 * Same missing-FK-validation defect class as Bug #56 (columns), but on the
 * epics endpoint.
 *
 * Steps to reproduce:
 * 1. GET an existing epic that has linked tasks (EPIC-001 has 3 in seed data)
 * 2. DELETE /api/epics/{id}
 * 3. Expect a 4xx error; observed 500 instead. The epic is NOT deleted
 *    (verified via a follow-up GET), so there is no data loss, but the API
 *    contract is violated and the crash is unhandled.
 */

const { test, expect } = require('@playwright/test');

const API = 'http://localhost:8000';

test('deleting an epic that still has linked tasks returns a 4xx, not a 500', async ({ request }) => {
  const epicsRes = await request.get(`${API}/api/epics`);
  const epics = await epicsRes.json();
  const epicWithTasks = epics.find((e) => e.task_count > 0) || epics[0];
  expect(epicWithTasks, 'expected at least one epic to exist').toBeTruthy();

  const deleteRes = await request.delete(`${API}/api/epics/${epicWithTasks.id}`);
  expect(deleteRes.status(), 'expected a 4xx conflict, not a 500 crash').toBeLessThan(500);

  // Verify the epic still exists / wasn't corrupted either way
  const check = await request.get(`${API}/api/epics/${epicWithTasks.id}`);
  expect(check.ok()).toBeTruthy();
});
