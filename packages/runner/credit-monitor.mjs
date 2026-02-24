import { spawn } from 'node:child_process';
import { request } from 'node:https';
import { loadConfig, log } from '@autoclaude/core';

export const CreditStatus = {
  AVAILABLE: 'AVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  NO_CREDITS: 'NO_CREDITS',
  API_OVERLOADED: 'API_OVERLOADED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

// Primary: scrape claude.ai usage API
export async function fetchUsageFromApi() {
  const config = loadConfig();
  const { orgId, sessionKey, baseUrl } = config.claudeApi;

  if (!orgId || !sessionKey) {
    return null; // not configured, use fallback
  }

  const endpoints = {
    usage: `/api/organizations/${orgId}/usage`,
    overage: `/api/organizations/${orgId}/overage_spend_limit`,
    credits: `/api/organizations/${orgId}/prepaid/credits`,
  };

  const results = {};
  for (const [key, path] of Object.entries(endpoints)) {
    try {
      results[key] = await httpGet(baseUrl + path, sessionKey);
    } catch (err) {
      log('warn', `Failed to fetch ${key}: ${err.message}`);
      results[key] = null;
    }
  }

  return results;
}

function httpGet(url, sessionKey) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'Cookie': `sessionKey=${sessionKey}`,
        'Accept': 'application/json',
        'User-Agent': 'AutoClaude/1.0',
      },
      timeout: 15000,
    };

    const req = request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Invalid JSON from ${parsedUrl.pathname}`));
          }
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          reject(new Error(`Auth failed (${res.statusCode}) - sessionKey may have expired`));
        } else {
          reject(new Error(`HTTP ${res.statusCode} from ${parsedUrl.pathname}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.end();
  });
}

// Classify credit status from API usage data
export function classifyUsage(usageData) {
  const config = loadConfig();
  const threshold = config.creditCheck.utilizationThreshold;

  if (!usageData?.usage?.five_hour) {
    return { status: CreditStatus.UNKNOWN_ERROR, detail: 'No usage data' };
  }

  const fiveHr = usageData.usage.five_hour;
  const sevenDay = usageData.usage.seven_day;

  if (fiveHr.utilization >= 100) {
    return {
      status: CreditStatus.NO_CREDITS,
      detail: `5hr window: ${fiveHr.utilization}% used, resets at ${fiveHr.resets_at}`,
      resetsAt: fiveHr.resets_at,
    };
  }

  if (sevenDay && sevenDay.utilization >= 100) {
    return {
      status: CreditStatus.NO_CREDITS,
      detail: `Weekly limit: ${sevenDay.utilization}% used, resets at ${sevenDay.resets_at}`,
      resetsAt: sevenDay.resets_at,
    };
  }

  if (fiveHr.utilization >= threshold) {
    return {
      status: CreditStatus.RATE_LIMITED,
      detail: `5hr window: ${fiveHr.utilization}% (above ${threshold}% threshold)`,
      resetsAt: fiveHr.resets_at,
    };
  }

  return {
    status: CreditStatus.AVAILABLE,
    detail: `5hr: ${fiveHr.utilization}%, 7day: ${sevenDay?.utilization ?? '?'}%`,
    resetsAt: fiveHr.resets_at,
  };
}

// Combined check: try API first, fall back to CLI ping
export async function checkCredits() {
  // Try API first
  const apiData = await fetchUsageFromApi();
  if (apiData?.usage) {
    const result = classifyUsage(apiData);
    return { ...result, source: 'api', raw: apiData };
  }

  // Fallback: CLI ping
  log('info', 'API unavailable, falling back to CLI credit check');
  return checkCreditsViaCli();
}

// Fallback: spawn claude CLI to test credit availability
function checkCreditsViaCli() {
  const config = loadConfig();
  const { binary } = config.claude;
  const { pingPrompt, maxBudgetUsd, timeoutMs } = config.creditCheck;

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let resolved = false;

    const env = { ...process.env };
    delete env.CLAUDECODE;

    const proc = spawn(binary, [
      '-p', pingPrompt,
      '--max-budget-usd', String(maxBudgetUsd),
      '--output-format', 'text',
      '--no-session-persistence',
    ], {
      env,
      cwd: process.env.HOME,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        proc.kill('SIGTERM');
        resolve({ status: CreditStatus.TIMEOUT, detail: 'CLI ping timed out', source: 'cli' });
      }
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (resolved) return;
      resolved = true;

      if (code === 0 && stdout.trim().length > 0) {
        resolve({ status: CreditStatus.AVAILABLE, detail: 'CLI ping succeeded', source: 'cli' });
        return;
      }

      const combined = (stderr + stdout).toLowerCase();
      if (/rate.?limit|429|too many requests/.test(combined)) {
        resolve({ status: CreditStatus.RATE_LIMITED, detail: stderr.slice(0, 200), source: 'cli' });
      } else if (/credit|billing|payment|insufficient|quota/.test(combined)) {
        resolve({ status: CreditStatus.NO_CREDITS, detail: stderr.slice(0, 200), source: 'cli' });
      } else if (/overloaded|503|529|capacity/.test(combined)) {
        resolve({ status: CreditStatus.API_OVERLOADED, detail: stderr.slice(0, 200), source: 'cli' });
      } else if (/network|econnrefused|etimedout|enotfound/.test(combined)) {
        resolve({ status: CreditStatus.NETWORK_ERROR, detail: stderr.slice(0, 200), source: 'cli' });
      } else {
        resolve({ status: CreditStatus.UNKNOWN_ERROR, detail: stderr.slice(0, 200), source: 'cli' });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      if (!resolved) {
        resolved = true;
        resolve({ status: CreditStatus.NETWORK_ERROR, detail: err.message, source: 'cli' });
      }
    });
  });
}
