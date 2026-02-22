import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CLAUDE_DIR = join(homedir(), '.claude');

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
