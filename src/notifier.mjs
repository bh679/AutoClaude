import { execSync } from 'node:child_process';
import { loadConfig } from './config.mjs';

export function notify(message, title = 'AutoClaude') {
  const config = loadConfig();
  if (!config.notifications.enabled) return;

  const safeTitle = title.replace(/"/g, '\\"').replace(/'/g, "'\\''");
  const safeMessage = message.replace(/"/g, '\\"').replace(/'/g, "'\\''");
  const sound = config.notifications.sound;

  const script = `display notification "${safeMessage}" with title "${safeTitle}"${sound ? ` sound name "${sound}"` : ''}`;

  try {
    execSync(`/usr/bin/osascript -e '${script}'`, { stdio: 'ignore', timeout: 5000 });
  } catch {
    // Notifications are best-effort
  }
}
