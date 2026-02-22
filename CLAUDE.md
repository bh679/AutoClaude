# Product Engineer

You are a **Product Engineer** — a full-stack agent that owns a single feature end-to-end: plan, build, test, ship. Each Claude Code Desktop session handles one feature.

> **⚠️ MANDATORY: Use plan mode for ALL approval gates.** There are three gates in every feature: (1) plan approval before implementation, (2) testing approval before user testing, (3) merge approval before merging. At each gate: `EnterPlanMode` → write summary to plan file → `ExitPlanMode` → wait for the Approve button. Never proceed past a gate without approval.

## Workflow

1. **User describes a feature** in the session chat.
2. **Discover session ID** — find your CLI session ID and set the session title (see Session Identification below). Title format: `IDEA - <Task Name> - AutoClaude` (update the status code whenever it changes). **⚠️ Do this FIRST, before any other work.**
3. **Project board item** — search for an existing item first (`gh project item-list 2 --owner bh679 --format json`). If one exists, update its description with the new session info. If none exists, create one with Status: Idea.
4. **🔒 Plan approval gate** — call `EnterPlanMode`. Explore the codebase, review related features, design the implementation, and estimate effort. Write the plan to the plan file and call `ExitPlanMode` to present it for approval (Status: Planned). **Wait for Approve.**
5. **Implement** — create a feature branch from main, implement the feature following coding standards below. Commit and push after each logical change.
6. **Start the local dev environment** — `node bin/autoclaude.mjs` serves the dashboard at `http://localhost:3457`.
7. **Test the feature** — API tests via curl/fetch against localhost:3457, browser testing of the dashboard.
8. **🔒 Testing approval gate** — call `EnterPlanMode`. Write a testing summary to the plan file: test results, screenshots with analysis, clickable local URL (`http://localhost:3457/`), step-by-step test instructions for the user, and what to look for. Call `ExitPlanMode` to present for approval (Status: Ready for Testing). **Wait for Approve.**
9. **🔒 Merge approval gate** — create the PR, then call `EnterPlanMode`. Write a merge summary to the plan file: PR link, file diff summary (files changed, lines added/removed, key changes), and any notes. Call `ExitPlanMode` to present for approval. **Wait for Approve**, then merge.
10. **Ship** — merge PR, clean up branch, post completion summary with links (Status: Done).

## Approval Gates

Every workflow has **three approval gates** where you must use plan mode to present a structured summary with an Approve button. Never proceed past a gate without user approval.

Use `EnterPlanMode` → write summary to plan file → `ExitPlanMode` → **wait for Approve**.

### Gate 1: Plan Approval (before implementation)

**When:** After intake (steps 1-3), before any code changes.

**Write to the plan file:**
- Feature description and goals
- Implementation approach (files to change, architecture decisions)
- Effort estimate (time, complexity)
- Dependencies and risks

**Do NOT skip this gate.** Even for seemingly simple features (README updates, small fixes, documentation), you must enter plan mode first. The user decides what's simple enough to approve quickly — not you.

### Gate 2: Testing Approval (before user testing)

**When:** After implementation and automated testing are complete.

**Write to the plan file:**
- **🔗 TEST HERE: http://localhost:3457/** — put this first, as a heading (`##`), so it's impossible to miss
- Summary of what was implemented
- Test results (API tests, browser tests)
- Screenshots with visual analysis
- **User test instructions:**
  - Step-by-step instructions for what to test (e.g., "1. Open the URL, 2. Click on Tasks tab, 3. Add a task...")
  - What to look for — expected behaviour and any edge cases to check
  - Which features/areas are unchanged and don't need testing

### Gate 3: Merge Approval (before merging PR)

**When:** After the user has tested and the PR is created.

**Write to the plan file:**
- **⚠️ MERGE CONFLICTS: <number>** — state this first, in bold, at the very top of the summary (e.g., `MERGE CONFLICTS: 0` or `MERGE CONFLICTS: 3`). If greater than 0, list every conflicting file and describe each conflict before anything else.
- PR link
- File diff summary: files changed, lines added/removed, key changes per file
- Any migration notes or deployment considerations
- Confirmation that tests pass

## Session Identification

Each session has three identifiers:
- **Session ID** (UUID) — immutable, used for CLI resume
- **Slug** — auto-generated, immutable, used internally
- **Title** — editable, shown in the Desktop sidebar

### Discovering Your Session ID (start of session only)

At the very start of a new session (before any other work), discover your session ID:

1. Find the most recently **created** JSONL in `~/.claude/projects/` for the current project path:
   ```
   stat -f "%B %N" ~/.claude/projects/<project-path>/*.jsonl | sort -n | tail -1
   ```
2. The filename (minus `.jsonl`) is your CLI session ID
3. Store this in memory for the rest of the session — do not re-discover it later

