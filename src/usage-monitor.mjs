import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { loadConfig } from './config.mjs';

export function loadUsageHistory() {
  const config = loadConfig();
  if (!existsSync(config.paths.usageHistoryFile)) return [];
  try {
    return JSON.parse(readFileSync(config.paths.usageHistoryFile, 'utf8'));
  } catch {
    return [];
  }
}

export function appendUsageEvent(event) {
  const history = loadUsageHistory();
  history.push({ ts: new Date().toISOString(), ...event });

  // Keep last 2000 entries to prevent unbounded growth
  const trimmed = history.slice(-2000);

  const config = loadConfig();
  writeFileSync(config.paths.usageHistoryFile, JSON.stringify(trimmed, null, 2));
}

export function recordPoll(usageData) {
  if (!usageData?.usage) return;

  const fiveHr = usageData.usage.five_hour;
  const sevenDay = usageData.usage.seven_day;
  const overage = usageData.overage;
  const credits = usageData.credits;

  appendUsageEvent({
    event: 'poll',
    fiveHr: fiveHr?.utilization ?? null,
    fiveHrResetAt: fiveHr?.resets_at ?? null,
    sevenDay: sevenDay?.utilization ?? null,
    sevenDayResetAt: sevenDay?.resets_at ?? null,
    sonnet: usageData.usage.seven_day_sonnet?.utilization ?? null,
    overageUsed: overage?.used_credits ?? null,
    overageLimit: overage?.monthly_credit_limit ?? null,
    prepaidBalance: credits?.amount ?? null,
    currency: credits?.currency ?? overage?.currency ?? null,
  });
}

export function recordTaskEvent(eventType, taskTitle) {
  appendUsageEvent({ event: eventType, task: taskTitle });
}

// Build data for dashboard SVG graph
export function getGraphData(hours = 12) {
  const history = loadUsageHistory();
  const cutoff = new Date(Date.now() - hours * 3600000).toISOString();

  const recent = history.filter(e => e.ts >= cutoff);

  const polls = recent.filter(e => e.event === 'poll').map(e => ({
    ts: e.ts,
    fiveHr: e.fiveHr,
    sevenDay: e.sevenDay,
  }));

  const taskEvents = recent.filter(e => e.event === 'task_start' || e.event === 'task_complete').map(e => ({
    ts: e.ts,
    event: e.event,
    task: e.task,
  }));

  return { polls, taskEvents };
}

// Get current usage summary for dashboard header
export function getCurrentUsageSummary(rawUsageData) {
  if (!rawUsageData?.usage) return null;

  const u = rawUsageData.usage;
  const result = {
    fiveHour: {
      utilization: u.five_hour?.utilization ?? 0,
      resetsAt: u.five_hour?.resets_at ?? null,
      resetsIn: u.five_hour?.resets_at ? formatTimeUntil(u.five_hour.resets_at) : null,
    },
    sevenDay: {
      utilization: u.seven_day?.utilization ?? 0,
      resetsAt: u.seven_day?.resets_at ?? null,
      resetsIn: u.seven_day?.resets_at ? formatTimeUntil(u.seven_day.resets_at) : null,
    },
    sonnet: {
      utilization: u.seven_day_sonnet?.utilization ?? 0,
      resetsAt: u.seven_day_sonnet?.resets_at ?? null,
    },
  };

  if (rawUsageData.overage) {
    result.extraUsage = {
      used: rawUsageData.overage.used_credits,
      limit: rawUsageData.overage.monthly_credit_limit,
      currency: rawUsageData.overage.currency,
      percentage: rawUsageData.overage.monthly_credit_limit > 0
        ? Math.round((rawUsageData.overage.used_credits / rawUsageData.overage.monthly_credit_limit) * 100)
        : 0,
    };
  }

  if (rawUsageData.credits) {
    result.prepaid = {
      amount: rawUsageData.credits.amount,
      currency: rawUsageData.credits.currency,
    };
  }

  return result;
}

function formatTimeUntil(isoDate) {
  const diff = new Date(isoDate) - Date.now();
  if (diff <= 0) return 'now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}
