import { test, expect } from '@playwright/test';

const API = 'http://localhost:8000';

test('should handle creating a task with a very long name', async ({ page }) => {
  const longString = 'A'.repeat(600); // 600+ chars

  // Tasks can only be created via API — the UI has no create-task form
  const response = await page.request.post(`${API}/api/tasks`, {
    data: {
      title: longString,
      column_id: 1,
      content_path: 'tasks/long-title-test.md',
    },
  });

  // Task creation itself should succeed
  expect(response.status()).toBe(201);
  const { id } = await response.json();

  // Open the board and verify the card renders without breaking layout
  // Use #task-{id}-title — unique per task, avoids strict mode violations
  await page.goto('http://localhost:5173/board');
  await expect(page.locator(`#task-${id}-title`)).toBeVisible();
});
