// Reproduction test for BUG #43:
// Epic detail page (/epics/{id}) does not show linked tasks.
// Epics list table rows are not clickable links.
// This test FAILS on the current build.

const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:8000';
const FRONTEND = 'http://localhost:5173';

test.describe('Epic detail view shows linked tasks', () => {
  let epicId;
  let taskIds = [];

  test.beforeAll(async ({ request }) => {
    // Create epic (column_id workaround for bug #40)
    const epic = await request.post(`${BASE}/api/epics`, {
      data: { title: 'Bug43-Epic', content_path: 'epics/qa-epic-detail.md', column_id: 1 },
    });
    expect(epic.status()).toBe(201);
    epicId = (await epic.json()).id;

    // Create 3 tasks and link them
    for (let i = 1; i <= 3; i++) {
      const t = await request.post(`${BASE}/api/tasks`, {
        data: { title: `Bug43-Task-${i}`, column_id: 1, content_path: 'tasks/perf-test.md' },
      });
      expect(t.status()).toBe(201);
      const { id } = await t.json();
      taskIds.push(id);
      await request.patch(`${BASE}/api/tasks/${id}`, { data: { epic_id: epicId } });
    }
  });

  test('Epics list rows are clickable links to the epic detail', async ({ page }) => {
    await page.goto(`${FRONTEND}/epics`);
    await page.waitForTimeout(500);

    // Should have a link or clickable row for the epic
    const epicLinks = await page.evaluate((slug) => {
      return [...document.querySelectorAll(`a[href*="/epics/"], [role="link"]`)]
        .map(el => ({ tag: el.tagName, href: el.getAttribute('href') || '', text: el.textContent.trim() }));
    }, `EPIC-${epicId}`);

    expect(epicLinks.length, 'Epics list should have clickable links to epic detail pages').toBeGreaterThan(0);
  });

  test('Epic detail page shows all linked task titles', async ({ page }) => {
    await page.goto(`${FRONTEND}/epics/${epicId}`);
    await page.waitForTimeout(500);

    const pageText = await page.evaluate(() => document.querySelector('main')?.innerText ?? '');

    // Each linked task title should appear on the detail page
    for (let i = 1; i <= 3; i++) {
      expect(pageText, `Epic detail should show Bug43-Task-${i}`).toContain(`Bug43-Task-${i}`);
    }
  });

  test('Epic detail page shows correct progress count', async ({ page }) => {
    await page.goto(`${FRONTEND}/epics/${epicId}`);
    await page.waitForTimeout(500);

    const pageText = await page.evaluate(() => document.querySelector('main')?.innerText ?? '');
    // Should show task count (3 tasks linked)
    expect(pageText, 'Epic detail should show task count').toMatch(/3/);
  });
});
