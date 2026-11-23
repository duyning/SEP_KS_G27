import { DEFAULT_GLOBAL_LOADING_MESSAGE, normalizeLoadingMessage } from './loading-policy.js';

export const LOADING_MESSAGES = Object.freeze({
  startup: 'Đang chuẩn bị không gian của bạn...',
  sessionRestore: 'Đang xác thực phiên đăng nhập...',
  switchWorkspace: 'Đang chuyển không gian làm việc...',
  loadingData: DEFAULT_GLOBAL_LOADING_MESSAGE,
  signingOut: 'Đang đóng phiên làm việc...',
});

const DEFAULT_TIMINGS = Object.freeze({
  showDelayMs: 200,
  minVisibleMs: 300,
});

export class LoadingManager {
  constructor(timings = {}, now = () => Date.now()) {
    this.timings = { ...DEFAULT_TIMINGS, ...timings };
    this.now = now;
    this.tasks = new Map();
    this.listeners = new Set();
    this.snapshot = {
      visible: false,
      mode: 'overlay',
      message: LOADING_MESSAGES.loadingData,
      activeCount: 0,
    };
    this.seq = 0;
    this.visibleSince = null;
    this.showTimer = null;
    this.hideTimer = null;
  }

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  emit(next) {
    if (
      next.visible === this.snapshot.visible &&
      next.mode === this.snapshot.mode &&
      next.message === this.snapshot.message &&
      next.activeCount === this.snapshot.activeCount
    ) {
      return;
    }
    this.snapshot = next;
    this.listeners.forEach((fn) => fn());
  }

  clearTimers() {
    if (this.showTimer !== null) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  resolveCurrentPresentation() {
    const list = Array.from(this.tasks.values());
    if (list.length === 0) {
      return { mode: this.snapshot.mode, message: this.snapshot.message };
    }
    const fullscreenTasks = list.filter((t) => t.mode === 'fullscreen');
    if (fullscreenTasks.length > 0) {
      const latest = fullscreenTasks[fullscreenTasks.length - 1];
      return { mode: 'fullscreen', message: latest.message };
    }
    const latest = list[list.length - 1];
    return { mode: 'overlay', message: latest.message };
  }

  start = (options = {}) => {
    const id = (typeof options.id === 'string' && options.id.trim()) || `loading-${++this.seq}`;
    const mode = options.mode === 'fullscreen' ? 'fullscreen' : 'overlay';
    const message = normalizeLoadingMessage(options.message, LOADING_MESSAGES.loadingData);

    this.tasks.delete(id);
    this.tasks.set(id, { id, message, mode, startedAt: this.now() });

    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    const presentation = this.resolveCurrentPresentation();
    const shouldShowImmediately =
      this.snapshot.visible ||
      mode === 'fullscreen' ||
      options.immediate === true ||
      this.timings.showDelayMs <= 0;

    if (shouldShowImmediately) {
      if (this.showTimer !== null) {
        clearTimeout(this.showTimer);
        this.showTimer = null;
      }
      if (!this.snapshot.visible) {
        this.visibleSince = this.now();
      }
      this.emit({
        visible: true,
        mode: presentation.mode,
        message: presentation.message,
        activeCount: this.tasks.size,
      });
    } else {
      this.emit({
        visible: false,
        mode: presentation.mode,
        message: presentation.message,
        activeCount: this.tasks.size,
      });
      if (this.showTimer === null) {
        this.showTimer = setTimeout(() => {
          this.showTimer = null;
          if (this.tasks.size === 0) return;
          const current = this.resolveCurrentPresentation();
          this.visibleSince = this.now();
          this.emit({
            visible: true,
            mode: current.mode,
            message: current.message,
            activeCount: this.tasks.size,
          });
        }, this.timings.showDelayMs);
      }
    }

    return id;
  };

  updateMessage = (id, message) => {
    const existing = this.tasks.get(id);
    if (!existing) return;
    existing.message = normalizeLoadingMessage(message, existing.message);
    const current = this.resolveCurrentPresentation();
    this.emit({
      ...this.snapshot,
      mode: current.mode,
      message: current.message,
      activeCount: this.tasks.size,
    });
  };

  stop = (id) => {
    if (!this.tasks.delete(id)) return;

    if (this.tasks.size > 0) {
      const current = this.resolveCurrentPresentation();
      this.emit({
        ...this.snapshot,
        mode: current.mode,
        message: current.message,
        activeCount: this.tasks.size,
      });
      return;
    }

    if (this.showTimer !== null) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }

    if (!this.snapshot.visible) {
      this.visibleSince = null;
      this.emit({
        ...this.snapshot,
        visible: false,
        activeCount: 0,
      });
      return;
    }

    const elapsed =
      this.visibleSince != null ? this.now() - this.visibleSince : this.timings.minVisibleMs;
    const remaining =
      this.snapshot.mode === 'fullscreen'
        ? 0
        : Math.max(0, this.timings.minVisibleMs - elapsed);

    if (remaining <= 0) {
      this.visibleSince = null;
      this.emit({
        ...this.snapshot,
        visible: false,
        activeCount: 0,
      });
    } else {
      this.emit({
        ...this.snapshot,
        activeCount: 0,
      });
      this.hideTimer = setTimeout(() => {
        this.hideTimer = null;
        if (this.tasks.size > 0) return;
        this.visibleSince = null;
        this.emit({
          ...this.snapshot,
          visible: false,
          activeCount: 0,
        });
      }, remaining);
    }
  };

  withLoading = async (task, options = {}) => {
    const id = this.start(options);
    try {
      return await task((next) => this.updateMessage(id, next));
    } finally {
      this.stop(id);
    }
  };

  clearAll = () => {
    this.clearTimers();
    this.tasks.clear();
    this.visibleSince = null;
    this.emit({
      visible: false,
      mode: 'overlay',
      message: LOADING_MESSAGES.loadingData,
      activeCount: 0,
    });
  };

  dispose = () => {
    this.clearAll();
    this.listeners.clear();
  };
}
