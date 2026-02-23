# @autoclaude/daemon

Orchestration loop — wires all packages together, owns the SLEEP/WAKE/WORK cycle, drives task execution decisions.

## Scope

- **Daemon** (`index.mjs`) — the `Daemon` class that runs the main loop. In SLEEP mode: polls credits, runs approved tasks in sequence. In WAKE mode: generates overnight summary. In WORK mode: idles. Broadcasts status changes for SSE.

## Dependencies

- `@autoclaude/core` — config, scheduler, logger, notifier
- `@autoclaude/store` — task queue, usage recording, summary generation
- `@autoclaude/runner` — task runner, credit monitor

## Key Exports

```js
Daemon class
  .start() / .stop()
  .setSchedule({ bedTime, wakeTime, workTime })
  .getStatus() → { schedule, runner, creditsAvailable, ... }
  .getUsageData() → { current, graph, raw }
```

## Entry Point

`bin/autoclaude.mjs` (in the repo root) is the process entry point. It:
1. Creates a `Daemon` instance
2. Calls `setDaemon(daemon)` to inject it into the server package
3. Starts the HTTP server
4. Handles SIGINT/SIGTERM graceful shutdown

## Mode Lifecycle

```
WORK → SLEEP (bedTime) → WAKE (wakeTime) → WORK (workTime)
```

- **SLEEP**: Check credits → run next approved task → repeat
- **WAKE**: Generate overnight summary → idle
- **WORK**: Idle (user is working)
