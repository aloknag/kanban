/**
 * Bug repro: PATCH /api/tasks/{id} with non-existent column_id returns 200 OK
 * and silently orphans the task (it disappears from the board).
 *
 * Expected: API should return 4xx when column_id does not exist.
 * Actual:   API returns 200 and persists column_id=9999, task vanishes from board.
 */

const { test, expect } = require('@playwright/test');

const API = 'http://localhost:8000';
const UI = 'http://localhost:5173';

const TASK_ID = 3; // TASK-003

test('PATCH task with non-existent column_id should return 4xx, not 200', async ({ request }) => {
  // Record original column before patching
  const before = await request.get(`${API}/api/tasks/${TASK_ID}`);
  const originalColumnId = (await before.json()).column_id;

  // Attempt to move to a non-existent column
  const response = await request.patch(`${API}/api/tasks/${TASK_ID}`, {
    data: { column_id: 9999 },
  });

  // Should NOT be 200 — expect a 4xx error
  expect(response.status()).toBeGreaterThanOrEqual(400);
  expect(response.status()).toBeLessThan(500);

  // Verify task still has original column_id
  const after = await request.get(`${API}/api/tasks/${TASK_ID}`);
  expect((await after.json()).column_id).toBe(originalColumnId);
});

test('Task assigned to non-existent column is visible somewhere on the board', async ({ page }) => {
  // Move TASK-003 to a non-existent column via API
  await page.request.patch(`${API}/api/tasks/${TASK_ID}`, {
    data: { column_id: 9999 },
  });

  // Verify by slug-based id — #task-3-title is unique on the board
  await page.goto(`${UI}/board`);
  await expect(page.locator('#task-3-title')).toBeVisible();
});
