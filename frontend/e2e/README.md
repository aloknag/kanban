# Playwright Test Files

## Running Tests

### Unit Tests (Vitest + RTL)
```bash
# Run all unit tests once
npm run test

# Run tests in watch mode
npm run test -- --watch

# Open Vitest UI for interactive testing
npm run test:ui
```

### E2E Tests (Playwright)
```bash
# Run all E2E tests once
npm run e2e

# Run tests in UI mode
npm run e2e:ui

# Debug mode with inspector
npm run e2e:debug

# Run specific test file
npm run e2e -- board.spec.ts

# Run tests in headed mode (see browser)
npm run e2e -- --headed

# Run tests with specific browser
npm run e2e -- --project=chromium
```

## Test Structure

### Unit Tests
- Located in `src/**/*.test.tsx`
- Use Vitest + React Testing Library
- Test components in isolation with mocked dependencies
- Use data-testid for reliable element selection
- Test user interactions and component behavior

### E2E Tests
- Located in `e2e/**/*.spec.ts`
- Use Playwright for cross-browser testing
- Test complete user workflows
- Start dev server automatically
- Test against actual running application

## Example: Testing with data-testid

### React Component with data-testid
```tsx
// src/components/MyComponent.tsx
export function MyComponent() {
  return (
    <div data-testid="my-component">
      <button data-testid="my-button">Click me</button>
    </div>
  )
}
```

### Unit Test with RTL
```tsx
// src/components/MyComponent.test.tsx
import { render, screen } from '@/test/test-utils'
import { MyComponent } from './MyComponent'

test('renders component', () => {
  render(<MyComponent />)
  
  // Find element by data-testid
  const component = screen.getByTestId('my-component')
  expect(component).toBeInTheDocument()
  
  // Find button
  const button = screen.getByTestId('my-button')
  expect(button).toHaveTextContent('Click me')
})
```

### E2E Test with Playwright
```ts
// e2e/my-component.spec.ts
import { test, expect } from '@playwright/test'

test('user can click button', async ({ page }) => {
  await page.goto('/')
  
  // Find element by data-testid
  const button = page.locator('[data-testid="my-button"]')
  await expect(button).toBeVisible()
  
  // Click button
  await button.click()
})
```

## Best Practices

### Selectors
- ✅ Use `data-testid` for reliable element selection
- ✅ Use semantic HTML roles (`button`, `main`, `heading`)
- ❌ Avoid fragile selectors (class names, text content)

### Testing Behavior
- ✅ Test user interactions (click, type, submit)
- ✅ Test visible results and side effects
- ❌ Avoid testing implementation details

### Mocking
- Unit tests: Mock API calls, external dependencies
- E2E tests: Use real application against dev server

### Accessibility
- Use semantic HTML
- Ensure focus management
- Test keyboard navigation in E2E

## Common Patterns

### Custom render() function
The `test-utils.tsx` provides a custom render function that includes providers:

```tsx
import { render, screen } from '@/test/test-utils'

// QueryClientProvider + BrowserRouter already set up
render(<MyComponent />)
```

### Testing async operations
```tsx
import { render, screen, waitFor } from '@/test/test-utils'

test('loads data', async () => {
  render(<MyComponent />)
  
  // Wait for element to appear
  await waitFor(() => {
    expect(screen.getByTestId('loaded-content')).toBeInTheDocument()
  })
})
```

### Debugging in E2E
```bash
# Run with inspector (opens debugger)
npm run e2e:debug

# Run in headed mode to see browser
npm run e2e -- --headed

# Generate trace for debugging (already enabled in config)
# Traces available in playwright-report/
```

## CI/CD Integration

Tests are configured to run in CI mode. Set `CI` environment variable to enable:
- Retries on failure
- Single worker mode
- Artifact collection

## Troubleshooting

### Playwright not finding app
Make sure dev server is running:
```bash
npm run dev
```
Then in another terminal:
```bash
npm run e2e
```

### Tests failing in headless
- Check baseURL in playwright.config.ts
- Verify dev server is running
- Run with `--headed` to see what's happening

### Vitest or dependencies not found
```bash
npm install --legacy-peer-deps
```
