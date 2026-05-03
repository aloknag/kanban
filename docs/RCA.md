# Root Cause Analysis

---

### Mermaid initialized with unresolvable CSS vars

Why: The theme toggle feature passed CSS custom properties as mermaid color values, but mermaid parses them synchronously before the DOM exists.
Who: `frontend/src/main.tsx` — `mermaid.initialize()` call added with the theme toggle commit (e244ae6).
Where: Should have been caught by an E2E smoke test on the Docker build, or a local `npm run build && serve dist` check before merging.
Avoid: Never pass `var(--x)` to third-party libraries that parse values at init time; validate features against the production build, not just `npm run dev`.

---

### Backend shipped without CORS headers

Why: CORS was never needed in dev because the Vite proxy handles API calls server-side, masking the requirement for the production build.
Who: `app/main.py` — `create_app()` has no `CORSMiddleware`, present since the backend was first scaffolded.
Where: Should have been caught by an E2E test running against a built Docker image, not the Vite dev server.
Avoid: Treat Docker Compose as the only valid acceptance environment; any API consumed by a browser requires CORS headers regardless of the dev proxy setup.
