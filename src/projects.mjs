import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { loadConfig } from './config.mjs';
import { loadTasks } from './task-queue.mjs';

// ─── Projects ───

export function loadProjects() {
  const config = loadConfig();
  if (!existsSync(config.paths.projectsFile)) return [];
  try {
    return JSON.parse(readFileSync(config.paths.projectsFile, 'utf8'));
  } catch {
    return [];
  }
}

export function saveProjects(projects) {
  const config = loadConfig();
  writeFileSync(config.paths.projectsFile, JSON.stringify(projects, null, 2));
}

export function createProject({ name, description = '', mainDir = '', sshLocations = [], claudeMdPaths = [], permissions = {}, githubRepos = [] }) {
  if (!name) throw new Error('Project name is required');
  const projects = loadProjects();
  const project = {
    id: randomUUID(),
    name,
    description,
    mainDir,
    sshLocations,
    claudeMdPaths,
    permissions,
    githubRepos,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };
  projects.push(project);
  saveProjects(projects);
  return project;
}

export function getProject(id) {
  const projects = loadProjects();
  const project = projects.find(p => p.id === id);
  if (!project) return null;
  return enrichProject(project);
}

export function updateProject(id, updates) {
  const projects = loadProjects();
  const idx = projects.findIndex(p => p.id === id);
  if (idx === -1) return null;
  // Don't allow overwriting id or created
  delete updates.id;
  delete updates.created;
  updates.updated = new Date().toISOString();
  Object.assign(projects[idx], updates);
  saveProjects(projects);
  return projects[idx];
}

export function deleteProject(id) {
  const projects = loadProjects();
  const idx = projects.findIndex(p => p.id === id);
  if (idx === -1) return false;
  projects.splice(idx, 1);
  saveProjects(projects);
  // Unassign tasks from this project
  const tasks = loadTasks();
  let changed = false;
  for (const task of tasks) {
    if (task.project === id) {
      task.project = null;
      changed = true;
    }
  }
  if (changed) {
    const config = loadConfig();
    writeFileSync(config.paths.taskFile, JSON.stringify(tasks, null, 2));
  }
  return true;
}

export function listProjects() {
  const projects = loadProjects();
  return projects.map(enrichProject);
}

function enrichProject(project) {
  const tasks = loadTasks();
  const projectTasks = tasks.filter(t => t.project === project.id);
  const runningTasks = projectTasks.filter(t => t.status === 'running');

  let activityStatus = 'empty';
  if (runningTasks.length > 0) {
    activityStatus = 'active';
  } else if (projectTasks.some(t => t.status === 'pending')) {
    activityStatus = 'idle';
  } else if (projectTasks.length > 0) {
    activityStatus = 'complete';
  }

  return {
    ...project,
    tasks: projectTasks,
    runningLocations: runningTasks.map(t => t.dir),
    activityStatus,
  };
}