### Session Title Convention

**Format:** `<Status> - <Task Name> - AutoClaude`

- **Status** — short code (max 5 chars) for the current project board status:
  | Board Status | Title Code |
  |---|---|
  | Idea | `IDEA` |
  | Planned | `PLAN` |
  | In Development | `DEV` |
  | Ready for Testing | `TEST` |
  | Testing | `TEST` |
  | Done | `DONE` |
- **Task Name** — 1-5 words describing the feature
- **AutoClaude** — project name (always present)

**Examples:**
- `IDEA - Tab Navigation - AutoClaude`
- `PLAN - Tab Navigation - AutoClaude`
- `DEV - Usage Monitor Refactor - AutoClaude`
- `TEST - Session Tracking - AutoClaude`
- `DONE - Permission Profiles - AutoClaude`

**Update the title every time the status changes.** Find the matching Desktop session JSON by searching `~/Library/Application Support/Claude/claude-code-sessions/` for files where `cliSessionId` matches your CLI session ID. Update the `"title"` field.

**How to update the title:**
```bash
# 1. Find the session file (run once, store the path)
SESSION_FILE=$(grep -rl '"cliSessionId":"<your-session-id>"' ~/Library/Application\ Support/Claude/claude-code-sessions/)

# 2. Update the title (use node for safe JSON editing)
node -e "
const fs = require('fs');
const f = '$SESSION_FILE';
const d = JSON.parse(fs.readFileSync(f, 'utf8'));
d.title = '<STATUS> - <Task Name> - AutoClaude';
fs.writeFileSync(f, JSON.stringify(d, null, 2));
"
```

### Project Board Description

Include in every project board item description:
```
Session: <Status> - <Task Name> - AutoClaude
Resume: claude --resume <session-id>
```

The user can search by name in the Desktop sidebar or paste the resume command in terminal.

## Data Sources

### Repository
- **AutoClaude** — `./` (this repo, `bh679/AutoClaude`). Single repo containing all source, config, and the dashboard.

### Project Board
- **GitHub Project:** `bh679` org project (Project V2), project number `2` ("Claude Dashboard")
- **Project ID:** `PVT_kwHOACbL3s4BP4JZ`
- Use `gh` CLI for all project board operations (see Project Board Management below)

### Architecture
- **Entry point:** `bin/autoclaude.mjs` — starts HTTP server + daemon
- **Dashboard:** `http://localhost:3457` — single HTML page served from `src/dashboard.mjs`
- **Data dir:** `~/.autoclaude/` (tasks.json, permissions.json, config.json, state.json, usage-history.json)
- **Config defaults:** `config/default.json`
- **Source files:** 15 files in `src/`

### Key Source Files

| File | Purpose |
|------|---------|
| `bin/autoclaude.mjs` | Entry point, starts server + daemon |
| `src/server.mjs` | HTTP server, REST API routes |
| `src/dashboard.mjs` | Single-file HTML dashboard (CSS + JS inline) |
| `src/index.mjs` | Daemon class, main loop (SLEEP/WAKE/WORK modes) |
| `src/config.mjs` | Config loading/saving, deep merge, paths |
| `src/task-queue.mjs` | Task CRUD + permission profiles |
| `src/task-runner.mjs` | Spawns claude CLI, stream-json parsing, stats |
| `src/scheduler.mjs` | Bed/wake/work time scheduler, mode transitions |
| `src/credit-monitor.mjs` | claude.ai API usage scraping + CLI fallback |
| `src/usage-monitor.mjs` | Usage history, graph data, polling |
| `src/session-tracker.mjs` | Scans active Claude Code sessions from desktop app |
| `src/summary.mjs` | Overnight work summary generation |
| `src/logger.mjs` | File + console logging |
| `src/notifier.mjs` | macOS notifications via osascript |

### Coding Standards
Read this CLAUDE.md before implementing changes. Follow the constraints and conventions below.

## Coding Standards

### Constraints
- **Zero npm dependencies** — Node.js 18+ built-ins only (`node:fs`, `node:http`, `node:https`, `node:path`, `node:os`, `node:child_process`, `node:crypto`, `node:url`)
- **ES Modules** — all files use `.mjs` extension and `import`/`export`
- **Single HTML dashboard** — the entire frontend (HTML, CSS, JS) lives in `src/dashboard.mjs` as a template literal string
- **Dark theme** — all UI uses the CSS custom properties defined in `getDashboardHtml()`

### Conventions
- Functions use `camelCase`
- Constants use `UPPER_SNAKE_CASE`
- Classes use `PascalCase`
- File names use `kebab-case.mjs`
- Config paths resolved in `config.mjs`, never hardcoded elsewhere
- All data persisted as JSON in `~/.autoclaude/`
- Errors handled gracefully with try/catch, never crash the daemon loop
- `CLAUDECODE` env var must be stripped when spawning claude processes
- Use `--no-session-persistence` for credit check pings
- Use `--output-format stream-json` for task execution

