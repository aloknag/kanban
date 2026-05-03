import { test, expect } from '@playwright/test'
import { execSync } from 'child_process'

// Tests the Epics view end-to-end:
// 1. Creates a markdown file inside the Docker backend container
// 2. Registers an Epic via the API
// 3. Navigates to /epics and asserts the card appears
// 4. Cleans up via DELETE

test.describe('Epics view shows newly created Epic within 6s', () => {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'
  const CONTAINER = 'kanban-backend'
  const EPIC_TITLE = `QA Smoke Epic ${Date.now()}`
  const CONTENT_PATH = 'epics/e2e-smoke-epic.md'

  let epicId: number

  test.beforeAll(async () => {
    // Create the markdown file inside the running Docker container
    execSync(
      `docker exec ${CONTAINER} sh -c "mkdir -p /data/epics && printf '# E2E Smoke Epic\\n\\nCreated by Playwright.' > /data/${CONTENT_PATH}"`
    )
  })

  test.afterAll(async ({ request }) => {
    if (epicId) {
      await request.delete(`${BACKEND_URL}/api/epics/${epicId}`)
    }
    // Remove the fixture file
    execSync(`docker exec ${CONTAINER} rm -f /data/${CONTENT_PATH}`).toString()
  })

  test('Epic card appears on /epics within 6s of POST', async ({ page, request }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    // Step 1: Register the Epic via REST API
    const res = await request.post(`${BACKEND_URL}/api/epics`, {
      data: {
        title: EPIC_TITLE,
        content_path: CONTENT_PATH,
        column_id: 1,
      },
    })
    expect(res.status(), `POST /api/epics failed: ${await res.text()}`).toBe(201)
    const body = await res.json()
    epicId = body.id

    // Step 2: Navigate to /epics
    await page.goto('/epics')

    // Step 3: Epic card should appear within 6s (polling interval is 5s)
    const epicCard = page.getByText(EPIC_TITLE)
    await expect(epicCard).toBeVisible({ timeout: 6_000 })

    // Step 4: No CORS or crash errors
    const fatal = consoleErrors.find(
      (e) => e.includes('CORS') || e.includes('Unsupported color format')
    )
    expect(fatal, `Console error: ${fatal}`).toBeUndefined()
  })
})
