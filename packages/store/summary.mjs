import { writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '@autoclaude/core';
import { loadTasks } from './task-queue.mjs';
import { getSessionSummary, getSessionTodos } from '@autoclaude/sessions';

export function generateSummary(sessionStartTime) {
  const config = loadConfig();
  const tasks = loadTasks();

  const tonight = tasks.filter(t =>
    t.started && new Date(t.started) >= sessionStartTime &&
    (t.status === 'completed' || t.status === 'failed')
  );

  const completed = tonight.filter(t => t.status === 'completed');
  const failed = tonight.filter(t => t.status === 'failed');
  const pending = tasks.filter(t => t.status === 'pending');

  let md = `# AutoClaude Overnight Summary\n\n`;
  md += `**Date:** ${new Date().toLocaleDateString()}\n`;
  md += `**Session start:** ${sessionStartTime.toISOString()}\n`;
  md += `**Summary generated:** ${new Date().toISOString()}\n\n`;
  md += `## Results: ${completed.length} completed, ${failed.length} failed, ${pending.length} still pending\n\n`;

  for (const task of tonight) {
    const icon = task.status === 'completed' ? 'DONE' : 'FAIL';
    md += `### [${icon}] ${task.title}\n`;
    md += `- **Directory:** ${task.dir}\n`;
    md += `- **Duration:** ${formatDuration(task.started, task.completed)}\n`;
    md += `- **Session:** \`${task.sessionId}\`\n`;
    md += `- **Permission Profile:** ${task.permissionProfile}\n`;
    md += `- **Sub-agent Level:** ${Math.round((task.subagentLevel || 0) * 100)}%\n`;

    if (task.stats) {
      md += `\n**Work Distribution:**\n`;
      md += `- Claude direct tool uses: ${task.stats.claudeDirectWork}\n`;
      md += `- Sub-agent calls: ${task.stats.subagentCount}\n`;
      md += `- Sub-agent ratio: ${Math.round(task.stats.subagentRatio * 100)}%\n`;
      md += `- Models used: ${task.stats.models?.join(', ') || 'unknown'}\n`;

      if (task.stats.subagentCalls?.length) {
        md += `\n**Sub-agents spawned:**\n`;
        for (const sa of task.stats.subagentCalls) {
          md += `  - [${sa.subagentType}] ${sa.description} (model: ${sa.model})\n`;
        }
      }

      if (task.stats.toolUses) {
        md += `\n**Tool usage breakdown:**\n`;
        for (const [tool, count] of Object.entries(task.stats.toolUses).sort((a, b) => b[1] - a[1])) {
          md += `  - ${tool}: ${count}\n`;
        }
      }
    }

    if (task.sessionId) {
      const todos = getSessionTodos(task.sessionId);
      if (todos.length > 0) {
        md += `\n**Todo items:**\n`;
        for (const todo of todos) {
          const check = todo.status === 'completed' ? 'x' : ' ';
          md += `  - [${check}] ${todo.content}\n`;
        }
      }
    }

    if (task.error) {
      md += `\n**Error:** ${task.error}\n`;
    }
    md += '\n---\n\n';
  }

  const filename = `summary-${new Date().toISOString().slice(0, 10)}.md`;
  const summaryPath = join(config.paths.summaryDir, filename);
  writeFileSync(summaryPath, md);

  return { path: summaryPath, content: md };
}

function formatDuration(start, end) {
  if (!start || !end) return 'unknown';
  const ms = new Date(end) - new Date(start);
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function getLatestSummary() {
  const config = loadConfig();
  if (!existsSync(config.paths.summaryDir)) return null;
  const files = readdirSync(config.paths.summaryDir).sort().reverse();
  if (files.length === 0) return null;
  return readFileSync(join(config.paths.summaryDir, files[0]), 'utf8');
}
