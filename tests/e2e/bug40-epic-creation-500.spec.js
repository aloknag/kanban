// Reproduction test for BUG #40: POST /api/epics crashes with HTTP 500 when column_id is not provided
// Epics are not column-scoped entities — column_id should not be required.
// The backend crashes with KeyError: 'column_id' in app/main.py:383 create_epic()
// This test FAILS on the current build.

const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:8000';

test('POST /api/epics without column_id should succeed (not crash with 500)', async ({ request }) => {
  // First create required content file via a known-working approach
  // Epic creation with only the semantically correct fields (title + content_path)
  const resp = await request.post(`${BASE}/api/epics`, {
    data: {
      title: 'Bug40-Repro-Epic',
      content_path: 'epics/qa-epic-test.md',
      // NOTE: column_id is intentionally omitted — epics are not column-scoped
    },
  });

  // Should succeed with 201, not crash with 500
  expect(resp.status(), 'Epic creation without column_id should return 201, not 500').toBe(201);
  const body = await resp.json();
  expect(body).toHaveProperty('id');
  expect(body).toHaveProperty('slug');
  expect(body.title).toBe('Bug40-Repro-Epic');
  // Epic should NOT have column_id in response
  expect(body.column_id, 'Epics should not have column_id').toBeUndefined();
});
