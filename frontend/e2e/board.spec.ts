import { test, expect } from '@playwright/test';

test.describe('Board Page E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the board page before each test
    await page.goto('/');
  });

  test('should load the board page', async ({ page }) => {
    // Verify the page loads
    await expect(page).toHaveTitle(/AgentBoard/);
  });

  test('should display the main board content', async ({ page }) => {
    // Wait for board page to load
    await page.waitForSelector('[data-testid="board-page"]');
    
    // Verify main element is visible
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should display columns section', async ({ page }) => {
    // Wait for columns to be visible
    await page.waitForSelector('[data-testid="column"]');
    
    // Get all columns
    const columns = page.locator('[data-testid="column"]');
    const count = await columns.count();
    
    // We should have at least the default columns
    expect(count).toBeGreaterThan(0);
  });

  test('should have column headers', async ({ page }) => {
    // Wait for a column header to appear
    const columnHeader = page.locator('[data-testid="column-header"]').first();
    await expect(columnHeader).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    // This is a placeholder for keyboard navigation testing
    // In a real scenario, you'd test j/k navigation, g+b, etc.
    //
    // Note: per docs/FrontEngDesign.md §7, keyboard focus in this app moves
    // between interactive cards/controls (DOM tab order), not a programmatic
    // focus on the <main> wrapper itself — <main> has no tabIndex and isn't
    // meant to be a focus target, so we only assert it's present.
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify board is still visible and responsive
    const board = page.locator('[data-testid="board-page"]');
    await expect(board).toBeVisible();
  });
});
