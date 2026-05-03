import { test, expect } from '@playwright/test'

test.describe('Board loads correctly', () => {
  test('renders without console errors and shows the board columns', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    const pageErrors: string[] = []
    page.on('pageerror', (err) => {
      pageErrors.push(err.message)
    })

    await page.goto('/')

    // Wait for the board to load
    await page.waitForURL('**/board')

    // No uncaught page errors (e.g. crash before React mounts)
    expect(pageErrors, `Page crashed: ${pageErrors.join('; ')}`).toHaveLength(0)

    // Regression: mermaid.initialize() must not throw "Unsupported color format"
    // when passed CSS custom properties (var(--x)) as themeVariables — this crashed
    // the app before ReactDOM.createRoot() ran, leaving a blank page.
    const mermaidCrash = consoleErrors.find((e) =>
      e.includes('Unsupported color format')
    )
    expect(
      mermaidCrash,
      `Mermaid initialization crashed with: ${mermaidCrash}`
    ).toBeUndefined()

    // Regression: backend must have CORS headers so browser requests are not blocked.
    const corsError = consoleErrors.find(
      (e) =>
        e.includes('CORS policy') ||
        e.includes('Access-Control-Allow-Origin')
    )
    expect(corsError, `CORS blocked API calls: ${corsError}`).toBeUndefined()

    // Board columns are visible
    await expect(page.getByText('TODO')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('IN PROGRESS')).toBeVisible()
    await expect(page.getByText('DONE')).toBeVisible()
  })
})
