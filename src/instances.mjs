import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { hostname } from 'node:os';
import { loadConfig } from './config.mjs';

// ─── Instance Persistence ───

export function loadInstances() {
  const config = loadConfig();
  if (!existsSync(config.paths.instancesFile)) return {};
  try {
    return JSON.parse(readFileSync(config.paths.instancesFile, 'utf8'));
  } catch {
    return {};
  }
}

export function saveInstances(data) {
  const config = loadConfig();
  writeFileSync(config.paths.instancesFile, JSON.stringify(data, null, 2));
}

export function getInstanceDisplayName(key, sshConfig) {
  if (key === 'local') {
    return 'Claude Code Desktop, ' + hostname();
  }
  if (sshConfig) {
    const name = sshConfig.name || sshConfig.sshHost || 'Remote';
    return 'Claude Code Desktop, ' + name;
  }
  return 'Claude Code, Unknown';
}

export function renameInstance(key, customName) {
  const data = loadInstances();
  if (!data[key]) data[key] = {};
  data[key].customName = customName || null;
  saveInstances(data);
  return data[key];
}

// ─── Group Sessions into Instances ───

export function getInstancesWithSessions(sessions, tasks) {
  const persisted = loadInstances();
  const grouped = {};

  for (const session of sessions) {
    const key = session.instanceKey;
    if (!grouped[key]) {
      const saved = persisted[key] || {};
      grouped[key] = {
        key,
        displayName: getInstanceDisplayName(key, session.sshConfig),
        customName: saved.customName || null,
        isLocal: key === 'local',
        sshConfig: session.sshConfig || null,
        sessions: [],
        sessionCount: 0,
        runningCount: 0,
      };
    }

    // Link task to session
    const linkedTask = tasks.find(t =>
      t.cliSessionId === session.cliSessionId ||
      t.sessionId === session.cliSessionId
    );
    session.linkedTaskId = linkedTask ? linkedTask.id : null;

    grouped[key].sessions.push(session);
    grouped[key].sessionCount++;
    if (session.isRunning) grouped[key].runningCount++;
  }

  // Sort: local first, then by runningCount desc, then by sessionCount desc
  return Object.values(grouped).sort((a, b) => {
    if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
    if (a.runningCount !== b.runningCount) return b.runningCount - a.runningCount;
    return b.sessionCount - a.sessionCount;
  });
}
