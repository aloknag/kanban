// Reproduction test for BUG #39: API accepts empty/whitespace-only journal comment body
// POST /api/tasks/{id}/comments with body="" or body="   " returns 201 (should return 4xx)
// POST /api/tasks/{id}/comments with no body field returns 500 (should return 4xx)
// This test FAILS on the current build.

const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:8000';

test.describe('BUG-39: comment body validation', () => {
  test('POST comment with empty body string should be rejected (4xx)', async ({ request }) => {
    const resp = await request.post(`${BASE}/api/tasks/15/comments`, {
      data: { author: 'QA-Tester', body: '' },
    });
    // Should reject with 4xx, not accept with 201
    expect(resp.status(), 'empty body should be rejected').toBeGreaterThanOrEqual(400);
    expect(resp.status()).toBeLessThan(500);
  });

  test('POST comment with whitespace-only body should be rejected (4xx)', async ({ request }) => {
    const resp = await request.post(`${BASE}/api/tasks/15/comments`, {
      data: { author: 'QA-Tester', body: '   ' },
    });
    expect(resp.status(), 'whitespace-only body should be rejected').toBeGreaterThanOrEqual(400);
    expect(resp.status()).toBeLessThan(500);
  });

  test('POST comment with missing body field should return 4xx not 500', async ({ request }) => {
    const resp = await request.post(`${BASE}/api/tasks/15/comments`, {
      data: { author: 'QA-Tester' },
    });
    // Should return 422 validation error, NOT 500
    expect(resp.status(), 'missing body field should give 4xx not 500').toBeGreaterThanOrEqual(400);
    expect(resp.status(), 'should not be 500 server crash').toBeLessThan(500);
  });
});
