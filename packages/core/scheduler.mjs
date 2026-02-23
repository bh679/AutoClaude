export const MODES = { SLEEP: 'SLEEP', WAKE: 'WAKE', WORK: 'WORK' };

export class Scheduler {
  constructor({ bedTime, wakeTime, workTime }) {
    this.bedTime = this._parseTime(bedTime);
    this.wakeTime = this._parseTime(wakeTime);
    this.workTime = this._parseTime(workTime);
    this.currentMode = MODES.WORK; // start in WORK until explicitly started
    this.running = false;
    this._listeners = [];
  }

  start() {
    this.running = true;
    this.currentMode = this._calculateMode();
  }

  stop() {
    this.running = false;
    this.currentMode = MODES.WORK;
  }

  setSchedule({ bedTime, wakeTime, workTime }) {
    if (bedTime) this.bedTime = this._parseTime(bedTime);
    if (wakeTime) this.wakeTime = this._parseTime(wakeTime);
    if (workTime) this.workTime = this._parseTime(workTime);
  }

  _calculateMode() {
    if (!this.running) return MODES.WORK;

    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    // Handle overnight wrap: bed=23:00(1380), wake=7:00(420), work=9:00(540)
    if (this.bedTime > this.wakeTime) {
      // Overnight schedule
      if (nowMins >= this.bedTime || nowMins < this.wakeTime) {
        return MODES.SLEEP;
      } else if (nowMins >= this.wakeTime && nowMins < this.workTime) {
        return MODES.WAKE;
      } else {
        return MODES.WORK;
      }
    } else {
      // Same-day schedule (unusual but supported)
      if (nowMins >= this.bedTime && nowMins < this.wakeTime) {
        return MODES.SLEEP;
      } else if (nowMins >= this.wakeTime && nowMins < this.workTime) {
        return MODES.WAKE;
      } else {
        return MODES.WORK;
      }
    }
  }

  checkTransition() {
    if (!this.running) return this.currentMode;
    const newMode = this._calculateMode();
    if (newMode !== this.currentMode) {
      const oldMode = this.currentMode;
      this.currentMode = newMode;
      for (const fn of this._listeners) {
        try { fn(oldMode, newMode); } catch { /* ignore */ }
      }
    }
    return this.currentMode;
  }

  onModeChange(fn) {
    this._listeners.push(fn);
  }

  shouldStartNewTask() {
    return this.running && this.currentMode === MODES.SLEEP;
  }

  getScheduleInfo() {
    return {
      bedTime: this._formatTime(this.bedTime),
      wakeTime: this._formatTime(this.wakeTime),
      workTime: this._formatTime(this.workTime),
      currentMode: this.currentMode,
      running: this.running,
    };
  }

  _parseTime(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  _formatTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
