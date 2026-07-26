import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Detail: Mermaid renders Fig. 1, comment posts within 5s', () => {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
  const BACKEND_CONTAINER = process.env.BACKEND_CONTAINER || 'kanban-backend';
  const FIXTURES_DIR = path.join(__dirname, 'fixtures');

  // The backend under test runs in Docker Compose (docs/e2e-testing.md), whose
  // DATA_DIR is a named Docker volume — not a host-bind-mounted directory. A
  // file written to a local DATA_DIR path is invisible to that container, so
  // content_path fixtures must be copied directly into the container instead.
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

  test('should render mermaid diagram with Fig. 1 caption and accept comment within 5s', async ({
    page,
    request,
  }) => {
    const taskTitle = 'E2E Mermaid and Comment Test';
    const contentPath = 'tasks/e2e-mermaid.md';

    // Step 1: Ensure the Markdown file with mermaid block exists in the backend's data folder
    const fixturePath = path.join(FIXTURES_DIR, 'mermaid.md');
    const fixtureContent = fs.readFileSync(fixturePath, 'utf-8');
    writeContainerFile(contentPath, fixtureContent);

    // Step 2: POST a new task to the API
    const createResponse = await request.post(`${BACKEND_URL}/api/tasks`, {
      data: {
        title: taskTitle,
        content_path: contentPath,
        column_id: 1,
      },
    });

    expect(createResponse.status()).toBe(201);
    const responseBody = await createResponse.json();
    const taskId = responseBody.id;

    // Step 3: Set localStorage author before navigation
    await page.addInitScript(() => {
      localStorage.setItem('author', 'e2e-bot');
    });

    // Step 4: Navigate to the task detail page
    await page.goto(`/tasks/${taskId}`);

    // Wait for the mermaid diagram to render
    const figureLocator = page.locator('figure[data-mermaid]').first();
    await expect(figureLocator).toBeVisible({ timeout: 10000 });

    // Assert SVG is inside the figure
    const svgLocator = figureLocator.locator('svg').first();
    await expect(svgLocator).toBeVisible({ timeout: 10000 });

    // Assert the caption matches the pattern /^Fig\. 1$/
    const figureCaption = figureLocator.locator('[data-figure-caption]');
    await expect(figureCaption).toBeVisible();
    const captionText = await figureCaption.textContent();
    expect(captionText?.trim()).toMatch(/^FIG\. 1$/);

    // Step 6: Find the comment compose area and type a comment
    const commentInput = page.locator('textarea[data-testid="comment-input"]');
    await expect(commentInput).toBeVisible({ timeout: 10000 });

    await commentInput.click();
    await commentInput.type('playwright was here', { delay: 50 });

    // Step 7: Submit the comment using Ctrl+Enter
    await commentInput.press('Control+Enter');

    // Step 8: Wait for the comment to appear in the journal within 5 seconds
    const journalEntry = page.locator('[data-testid="journal-entry"]');
    await expect(journalEntry.first()).toBeVisible({ timeout: 5000 });

    // Step 9: Verify the comment entry has the correct author and body
    const entryAuthor = journalEntry.locator('[data-author]').first();
    const entryBody = journalEntry.locator('[data-body]').first();

    const authorText = await entryAuthor.textContent();
    const entryBodyText = await entryBody.textContent();

    expect(authorText?.trim()).toContain('e2e-bot');
    expect(entryBodyText?.trim()).toContain('playwright was here');
  });
});
