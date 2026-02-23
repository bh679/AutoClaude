# @autoclaude/server

HTTP API layer and the single-file dashboard frontend.

## Scope

- **Server** (`server.mjs`) — HTTP server handling all REST API routes. Serves dashboard at `/`, API at `/api/*`. Receives daemon reference via `setDaemon()` injection to avoid circular imports.
- **Dashboard** (`dashboard.mjs`) — exports `getDashboardHtml()` which returns the entire frontend as a single HTML string (HTML, CSS, JS inline). Dark theme using CSS custom properties.

## Dependencies

- `@autoclaude/core` — config, saveConfig, logger
- `@autoclaude/store` — all CRUD functions for tasks, permissions, projects, summary
- `@autoclaude/sessions` — `scanActiveSessions`

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Dashboard HTML |
| GET/POST | `/api/tasks` | List / create tasks |
| PUT | `/api/tasks/reorder` | Reorder tasks |
| PUT/DELETE | `/api/tasks/:id` | Update / delete task |
| GET/POST | `/api/permissions` | List / create profiles |
| PUT/DELETE | `/api/permissions/:key` | Update / delete profile |
| GET/POST | `/api/projects` | List / create projects |
| GET/PUT/DELETE | `/api/projects/:id` | Get / update / delete project |
| GET | `/api/status` | Daemon status |
| POST | `/api/schedule` | Update schedule |
| POST | `/api/daemon/start` | Start daemon |
| POST | `/api/daemon/stop` | Stop daemon |
| GET | `/api/sessions` | Active Claude sessions |
| GET | `/api/usage` | Usage data |
| POST | `/api/auth/callback` | Save session cookie |
| GET/POST | `/api/config` | Read / update config |
| GET | `/api/log` | Recent log lines |
| GET | `/api/summary` | Latest overnight summary |

## Conventions

- All UI stays in `dashboard.mjs` as a template literal (single-file frontend)
- Dark theme: use CSS custom properties (--bg, --bg2, --text, --accent, etc.)
- CORS enabled for all origins
- `setDaemon()` must be called from bin/autoclaude.mjs before server starts handling requests
