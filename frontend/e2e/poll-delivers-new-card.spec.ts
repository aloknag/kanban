import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// This test validates the full polling pipeline: POST a task to the API and verify it appears
// on the frontend within 6s with the signal rule styling (inset box-shadow).
// The 6s timeout is chosen to allow the polling interval (5s) + small margin for rendering.
test.describe('Poll Delivers New Card within 6s', () => {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
  const DATA_DIR = process.env.DATA_DIR || '/tmp/e2e-data';

  test.beforeEach(async ({ page }) => {
    // Create the data directory if it doesn't exist
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Create the tasks subdirectory
    const tasksDir = path.join(DATA_DIR, 'tasks');
    if (!fs.existsSync(tasksDir)) {
      fs.mkdirSync(tasksDir, { recursive: true });
    }

    // Navigate to the board
    await page.goto('/');

    // Wait for the board to load
    await page.waitForLoadState('networkidle');
  });

  test('should display new card within 6s after POST with signal rule', async ({
    page,
    request,
  }) => {
    const taskTitle = 'E2E test task';
    const contentPath = 'tasks/e2e.md';

    // Step 1: Ensure the stub Markdown file exists in the data folder
    const stubPath = path.join(DATA_DIR, contentPath);
    const stubDir = path.dirname(stubPath);
    if (!fs.existsSync(stubDir)) {
      fs.mkdirSync(stubDir, { recursive: true });
    }
    fs.writeFileSync(stubPath, '# E2E Test Task\n\nThis is a test task for E2E polling verification.');

    // Step 2: POST a new task to the API
    const createResponse = await request.post(`${BACKEND_URL}/api/tasks`, {
      data: {
        title: taskTitle,
        content_path: contentPath,
        column_id: 1,
      },
    });

    expect(createResponse.status()).toBe(201);
    const responseBody = await createResponse.json();
    const taskId = responseBody.id;

    // Step 3: Wait up to 6 seconds for the new TaskCard to appear in the UI
    // The polling should pick up the new task within 5 seconds
    const taskCardLocator = page.locator(`[data-task-id="${taskId}"]`);
    await expect(taskCardLocator).toBeVisible({ timeout: 6000 });

    // Step 4: Verify the task card has the data-new attribute indicating it is newly created
    await expect(taskCardLocator).toHaveAttribute('data-new', '');

    // Step 5: Assert the element has the signal rule box-shadow with inset
    // The signal rule is applied via CSS: box-shadow: inset 1px 0 0 var(--c-signal)
    const boxShadow = await taskCardLocator.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.boxShadow;
    });

    // The box-shadow should contain "inset" substring (browser normalization varies)
    expect(boxShadow).toContain('inset');
  });
});
