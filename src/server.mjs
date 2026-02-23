import { createServer } from 'node:http';
import { loadConfig, saveConfig } from './config.mjs';
import { loadTasks, createTask, updateTask, deleteTask, reorderTasks, loadPermissions, createPermissionProfile, updatePermissionProfile, deletePermissionProfile, detectCircularDeps } from './task-queue.mjs';
import { listProjects, getProject, createProject, updateProject, deleteProject } from './projects.mjs';
import { getRecentLogs } from './logger.mjs';
import { log } from './logger.mjs';
import { getLatestSummary } from './summary.mjs';
import { scanActiveSessions } from './session-tracker.mjs';
import { getDashboardHtml } from './dashboard.mjs';

let _daemon = null; // set by index.mjs

export function setDaemon(daemon) {
  _daemon = daemon;
}

// ─── Server-Sent Events ───

const sseClients = new Set();

export function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try { client.write(msg); } catch { sseClients.delete(client); }
  }
}

function handleSSE(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  res.write('event: connected\ndata: {}\n\n');
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function extractParam(url, prefix) {
  const path = url.split('?')[0];
  const after = path.slice(prefix.length);
  return after.startsWith('/') ? after.slice(1) : after;
}

export function startServer() {
  const config = loadConfig();
  const { port, host } = config.server;

  const server = createServer(async (req, res) => {
    const url = req.url;
    const method = req.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    try {
      // Dashboard HTML
      if (url === '/' && method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(getDashboardHtml());
        return;
      }

      // ─── SSE endpoint ───
      if (url === '/api/events' && method === 'GET') {
        return handleSSE(req, res);
      }

      // ─── Tasks ───
      if (url === '/api/tasks' && method === 'GET') {
        return json(res, loadTasks());
      }
      if (url === '/api/tasks' && method === 'POST') {
        const body = await parseBody(req);
        const task = createTask(body);
        broadcast('tasks', loadTasks());
        return json(res, task, 201);
      }
      if (url === '/api/tasks/reorder' && method === 'PUT') {
        const body = await parseBody(req);
        const tasks = reorderTasks(body.orderedIds);
        broadcast('tasks', tasks);
        return json(res, tasks);
      }
      if (url.startsWith('/api/tasks/') && method === 'PUT') {
        const id = extractParam(url, '/api/tasks/');
        const body = await parseBody(req);
        // Validate circular dependencies
        if (body.dependencies?.length) {
          const allTasks = loadTasks();
          if (detectCircularDeps(id, body.dependencies, allTasks)) {
            return json(res, { error: 'Circular dependency detected' }, 400);
          }
        }
        const task = updateTask(id, body);
        if (task) broadcast('tasks', loadTasks());
        return task ? json(res, task) : json(res, { error: 'Not found' }, 404);
      }
      if (url.match(/^\/api\/tasks\/[^/]+\/requeue$/) && method === 'POST') {
        const id = url.split('/')[3];
        const task = loadTasks().find(t => t.id === id);
        if (!task) return json(res, { error: 'Not found' }, 404);
        const updated = updateTask(id, { status: 'pending', started: null, completed: null, error: null, stats: null, sessionId: null });
        broadcast('tasks', loadTasks());
        return json(res, updated);
      }
      if (url.match(/^\/api\/tasks\/[^/]+\/duplicate$/) && method === 'POST') {
        const id = url.split('/')[3];
        const source = loadTasks().find(t => t.id === id);
        if (!source) return json(res, { error: 'Not found' }, 404);
        const dup = createTask({ title: source.title + ' (copy)', prompt: source.prompt, dir: source.dir, project: source.project, permissionProfile: source.permissionProfile, subagentLevel: source.subagentLevel, dependencies: source.dependencies });
        broadcast('tasks', loadTasks());
        return json(res, dup, 201);
      }
      if (url.startsWith('/api/tasks/') && method === 'DELETE') {
        const id = extractParam(url, '/api/tasks/');
        const ok = deleteTask(id);
        if (ok) broadcast('tasks', loadTasks());
        return ok ? json(res, { ok: true }) : json(res, { error: 'Not found' }, 404);
      }

      // ─── Permissions ───
      if (url === '/api/permissions' && method === 'GET') {
        return json(res, loadPermissions());
      }
      if (url === '/api/permissions' && method === 'POST') {
        const body = await parseBody(req);
        const profile = createPermissionProfile(body.key, body.profile);
        broadcast('permissions', loadPermissions());
        return json(res, profile, 201);
      }
      if (url.startsWith('/api/permissions/') && method === 'PUT') {
        const key = extractParam(url, '/api/permissions/');
        const body = await parseBody(req);
        const profile = updatePermissionProfile(key, body);
        if (profile) broadcast('permissions', loadPermissions());
        return profile ? json(res, profile) : json(res, { error: 'Not found' }, 404);
      }
      if (url.startsWith('/api/permissions/') && method === 'DELETE') {
        const key = extractParam(url, '/api/permissions/');
        const ok = deletePermissionProfile(key);
        if (ok) broadcast('permissions', loadPermissions());
        return ok ? json(res, { ok: true }) : json(res, { error: 'Not found' }, 404);
      }

      // ─── Projects ───
      if (url === '/api/projects' && method === 'GET') {
        return json(res, listProjects());
      }
      if (url === '/api/projects' && method === 'POST') {
        const body = await parseBody(req);
        const project = createProject(body);
        broadcast('projects', listProjects());
        return json(res, project, 201);
      }
      if (url.startsWith('/api/projects/') && method === 'GET') {
        const id = extractParam(url, '/api/projects/');
        const project = getProject(id);
        return project ? json(res, project) : json(res, { error: 'Not found' }, 404);
      }
      if (url.startsWith('/api/projects/') && method === 'PUT') {
        const id = extractParam(url, '/api/projects/');
        const body = await parseBody(req);
        const project = updateProject(id, body);
        if (project) broadcast('projects', listProjects());
        return project ? json(res, project) : json(res, { error: 'Not found' }, 404);
      }
      if (url.startsWith('/api/projects/') && method === 'DELETE') {
        const id = extractParam(url, '/api/projects/');
        const ok = deleteProject(id);
        if (ok) broadcast('projects', listProjects());
        return ok ? json(res, { ok: true }) : json(res, { error: 'Not found' }, 404);
      }

      // ─── Task Progress ───
      if (url === '/api/tasks/current/progress' && method === 'GET') {
        const progress = _daemon?.getProgress() || null;
        return json(res, progress || { running: false });
      }

      // ─── Status ───
      if (url === '/api/status' && method === 'GET') {
        return json(res, _daemon?.getStatus() || { mode: 'WORK', running: false });
      }

      // ─── Schedule ───
      if (url === '/api/schedule' && method === 'POST') {
        const body = await parseBody(req);
        if (_daemon) _daemon.setSchedule(body);
        saveConfig({ schedule: body });
        broadcast('status', _daemon?.getStatus() || { mode: 'WORK', running: false });
        return json(res, { ok: true });
      }

      // ─── Daemon control ───
      if (url === '/api/daemon/start' && method === 'POST') {
        if (_daemon) _daemon.start();
        broadcast('status', _daemon?.getStatus() || { mode: 'WORK', running: true });
        return json(res, { ok: true });
      }
      if (url === '/api/daemon/stop' && method === 'POST') {
        if (_daemon) _daemon.stop();
        broadcast('status', _daemon?.getStatus() || { mode: 'WORK', running: false });
        return json(res, { ok: true });
      }

      // ─── Sessions (active Claude Code instances) ───
      if (url === '/api/sessions' && method === 'GET') {
        return json(res, scanActiveSessions());
      }

      // ─── Usage ───
      if (url === '/api/usage' && method === 'GET') {
        return json(res, _daemon?.getUsageData() || {});
      }

      // ─── Auth: extract cookies from browser login ───
      if (url === '/api/auth/callback' && method === 'POST') {
        const body = await parseBody(req);
        if (body.sessionKey && body.orgId) {
          saveConfig({ claudeApi: { sessionKey: body.sessionKey, orgId: body.orgId } });
          log('info', 'Session cookie saved via browser login');
          return json(res, { ok: true });
        }
        return json(res, { error: 'Missing sessionKey or orgId' }, 400);
      }

      // ─── Config (session key, org ID) ───
      if (url === '/api/config' && method === 'GET') {
        const config = loadConfig();
        return json(res, {
          claudeApi: {
            orgId: config.claudeApi.orgId,
            sessionKeySet: !!config.claudeApi.sessionKey,
          },
          schedule: config.schedule,
          creditCheck: { utilizationThreshold: config.creditCheck.utilizationThreshold },
        });
      }
      if (url === '/api/config' && method === 'POST') {
        const body = await parseBody(req);
        saveConfig(body);
        return json(res, { ok: true });
      }

      // ─── Log ───
      if (url.startsWith('/api/log') && method === 'GET') {
        const params = new URL(url, 'http://localhost').searchParams;
        const lines = parseInt(params.get('lines')) || 50;
        return json(res, getRecentLogs(lines));
      }

      // ─── Summary ───
      if (url === '/api/summary' && method === 'GET') {
        const summary = getLatestSummary();
        return json(res, { content: summary });
      }

      // 404
      json(res, { error: 'Not found' }, 404);

    } catch (err) {
      log('error', `Server error: ${err.message}`);
      json(res, { error: err.message }, 500);
    }
  });

  server.listen(port, host, () => {
    log('info', `Dashboard running at http://${host}:${port}`);
  });

  return server;
}
