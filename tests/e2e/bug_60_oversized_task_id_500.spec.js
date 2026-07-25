/**
 * Bug #60 — GET /api/tasks/{id} with an ID exceeding normal integer range
 * returns HTTP 500 Internal Server Error instead of 404 Not Found.
 *
 * Steps to reproduce:
 * 1. GET /api/tasks/99999999999999999999999999 (26-digit number)
 * 2. Expect 404 Not Found (as with any other nonexistent numeric id,
 *    e.g. /api/tasks/-5 which correctly returns 404)
 * 3. Observed: 500 Internal Server Error
 */

const { test, expect } = require('@playwright/test');

const API = 'http://localhost:8000';

test('oversized numeric task id returns 404, not 500', async ({ request }) => {
  const res = await request.get(`${API}/api/tasks/99999999999999999999999999`);
  expect(res.status()).toBe(404);
});

test('control: negative task id correctly returns 404', async ({ request }) => {
  const res = await request.get(`${API}/api/tasks/-5`);
  expect(res.status()).toBe(404);
});
