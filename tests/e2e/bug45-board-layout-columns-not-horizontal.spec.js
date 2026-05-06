// Repro test for bug #45
// Board layout collapses to vertical stacking — columns render as block elements
// instead of side-by-side flex row. All columns pile vertically; board
// appears as a single full-width column regardless of how many columns exist.
//
// Run: npx playwright test tests/e2e/bug45-board-layout-columns-not-horizontal.spec.js --reporter=list

const { test, expect } = require('@playwright/test');

test('board renders columns side-by-side in a horizontal flex layout', async ({ page }) => {
  await page.goto('http://localhost:5173/board');
  await page.waitForSelector('[data-testid="board-content"]');

  // Give the board a moment to load columns
  await page.waitForTimeout(2000);

  // Assert board-content uses flex (or inline-flex) so columns sit side-by-side
  const display = await page.evaluate(() => {
    const board = document.querySelector('[data-testid="board-content"]');
    return window.getComputedStyle(board).display;
  });

  expect(
    display,
    `Expected board-content to use a flex display so columns sit side-by-side, but got "${display}". Columns are stacking vertically.`
  ).toMatch(/flex/);

  // Assert at least 2 column elements are rendered
  const columnCount = await page.locator('[data-testid="column"]').count();
  expect(columnCount, 'Expected at least 2 columns to be rendered').toBeGreaterThanOrEqual(2);

  // Assert columns are NOT all at the same left offset (i.e., they are actually side-by-side)
  const offsets = await page.evaluate(() => {
    const cols = document.querySelectorAll('[data-testid="column"]');
    return Array.from(cols).map(c => c.getBoundingClientRect().left);
  });

  const uniqueLeftOffsets = new Set(offsets);
  expect(
    uniqueLeftOffsets.size,
    `Expected columns to have different left offsets (side-by-side), but all share the same offset. They are stacked vertically.`
  ).toBeGreaterThan(1);
});
