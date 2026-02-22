import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(homedir(), '.autoclaude');
const CONFIG_PATH = join(DATA_DIR, 'config.json');
const DEFAULTS_PATH = join(__dirname, '..', 'config', 'default.json');

let _config = null;

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export function loadConfig(forceReload = false) {
  if (_config && !forceReload) return _config;

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  const defaults = JSON.parse(readFileSync(DEFAULTS_PATH, 'utf8'));
  let userConfig = {};
  if (existsSync(CONFIG_PATH)) {
    try {
      userConfig = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    } catch { /* use defaults */ }
  }

  _config = deepMerge(defaults, userConfig);

  // Resolve paths
  _config.paths = {
    dataDir: DATA_DIR,
    taskFile: join(DATA_DIR, 'tasks.json'),
    permissionsFile: join(DATA_DIR, 'permissions.json'),
    stateFile: join(DATA_DIR, 'state.json'),
    logFile: join(DATA_DIR, 'autoclaude.log'),
    usageHistoryFile: join(DATA_DIR, 'usage-history.json'),
    projectsFile: join(DATA_DIR, 'projects.json'),
    summaryDir: join(DATA_DIR, 'summaries'),
  };

  // Ensure directories exist
  if (!existsSync(_config.paths.summaryDir)) {
    mkdirSync(_config.paths.summaryDir, { recursive: true });
  }

  return _config;
}

export function saveConfig(updates) {
  const config = loadConfig();
  let userConfig = {};
  if (existsSync(CONFIG_PATH)) {
    try {
      userConfig = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    } catch { /* start fresh */ }
  }
  const merged = deepMerge(userConfig, updates);
  writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2));
  _config = null; // force reload
  return loadConfig(true);
}

export function getConfig(key) {
  const config = loadConfig();
  return key ? key.split('.').reduce((o, k) => o?.[k], config) : config;
}
