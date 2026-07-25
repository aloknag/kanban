/**
 * Bug #54 — Non-numeric task/epic IDs in the URL render a blank, broken page
 * with no "not found" message, unlike numeric-but-nonexistent IDs which
 * correctly show "not found".
 *
 * Steps to reproduce:
 * 1. Navigate to /tasks/abc (or /epics/abc) — a non-numeric ID
 * 2. Compare against /tasks/-1 — a numeric but nonexistent ID
 * 3. /tasks/-1 shows "not found". /tasks/abc shows a blank shell
 *    ("agent: — · created · updated" with no title, no error) and never
 *    even issues a fetch for the task.
 */

const { test, expect } = require('@playwright/test');

test('non-numeric task id shows a not-found state, not a blank page', async ({ page }) => {
  await page.goto('http://localhost:5173/tasks/abc');
  await expect(page.getByText('not found')).toBeVisible({ timeout: 5000 });
});

test('non-numeric epic id shows a not-found state, not a blank page', async ({ page }) => {
  await page.goto('http://localhost:5173/epics/abc');
  await expect(page.getByText('not found')).toBeVisible({ timeout: 5000 });
});
