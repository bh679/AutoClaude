import { createServer } from 'node:http';
import { loadConfig, saveConfig } from './config.mjs';
import { loadTasks, createTask, updateTask, deleteTask, reorderTasks, loadPermissions, createPermissionProfile, updatePermissionProfile, deletePermissionProfile } from './task-queue.mjs';
import { listProjects, getProject, createProject, updateProject, deleteProject } from './projects.mjs';
import { getRecentLogs } from './logger.mjs';
import { log } from './logger.mjs';
import { getLatestSummary } from './summary.mjs';
import { scanActiveSessions, autoRegisterSessions } from './session-tracker.mjs';
import { getInstancesWithSessions, renameInstance } from './instances.mjs';
import { getDashboardHtml } from './dashboard.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
      // Task progress push (must be before generic /api/tasks/:id PUT)
      if (url.match(/^\/api\/tasks\/[^/]+\/progress$/) && method === 'POST') {
        const pathParts = url.split('/');
        const id = pathParts[3];
        const body = await parseBody(req);
        const task = loadTasks().find(t => t.id === id);
        if (!task) return json(res, { error: 'Not found' }, 404);
        const update = {
          timestamp: new Date().toISOString(),
          status: body.status || 'update',
          message: body.message || '',
        };
        const progressUpdates = task.progressUpdates || [];
        progressUpdates.push(update);
        updateTask(id, { progressUpdates });
        return json(res, { ok: true, update });
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

      // ─── Projects ───
      if (url === '/api/projects' && method === 'GET') {
        return json(res, listProjects());
      }
      if (url === '/api/projects' && method === 'POST') {
        const body = await parseBody(req);
        const project = createProject(body);
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
        return project ? json(res, project) : json(res, { error: 'Not found' }, 404);
      }
      if (url.startsWith('/api/projects/') && method === 'DELETE') {
        const id = extractParam(url, '/api/projects/');
        return deleteProject(id) ? json(res, { ok: true }) : json(res, { error: 'Not found' }, 404);
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

      // ─── Instances (sessions grouped by machine) ───
      if (url === '/api/instances' && method === 'GET') {
        const sessions = scanActiveSessions();
        const tasks = loadTasks();
        autoRegisterSessions(sessions);
        const instances = getInstancesWithSessions(sessions, loadTasks());
        return json(res, instances);
      }
      if (url.startsWith('/api/instances/') && method === 'PUT') {
        const key = decodeURIComponent(extractParam(url, '/api/instances/'));
        const body = await parseBody(req);
        const result = renameInstance(key, body.customName);
        return json(res, result);
      }

      // ─── Session Registration (from CLAUDE.md push) ───
      if (url === '/api/sessions/register' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.cliSessionId) return json(res, { error: 'cliSessionId required' }, 400);
        const tasks = loadTasks();
        let task = tasks.find(t => t.cliSessionId === body.cliSessionId);
        if (!task) {
          task = createTask({
            title: body.title || 'Registered Session',
            prompt: body.prompt || 'Session registered via API. CWD: ' + (body.cwd || 'unknown'),
            dir: body.cwd || process.cwd(),
            source: 'auto-registered',
            cliSessionId: body.cliSessionId,
          });
        }
        return json(res, task);
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

  // Generate shared CLAUDE.md for integration
  try {
    const claudeMdPath = join(config.paths.dataDir, 'CLAUDE.md');
    const claudeMdContent = `# AutoClaude Integration

## Auto-Registration
At the start of every session, register with AutoClaude to track your work:

\`\`\`bash
# Discover your session ID (most recent JSONL file)
SESSION_ID=$(stat -f "%B %N" ~/.claude/projects/*/*.jsonl 2>/dev/null | sort -n | tail -1 | awk '{print $2}' | xargs -I{} basename {} .jsonl)

# Register with AutoClaude dashboard
curl -s -X POST http://${host}:${port}/api/sessions/register \\
  -H "Content-Type: application/json" \\
  -d "{\\"cliSessionId\\":\\"$SESSION_ID\\",\\"title\\":\\"$(basename $(pwd))\\",\\"cwd\\":\\"$(pwd)\\"}"
\`\`\`

## Progress Updates
Push progress updates during your session:

\`\`\`bash
curl -s -X POST http://${host}:${port}/api/tasks/TASK_ID/progress \\
  -H "Content-Type: application/json" \\
  -d '{"status":"in-progress","message":"Description of current work"}'
\`\`\`

## Status Codes
- \`planning\` - Exploring codebase, designing solution
- \`in-progress\` - Actively implementing
- \`testing\` - Running tests
- \`blocked\` - Waiting for input or dependency
- \`completed\` - Task finished
`;
    writeFileSync(claudeMdPath, claudeMdContent);
    log('info', 'Generated shared CLAUDE.md at ' + claudeMdPath);
  } catch (err) {
    log('warn', 'Failed to generate shared CLAUDE.md: ' + err.message);
  }

  return server;
}
