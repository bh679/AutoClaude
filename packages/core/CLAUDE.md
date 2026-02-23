# @autoclaude/core

Foundation primitives that all other packages depend on. This package has zero dependencies on other `@autoclaude/*` packages.

## Scope

- **Config** (`config.mjs`) — loads `config/default.json`, merges with user config at `~/.autoclaude/config.json`, resolves all file paths. Single source of truth for `paths.*`.
- **Logger** (`logger.mjs`) — writes to log file + stderr with ANSI color. Supports listener subscriptions for SSE broadcast.
- **Notifier** (`notifier.mjs`) — macOS notifications via `osascript`. Best-effort (errors silently ignored).
- **Scheduler** (`scheduler.mjs`) — pure time-based SLEEP/WAKE/WORK mode calculation. Zero imports, no side effects.

## Key Exports

```js
// config
loadConfig(forceReload?) → config object
saveConfig(updates) → config object
getConfig(key?) → value

// logger
log(level, message)
onLog(fn) → unsubscribe function
getRecentLogs(lines?) → string[]

// notifier
notify(message, title?)

// scheduler
Scheduler class, MODES constant
```

## Conventions

- Config paths are resolved in `config.mjs` — never hardcode `~/.autoclaude/` elsewhere
- All data directory creation happens in `loadConfig()`
- Logger level threshold: `debug` < `info` < `warn` < `error`. Only `info`+ goes to stderr.
- `DEFAULTS_PATH` in config.mjs resolves to `../../config/default.json` relative to this package
