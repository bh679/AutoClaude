# @autoclaude/runner

Subprocess execution — spawns the `claude` CLI for task execution and checks credit availability via the claude.ai API.

## Scope

- **Task Runner** (`task-runner.mjs`) — spawns `claude` CLI as child process with permission profile args, budget cap, sub-agent level instruction. Parses `--output-format stream-json` for progress tracking. Handles task timeout watchdog, stats extraction, and credit-issue retry detection.
- **Credit Monitor** (`credit-monitor.mjs`) — primary: HTTP GET to `claude.ai/api/organizations/{orgId}/usage` using session cookie. Fallback: spawns `claude` CLI with a "PONG" ping prompt. Classifies usage into `CreditStatus` enum.

## Dependencies

- `@autoclaude/core` — config, logger, notifier
- `@autoclaude/store` — `updateTask`, `getPermissionProfile`

## Key Exports

```js
// Task Runner
TaskRunner class
  .runTask(task) → Promise<{ exitCode, sessionId, duration, stats }>
  .kill()
  .getStatus() → { isRunning, currentTask, currentSessionId, currentDir }

// Credit Monitor
CreditStatus enum
fetchUsageFromApi() → Promise<ApiData | null>
classifyUsage(usageData) → { status, detail, resetsAt }
checkCredits() → Promise<{ status, detail, source }>
```

## Key Implementation Details

- `CLAUDECODE` env var is stripped before spawning claude processes
- `--no-session-persistence` used for credit check pings
- `--output-format stream-json` used for task execution
- Sub-agent level (0-1 slider) maps to `--append-system-prompt` instructions
- Watchdog kills tasks after `config.claude.taskTimeoutMs` of inactivity
- Credit-issue failures (rate limit, billing) auto-retry by resetting task to `pending`
