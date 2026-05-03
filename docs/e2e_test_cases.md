## Document containing e2e test cases

| Test Case |Test Dimension | Status | Date Executed | GitHub Tracker if test failed |
|-----------|---------------|--------|---------------|-------------------------------|
| When: Human user creates a new task with a name of 600 characters. And: Fills in the task body with a normal-length string. Then: The task is created successfully, and the name displays fully and correctly on the board. | Boundary values | FAIL | 2026-05-03 (re-validated 2026-05-03) | https://github.com/aloknag/testfiles/issues/36 |
| When: Human user creates a task in "To Do" column. And: Moves the task to "In Progress", then to "Done", then back to "To Do". Then: The task status updates correctly at each step and persists after page refresh. | State transitions | PASS | 2026-05-03 | - |
| When: Agent creates a task via API with special characters in title (e.g. `<script>alert(1)</script>` and unicode emoji 🚀). And: Human opens the board. Then: The task title renders safely (no XSS execution) and the unicode displays correctly. | UI rendering / Boundary values | PASS | 2026-05-03 | - |
| When: Agent sends a PATCH request to move a task to a non-existent column_id (e.g. 9999). Then: The API returns an appropriate error (4xx) and the task remains in its original column. | API contract / Error states | FAIL | 2026-05-03 | https://github.com/aloknag/testfiles/issues/37 |
| When: Agent creates a new task via API (POST /api/tasks) with a known title. And: Human opens the board in the browser. Then: The task appears on the board under the correct column without requiring any manual interaction. | Cross-persona | PASS | 2026-05-03 | - |
| When: Human opens the board. And: The API returns 4 columns including a duplicate "Todo" column (id=4, position=3). Then: The board should only show 3 canonical columns (Todo, In Progress, Done) with no duplicates. | Data integrity | FAIL | 2026-05-03 | https://github.com/aloknag/testfiles/issues/38 |
