/**
 * Bug #53 — GET /api/tasks?column_id=N ignores the filter, returns all tasks
 *
 * Steps to reproduce:
 * 1. Have at least one task in each column (Todo, In Progress, Done)
 * 2. Call GET /api/tasks?column_id=1 — expect only Todo tasks
 * 3. Call GET /api/tasks?column_id=2 — expect only In Progress tasks
 * 4. Call GET /api/tasks?column_id=3 — expect only Done tasks
 * 5. All three calls return the full task list — filter is ignored
 */

const { test, expect } = require('@playwright/test');

const API = 'http://localhost:8000';

test('GET /api/tasks?column_id filter is applied server-side', async ({ request }) => {
  // Seed: create one task in each column so all three are populated
  const createFile = async (name, content) => {
    // Use the backend container exec — here we rely on existing seeded data
    // The bug is reproducible with any board that has tasks in >1 column
  };

  // Fetch tasks for each column
  const [r1, r2, r3, rAll] = await Promise.all([
    request.get(`${API}/api/tasks?column_id=1`),
    request.get(`${API}/api/tasks?column_id=2`),
    request.get(`${API}/api/tasks?column_id=3`),
    request.get(`${API}/api/tasks`),
  ]);

  const [tasks1, tasks2, tasks3, tasksAll] = await Promise.all([
    r1.json(), r2.json(), r3.json(), rAll.json(),
  ]);

  // Every response should differ from the unfiltered response
  // (unless all tasks genuinely live in one column, which is unlikely in a seeded board)
  expect(tasks1.length).toBeLessThan(tasksAll.length);

  // Each filtered response should only contain tasks matching that column
  for (const task of tasks1) {
    expect(task.column_id).toBe(1);
  }
  for (const task of tasks2) {
    expect(task.column_id).toBe(2);
  }
  for (const task of tasks3) {
    expect(task.column_id).toBe(3);
  }

  // The union of all three filtered lists should equal the unfiltered list
  const filteredIds = new Set([...tasks1, ...tasks2, ...tasks3].map(t => t.id));
  const allIds = new Set(tasksAll.map(t => t.id));
  expect(filteredIds).toEqual(allIds);
});
