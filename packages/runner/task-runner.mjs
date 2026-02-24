import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { loadConfig, log, notify } from '@autoclaude/core';
import { updateTask, getPermissionProfile } from '@autoclaude/store';

const SUBAGENT_PROMPTS = {
  0: 'Do all work yourself. Do not use the Task tool to spawn sub-agents.',
  0.25: 'Only use sub-agents for simple file searches and exploration.',
  0.5: 'Use sub-agents for research, exploration, and independent subtasks.',
  0.75: 'Maximize use of sub-agents. Delegate implementation, testing, and research to parallel agents wherever possible.',
  1: 'Offload as much work as reasonably possible to sub-agents. Use them for all exploration, implementation, testing, and validation. Only coordinate and review their output yourself.',
};

function getSubagentPrompt(level) {
  // Find closest defined level
  const levels = Object.keys(SUBAGENT_PROMPTS).map(Number).sort((a, b) => a - b);
  let closest = levels[0];
  for (const l of levels) {
    if (Math.abs(l - level) < Math.abs(closest - level)) closest = l;
  }
  return SUBAGENT_PROMPTS[closest];
}

export class TaskRunner {
  constructor() {
    this.currentProcess = null;
    this.currentTask = null;
    this.isRunning = false;
    this._streamData = [];
  }

  async runTask(task) {
    const config = loadConfig();
    const sessionId = randomUUID();

    this.currentTask = { ...task, sessionId };
    this.isRunning = true;
    this._streamData = [];

    log('info', `Starting task: "${task.title}" in ${task.dir}`);
    log('info', `Session ID: ${sessionId}`);
    notify(`Starting task: ${task.title}`);

    updateTask(task.id, {
      status: 'running',
      started: new Date().toISOString(),
      sessionId,
    });

    const env = { ...process.env };
    delete env.CLAUDECODE;

    const args = ['-p', task.prompt, '--session-id', sessionId, '--output-format', 'stream-json'];

    // Apply permission profile
    const profile = getPermissionProfile(task.permissionProfile);
    if (profile) {
      if (profile.dangerouslySkipPermissions) {
        args.push('--dangerously-skip-permissions');
      } else if (profile.permissionMode) {
        args.push('--permission-mode', profile.permissionMode);
      }
      if (profile.allowedTools?.length) {
        args.push('--allowedTools', profile.allowedTools.join(' '));
      }
      if (profile.disallowedTools?.length) {
        args.push('--disallowedTools', profile.disallowedTools.join(' '));
      }
    } else {
      args.push('--dangerously-skip-permissions');
    }

    // Apply budget cap
    if (config.claude.maxBudgetPerTaskUsd) {
      args.push('--max-budget-usd', String(config.claude.maxBudgetPerTaskUsd));
    }

    // Apply sub-agent level instruction
    const subagentPrompt = getSubagentPrompt(task.subagentLevel ?? 0.5);
    args.push('--append-system-prompt', subagentPrompt);

    const startTime = Date.now();

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let lastActivity = Date.now();

      this.currentProcess = spawn(config.claude.binary, args, {
        env,
        cwd: task.dir,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.currentProcess.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        stdout += text;
        lastActivity = Date.now();

        // Parse stream-json lines for progress tracking
        for (const line of text.split('\n').filter(Boolean)) {
          try {
            const msg = JSON.parse(line);
            this._streamData.push(msg);
            if (msg.type === 'assistant' && msg.subtype === 'tool_use') {
              log('debug', `  Tool: ${msg.tool_name}`);
            }
          } catch { /* not all lines are valid JSON */ }
        }
      });

      this.currentProcess.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
        lastActivity = Date.now();
      });

      // Watchdog: kill if no output for taskTimeoutMs
      const watchdog = setInterval(() => {
        if (Date.now() - lastActivity > config.claude.taskTimeoutMs) {
          log('warn', `Task "${task.title}" timed out after ${config.claude.taskTimeoutMs}ms inactivity`);
          this.currentProcess.kill('SIGTERM');
          clearInterval(watchdog);
        }
      }, 60000);

      this.currentProcess.on('close', (code) => {
        clearInterval(watchdog);
        this.isRunning = false;
        this.currentProcess = null;

        const duration = Date.now() - startTime;
        const stats = this._extractStats();

        if (code === 0) {
          log('info', `Task "${task.title}" completed in ${Math.round(duration / 1000)}s`);
          notify(`Task completed: ${task.title}`);
          updateTask(task.id, {
            status: 'completed',
            completed: new Date().toISOString(),
            stats,
          });
        } else {
          // Check if it's a credit issue (should retry)
          const combined = (stderr + stdout).toLowerCase();
          const isCreditIssue = /rate.?limit|credit|billing|quota|429/.test(combined);

          log('error', `Task "${task.title}" failed (exit ${code})${isCreditIssue ? ' - credit issue, will retry' : ''}`);
          notify(`Task failed: ${task.title}`);
          updateTask(task.id, {
            status: isCreditIssue ? 'pending' : 'failed',
            completed: isCreditIssue ? null : new Date().toISOString(),
            error: stderr.slice(-300),
            stats,
          });
        }

        resolve({ exitCode: code, sessionId, duration, stats });
      });

      this.currentProcess.on('error', (err) => {
        clearInterval(watchdog);
        this.isRunning = false;
        this.currentProcess = null;
        log('error', `Failed to spawn Claude for "${task.title}": ${err.message}`);
        updateTask(task.id, { status: 'failed', error: err.message });
        resolve({ exitCode: -1, sessionId, duration: 0, stats: null });
      });
    });
  }

  _extractStats() {
    const toolUses = {};
    const subagentCalls = [];
    const models = new Set();

    for (const msg of this._streamData) {
      // Track model usage
      if (msg.model) models.add(msg.model);

      // Track tool usage
      if (msg.type === 'assistant') {
        const content = msg.message?.content || [];
        for (const block of content) {
          if (block.type === 'tool_use') {
            const name = block.name || 'unknown';
            toolUses[name] = (toolUses[name] || 0) + 1;

            // Track sub-agent calls specifically
            if (name === 'Task') {
              const input = block.input || {};
              subagentCalls.push({
                description: input.description || '',
                subagentType: input.subagent_type || input.subagentType || 'unknown',
                model: input.model || 'inherited',
              });
            }
          }
        }
      }
    }

    const totalToolUses = Object.values(toolUses).reduce((a, b) => a + b, 0);
    const subagentCount = subagentCalls.length;

    return {
      toolUses,
      totalToolUses,
      subagentCalls,
      subagentCount,
      models: [...models],
      claudeDirectWork: totalToolUses - subagentCount,
      subagentRatio: totalToolUses > 0 ? subagentCount / totalToolUses : 0,
    };
  }

  kill() {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      setTimeout(() => {
        if (this.currentProcess) this.currentProcess.kill('SIGKILL');
      }, 5000);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      currentTask: this.currentTask?.title || null,
      currentSessionId: this.currentTask?.sessionId || null,
      currentDir: this.currentTask?.dir || null,
    };
  }
}
