import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { loadConfig } from './config.mjs';

// ─── Tasks ───

export function loadTasks() {
  const config = loadConfig();
  if (!existsSync(config.paths.taskFile)) return [];
  try {
    return JSON.parse(readFileSync(config.paths.taskFile, 'utf8'));
  } catch {
    return [];
  }
}

export function saveTasks(tasks) {
  const config = loadConfig();
  writeFileSync(config.paths.taskFile, JSON.stringify(tasks, null, 2));
}

export function createTask({ title, prompt, dir, project = null, dependencies = [], permissionProfile = 'full-auto', subagentLevel = 0.5 }) {
  const tasks = loadTasks();
  const maxOrder = tasks.reduce((max, t) => Math.max(max, t.order || 0), 0);
  const task = {
    id: randomUUID(),
    title,
    prompt,
    dir: dir || process.cwd(),
    project,
    dependencies,
    status: 'pending',
    approved: false,
    workflowStatus: 'idea',
    needsInput: null,
    order: maxOrder + 1,
    permissionProfile,
    subagentLevel,
    added: new Date().toISOString(),
    started: null,
    completed: null,
    sessionId: null,
    error: null,
    stats: null, // populated on completion: { toolUses, subagentCalls, models, duration }
  };
  tasks.push(task);
  saveTasks(tasks);
  return task;
}

export function updateTask(id, updates) {
  const tasks = loadTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return null;
  Object.assign(tasks[idx], updates);
  saveTasks(tasks);
  return tasks[idx];
}

export function deleteTask(id) {
  const tasks = loadTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return false;
  tasks.splice(idx, 1);
  saveTasks(tasks);
  return true;
}

export function reorderTasks(orderedIds) {
  const tasks = loadTasks();
  for (let i = 0; i < orderedIds.length; i++) {
    const task = tasks.find(t => t.id === orderedIds[i]);
    if (task) task.order = i + 1;
  }
  saveTasks(tasks);
  return tasks;
}

export function getNextApprovedTask() {
  const tasks = loadTasks();
  return tasks
    .filter(t => t.approved && t.status === 'pending')
    .sort((a, b) => (a.order || 0) - (b.order || 0))[0] || null;
}

// ─── Permission Profiles ───

export function loadPermissions() {
  const config = loadConfig();
  if (!existsSync(config.paths.permissionsFile)) {
    const defaults = getDefaultPermissions();
    savePermissions(defaults);
    return defaults;
  }
  try {
    return JSON.parse(readFileSync(config.paths.permissionsFile, 'utf8'));
  } catch {
    return getDefaultPermissions();
  }
}

export function savePermissions(data) {
  const config = loadConfig();
  writeFileSync(config.paths.permissionsFile, JSON.stringify(data, null, 2));
}

export function getPermissionProfile(key) {
  const data = loadPermissions();
  return data.profiles?.[key] || null;
}

export function createPermissionProfile(key, profile) {
  const data = loadPermissions();
  if (!data.profiles) data.profiles = {};
  data.profiles[key] = profile;
  savePermissions(data);
  return profile;
}

export function updatePermissionProfile(key, updates) {
  const data = loadPermissions();
  if (!data.profiles?.[key]) return null;
  Object.assign(data.profiles[key], updates);
  savePermissions(data);
  return data.profiles[key];
}

export function deletePermissionProfile(key) {
  const data = loadPermissions();
  if (!data.profiles?.[key]) return false;
  delete data.profiles[key];
  savePermissions(data);
  return true;
}

function getDefaultPermissions() {
  return {
    profiles: {
      'full-auto': {
        name: 'Full Auto',
        description: 'Skip all permission checks',
        permissionMode: 'bypassPermissions',
        dangerouslySkipPermissions: true,
        allowedTools: [],
        disallowedTools: [],
      },
      'safe-edit': {
        name: 'Safe Edit',
        description: 'Auto-accept file edits only',
        permissionMode: 'acceptEdits',
        dangerouslySkipPermissions: false,
        allowedTools: ['Read', 'Edit', 'Write', 'Glob', 'Grep'],
        disallowedTools: ['Bash'],
      },
      'read-only': {
        name: 'Read Only',
        description: 'Research only, no modifications',
        permissionMode: 'plan',
        dangerouslySkipPermissions: false,
        allowedTools: ['Read', 'Glob', 'Grep', 'WebFetch'],
        disallowedTools: ['Edit', 'Write', 'Bash'],
      },
    },
  };
}
