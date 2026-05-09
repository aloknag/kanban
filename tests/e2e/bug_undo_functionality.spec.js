import { test, expect } from '@playwright/test';

test('BUG: Undo functionality does not work after task creation', async ({ page }) => {
  // Navigate to the board
  await page.goto('http://localhost:5173');

  // Create a task via API first (simulating human creation)
  const createResponse = await page.request.post('http://localhost:8000/api/tasks', {
    data: {
      title: 'TestUndoTask',
      column_id: 1,
      content_path: 'tasks/test-undo.md'
    }
  });

  expect(createResponse.ok()).toBeTruthy();

  // Refresh the page to see the task
  await page.goto('http://localhost:5173');

  // Verify task appears
  await expect(page.getByText('TestUndoTask')).toBeVisible();

  // Try to undo with Ctrl+Z
  await page.keyboard.press('Control+z');

  // Wait a moment for any potential undo to take effect
  await page.waitForTimeout(1000);

  // Verify task is still there (BUG: it should be gone)
  const taskStillVisible = await page.getByText('TestUndoTask').isVisible();
  expect(taskStillVisible).toBeTruthy(); // This should fail if undo worked

  // Try browser back button
  await page.goBack();

  // Wait for navigation
  await page.waitForTimeout(1000);

  // Check if task still exists via API
  const tasksResponse = await page.request.get('http://localhost:8000/api/tasks');
  const tasks = await tasksResponse.json();

  // BUG: Task should not exist after undo, but it does
  const testTask = tasks.find(t => t.title === 'TestUndoTask');
  expect(testTask).toBeDefined(); // This should fail if undo worked
});