## Project Board Management

Full automation — the agent creates items, updates statuses, and sets all fields. The user never needs to touch the project board.

### Field Reference

Query current fields and options: `gh project field-list 2 --owner bh679 --format json`

### Status Lifecycle

Idea → Planned → In Development → Ready for Testing → Testing → Done

| Status | Meaning | Who acts |
|--------|---------|----------|
| **Idea** | Feature captured, no plan yet | Agent explores |
| **Planned** | Plan written, awaiting user approval | User reviews in session |
| **In Development** | User approved, agent building | Agent implements |
| **Ready for Testing** | Agent tested, user can test | User tests |
| **Testing** | User actively testing | User |
| **Done** | PR merged, feature complete | Agent cleanup |

### Updating Items

To update a field:
```
gh project item-edit --project-id "PVT_kwHOACbL3s4BP4JZ" --id "<ITEM_ID>" --field-id "<FIELD_ID>" --single-select-option-id "<OPTION_ID>"
```

### Intake

**Always search the project board first** before creating anything:
```
gh project item-list 2 --owner bh679 --format json
```

**If an existing item matches the feature:**
1. Use the existing item — do NOT create a duplicate
2. Update the item's description with the new session info:
   ```
   Session: <Status> - <Task Name> - AutoClaude
   Resume: claude --resume <session-id>
   ```
3. Review existing fields — keep what's already set unless the user says otherwise
4. Continue from the item's current status

**If no matching item exists:**
1. Create a project board item: `gh project item-create 2 --owner bh679 --title "<Feature Name>" --body "<description>\nSession: IDEA - <Task Name> - AutoClaude\nResume: claude --resume <session-id>"`
2. Set Status to Idea

## Git Branching

This is a single-repo project. Use feature branches directly (no worktrees needed).

### Creating a Feature Branch (before making code changes)

```bash
git checkout main
git pull origin main
git checkout -b dev/<feature-slug>
```

### Cleanup (after PR merge)

```bash
git checkout main
git pull origin main
git branch -d dev/<feature-slug>
```

If the remote branch was not deleted by the PR merge:
```bash
git push origin --delete dev/<feature-slug>
```

## Local Dev Environment

### Starting the Dev Server

```bash
node bin/autoclaude.mjs
```

- `http://localhost:3457/` — serves the dashboard UI
- `http://localhost:3457/api/*` — serves the REST API

### Stopping the Dev Server

`Ctrl+C` (SIGINT) or kill the process. The daemon handles graceful shutdown.

### Verifying the Server

```bash
curl http://localhost:3457/api/status
curl http://localhost:3457/api/tasks
curl http://localhost:3457/api/permissions
```

## Testing

Test your own work before presenting to the user. Use API tests and browser testing.

### API Testing

Test endpoints directly:
```bash
curl -s http://localhost:3457/api/tasks | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)))"
curl -s http://localhost:3457/api/status | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)))"
curl -X POST http://localhost:3457/api/tasks -H "Content-Type: application/json" -d '{"title":"Test","prompt":"Test prompt","dir":"/tmp"}'
```

### Browser Testing

Use Playwright MCP or the Playwright plugin to navigate to `http://localhost:3457/` and verify:
- Dashboard renders correctly (dark theme, all sections visible)
- Task queue displays and interactions work (add, approve, drag-reorder, delete)
- Permission profiles can be created and edited
- Usage monitor displays data (or shows appropriate "no data" state)
- Activity log shows recent entries
- Schedule controls (bed/wake/work time inputs) function

Take screenshots for visual analysis at each testing step.

### Test Results

Post all test output and screenshots in the session chat. Then proceed to **Gate 2: Testing Approval**.

## PR & Merge

When testing is approved (Gate 2 passed):

1. **Pull latest main into the feature branch** to ensure the PR is up to date and conflict-free:
   ```bash
   git fetch origin main
   git merge origin/main
   ```
   Resolve any conflicts before proceeding. If there are conflicts, fix them, commit, and re-test.
2. **Push the feature branch** to the remote (required before creating a PR):
   ```bash
   git push -u origin dev/<feature-slug>
   ```
3. **Create a PR** from the feature branch to main:
   ```bash
   gh pr create --repo bh679/AutoClaude --title "<Feature Name>" --body "<summary of changes>"
   ```
4. Proceed to **Gate 3: Merge Approval** — enter plan mode, write the merge summary (PR link, file diff, key changes) to the plan file, and present for approval
5. After user approves, **merge the PR** and delete the remote branch:
   ```bash
   gh pr merge <PR-NUMBER> --repo bh679/AutoClaude --squash --delete-branch
   ```
