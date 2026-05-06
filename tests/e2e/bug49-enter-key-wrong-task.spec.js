// Repro test for bug #49
// Pressing Enter on a focused task card navigates to the WRONG task's detail page.
// The card that receives Tab focus is TASK-126 but Enter navigates to /tasks/129.
// Root cause: the keyboard Enter handler fires on a different element than the
// visually focused card, indicating a focus/click target mismatch.
//
// Run: npx playwright test tests/e2e/bug49-enter-key-wrong-task.spec.js --reporter=list

const { test, expect } = require('@playwright/test');

test('Enter key on focused task card navigates to THAT card, not a different one', async ({ page }) => {
  await page.goto('http://localhost:5173/board');
  await page.waitForSelector('[data-testid="column"]', { timeout: 10000 });
  await page.waitForTimeout(1500);

  // Tab to first task card
  let focusedTaskId = null;
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el?.querySelector('article')) return null;
      // Extract task ID from the detail link inside the card
      const link = el.querySelector('a[href^="/tasks/"]');
      return link ? link.getAttribute('href') : null;
    });
    if (focused) {
      focusedTaskId = focused; // e.g. "/tasks/126"
      console.log('Focused card href:', focusedTaskId);
      break;
    }
  }

  expect(focusedTaskId, 'Should reach a task card via Tab').not.toBeNull();

  // Press Enter and capture where we land
  await Promise.all([
    page.waitForURL(/\/tasks\/\d+/, { timeout: 5000 }).catch(() => {}),
    page.keyboard.press('Enter'),
  ]);

  const landedUrl = new URL(page.url()).pathname; // e.g. "/tasks/129"
  console.log('Focused task was:', focusedTaskId, '— navigated to:', landedUrl);

  expect(
    landedUrl,
    `Enter was pressed while TASK card at "${focusedTaskId}" had focus, ` +
    `but the browser navigated to "${landedUrl}" — the wrong task.`
  ).toBe(focusedTaskId);
});
