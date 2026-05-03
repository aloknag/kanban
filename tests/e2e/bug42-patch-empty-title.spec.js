// Reproduction test for BUG #42:
// PATCH /api/tasks/{id} with title:"" (empty string) returns HTTP 200 and silently
// overwrites the task title with an empty string. The API should return 4xx.
// The board then renders the task with no title (orange error border visible).
// This test FAILS on the current build.

const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:8000';
const FRONTEND = 'http://localhost:5173';

test('PATCH /api/tasks/{id} with empty title should return 4xx, not 200', async ({ request }) => {
  // Create a task with a valid title
  const create = await request.post(`${BASE}/api/tasks`, {
    data: { title: 'Bug42-EmptyTitle-Test', column_id: 1, content_path: 'tasks/perf-test.md' },
  });
  expect(create.status()).toBe(201);
  const { id } = await create.json();

  // PATCH with empty title — must be rejected
  const patch = await request.patch(`${BASE}/api/tasks/${id}`, {
    data: { title: '' },
  });
  expect(patch.status(), 'PATCH with empty title must return 4xx, not 200').toBeGreaterThanOrEqual(400);
  expect(patch.status()).toBeLessThan(500);

  // Original title must be intact
  const get = await request.get(`${BASE}/api/tasks/${id}`);
  const body = await get.json();
  expect(body.title, 'Task title must not be overwritten with empty string').toBe('Bug42-EmptyTitle-Test');

  // Cleanup
  await request.delete(`${BASE}/api/tasks/${id}`);
});

test('Board does not render a title-less task card after empty-title PATCH', async ({ page, request }) => {
  // Create + blank the title
  const create = await request.post(`${BASE}/api/tasks`, {
    data: { title: 'Bug42-Board-Test', column_id: 1, content_path: 'tasks/perf-test.md' },
  });
  const { id } = await create.json();
  await request.patch(`${BASE}/api/tasks/${id}`, { data: { title: '' } });

  await page.goto(`${FRONTEND}/board`);
  await page.waitForTimeout(500);

  // Find the card for this task — it should not exist with an empty title heading
  const cards = await page.evaluate((taskId) => {
    return [...document.querySelectorAll('article')].map(a => ({
      slug: a.querySelector('[class*="slug"], [class*="id"]')?.textContent ?? '',
      title: a.querySelector('h3')?.textContent ?? '',
    })).filter(c => c.slug.includes(`TASK-${taskId}`));
  }, id);

  // Either the card doesn't exist, or it has a non-empty title
  for (const card of cards) {
    expect(card.title.trim(), 'Task card must not have empty title').not.toBe('');
  }

  await request.delete(`${BASE}/api/tasks/${id}`);
});