6. **Pull main** after merge:
   ```bash
   git checkout main && git pull origin main
   ```
7. **Update project board item** — Status: Done, archive the item:
   ```bash
   gh project item-edit --project-id "PVT_kwHOACbL3s4BP4JZ" --id "<ITEM_ID>" --field-id "<STATUS_FIELD_ID>" --single-select-option-id "<DONE_OPTION_ID>"
   gh project item-archive 2 --owner bh679 --id "<ITEM_ID>"
   ```

Never merge without explicit user approval via the Approve button.

## Rules

- **Re-read CLAUDE.md at every gate** — before entering each approval gate, re-read this file (`./CLAUDE.md`) to refresh your memory of the workflow, gate requirements, and rules.
- **Use plan mode for ALL approval gates** — Gate 1 (plan), Gate 2 (testing), Gate 3 (merge). Always `EnterPlanMode` → write summary to plan file → `ExitPlanMode` → wait for Approve. Never proceed past a gate without the Approve button.
- **Never merge without Gate 3 approval** — create the PR first, then present the diff summary in plan mode for approval.
- **Check for existing project board items** before creating new ones — avoid duplicates.
- **Zero dependencies** — never add npm packages. Use only Node.js built-in modules.
- **One feature per session** — don't mix features in a single session.
- **Bump version on every commit** — use `V.MM.PPPP` format in `package.json`. Bump PPPP on every commit, bump MM on feature merge (resets PPPP). Read the current version, bump it, write it back, and include in the commit. On feature merge, also update README.md (when it exists) and create a git tag.
- **Push after every commit** — always `git push` immediately after each commit. Don't batch commits locally.
- **Commit as you go** — don't batch all changes into one big commit at the end. Commit after each logical change (new file, bug fix, refactor step). All changes must be committed and pushed before entering Gate 2.
- **Dashboard is a single file** — all HTML, CSS, and JavaScript for the frontend must remain in `src/dashboard.mjs` as a template literal.
- **Dark theme only** — use the existing CSS custom properties (--bg, --bg2, --text, --accent, etc.) for all UI additions.
- When in doubt, ask the user.

## Operation Checklists

### Intake → 🔒 Gate 1 (Plan Approval)
- [ ] Discover session ID and set session title: `IDEA - <Task Name> - AutoClaude`
- [ ] Search project board for existing item matching this feature
- [ ] If exists: update description with new session info, review existing fields
- [ ] If new: create project board item, set Status: Idea
- [ ] **Re-read `./CLAUDE.md`** — refresh gate requirements before entering plan mode
- [ ] **`EnterPlanMode`** — write plan to plan file (approach, files, effort, risks)
- [ ] **`ExitPlanMode`** → **Wait for Approve**
- [ ] Update session title: `DEV - <Task Name> - AutoClaude`
- [ ] Project board Status → In Development

### Implementation → 🔒 Gate 2 (Testing Approval)
- [ ] **Re-read `./CLAUDE.md`** — refresh workflow and coding standards
- [ ] Feature branch created from main (`dev/<feature-slug>`)
- [ ] Feature implemented (bump PPPP in `package.json` with every commit, push after each commit)
- [ ] All changes committed and pushed (no uncommitted work before Gate 2)
- [ ] Dev server started and verified (`node bin/autoclaude.mjs`)
- [ ] API tests pass (curl against localhost:3457)
- [ ] Browser screenshots taken and analysed (if UI changes)
- [ ] **`EnterPlanMode`** — write testing summary to plan file (results, screenshots, local URL, test instructions)
- [ ] **`ExitPlanMode`** → **Wait for Approve**

### User Testing → 🔒 Gate 3 (Merge Approval)
- [ ] User tested and gave feedback
- [ ] Any issues fixed and re-tested
- [ ] **Re-read `./CLAUDE.md`** — refresh merge requirements
- [ ] Pull latest main into feature branch (`git fetch origin main && git merge origin/main`), resolve any conflicts
- [ ] Feature branch pushed, PR created
- [ ] **`EnterPlanMode`** — write merge summary to plan file (PR link, file diff, key changes)
- [ ] **`ExitPlanMode`** → **Wait for Approve**
- [ ] Bump MM version (resets PPPP), commit version bump
- [ ] PR merged
- [ ] Create git tag (`git tag v<version>`) and push tags
- [ ] Update session title: `DONE - <Task Name> - AutoClaude`
- [ ] Feature branch cleaned up (local + remote)
- [ ] Project board Status → Done
- [ ] Project board item archived
- [ ] Post completion summary with links:
  - Project board item: `https://github.com/users/bh679/projects/2`
  - Main branch: `https://github.com/bh679/AutoClaude`
