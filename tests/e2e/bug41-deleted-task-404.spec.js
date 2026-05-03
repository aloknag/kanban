// Reproduction test for BUG #41:
// GET /api/tasks/{id} returns HTTP 200 (not 404) for deleted tasks.
// Frontend renders a blank broken task detail instead of a "not found" page.
// Console also shows: GET /api/tasks/undefined/comments -> HTTP 422
// This test FAILS on the current build.

const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:8000';
const FRONTEND = 'http://localhost:5173';

test('GET /api/tasks/{id} should return HTTP 404 for a deleted task', async ({ request }) => {
  // Create a task
  const create = await request.post(`${BASE}/api/tasks`, {
    data: { title: 'Bug41-Delete-Test', column_id: 1, content_path: 'tasks/perf-test.md' },
  });
  expect(create.status()).toBe(201);
  const { id } = await create.json();

  // Delete it
  const del = await request.delete(`${BASE}/api/tasks/${id}`);
  expect(del.status()).toBe(204);

  // Fetch deleted task — must return HTTP 404, NOT 200
  const get = await request.get(`${BASE}/api/tasks/${id}`);
  expect(get.status(), `GET /api/tasks/${id} after deletion must return 404, not 200`).toBe(404);
});

test('Navigating to a deleted task URL should show an error page, not a blank detail', async ({ page }) => {
  // Create and delete a task via API
  const resp = await page.request.post(`${BASE}/api/tasks`, {
    data: { title: 'Bug41-Browser-Test', column_id: 1, content_path: 'tasks/perf-test.md' },
  });
  const { id } = await resp.json();
  await page.request.delete(`${BASE}/api/tasks/${id}`);

  // Navigate to deleted task detail
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto(`${FRONTEND}/tasks/${id}`);
  await page.waitForTimeout(500);

  // Should show "not found" — NOT a blank page
  const text = await page.evaluate(() => document.querySelector('main')?.innerText ?? '');
  expect(text, 'Page should show a not-found message').toMatch(/not found|404|doesn.t exist/i);

  // Should have no console errors about /undefined/
  const undefinedErrors = errors.filter(e => e.includes('/undefined/'));
  expect(undefinedErrors, 'No requests to /undefined/ endpoints').toHaveLength(0);
});
