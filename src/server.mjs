import { createServer } from 'node:http';
import { loadConfig, saveConfig } from './config.mjs';
import { loadTasks, createTask, updateTask, deleteTask, reorderTasks, loadPermissions, createPermissionProfile, updatePermissionProfile, deletePermissionProfile } from './task-queue.mjs';
import { getRecentLogs } from './logger.mjs';
import { log } from './logger.mjs';
import { getLatestSummary } from './summary.mjs';
import { scanActiveSessions } from './session-tracker.mjs';
import { getDashboardHtml } from './dashboard.mjs';

let _daemon = null; // set by index.mjs

export function setDaemon(daemon) {
  _daemon = daemon;
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

      // ─── Tasks ───
      if (url === '/api/tasks' && method === 'GET') {
        return json(res, loadTasks());
      }
      if (url === '/api/tasks' && method === 'POST') {
        const body = await parseBody(req);
        const task = createTask(body);
        return json(res, task, 201);
      }
      if (url === '/api/tasks/reorder' && method === 'PUT') {
        const body = await parseBody(req);
        const tasks = reorderTasks(body.orderedIds);
        return json(res, tasks);
      }
      if (url.startsWith('/api/tasks/') && method === 'PUT') {
        const id = extractParam(url, '/api/tasks/');
        const body = await parseBody(req);
        const task = updateTask(id, body);
        return task ? json(res, task) : json(res, { error: 'Not found' }, 404);
      }
      if (url.startsWith('/api/tasks/') && method === 'DELETE') {
        const id = extractParam(url, '/api/tasks/');
        return deleteTask(id) ? json(res, { ok: true }) : json(res, { error: 'Not found' }, 404);
      }

      // ─── Permissions ───
      if (url === '/api/permissions' && method === 'GET') {
        return json(res, loadPermissions());
      }
      if (url === '/api/permissions' && method === 'POST') {
        const body = await parseBody(req);
        const profile = createPermissionProfile(body.key, body.profile);
        return json(res, profile, 201);
      }
      if (url.startsWith('/api/permissions/') && method === 'PUT') {
        const key = extractParam(url, '/api/permissions/');
        const body = await parseBody(req);
        const profile = updatePermissionProfile(key, body);
        return profile ? json(res, profile) : json(res, { error: 'Not found' }, 404);
      }
      if (url.startsWith('/api/permissions/') && method === 'DELETE') {
        const key = extractParam(url, '/api/permissions/');
        return deletePermissionProfile(key) ? json(res, { ok: true }) : json(res, { error: 'Not found' }, 404);
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
        return json(res, { ok: true });
      }

      // ─── Daemon control ───
      if (url === '/api/daemon/start' && method === 'POST') {
        if (_daemon) _daemon.start();
        return json(res, { ok: true });
      }
      if (url === '/api/daemon/stop' && method === 'POST') {
        if (_daemon) _daemon.stop();
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
