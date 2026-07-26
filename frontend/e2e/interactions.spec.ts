import { test, expect } from '@playwright/test';

test.describe('Interactive Elements E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should render interactive elements with data-testid', async ({ page }) => {
    // Wait for the page to load
    await page.waitForSelector('[data-testid="board-page"]');
    
    // Check for main content area
    const boardPage = page.locator('[data-testid="board-page"]');
    await expect(boardPage).toBeVisible();
  });

  test('should be able to interact with columns', async ({ page }) => {
    // Wait for a column to be available
    const columns = page.locator('[data-testid="column"]');
    
    // Verify columns exist
    const firstColumn = columns.first();
    await expect(firstColumn).toBeVisible();
    
    // Get the column header
    const header = firstColumn.locator('[data-testid="column-header"]');
    await expect(header).toBeVisible();
  });

  test('should support theme toggle', async ({ page }) => {
    // Check if theme toggle is available (if implemented)
    // This is a placeholder for future theme toggle testing
    const initialBackground = await page.locator('html').evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );
    
    expect(initialBackground).toBeTruthy();
  });

  test('should maintain accessibility with data-testid selectors', async ({ page }) => {
    // Verify main role is present
    const main = page.locator('main');
    await expect(main).toBeVisible();
    
    // Verify we can find elements by data-testid
    const boardPage = page.locator('[data-testid="board-page"]');
    await expect(boardPage).toBeVisible();
  });

  test('should handle navigation', async ({ page }) => {
    // Verify current URL is root
    expect(page.url()).toMatch(/localhost.*\/$/);
    
    // If there's a link to epics, test navigation
    const epicsLink = page.locator('a[href*="/epics"]').first();
    
    if (await epicsLink.isVisible().catch(() => false)) {
      await epicsLink.click();
      await page.waitForURL(/\/epics/);
      expect(page.url()).toMatch(/\/epics/);
    }
  });
});
