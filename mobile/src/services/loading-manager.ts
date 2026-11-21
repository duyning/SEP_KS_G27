export const LOADING_MESSAGES = {
  startup: 'Đang chuẩn bị không gian của bạn...',
  sessionRestore: 'Đang xác thực phiên đăng nhập...',
  switchWorkspace: 'Đang chuyển không gian làm việc...',
  loadingData: 'Đang tải dữ liệu...',
  signingOut: 'Đang đóng phiên làm việc...',
} as const;

export type LoadingMode = 'overlay' | 'fullscreen';

export interface StartLoadingOptions {
  id?: string;
  message?: string;
  mode?: LoadingMode;
  /** Skip the 200ms anti-flicker delay (used for fullscreen/startup transitions). */
  immediate?: boolean;
}

export interface LoadingTask {
  id: string;
  message: string;
  mode: LoadingMode;
  startedAt: number;
}

export interface LoadingSnapshot {
  visible: boolean;
  mode: LoadingMode;
  message: string;
  activeCount: number;
}

export interface LoadingManagerTimings {
  showDelayMs: number;
  minVisibleMs: number;
}

const DEFAULT_TIMINGS: LoadingManagerTimings = {
  showDelayMs: 200,
  minVisibleMs: 300,
};

export function normalizeLoadingMessage(
  message?: string | null,
  fallback: string = LOADING_MESSAGES.loadingData
): string {
  const trimmed = typeof message === 'string' ? message.trim() : '';
  return trimmed || fallback;
}

/**
 * Centralized, framework-agnostic loading coordinator.
 * - Tracks multiple concurrent async tasks by unique ID so one request never cancels another.
 * - Guarantees a single active overlay/splash state (never stacked overlays).
 * - Implements 200ms show delay + 300ms min-visible duration for overlays to prevent flicker.
 * - Cleans up all timers deterministically on stop/clearAll/dispose.
 */
export class LoadingManager {
  private tasks = new Map<string, LoadingTask>();
  private listeners = new Set<() => void>();
  private snapshot: LoadingSnapshot = {
    visible: false,
    mode: 'overlay',
    message: LOADING_MESSAGES.loadingData,
    activeCount: 0,
  };
  private seq = 0;
  private visibleSince: number | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly timings: LoadingManagerTimings;
  private readonly now: () => number;

  constructor(
    timings: Partial<LoadingManagerTimings> = {},
    now: () => number = () => Date.now()
  ) {
    this.timings = { ...DEFAULT_TIMINGS, ...timings };
    this.now = now;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): LoadingSnapshot => this.snapshot;

  private emit(next: LoadingSnapshot) {
    if (
      next.visible === this.snapshot.visible &&
      next.mode === this.snapshot.mode &&
      next.message === this.snapshot.message &&
      next.activeCount === this.snapshot.activeCount
    ) {
      return;
    }
    this.snapshot = next;
    this.listeners.forEach(fn => fn());
  }

  private clearTimers() {
    if (this.showTimer !== null) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private resolveCurrentPresentation(): { mode: LoadingMode; message: string } {
    const list = Array.from(this.tasks.values());
    if (list.length === 0) {
      return { mode: this.snapshot.mode, message: this.snapshot.message };
    }
    // Fullscreen takes precedence over overlay when concurrent tasks exist
    const fullscreenTasks = list.filter(t => t.mode === 'fullscreen');
    if (fullscreenTasks.length > 0) {
      const latest = fullscreenTasks[fullscreenTasks.length - 1];
      return { mode: 'fullscreen', message: latest.message };
    }
    const latest = list[list.length - 1];
    return { mode: 'overlay', message: latest.message };
  }

  start = (options: StartLoadingOptions = {}): string => {
    const id = options.id?.trim() || `loading-${++this.seq}`;
    const mode: LoadingMode = options.mode === 'fullscreen' ? 'fullscreen' : 'overlay';
    const message = normalizeLoadingMessage(options.message, LOADING_MESSAGES.loadingData);

    // Re-insert so the latest started/updated task appears at the tail
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
      // Update activeCount without showing yet; schedule single show timer
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

  updateMessage = (id: string, message: string): void => {
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

  stop = (id: string): void => {
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

    // No active tasks remain
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

    // Fullscreen exits cleanly without artificial delay; overlay respects minVisibleMs
    const elapsed = this.visibleSince != null ? this.now() - this.visibleSince : this.timings.minVisibleMs;
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

  withLoading = async <T>(
    task: (updateMessage: (next: string) => void) => Promise<T>,
    options: StartLoadingOptions = {}
  ): Promise<T> => {
    const id = this.start(options);
    try {
      return await task(next => this.updateMessage(id, next));
    } finally {
      this.stop(id);
    }
  };

  clearAll = (): void => {
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

  dispose = (): void => {
    this.clearAll();
    this.listeners.clear();
  };
}
