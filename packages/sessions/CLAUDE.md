# @autoclaude/sessions

macOS-specific Claude Code session scanning. Reads Desktop app JSON files, detects running processes, and parses session JSONL files.

## Scope

- **Session Tracker** (`session-tracker.mjs`) — scans `~/Library/Application Support/Claude/claude-code-sessions/` for desktop app metadata, `~/.claude/projects/` for session JSONL files, and `~/.claude/todos/` for todo files. Detects running sessions via `ps aux`.

## Dependencies

None. This package has zero dependencies on other `@autoclaude/*` packages or Node.js modules beyond built-ins (`node:fs`, `node:path`, `node:os`, `node:child_process`).

## Key Exports

```js
encodeProjectPath(dirPath) → string
getSessionMessages(sessionId, projectDir) → Message[]
getSessionSummary(sessionId, projectDir) → SessionSummary
scanActiveSessions() → Session[]
getSessionTodos(sessionId) → Todo[]
```

## Platform Notes

- This package is macOS-specific (reads from `~/Library/Application Support/`)
- `ps aux` parsing for running session detection
- V2/V3 changes (session interaction, remote execution) will primarily impact this package
