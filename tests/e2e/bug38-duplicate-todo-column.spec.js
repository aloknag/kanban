// Reproduction test for: Duplicate "Todo" column rendered on the board
// The API returns 4 columns (id=4 is a phantom "Todo"), board renders it as extra empty "TODO" column.
// This test FAILS on the current build.

const { test, expect } = require('@playwright/test');

test('board should display exactly 3 columns with no duplicate Todo column', async ({ page, request }) => {
  // Verify API-level: columns endpoint should return exactly 3 columns
  const resp = await request.get('http://localhost:8000/api/columns');
  expect(resp.status()).toBe(200);
  const columns = await resp.json();
  const todoColumns = columns.filter(c => c.name.toLowerCase() === 'todo');
  expect(todoColumns.length, 'API should return exactly one Todo column').toBe(1);
  expect(columns.length, 'API should return exactly 3 columns').toBe(3);

  // Verify UI-level: board should not render a second "TODO" column header
  await page.goto('http://localhost:5173/board');
  await page.waitForLoadState('networkidle');

  const columnHeaders = page.locator('h2', { hasText: /^TODO$/i });
  const count = await columnHeaders.count();
  expect(count, 'Board should show exactly one TODO column header').toBe(1);
});
