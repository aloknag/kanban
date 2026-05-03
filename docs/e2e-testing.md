# E2E Testing Guide

E2E tests use [Playwright](https://playwright.dev/) and run against the full stack
(frontend + backend) deployed via Docker Compose.

## Test files

```
frontend/e2e/          ← test specs (*.spec.ts)
frontend/playwright.config.ts
```

## Workflow: make a change → deploy → test

### 1. Make your changes

Edit any file in the repo — frontend source, backend Python, config, etc.

### 2. Deploy locally via Docker

```sh
docker compose up -d --build
```

This rebuilds both images and restarts the containers.
The frontend is served at **http://localhost:5173** and the backend at **http://localhost:8000**.

Wait for containers to be healthy (the command above waits automatically):

```sh
docker compose ps   # both should show "healthy"
```

### 3. Run the E2E tests (headless)

```sh
cd frontend
npx playwright test --project=chromium
```

Playwright detects the server already running on port 5173 and skips starting one.
Results print to the terminal; an HTML report opens automatically on failure.

**Run a single spec:**

```sh
npx playwright test e2e/board-loads.spec.ts --project=chromium
```

**Run all browsers (slower):**

```sh
npx playwright test
```

**Interactive UI mode** (useful for debugging — pauses on failure, shows browser):

```sh
npx playwright test --ui
```

### 4. View the HTML report

```sh
npx playwright show-report
```

## Writing new tests

Add a `*.spec.ts` file under `frontend/e2e/`. Use the existing
`board-loads.spec.ts` as a template.

Key patterns:

```ts
// Capture console errors before navigating
const consoleErrors: string[] = []
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})

await page.goto('/')

// Assert no specific errors
const crashError = consoleErrors.find((e) => e.includes('something bad'))
expect(crashError).toBeUndefined()

// Assert visible content
await expect(page.getByText('TODO')).toBeVisible({ timeout: 10_000 })
```

## Backend for tests

The playwright config (`frontend/playwright.config.ts`) notes that the backend
must be running separately. Docker Compose handles this — both services start
together and the frontend container waits for the backend health check before starting.

If you need an isolated data directory for tests, start the backend manually:

```sh
DATA_DIR=/tmp/e2e .venv/Scripts/python -m app serve --folder /tmp/e2e --port 8000
```
