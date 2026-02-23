import { appendFileSync, readFileSync, existsSync } from 'node:fs';
import { loadConfig } from './config.mjs';

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const COLORS = { info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m', debug: '\x1b[90m' };

const _listeners = [];

export function log(level, message) {
  const config = loadConfig();
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase().padEnd(5)}] ${message}`;

  appendFileSync(config.paths.logFile, line + '\n');

  if (LEVELS[level] >= LEVELS.info) {
    const color = COLORS[level] || '';
    process.stderr.write(`${color}${line}\x1b[0m\n`);
  }

  // Notify listeners (for dashboard live log)
  for (const fn of _listeners) {
    try { fn({ timestamp, level, message }); } catch { /* ignore */ }
  }
}

export function onLog(fn) {
  _listeners.push(fn);
  return () => {
    const idx = _listeners.indexOf(fn);
    if (idx >= 0) _listeners.splice(idx, 1);
  };
}

export function getRecentLogs(lines = 50) {
  const config = loadConfig();
  if (!existsSync(config.paths.logFile)) return [];
  const content = readFileSync(config.paths.logFile, 'utf8');
  const allLines = content.split('\n').filter(Boolean);
  return allLines.slice(-lines);
}
