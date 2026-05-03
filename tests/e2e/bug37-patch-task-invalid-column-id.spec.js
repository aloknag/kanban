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

test('PATCH task with non-existent column_id should return 4xx, not 200', async ({ request }) => {
  // Get a valid task id from the first task in the list
  const tasks = await request.get(`${API}/api/tasks`);
  const taskList = await tasks.json();
  const task = taskList[0];
  const originalColumnId = task.column_id;

  // Attempt to move to a non-existent column
  const response = await request.patch(`${API}/api/tasks/${task.id}`, {
    data: { column_id: 9999 },
  });

  // Should NOT be 200 — expect a 4xx error
  expect(response.status()).toBeGreaterThanOrEqual(400);
  expect(response.status()).toBeLessThan(500);

  // Verify task still has original column_id
  const check = await request.get(`${API}/api/tasks/${task.id}`);
  const updated = await check.json();
  expect(updated.column_id).toBe(originalColumnId);
});

test('Task assigned to non-existent column is visible somewhere on the board', async ({ page }) => {
  // Move task 3 to non-existent column via API
  const response = await page.request.patch(`${API}/api/tasks/3`, {
    data: { column_id: 9999 },
  });
  // Even if API accepted it (the bug), verify the task still appears on the board
  await page.goto(`${UI}/board`);
  const taskOnBoard = page.locator('text=E2E test task');
  await expect(taskOnBoard).toBeVisible();
});
