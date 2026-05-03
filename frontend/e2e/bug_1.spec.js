import { test, expect } from '@playwright/test';

test('should handle creating a task with a very long name', async ({ page }) => {
  await page.goto('http://localhost:5173');
  // Click the button to add a new task (selector may differ based on UI)
  await page.click('[data-testid="add-task-button"]');

  const longString = 'A'.repeat(600); // 600+ chars
  await page.fill('[data-testid="task-title-input"]', longString);
  await page.fill('[data-testid="task-body-input"]', 'Standard task body.');
  await page.click('[data-testid="submit-task-button"]');

  // Try to find the card with the exact long title
  const card = await page.locator(`[data-testid="task-card-title"]`, { hasText: longString });
  await expect(card).toBeVisible(); // should not be truncated or broken

  // If the card is not visible or has rendering errors, fail the test
});
