// Keyboard / Accessibility test — Tab navigation and Enter on task card
// Tests that:
// 1. Task cards are reachable via Tab key (focusable)
// 2. Pressing Enter on a focused task card navigates to its detail page
// 3. Task card container is a proper interactive element (BUTTON or role=button), not bare DIV

const { test, expect } = require('@playwright/test');

test('task cards are keyboard-navigable: Tab focuses cards, Enter navigates to detail', async ({ page }) => {
  await page.goto('http://localhost:5173/board');
  await page.waitForSelector('[data-testid="column"]', { timeout: 10000 });
  await page.waitForTimeout(1500);

  // Get the href of the first task link so we know where Enter should navigate
  const firstLink = page.locator('article h3 a').first();
  const expectedHref = await firstLink.getAttribute('href');
  console.log('Expected navigation target:', expectedHref);

  // Tab through up to 30 elements looking for a task card to receive focus
  let focusedInfo = null;
  let tabCount = 0;

  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    tabCount++;

    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName,
        role: el?.getAttribute('role'),
        ariaLabel: el?.getAttribute('aria-label'),
        isTaskCard: !!el?.querySelector('article'),
        text: el?.textContent?.trim().substring(0, 60),
      };
    });

    console.log(`Tab ${tabCount}:`, focused);

    if (focused.isTaskCard) {
      focusedInfo = focused;
      console.log('Task card received focus at tab count:', tabCount);
      break;
    }
  }

  // Assert: a task card received focus
  expect(focusedInfo, 'A task card should be reachable via Tab keyboard navigation').not.toBeNull();

  // Assert: the focused element is a proper interactive element — BUTTON or has role=button
  // A bare DIV receiving focus is not a proper accessible interactive element
  expect(
    focusedInfo.tag === 'BUTTON' || focusedInfo.role === 'button',
    `Task card received focus as <${focusedInfo.tag} role="${focusedInfo.role}">. ` +
    `Expected BUTTON element or role="button" for proper keyboard accessibility. ` +
    `A bare focusable DIV does not fire click events on Enter key press.`
  ).toBe(true);

  // Assert: pressing Enter navigates to the task detail page
  const navigationPromise = page.waitForURL(/\/tasks\/\d+/, { timeout: 5000 }).catch(() => null);
  await page.keyboard.press('Enter');
  await navigationPromise;

  const currentUrl = page.url();
  console.log('URL after Enter:', currentUrl);

  expect(
    currentUrl,
    `Pressing Enter on a focused task card should navigate to /tasks/{id}, but URL is "${currentUrl}"`
  ).toMatch(/\/tasks\/\d+/);
});
