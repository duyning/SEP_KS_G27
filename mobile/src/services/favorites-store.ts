import { tokenStore } from './auth';
import { favoritesApi, FavoritesError, type FavoriteItem, type FavoritesApi } from './favorites';

export interface FavoritesSnapshot {
  states: Record<number, number>; pending: Record<number, boolean>; items: FavoriteItem[];
  page: number; totalPages: number; total: number; loaded: boolean;
  loading: boolean; refreshing: boolean; loadingMore: boolean;
  error: string | null; moreError: string | null; mutationError: string | null;
}
const empty = (): FavoritesSnapshot => ({ states: {}, pending: {}, items: [], page: -1, totalPages: 0, total: 0, loaded: false, loading: false, refreshing: false, loadingMore: false, error: null, moreError: null, mutationError: null });

// One store per authenticated account. No disk/browser persistence of wishlist data.
export class FavoritesStore {
  private snapshot = empty();
  private listeners = new Set<() => void>();
  private active = true;
  private generation = 0;
  private mutationVersion = 0;
  private dirtyList = false;
  private listBusy = false;
  private listNeedsReload = false;
  private listRequest?: AbortController;
  private stateRequest?: AbortController;
  private mutationRequests = new Set<AbortController>();
  constructor(private enabled: boolean, private api: FavoritesApi = favoritesApi, private getToken = tokenStore.get, private onUnauthorized: () => void = () => {}, readonly accountKey = '') {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(values: Partial<FavoritesSnapshot>) { this.snapshot = { ...this.snapshot, ...values }; this.listeners.forEach(listener => listener()); }
  start = () => { this.active = true; };
  stop = () => {
    this.active = false; this.generation++; this.listRequest?.abort(); this.stateRequest?.abort();
    this.mutationRequests.forEach(controller => controller.abort()); this.mutationRequests.clear(); this.listBusy = false;
    this.snapshot = empty(); this.dirtyList = false; this.listNeedsReload = false;
  };
  private async authorize(version: number) {
    const token = await this.getToken();
    if (!this.active || version !== this.generation) throw new FavoritesError('Yêu cầu đã bị hủy.');
    if (!this.enabled) throw new FavoritesError('Tài khoản không có quyền quản lý phòng đã lưu.', 403);
    if (!token) throw new FavoritesError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);
    return token;
  }
  private failure(error: unknown): string {
    if (error instanceof FavoritesError && (error.status === 401 || error.status === 403)) this.onUnauthorized();
    return error instanceof Error ? error.message : 'Vui lòng kiểm tra kết nối và thử lại.';
  }
  hydrate = async (ids: number[]) => {
    if (!this.enabled || !ids.length) return;
    this.stateRequest?.abort(); const controller = new AbortController(); this.stateRequest = controller;
    const version = this.generation, mutation = this.mutationVersion, requested = [...new Set(ids.filter(id => Number.isSafeInteger(id) && id > 0))];
    try {
      const token = await this.authorize(version); if (controller.signal.aborted) return;
      const values = await this.api.states(requested, token, controller.signal);
      if (!this.active || controller.signal.aborted || version !== this.generation || mutation !== this.mutationVersion) return;
      const states = { ...this.snapshot.states };
      requested.forEach(id => { if (this.snapshot.pending[id]) return; if (values[id]) states[id] = values[id]; else delete states[id]; });
      this.update({ states });
    } catch (error) { if (this.active && !controller.signal.aborted && version === this.generation) this.failure(error); }
  };
  refresh = async () => {
    if (!this.enabled || this.listBusy) return;
    await this.load(false);
  };
  loadMore = async () => {
    if (!this.enabled || this.listBusy || !this.snapshot.loaded) return;
    // Deleting rows shifts offset pagination. Revalidate loaded pages before
    // requesting the next page so no row is skipped after a removal.
    if (this.dirtyList) { await this.load(false); return; }
    if (this.snapshot.page + 1 < this.snapshot.totalPages) await this.load(true);
  };
  private flushReload() {
    if (this.active && this.listNeedsReload && !this.listBusy && Object.keys(this.snapshot.pending).length === 0) {
      this.listNeedsReload = false; void this.refresh();
    }
  }
  private async load(append: boolean) {
    this.listBusy = true;
    const controller = new AbortController(); this.listRequest = controller;
    const version = this.generation, mutation = this.mutationVersion;
    const lastPage = append ? this.snapshot.page + 1 : Math.max(0, this.snapshot.page);
    this.update(append ? { loadingMore: true, moreError: null } : { loading: !this.snapshot.loaded, refreshing: this.snapshot.loaded, error: null, moreError: null });
    try {
      const token = await this.authorize(version); if (controller.signal.aborted) return;
      let data = await this.api.list(append ? lastPage : 0, token, controller.signal);
      let items = append ? [...this.snapshot.items, ...data.items] : data.items;
      if (!append) {
        for (let page = 1; page <= lastPage && page < data.totalPages; page++) {
          const next = await this.api.list(page, token, controller.signal); items = [...items, ...next.items]; data = next;
        }
      }
      if (!this.active || controller.signal.aborted || version !== this.generation) return;
      if (mutation !== this.mutationVersion) { this.listNeedsReload = true; return; }
      items = [...new Map(items.map(value => [value.favoriteId, value])).values()];
      const states = { ...this.snapshot.states }; items.forEach(value => { if (!this.snapshot.pending[value.roomTypeId]) states[value.roomTypeId] = value.favoriteId; });
      this.dirtyList = false;
      this.update({ items, states, total: data.totalElements, page: data.page, totalPages: data.totalPages, loaded: true, error: null, moreError: null });
    } catch (error) {
      if (this.active && !controller.signal.aborted && version === this.generation) this.update(append ? { moreError: this.failure(error) } : { error: this.failure(error) });
    } finally {
      if (version === this.generation) { this.listBusy = false; if (this.active) this.update({ loading: false, refreshing: false, loadingMore: false }); this.flushReload(); }
    }
  }
  toggle = async (roomTypeId: number) => {
    if (this.snapshot.pending[roomTypeId] || !this.enabled || !this.active) return;
    const version = this.generation, previous = this.snapshot.states[roomTypeId];
    this.mutationVersion++;
    const states = { ...this.snapshot.states }; if (previous) delete states[roomTypeId]; else states[roomTypeId] = -1;
    this.update({ states, pending: { ...this.snapshot.pending, [roomTypeId]: true }, mutationError: null });
    const controller = new AbortController(); this.mutationRequests.add(controller);
    try {
      const token = await this.authorize(version);
      let saved: FavoriteItem | undefined;
      if (previous) await this.api.remove(previous, token, controller.signal); else saved = await this.api.save(roomTypeId, token, controller.signal);
      if (!this.active || version !== this.generation) return;
      this.mutationVersion++; this.dirtyList = true;
      const next = { ...this.snapshot.states }; if (saved) next[roomTypeId] = saved.favoriteId; else delete next[roomTypeId];
      this.update({ states: next, ...(previous ? { items: this.snapshot.items.filter(value => value.roomTypeId !== roomTypeId), total: Math.max(0, this.snapshot.total - 1) } : {}) });
    } catch (error) {
      if (!this.active || version !== this.generation) return;
      this.mutationVersion++;
      const next = { ...this.snapshot.states }; if (previous) next[roomTypeId] = previous; else delete next[roomTypeId];
      this.update({ states: next, mutationError: this.failure(error) });
      throw error;
    } finally {
      this.mutationRequests.delete(controller);
      if (this.active && version === this.generation) { const pending = { ...this.snapshot.pending }; delete pending[roomTypeId]; this.update({ pending }); this.flushReload(); }
    }
  };
}
