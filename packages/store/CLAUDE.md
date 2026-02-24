# @autoclaude/store

All JSON data persistence — tasks, permission profiles, projects, usage history, and overnight summaries.

## Scope

- **Task Queue** (`task-queue.mjs`) — CRUD for tasks (`~/.autoclaude/tasks.json`) and permission profiles (`~/.autoclaude/permissions.json`). Contains the task data model and three default permission profiles (full-auto, safe-edit, read-only).
- **Projects** (`projects.mjs`) — CRUD for projects (`~/.autoclaude/projects.json`). Projects group tasks and have computed fields (activity status, running locations). Cascade-unassigns tasks on project deletion.
- **Usage Monitor** (`usage-monitor.mjs`) — Records usage polling history (`~/.autoclaude/usage-history.json`, capped at 2000 entries). Transforms raw API data into dashboard-ready summaries.
- **Summary** (`summary.mjs`) — Generates Markdown overnight summaries of completed/failed tasks to `~/.autoclaude/summaries/`.

## Dependencies

- `@autoclaude/core` — config for file paths
- `@autoclaude/sessions` — summary.mjs uses `getSessionTodos()`

## Key Exports

```js
// Tasks
loadTasks, saveTasks, createTask, updateTask, deleteTask, reorderTasks, getNextApprovedTask

// Permission Profiles
loadPermissions, savePermissions, getPermissionProfile, createPermissionProfile, updatePermissionProfile, deletePermissionProfile

// Projects
loadProjects, saveProjects, createProject, getProject, updateProject, deleteProject, listProjects

// Usage
loadUsageHistory, appendUsageEvent, recordPoll, recordTaskEvent, getGraphData, getCurrentUsageSummary

// Summary
generateSummary, getLatestSummary
```

## Conventions

- All persistence is JSON files in `~/.autoclaude/`
- File paths come from `loadConfig().paths.*` — never hardcode
- Task IDs and project IDs are UUIDs from `node:crypto`
- Usage history capped at 2000 entries to prevent unbounded growth
