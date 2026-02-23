import { writeFileSync, existsSync } from 'node:fs';
import { loadConfig } from './config.mjs';
import { Scheduler, MODES } from './scheduler.mjs';
import { checkCredits, fetchUsageFromApi, classifyUsage, CreditStatus } from './credit-monitor.mjs';
import { getNextApprovedTask } from './task-queue.mjs';
import { TaskRunner } from './task-runner.mjs';
import { notify } from './notifier.mjs';
import { log } from './logger.mjs';
import { generateSummary } from './summary.mjs';
import { recordPoll, recordTaskEvent, getGraphData, getCurrentUsageSummary } from './usage-monitor.mjs';
import { broadcast } from './server.mjs';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class Daemon {
  constructor() {
    const config = loadConfig();
    this.scheduler = new Scheduler({
      bedTime: config.schedule.bedTime,
      wakeTime: config.schedule.wakeTime,
      workTime: config.schedule.workTime,
    });
    this.runner = new TaskRunner();
    this.runner.onProgress = (progress) => {
      try { broadcast('progress', progress); } catch {}
    };
    this.creditsAvailable = false;
    this.sessionStartTime = new Date();
    this.summaryGenerated = false;
    this._loopRunning = false;
    this._latestUsageRaw = null;
    this._latestUsageSummary = null;

    this.scheduler.onModeChange((oldMode, newMode) => {
      log('info', `Mode transition: ${oldMode} -> ${newMode}`);
      notify(`AutoClaude mode: ${newMode}`);
    });
  }

  start() {
    this.scheduler.start();
    this.summaryGenerated = false;
    this.sessionStartTime = new Date();
    log('info', `Daemon started. Schedule: bed=${this.scheduler.getScheduleInfo().bedTime} wake=${this.scheduler.getScheduleInfo().wakeTime} work=${this.scheduler.getScheduleInfo().workTime}`);
    notify('AutoClaude started. Monitoring for credits...');
    if (!this._loopRunning) this._runLoop();
  }

  stop() {
    this.scheduler.stop();
    this.runner.kill();
    log('info', 'Daemon stopped.');
    notify('AutoClaude stopped.');
  }

  setSchedule({ bedTime, wakeTime, workTime }) {
    this.scheduler.setSchedule({ bedTime, wakeTime, workTime });
  }

  getStatus() {
    return {
      schedule: this.scheduler.getScheduleInfo(),
      runner: this.runner.getStatus(),
      creditsAvailable: this.creditsAvailable,
      sessionStartTime: this.sessionStartTime.toISOString(),
      summaryGenerated: this.summaryGenerated,
    };
  }

  getProgress() {
    return this.runner.getProgress();
  }

  getUsageData() {
    return {
      current: this._latestUsageSummary,
      graph: getGraphData(12),
      raw: this._latestUsageRaw,
    };
  }

  async _runLoop() {
    this._loopRunning = true;
    const config = loadConfig();

    while (true) {
      // Check mode transitions
      this.scheduler.checkTransition();
      const mode = this.scheduler.currentMode;

      if (!this.scheduler.running) {
        await sleep(2000);
        continue;
      }

      if (mode === MODES.SLEEP) {
        await this._sleepMode(config);
      } else if (mode === MODES.WAKE) {
        await this._wakeMode();
      } else {
        // WORK mode - just idle
        await sleep(10000);
      }
    }
  }

  async _sleepMode(config) {
    if (this.runner.isRunning) {
      await sleep(5000);
      return;
    }

    // Poll for credits
    log('debug', 'Checking credit availability...');

    // Try API-based check first
    const apiData = await fetchUsageFromApi();
    if (apiData?.usage) {
      this._latestUsageRaw = apiData;
      this._latestUsageSummary = getCurrentUsageSummary(apiData);
      recordPoll(apiData);

      const result = classifyUsage(apiData);

      if (result.status === CreditStatus.AVAILABLE) {
        if (!this.creditsAvailable) {
          log('info', `Credits available! ${result.detail}`);
          notify('Credits available! Starting tasks...');
          this.creditsAvailable = true;
        }

        const task = getNextApprovedTask();
        if (task) {
          recordTaskEvent('task_start', task.title);
          await this.runner.runTask(task);
          recordTaskEvent('task_complete', task.title);
        } else {
          log('info', 'All approved tasks completed. Waiting...');
          await sleep(config.creditCheck.pollIntervalMs * 2);
        }
      } else {
        this.creditsAvailable = false;
        log('info', `Credits: ${result.status} - ${result.detail}`);
        const waitMs = result.status === CreditStatus.RATE_LIMITED ? 60000 : config.creditCheck.pollIntervalMs;
        await sleep(waitMs);
      }
    } else {
      // Fallback to CLI check
      const result = await checkCredits();
      if (result.status === CreditStatus.AVAILABLE) {
        if (!this.creditsAvailable) {
          log('info', 'Credits available (CLI check)!');
          notify('Credits available!');
          this.creditsAvailable = true;
        }
        const task = getNextApprovedTask();
        if (task) {
          recordTaskEvent('task_start', task.title);
          await this.runner.runTask(task);
          recordTaskEvent('task_complete', task.title);
        } else {
          await sleep(config.creditCheck.pollIntervalMs * 2);
        }
      } else {
        this.creditsAvailable = false;
        log('info', `Credits: ${result.status} - ${result.detail}`);
        await sleep(config.creditCheck.pollIntervalMs);
      }
    }
  }

  async _wakeMode() {
    if (this.runner.isRunning) {
      log('info', 'WAKE mode: waiting for current task to finish...');
      await sleep(5000);
      return;
    }

    if (!this.summaryGenerated) {
      log('info', 'Generating overnight work summary...');
      try {
        const { path } = generateSummary(this.sessionStartTime);
        log('info', `Summary written to: ${path}`);
        notify('Overnight work summary ready!');
      } catch (err) {
        log('error', `Summary generation failed: ${err.message}`);
      }
      this.summaryGenerated = true;
    }

    await sleep(30000);
  }
}
