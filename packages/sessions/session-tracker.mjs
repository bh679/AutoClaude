import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';

const CLAUDE_DIR = join(homedir(), '.claude');
const DESKTOP_SESSIONS_DIR = join(homedir(), 'Library', 'Application Support', 'Claude', 'claude-code-sessions');

export function encodeProjectPath(dirPath) {
  return dirPath.replace(/\//g, '-');
}

export function getSessionMessages(sessionId, projectDir) {
  const encodedPath = encodeProjectPath(projectDir);
  const sessionFile = join(CLAUDE_DIR, 'projects', encodedPath, `${sessionId}.jsonl`);

  if (!existsSync(sessionFile)) return [];

  const content = readFileSync(sessionFile, 'utf8');
  return content.split('\n')
    .filter(Boolean)
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
}

export function getSessionSummary(sessionId, projectDir) {
  const messages = getSessionMessages(sessionId, projectDir);

  const toolUses = {};
  const subagentCalls = [];
  const models = new Set();
  let lastText = '';

  for (const msg of messages) {
    if (msg.type === 'assistant') {
      if (msg.model) models.add(msg.model);
      const content = msg.message?.content || [];
      for (const block of content) {
        if (block.type === 'tool_use') {
          const name = block.name || 'unknown';
          toolUses[name] = (toolUses[name] || 0) + 1;
          if (name === 'Task') {
            subagentCalls.push({
              description: block.input?.description || '',
              subagentType: block.input?.subagent_type || block.input?.subagentType || 'unknown',
              model: block.input?.model || 'inherited',
            });
          }
        }
        if (block.type === 'text') {
          lastText = block.text;
        }
      }
    }
  }

  const totalToolUses = Object.values(toolUses).reduce((a, b) => a + b, 0);

  return {
    sessionId,
    projectDir,
    messageCount: messages.length,
    toolUses,
    totalToolUses,
    subagentCalls,
    subagentCount: subagentCalls.length,
    models: [...models],
    claudeDirectWork: totalToolUses - subagentCalls.length,
    subagentRatio: totalToolUses > 0 ? subagentCalls.length / totalToolUses : 0,
    lastResponse: lastText.slice(0, 500),
    startTime: messages[0]?.timestamp,
    endTime: messages[messages.length - 1]?.timestamp,
  };
}

// ─── Active Sessions Scanner ───

export function scanActiveSessions() {
  const sessions = [];

  // 1. Read desktop app session metadata
  const desktopSessions = readDesktopSessions();

  // 2. Get running claude processes to detect truly active ones
  const runningSessionIds = getRunningSessionIds();

  // 3. Merge desktop metadata with running status
  for (const ds of desktopSessions) {
    const isRunning = runningSessionIds.has(ds.cliSessionId);
    sessions.push({
      id: ds.sessionId,
      cliSessionId: ds.cliSessionId,
      title: ds.title || 'Untitled',
      project: extractProjectName(ds.cwd),
      cwd: ds.cwd,
      model: ds.model,
      permissionMode: ds.permissionMode,
      isArchived: ds.isArchived,
      isRunning,
      createdAt: ds.createdAt ? new Date(ds.createdAt).toISOString() : null,
      lastActivityAt: ds.lastActivityAt ? new Date(ds.lastActivityAt).toISOString() : null,
      todos: [],
    });
  }

  // 4. Sort: running first, then by lastActivityAt descending
  sessions.sort((a, b) => {
    if (a.isRunning !== b.isRunning) return a.isRunning ? -1 : 1;
    const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
    const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
    return bTime - aTime;
  });

  return sessions;
}

function readDesktopSessions() {
  if (!existsSync(DESKTOP_SESSIONS_DIR)) return [];

  const sessions = [];
  try {
    // Traverse accountUuid/orgUuid directories
    for (const accountDir of readdirSync(DESKTOP_SESSIONS_DIR)) {
      const accountPath = join(DESKTOP_SESSIONS_DIR, accountDir);
      if (!statSync(accountPath).isDirectory()) continue;

      for (const orgDir of readdirSync(accountPath)) {
        const orgPath = join(accountPath, orgDir);
        if (!statSync(orgPath).isDirectory()) continue;

        for (const file of readdirSync(orgPath)) {
          if (!file.endsWith('.json')) continue;
          try {
            const content = readFileSync(join(orgPath, file), 'utf8');
            const data = JSON.parse(content);
            sessions.push(data);
          } catch { /* skip corrupt files */ }
        }
      }
    }
  } catch { /* directory traversal failed */ }

  return sessions;
}

function getRunningSessionIds() {
  const running = new Set();
  try {
    const output = execSync('ps aux', { encoding: 'utf8', timeout: 5000 });
    // Look for claude processes with --resume or --session-id flags
    for (const line of output.split('\n')) {
      if (!line.includes('claude')) continue;
      // Match --resume UUID or --session-id UUID
      const resumeMatch = line.match(/--resume\s+([a-f0-9-]{36})/);
      if (resumeMatch) running.add(resumeMatch[1]);
      const sessionMatch = line.match(/--session-id\s+([a-f0-9-]{36})/);
      if (sessionMatch) running.add(sessionMatch[1]);
    }
  } catch { /* ps failed */ }
  return running;
}

function extractProjectName(cwd) {
  if (!cwd) return 'Unknown';
  const parts = cwd.split('/');
  return parts[parts.length - 1] || parts[parts.length - 2] || cwd;
}

export function getSessionTodos(sessionId) {
  const todosDir = join(CLAUDE_DIR, 'todos');
  if (!existsSync(todosDir)) return [];

  const files = readdirSync(todosDir).filter(f => f.startsWith(sessionId));
  const allTodos = [];
  for (const file of files) {
    try {
      const content = readFileSync(join(todosDir, file), 'utf8');
      allTodos.push(...JSON.parse(content));
    } catch { /* skip */ }
  }
  return allTodos;
}
