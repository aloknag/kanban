import { test, expect, type Page, type Locator } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The board only ever has one Todo/In-Progress pair — column reorder is a
// mutation on a shared *global* singleton, not per-test fixture data like
// tasks are. When this spec runs across multiple browser projects at once
// (the default outside CI), two projects' reorder tests can otherwise race
// on the same two columns and stomp each other's expectations. A simple
// cross-process directory lock (mkdir is atomic) keeps the reorder test
// exclusive without forcing the whole suite to run single-worker.
const REORDER_LOCK_DIR = path.join(os.tmpdir(), 'kanban-e2e-column-reorder.lock');

async function withColumnReorderLock<T>(fn: () => Promise<T>): Promise<T> {
  const deadline = Date.now() + 30_000;
  for (;;) {
    try {
      fs.mkdirSync(REORDER_LOCK_DIR);
      break;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
      if (Date.now() > deadline) throw new Error('Timed out waiting for column reorder lock');
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  try {
    return await fn();
  } finally {
    fs.rmdirSync(REORDER_LOCK_DIR);
  }
}

// The board polls /api/tasks and /api/columns every 5s (queryClient's
// refetchInterval), and that refetch is keyed to *global* backend state —
// so it also picks up mutations from completely unrelated e2e spec files
// running concurrently (poll-delivers-new-card.spec.ts and
// detail-mermaid-and-comment.spec.ts also POST tasks with column_id: 1).
// If one of those refetches lands mid-drag, the column layout can reflow
// under the cursor and the drop overshoots onto a different column. Delay
// (not block — an aborted request would surface as a console error) GET
// responses to those two endpoints on this page for the duration of the
// drag so its own DOM can't shift out from under it.
async function freezeBoardPollingDuringDrag<T>(page: Page, fn: () => Promise<T>): Promise<T> {
  const isFrozenEndpoint = (url: URL) => url.pathname === '/api/tasks' || url.pathname === '/api/columns';

  await page.route(isFrozenEndpoint, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await route.continue();
  });

  try {
    return await fn();
  } finally {
    await page.unroute(isFrozenEndpoint);
  }
}

// Covers Epic #7 AC1 (column reorder), AC2 (task move), AC4 (theme toggle),
// and AC5 (mermaid re-themes on toggle) against the live Docker stack.
test.describe('Drag-and-drop reorder/move and theme toggle', () => {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
  const BACKEND_CONTAINER = process.env.BACKEND_CONTAINER || 'kanban-backend';
  const FIXTURES_DIR = path.join(__dirname, 'fixtures');

  // Same technique as detail-mermaid-and-comment.spec.ts: the backend's
  // DATA_DIR is a named Docker volume, not a host bind mount, so fixture
  // files must be copied directly into the container.
  function writeContainerFile(contentPath: string, content: string) {
    const tmpFile = path.join(os.tmpdir(), `e2e-upload-${Date.now()}-${path.basename(contentPath)}`);
    fs.writeFileSync(tmpFile, content);
    try {
      const containerDir = path.posix.dirname(`/data/${contentPath}`);
      execFileSync('docker', ['exec', BACKEND_CONTAINER, 'mkdir', '-p', containerDir]);
      execFileSync('docker', ['cp', tmpFile, `${BACKEND_CONTAINER}:/data/${contentPath}`]);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  }

  // dnd-kit's PointerSensor is used (not native HTML5 DnD), so real pointer
  // events are simulated via page.mouse — a plain locator.dragTo() dispatches
  // native dragstart/drop events that dnd-kit never listens for. The move
  // past 8px is required because Board.tsx registers PointerSensor with
  // activationConstraint: { distance: 8 } (so taps still reach child links).
  //
  // dnd-kit positions the dragged item by translating its ORIGINAL rect by
  // the pointer's delta (current pointer − pointer-down position) — it does
  // NOT recenter the dragged rect on the pointer. For a column, the pointer
  // goes down on the small <header> (the drag handle), but the rect dnd-kit
  // actually measures and moves is the whole <section> (`activeContainer`),
  // which is a different size. Aiming the pointer at the target's center
  // therefore does not land the section's center on the target — the drop
  // point must be computed from the delta between the section's own center
  // and the target's center, then applied on top of wherever the handle is.
  async function dragElement(page: Page, handle: Locator, activeContainer: Locator, target: Locator) {
    // Read all three rects in a single browser-side pass instead of three
    // separate .boundingBox() round trips — under heavy parallel-worker CPU
    // load, a reflow (e.g. another column's task list growing) landing
    // between two separate round trips skews the computed delta and the
    // drop overshoots onto the wrong column. One atomic evaluate() can't be
    // interleaved with a reflow like that.
    const [handleEl, activeEl, targetEl] = await Promise.all([
      handle.elementHandle(),
      activeContainer.elementHandle(),
      target.elementHandle(),
    ]);
    if (!handleEl || !activeEl || !targetEl) {
      throw new Error('Could not resolve element handle for drag handle/container/target');
    }

    const { startX, startY, endX, endY } = await page.evaluate(
      ([h, a, t]) => {
        const hb = (h as Element).getBoundingClientRect();
        const ab = (a as Element).getBoundingClientRect();
        const tb = (t as Element).getBoundingClientRect();
        const activeCenterX = ab.x + ab.width / 2;
        const activeCenterY = ab.y + ab.height / 2;
        const targetCenterX = tb.x + tb.width / 2;
        const targetCenterY = tb.y + tb.height / 2;
        const startX = hb.x + hb.width / 2;
        const startY = hb.y + hb.height / 2;
        return {
          startX,
          startY,
          endX: startX + (targetCenterX - activeCenterX),
          endY: startY + (targetCenterY - activeCenterY),
        };
      },
      [handleEl, activeEl, targetEl]
    );

    // dnd-kit's collision detection re-measures on each real pointermove
    // event; a single interpolated mouse.move({steps}) call fires those
    // events back-to-back with no yield in between and dnd-kit misses
    // updates, so intermediate positions are sent as separate calls with a
    // short pause each to let dnd-kit's internal state catch up.
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(50);
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(startX + ((endX - startX) * i) / 10, startY + ((endY - startY) * i) / 10);
      await page.waitForTimeout(30);
    }
    await page.waitForTimeout(100);
    await page.mouse.up();
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/board');
    await expect(page.getByRole('heading', { name: 'TODO' })).toBeVisible({ timeout: 10_000 });
  });

  test('dragging a column header reorders columns, PATCHes /api/columns/reorder, and the order survives reload (AC1)', async ({
    page,
  }) => {
    test.slow(); // may wait behind withColumnReorderLock for concurrent browser projects
    await withColumnReorderLock(async () => {
      const headers = page.locator('[data-testid="column-header"]');
      const sections = page.locator('[data-testid="column"]');

      // Board.tsx always renders Done last regardless of `position`, so the
      // first two headers are always the two non-Done columns — this makes
      // the assertion below idempotent across repeated runs against the same
      // persisted volume, rather than hard-coding an initial "Todo, In
      // Progress" order that a prior run may have already swapped.
      const firstHeaderTextBefore = (await headers.nth(0).locator('h2').innerText()).trim();
      const secondHeaderTextBefore = (await headers.nth(1).locator('h2').innerText()).trim();

      const patchResponse = await freezeBoardPollingDuringDrag(page, async () => {
        const patchPromise = page.waitForResponse(
          (resp) => resp.url().includes('/api/columns/reorder') && resp.request().method() === 'PATCH',
          { timeout: 20_000 }
        );

        await dragElement(page, headers.nth(0), sections.nth(0), sections.nth(1));

        return patchPromise;
      });

      expect(patchResponse.ok()).toBe(true);

      await expect(headers.nth(0).locator('h2')).toHaveText(secondHeaderTextBefore);
      await expect(headers.nth(1).locator('h2')).toHaveText(firstHeaderTextBefore);

      // Survives reload — order is persisted server-side, not just optimistic UI state.
      await page.reload();
      await expect(page.locator('[data-testid="column-header"]').nth(0).locator('h2')).toHaveText(
        secondHeaderTextBefore,
        { timeout: 10_000 }
      );
      await expect(page.locator('[data-testid="column-header"]').nth(1).locator('h2')).toHaveText(
        firstHeaderTextBefore
      );
    });
  });

  test('dragging a task card onto a different column updates column_id, PATCHes /api/tasks/{id}, and survives reload (AC2)', async ({
    page,
    request,
  }) => {
    // Generous explicit timeout (not just test.slow()'s 3x): this test does
    // up to 3 full drag-reset-retry cycles, each with its own 20s PATCH
    // wait, and test.slow()'s 90s budget can get eaten by the retry loop
    // itself under heavy concurrent-project CPU load before a genuinely
    // slow-but-working drag gets the time it needs.
    test.setTimeout(150_000);
    const taskTitle = `E2E DnD move ${Date.now()}`;
    const contentPath = `tasks/e2e-dnd-move-${Date.now()}.md`;
    writeContainerFile(contentPath, `# ${taskTitle}\n\nCreated for the DnD move e2e test.`);

    const createResponse = await request.post(`${BACKEND_URL}/api/tasks`, {
      data: { title: taskTitle, content_path: contentPath, column_id: 1 },
    });
    expect(createResponse.status()).toBe(201);
    const task = await createResponse.json();

    try {
      await page.reload();
      const taskCard = page.locator(`[data-task-id="${task.id}"]`);
      await expect(taskCard).toBeVisible({ timeout: 10_000 });

      // Target whichever non-Done column is NOT the task's current column —
      // resilient to column order having been changed by the reorder test
      // above, and avoids Done (collapsed by default, so its drop surface
      // is smaller and not what this test is exercising).
      const targetSection = page
        .locator(`[data-testid="column"]:not([data-column-id="${task.column_id}"])`)
        .filter({ hasNot: page.getByRole('heading', { name: 'DONE' }) })
        .first();
      const targetColumnId = Number(await targetSection.getAttribute('data-column-id'));

      // A pointer-simulated drag is a physical, timing-sensitive interaction
      // (see dragElement) — under heavy concurrent CPU load from other
      // browser projects it can occasionally overshoot onto a neighboring
      // column. Retry the drag itself (not just the assertion) a couple of
      // times so a single mistimed run doesn't fail the whole suite; each
      // retry first resets the task back to its source column.
      let patchedTask: { column_id: number } | undefined;
      for (let attempt = 1; attempt <= 3 && patchedTask?.column_id !== targetColumnId; attempt++) {
        if (attempt > 1) {
          await request.patch(`${BACKEND_URL}/api/tasks/${task.id}`, {
            data: { column_id: task.column_id },
          });
          await page.reload();
          await expect(taskCard).toBeVisible({ timeout: 10_000 });
        }

        const patchResponse = await freezeBoardPollingDuringDrag(page, async () => {
          const patchPromise = page.waitForResponse(
            (resp) => resp.url().includes(`/api/tasks/${task.id}`) && resp.request().method() === 'PATCH',
            { timeout: 20_000 }
          );

          await dragElement(page, taskCard, taskCard, targetSection);

          return patchPromise;
        });

        expect(patchResponse.ok()).toBe(true);
        patchedTask = await patchResponse.json();
      }
      expect(patchedTask?.column_id).toBe(targetColumnId);

      // Survives reload
      await page.reload();
      const getResponse = await request.get(`${BACKEND_URL}/api/tasks/${task.id}`);
      const reloadedTask = await getResponse.json();
      expect(reloadedTask.column_id).toBe(targetColumnId);
    } finally {
      // Keep the board's task list small across repeated runs — a tall
      // Todo column pushes drag targets outside the viewport and makes
      // every other test in this file flakier.
      await request.delete(`${BACKEND_URL}/api/tasks/${task.id}`);
    }
  });

  test('"t" toggles theme, flips data-theme on <html>, and persists in localStorage (AC4)', async ({ page }) => {
    const initialTheme = await page.locator('html').getAttribute('data-theme');
    expect(initialTheme).toMatch(/^(light|dark)$/);

    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('t');

    const toggledTheme = await page.locator('html').getAttribute('data-theme');
    expect(toggledTheme).not.toBe(initialTheme);

    const storedTheme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(storedTheme).toBe(toggledTheme);

    // Toggle back
    await page.keyboard.press('t');
    const revertedTheme = await page.locator('html').getAttribute('data-theme');
    expect(revertedTheme).toBe(initialTheme);
  });

  test('mermaid diagram re-themes on toggle with no "Unsupported color format" crash (AC5)', async ({
    page,
    request,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const taskTitle = `E2E Mermaid Retheme ${Date.now()}`;
    const contentPath = `tasks/e2e-mermaid-retheme-${Date.now()}.md`;
    const fixtureContent = fs.readFileSync(path.join(FIXTURES_DIR, 'mermaid.md'), 'utf-8');
    writeContainerFile(contentPath, fixtureContent);

    const createResponse = await request.post(`${BACKEND_URL}/api/tasks`, {
      data: { title: taskTitle, content_path: contentPath, column_id: 1 },
    });
    expect(createResponse.status()).toBe(201);
    const task = await createResponse.json();

    try {
      await page.goto(`/tasks/${task.id}`);

      const figure = page.locator('figure[data-mermaid]').first();
      await expect(figure).toBeVisible({ timeout: 10_000 });
      const svg = figure.locator('svg').first();
      await expect(svg).toBeVisible({ timeout: 10_000 });

      const svgBefore = await svg.innerHTML();
      expect(svgBefore).not.toContain('var(--');

      const themeBefore = await page.locator('html').getAttribute('data-theme');

      // The `t` hotkey is only registered by Board.tsx, not the task detail
      // route (see Board.theme.test.tsx / HotkeyProvider — hotkeys are
      // registered per-component, not globally). Use the theme toggle button
      // in TopRule, which is rendered on every route, to flip the theme here.
      await page.getByLabel('theme toggle').click();

      await expect(page.locator('html')).not.toHaveAttribute('data-theme', themeBefore ?? '');

      // The diagram re-renders (new SVG content) rather than staying stuck on
      // the old theme's colors, and never regresses to raw var() strings.
      await expect(async () => {
        const svgAfter = await svg.innerHTML();
        expect(svgAfter).not.toBe(svgBefore);
        expect(svgAfter).not.toContain('var(--');
      }).toPass({ timeout: 5_000 });

      const crash = consoleErrors.find((e) => e.includes('Unsupported color format'));
      expect(crash, `Mermaid crashed on re-theme: ${crash}`).toBeUndefined();
    } finally {
      await request.delete(`${BACKEND_URL}/api/tasks/${task.id}`);
    }
  });
});
