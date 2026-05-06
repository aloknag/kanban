// Keyboard / Accessibility test — Tab navigation and Enter on task card
// Tests that:
// 1. Task cards are reachable via Tab key (focusable)
// 2. Pressing Enter on a focused task card navigates to its detail page

const { test, expect } = require('@playwright/test');

test('task cards are keyboard-navigable: Tab focuses cards, Enter navigates to detail', async ({ page }) => {
  await page.goto('http://localhost:5173/board');

  // Wait for at least one task card to be present
  await page.waitForSelector('[data-testid="column"]', { timeout: 10000 });
  await page.waitForTimeout(1500);

  // Find the first task card link on the board
  const firstTaskLink = page.locator('article').first();
  await expect(firstTaskLink).toBeVisible();

  // Get the href of the first task link so we know where Enter should navigate
  const firstLink = page.locator('article h3 a').first();
  const expectedHref = await firstLink.getAttribute('href');
  console.log('Expected navigation target:', expectedHref);

  // Tab from body until a task card button receives focus
  // Task cards are rendered as <button> elements wrapping <article>
  await page.keyboard.press('Tab'); // skip to first focusable (nav)
  
  // Find the first task card button by tabbing through up to 20 elements
  let focusedTag = '';
  let focusedAriaLabel = '';
  let tabCount = 0;
  
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    tabCount++;
    
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName,
        ariaLabel: el?.getAttribute('aria-label'),
        testId: el?.closest('[data-testid="column"]') ? 'in-column' : '',
        isTaskCard: !!el?.querySelector('article'),
        text: el?.textContent?.trim().substring(0, 50),
      };
    });
    
    console.log(`Tab ${tabCount}:`, focused);
    
    if (focused.isTaskCard || (focused.tag === 'BUTTON' && focused.testId === 'in-column')) {
      focusedTag = focused.tag;
      focusedAriaLabel = focused.ariaLabel || focused.text;
      console.log('Found task card button at tab count:', tabCount);
      break;
    }
  }

  // Assert: a task card button received focus via Tab
  expect(
    focusedTag,
    `After ${tabCount} Tab presses, expected to land on a task card BUTTON, but focused element tag was "${focusedTag}". Task cards may not be keyboard-reachable.`
  ).toBe('BUTTON');

  // Now press Enter and expect navigation to task detail page
  const [response] = await Promise.all([
    page.waitForURL(/\/tasks\/\d+/, { timeout: 5000 }).catch(() => null),
    page.keyboard.press('Enter'),
  ]);

  const currentUrl = page.url();
  console.log('URL after Enter:', currentUrl);

  expect(
    currentUrl,
    `Pressing Enter on a focused task card should navigate to /tasks/{id}, but URL is still "${currentUrl}"`
  ).toMatch(/\/tasks\/\d+/);
});
