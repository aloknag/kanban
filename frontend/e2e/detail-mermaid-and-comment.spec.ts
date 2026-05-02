import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Detail: Mermaid renders Fig. 1, comment posts within 5s', () => {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
  // Use the correct system temp directory
  const DATA_DIR = process.env.DATA_DIR || path.join(os.tmpdir(), 'e2e-data');
  const FIXTURES_DIR = path.join(__dirname, 'fixtures');

  test.beforeEach(async ({ page }) => {
    // Create the data directory if it doesn't exist
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Create the tasks subdirectory
    const tasksDir = path.join(DATA_DIR, 'tasks');
    if (!fs.existsSync(tasksDir)) {
      fs.mkdirSync(tasksDir, { recursive: true });
    }
  });

  test('should render mermaid diagram with Fig. 1 caption and accept comment within 5s', async ({
    page,
    request,
  }) => {
    const taskTitle = 'E2E Mermaid and Comment Test';
    const contentPath = 'tasks/e2e-mermaid.md';

    // Step 1: Ensure the Markdown file with mermaid block exists in the data folder
    const mermaidFilePath = path.join(DATA_DIR, contentPath);
    const mermaidDir = path.dirname(mermaidFilePath);
    if (!fs.existsSync(mermaidDir)) {
      fs.mkdirSync(mermaidDir, { recursive: true });
    }

    // Read the mermaid fixture and write it to the data folder
    const fixturePath = path.join(FIXTURES_DIR, 'mermaid.md');
    const fixtureContent = fs.readFileSync(fixturePath, 'utf-8');
    fs.writeFileSync(mermaidFilePath, fixtureContent);

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
