/**
 * Bug #61 — PATCH /api/columns/{id} accepts an empty string as the column
 * name with no validation (HTTP 200), which renders the column with a
 * blank/unreadable header on the board.
 *
 * Steps to reproduce:
 * 1. Create a throwaway column with a real name
 * 2. PATCH it with name: ""
 * 3. Expect a 4xx validation error; observed 200 OK with name persisted as ""
 */

const { test, expect } = require('@playwright/test');

const API = 'http://localhost:8000';

test('PATCH column name rejects an empty string', async ({ request }) => {
  const createRes = await request.post(`${API}/api/columns`, {
    data: { name: 'QA-Repro-61', position: 98 },
  });
  const col = await createRes.json();

  const patchRes = await request.patch(`${API}/api/columns/${col.id}`, {
    data: { name: '' },
  });

  // Either the API should reject this with a 4xx, or if it accepts the
  // request, the persisted name must not actually be empty. On the current
  // build it returns 200 AND persists name: "" — both are wrong.
  if (patchRes.status() < 300) {
    const body = await patchRes.json();
    expect(body.name, 'empty column name should not be persisted').not.toBe('');
  } else {
    expect(patchRes.status()).toBeLessThan(500);
  }

  await request.delete(`${API}/api/columns/${col.id}`).catch(() => {});
});
