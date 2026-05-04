// Reproduction test for BUG #44:
// The CATALOG sidebar on the board page is a non-functional empty placeholder.
// It renders only the text "CATALOG" with no search input, filters, or task links.
// The aria-label "Catalog sidebar" indicates it was intended to be interactive.
// This test FAILS on the current build.

const { test, expect } = require('@playwright/test');

const FRONTEND = 'http://localhost:5173';

test('CATALOG sidebar should contain a search input or interactive elements', async ({ page }) => {
  await page.goto(`${FRONTEND}/board`);
  await page.waitForTimeout(500);

  const sidebar = page.locator('[aria-label="Catalog sidebar"]');
  await expect(sidebar).toBeVisible();

  // Sidebar must contain more than just a label — expect a search input, list, or links
  const interactiveChildren = await sidebar.evaluate((el) => {
    const inputs = el.querySelectorAll('input, button, a, [role="searchbox"], [role="listitem"]');
    return inputs.length;
  });

  expect(
    interactiveChildren,
    'CATALOG sidebar must contain at least one interactive element (input, button, link, or list item)'
  ).toBeGreaterThan(0);
});

test('CATALOG sidebar search filters board tasks by keyword', async ({ page, request }) => {
  // Create a uniquely-titled task
  await request.post('http://localhost:8000/api/tasks', {
    data: { title: 'CatalogSearch-UniqueXYZ', column_id: 1, content_path: 'tasks/catalog-search.md' },
  });

  await page.goto(`${FRONTEND}/board`);
  await page.waitForTimeout(500);

  const sidebar = page.locator('[aria-label="Catalog sidebar"]');
  const searchInput = sidebar.locator('input[type="search"], input[type="text"], [role="searchbox"]');

  // Search input must exist
  await expect(searchInput, 'CATALOG sidebar must have a search input').toBeVisible();

  // Type search term
  await searchInput.fill('UniqueXYZ');
  await page.waitForTimeout(300);

  // The matching task must appear in results
  const pageText = await page.evaluate(() => document.body.innerText);
  expect(pageText).toContain('CatalogSearch-UniqueXYZ');
});
