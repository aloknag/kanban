/**
 * Bug #59 — POST /api/tasks can spuriously fail with HTTP 500
 * "slug_collision" for a title that has no real conflict. A prior failed
 * (400) creation attempt (invalid content_path, invalid epic_id type)
 * appears to reserve/advance slug-allocation state, which then causes an
 * unrelated subsequent create to crash instead of cleanly validating.
 *
 * Steps to reproduce (confirmed reproducible twice via curl):
 * 1. POST /api/tasks with title T, no content_path, epic_id: "abc" —
 *    returns 400 {"detail":"invalid_path"}. No task is created.
 * 2. POST /api/tasks again with a related title, a VALID content_path,
 *    and epic_id: "abc" again.
 * 3. Expect a clean 4xx (invalid epic_id type) or 201. Observed: 500
 *    {"detail":"slug_collision"} even though no task with a colliding
 *    slug exists in the task list.
 */

const { test, expect } = require('@playwright/test');

const API = 'http://localhost:8000';

test('a failed task creation does not poison slug allocation for the next create', async ({ request }) => {
  const uniqueSuffix = Date.now();

  // Step 1: intentionally invalid create (no content_path) — expect 400
  const failRes = await request.post(`${API}/api/tasks`, {
    data: {
      title: `QA Slug Poison Setup ${uniqueSuffix}`,
      column_id: 1,
      epic_id: 'abc', // invalid type, but content_path is the first thing validated
    },
  });
  expect(failRes.status()).toBe(400);

  // Step 2: a similarly-shaped create right after (same invalid epic_id
  // type, but this time with a valid content_path so it should succeed)
  const okRes = await request.post(`${API}/api/tasks`, {
    data: {
      title: `QA Slug Poison Followup ${uniqueSuffix}`,
      column_id: 1,
      epic_id: 'abc',
      content_path: `tasks/qa-slug-poison-${uniqueSuffix}.md`,
    },
  });

  const body = await okRes.json().catch(() => ({}));
  expect(
    okRes.status(),
    `expected a clean 4xx (invalid epic_id) or 201, got ${okRes.status()} body=${JSON.stringify(body)}`
  ).toBeLessThan(500);

  // cleanup
  if (body.id) {
    await request.delete(`${API}/api/tasks/${body.id}`).catch(() => {});
  }
});
