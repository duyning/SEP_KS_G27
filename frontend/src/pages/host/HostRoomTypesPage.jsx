import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Download,
  DoorOpen,
  Eye,
  FileSpreadsheet,
  Filter,
  Grid2X2,
  House,
  ImageOff,
  Layers,
  List,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { AnimatePresence, MotionButton } from '../../components/motion/MotionUI.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import HostAvailabilityConfirmation from '../../components/HostAvailabilityConfirmation.jsx';
import { hostApi } from '../../services/host.js';
import { Modal, StateView, useToast } from '../../components/PortalUI.jsx';
import RoomTypeCreateModal from '../../components/RoomTypeCreateModal.jsx';
import RoomTypeDetailModal from '../../components/RoomTypeDetailModal.jsx';
import RoomTypePhoto from '../../components/RoomTypePhoto.jsx';
import HostSetupRequired from '../../components/HostSetupRequired.jsx';
import RoomTypeExcelImportModal from '../../components/RoomTypeExcelImportModal.jsx';
import HostActionMenu from '../../components/HostActionMenu.jsx';
import HostManagementShell, {
  HostInlinePropertySelect,
  HostFilterPanel,
  useCompactHostFilters,
  HostManagementSkeleton,
  HostResults,
  HostSegmentedToggle,
} from '../../components/HostManagementShell.jsx';
import { downloadRoomTypeTemplate } from '../../services/room-type-excel.js';
import { money } from '../../services/room-types.js';
import {
  filterAndSortRoomTypes,
  getHostWorkspaceMemory,
  updateHostWorkspaceMemory,
} from '../../services/host-management.js';
import '../../styles/host-room-types-page.css';
import '../../styles/host-room-types-refinement.css';
import '../../styles/host-management-saas.css';

export function RoomTypesNoProperty({ onRefresh, pendingCount = 0 }) {
  return <HostSetupRequired kind="types" pendingCount={pendingCount} onRefresh={onRefresh} />;
}

function TypeImage({ type, className = 'hm-rt-card-thumb' }) {
  return type.images?.length ? (
    <RoomTypePhoto typeId={type.roomTypeId} image={type.images[0]} className={className} />
  ) : (
    <span className={`${className} hm-no-thumb`} aria-hidden="true">
      <ImageOff size={18} />
    </span>
  );
}

function renderRoomTypeStatusBadge(type) {
  const total = type.totalRooms ?? 0;
  const vacant = type.vacantRooms ?? 0;
  if (type.totalRooms == null || type.vacantRooms == null || total === 0) {
    return <span className="hm-badge tone-neutral">Chưa tạo phòng</span>;
  }
  if (vacant > 0) {
    return <span className="hm-badge tone-active">Đang khai thác</span>;
  }
  return <span className="hm-badge tone-info">Đã lấp đầy</span>;
}

function RoomTypeFilters({ types, filter, setFilter, sort, setSort }) {
  return <><label className="hm-filter-field"><span>Trạng thái phòng</span><select
              className="hm-select hm-type-status"
              aria-label="Lọc trạng thái loại phòng"
              value={filter}
              onChange={event => setFilter(event.target.value)}
            >
              <option value="ALL">Tất cả ({types.length})</option>
              <option value="AVAILABLE">
                Còn phòng trống ({types.filter(item => (item.vacantRooms ?? 0) > 0).length})
              </option>
              <option value="FULL">
                Đã lấp đầy (
                {types.filter(item => (item.totalRooms ?? 0) > 0 && item.vacantRooms === 0).length})
              </option>
              <option value="EMPTY">
                Chưa tạo phòng ({types.filter(item => (item.totalRooms ?? 0) === 0).length})
              </option>
            </select></label><label className="hm-filter-field"><span>Sắp xếp</span><select
              className="hm-select hm-type-sort"
              aria-label="Sắp xếp loại phòng"
              value={sort}
              onChange={event => setSort(event.target.value)}
            >
              <option value="NEWEST">Mới nhất</option>
              <option value="PRICE_ASC">Giá thấp → cao</option>
              <option value="PRICE_DESC">Giá cao → thấp</option>
              <option value="ROOMS_DESC">Nhiều phòng nhất</option>
              <option value="NAME">Tên A–Z</option>
            </select></label></>;
}

function RoomTypeCard({ type, onSelect, actions, onConfirmed }) {
  const total = Number.isInteger(type.totalRooms) ? type.totalRooms : null;
  const vacant = Number.isInteger(type.vacantRooms) ? type.vacantRooms : null;
  const occupied = total != null && vacant != null ? Math.max(0, total - vacant) : null;
  const roomLink = `/host/rooms?propertyId=${type.propertyId}&roomTypeId=${type.roomTypeId}`;
  return <article className="hm-rt-card">
    <div className="hm-rt-card-hero">
      <button type="button" className="hm-rt-thumb-trigger" onClick={() => onSelect(type)} aria-label={`Xem chi tiết ${type.roomType}`}><TypeImage type={type}/></button>
      <div className="hm-rt-card-info">
        <header className="hm-rt-card-top">
          <h2 className="hm-rt-card-title"><button type="button" onClick={() => onSelect(type)} title={type.roomType}>{type.roomType}</button></h2>
          <div className="hm-rt-card-status">{renderRoomTypeStatusBadge(type)}</div>
        </header>
        <div className="hm-rt-card-body">
          <p className="hm-rt-price-line"><strong className="hm-rt-price">{money(type.price)}</strong><span>/ tháng</span></p>
          <p className="hm-rt-spec-line"><span>{type.areaSqm != null ? `${type.areaSqm} m²` : 'Chưa rõ diện tích'}</span><span className="hm-dot-sep" aria-hidden="true">·</span><span>{type.capacity != null ? `Tối đa ${type.capacity} người` : 'Chưa rõ sức chứa'}</span></p>
        </div>
      </div>
    </div>
    <dl className="hm-rt-inventory" aria-label="Tình trạng phòng">
      <div><dt>Tổng số phòng</dt><dd>{total ?? '—'}</dd></div>
      <div className="is-vacant"><dt>Còn trống</dt><dd>{vacant ?? '—'}<House size={15} aria-hidden="true"/></dd></div>
      <div><dt>Đang thuê</dt><dd>{occupied ?? '—'}</dd></div>
    </dl>
    <HostAvailabilityConfirmation type={type} onConfirmed={onConfirmed}/>
    <footer className="hm-rt-card-footer">
      <Link className="hm-rt-manage-link" to={roomLink}><DoorOpen size={15}/><span>Quản lý phòng</span></Link>
      {actions}
    </footer>
  </article>;
}

export function RoomTypesContent({ data, propertyId, onRefresh, onCreated, onDeleted }) {
  const { user } = useAuth();
  const notify = useToast();
  const memory = getHostWorkspaceMemory(user?.userId);
  const compactFilters = useCompactHostFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [search, setSearch] = useState(memory.roomTypes.search || '');
  const [filter, setFilter] = useState(memory.roomTypes.filter || 'ALL');
  const [sort, setSort] = useState(memory.roomTypes.sort || 'NEWEST');
  const [view, setView] = useState(memory.roomTypes.view || 'cards');

  const [create, setCreate] = useState(false);
  const [excelImport, setExcelImport] = useState(false);
  const [excelDraft, setExcelDraft] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [operationError, setOperationError] = useState('');
  const operation = useRef();

  useEffect(() => () => operation.current?.abort(), []);

  useEffect(() => {
    updateHostWorkspaceMemory(user?.userId, {
      roomTypes: { search, filter, sort, view },
    });
  }, [user?.userId, search, filter, sort, view]);

  const effectivePropertyId = propertyId || memory.selectedPropertyId;
  const property = effectivePropertyId
    ? data.properties.find(item => String(item.propertyId) === String(effectivePropertyId)) ||
      data.properties[0]
    : data.properties[0];

  useEffect(() => {
    if (property?.propertyId != null) {
      updateHostWorkspaceMemory(user?.userId, { selectedPropertyId: String(property.propertyId) });
    }
  }, [property?.propertyId, user?.userId]);

  const types = useMemo(
    () => data.roomTypes.filter(item => item.propertyId === property?.propertyId),
    [data.roomTypes, property?.propertyId]
  );

  const shown = useMemo(
    () => filterAndSortRoomTypes(types, { search, filter, sort }),
    [types, search, filter, sort]
  );

  const exportTemplate = async () => {
    if (exporting) return;
    setExporting(true);
    setOperationError('');
    try {
      await downloadRoomTypeTemplate();
    } catch {
      setOperationError('Không tải được file mẫu Excel. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };

  const openEdit = async id => {
    if (operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setOperationError('');
    try {
      const detail = await hostApi.roomTypeDetail(id, controller.signal);
      if (!controller.signal.aborted) {
        setEditing(detail);
        setSelected(null);
      }
    } catch (error) {
      if (!controller.signal.aborted) setOperationError(error.message);
    } finally {
      if (operation.current === controller) operation.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  const remove = async () => {
    if (operation.current || !deleting) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setOperationError('');
    try {
      await hostApi.deleteRoomType(deleting.roomTypeId, controller.signal);
      if (!controller.signal.aborted) {
        onDeleted(deleting.roomTypeId);
        setDeleting(null);
        notify?.('Đã xóa loại phòng.', 'success');
      }
    } catch (error) {
      if (!controller.signal.aborted) setOperationError(error.message);
    } finally {
      if (operation.current === controller) operation.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  if (!property) {
    return (
      <HostManagementShell activePath="/host/room-types">
        <RoomTypesNoProperty onRefresh={onRefresh} pendingCount={data.pendingRegistrationCount} />
      </HostManagementShell>
    );
  }

  const canCreate = property.status === 'ACTIVE';
  const hasRoomCounts = types.length > 0 && types.every(item => item.totalRooms != null);
  const totals = hasRoomCounts ? types.reduce((sum, item) => sum + item.totalRooms, 0) : 0;
  const vacancies =
    types.length > 0 && types.every(item => item.vacantRooms != null)
      ? types.reduce((sum, item) => sum + item.vacantRooms, 0)
      : 0;
  const occupied = Math.max(0, totals - vacancies);

  const created = record => {
    const wasEditing = Boolean(editing);
    onCreated(record);
    setCreate(false);
    setEditing(null);
    notify?.(
      wasEditing
        ? 'Đã cập nhật loại phòng thành công.'
        : `Đã tạo loại phòng và ${(record.rooms || []).length} phòng thành công.`,
      'success'
    );
  };

  const headerActions = (
    <>
      <MotionButton
        type="button"
        className="hm-btn hm-btn-subtle"
        disabled={exporting}
        onClick={exportTemplate}
        title="Tải file Excel mẫu để chuẩn bị danh sách loại phòng"
      >
        {exporting ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />}
        <span className="hm-hide-xs">Mẫu Excel</span>
      </MotionButton>
      <MotionButton
        type="button"
        className="hm-btn hm-btn-subtle"
        disabled={!canCreate}
        onClick={() => setExcelImport(true)}
        title={canCreate ? 'Nhập nhanh thông tin loại phòng từ file Excel' : 'Nhà trọ cần đang hoạt động'}
      >
        <FileSpreadsheet size={15} />
        <span className="hm-hide-xs">Nhập Excel</span>
      </MotionButton>
      <MotionButton
        type="button"
        className="hm-btn hm-btn-primary"
        disabled={!canCreate}
        title={canCreate ? 'Thêm loại phòng mới' : 'Nhà trọ cần được phê duyệt và đang hoạt động'}
        onClick={() => setCreate(true)}
      >
        <Plus size={16} />
        <span>Thêm loại phòng</span>
      </MotionButton>
    </>
  );

  const summaryMetrics = [
    {
      key: 'types',
      label: 'Tổng loại phòng',
      value: types.length,
      icon: Layers,
      active: filter === 'ALL',
      onClick: () => setFilter('ALL'),
    },
    {
      key: 'rooms',
      label: 'Tổng số phòng',
      value: types.length ? totals : 0,
      icon: DoorOpen,
    },
    {
      key: 'vacant',
      label: 'Số phòng trống',
      value: types.length ? vacancies : 0,
      tone: 'emerald',
      icon: House,
      active: filter === 'AVAILABLE',
      onClick: () => setFilter(prev => (prev === 'AVAILABLE' ? 'ALL' : 'AVAILABLE')),
    },
    {
      key: 'occupied',
      label: 'Đang thuê',
      value: types.length ? occupied : 0,
      tone: 'blue',
      icon: Users,
      active: filter === 'FULL',
      onClick: () => setFilter(prev => (prev === 'FULL' ? 'ALL' : 'FULL')),
    },
  ];

  const resetFilters = () => {
    setSearch('');
    setFilter('ALL');
    setSort('NEWEST');
  };

  const renderTypeActions = type => {
    const menuItems = [
      {
        key: 'rooms',
        label: 'Quản lý danh sách phòng',
        icon: DoorOpen,
        to: `/host/rooms?propertyId=${type.propertyId}&roomTypeId=${type.roomTypeId}`,
      },
      {
        key: 'edit',
        label: 'Chỉnh sửa loại phòng',
        icon: Pencil,
        disabled: busy,
        onSelect: () => openEdit(type.roomTypeId),
      },
      { divider: true },
      {
        key: 'delete',
        label: 'Xóa loại phòng',
        icon: Trash2,
        tone: 'danger',
        disabled: busy,
        onSelect: () => {
          setOperationError('');
          setDeleting(type);
        },
      },
    ];

    return (
      <div className="hm-card-action-group">
        <MotionButton
          type="button"
          className="hm-btn hm-btn-tonal hm-btn-sm"
          onClick={() => setSelected(type)}
        >
          <Eye size={14} />
          <span>Chi tiết</span>
        </MotionButton>
        <HostActionMenu items={menuItems} label={`Tùy chọn cho ${type.roomType}`} />
      </div>
    );
  };

  return (
    <HostManagementShell
      activePath="/host/room-types"
      actions={headerActions}
      metrics={summaryMetrics}
      summaryLabel={`Thống kê loại phòng của ${property.name}`}
    >
      {operationError && !deleting && (
        <div className="hm-banner hm-banner-error" role="alert">
          <span>{operationError}</span>
        </div>
      )}
      {busy && !deleting && (
        <div className="hm-banner hm-banner-info" role="status">
          <LoaderCircle size={15} className="spin" />
          <span>Đang tải chi tiết cấu hình loại phòng...</span>
        </div>
      )}

      <section className="hm-surface" aria-label="Danh sách loại phòng">
        <div className={`hm-toolbar hm-types-toolbar ${compactFilters ? "is-compact" : ""}`}>
          <HostInlinePropertySelect
            properties={data.properties}
            selectedPropertyId={property.propertyId}
          />

          <label className="hm-search-box">
            <Search size={15} aria-hidden="true" />
            <input
              aria-label="Tìm loại phòng"
              placeholder="Tìm tên loại phòng..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </label>

          <div className="hm-toolbar-controls">
            {compactFilters ? <MotionButton type="button" id="hm-type-filter-toggle" className={`hm-btn hm-btn-subtle hm-type-filter-toggle ${filter !== 'ALL' || sort !== 'NEWEST' ? 'is-active' : ''}`} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(value => !value)}><Filter size={15}/>Bộ lọc{filter !== 'ALL' || sort !== 'NEWEST' ? ' •' : ''}</MotionButton> : <RoomTypeFilters {...{types, filter, setFilter, sort, setSort}} />}

            {!compactFilters && (search || filter !== 'ALL' || sort !== 'NEWEST') && (
              <MotionButton
                type="button"
                className="hm-btn hm-btn-ghost hm-btn-sm hm-filter-reset"
                onClick={resetFilters}
              >
                <RotateCcw size={14} />
                <span>Đặt lại</span>
              </MotionButton>
            )}

            <HostSegmentedToggle
              value={view}
              onChange={setView}
              ariaLabel="Chế độ hiển thị loại phòng"
              options={[
                { value: 'cards', icon: Grid2X2, title: 'Dạng thẻ gọn', ariaLabel: 'Dạng thẻ gọn' },
                { value: 'table', icon: List, title: 'Dạng bảng dữ liệu', ariaLabel: 'Dạng bảng dữ liệu' },
              ]}
            />
          </div>
        </div>

        <HostFilterPanel open={compactFilters && filtersOpen} onClose={() => setFiltersOpen(false)} triggerId="hm-type-filter-toggle" title="Bộ lọc loại phòng">
          <RoomTypeFilters {...{types, filter, setFilter, sort, setSort}} />
          {(search || filter !== 'ALL' || sort !== 'NEWEST') && <div className="hm-filter-actions"><MotionButton type="button" className="hm-btn hm-btn-ghost" onClick={resetFilters}><RotateCcw size={14}/>Đặt lại</MotionButton></div>}
        </HostFilterPanel>
        <HostResults revision={`${view}:${search}:${filter}:${sort}:${property.propertyId}`}>
        {!types.length ? (
          <div className="hm-empty-box">
            <Layers size={30} aria-hidden="true" />
            <h3>Nhà trọ chưa có loại phòng nào</h3>
            <p>
              Thiết lập loại phòng để chuẩn hóa giá thuê, diện tích, tiện nghi và tạo nhanh danh sách
              phòng theo tầng.
            </p>
            <MotionButton
              type="button"
              className="hm-btn hm-btn-primary"
              disabled={!canCreate}
              onClick={() => setCreate(true)}
            >
              <Plus size={16} />
              <span>Thêm loại phòng đầu tiên</span>
            </MotionButton>
          </div>
        ) : !shown.length ? (
          <div className="hm-empty-box">
            <Search size={28} aria-hidden="true" />
            <h3>Không có loại phòng phù hợp</h3>
            <p>Thử điều chỉnh từ khóa hoặc bộ lọc trạng thái phòng trống.</p>
            <MotionButton type="button" className="hm-btn" onClick={resetFilters}>
              Đặt lại bộ lọc
            </MotionButton>
          </div>
        ) : view === 'cards' ? (
          <div className="hm-rt-grid">
            {shown.map(type => <RoomTypeCard key={type.roomTypeId} type={type} onSelect={setSelected} actions={renderTypeActions(type)} onConfirmed={onCreated} />)}
          </div>
        ) : (
          <div className="hm-table-wrap">
            <table className="hm-table">
              <thead>
                <tr>
                  <th scope="col">Loại phòng</th>
                  <th scope="col">Giá thuê / tháng</th>
                  <th scope="col">Tiền đặt cọc</th>
                  <th scope="col">Quy mô & Phòng trống</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col" className="is-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(type => (
                  <tr key={type.roomTypeId}>
                    <td>
                      <div className="hm-entity-cell">
                        <TypeImage type={type} className="hm-rt-row-thumb" />
                        <div className="hm-entity-copy">
                          <button
                            type="button"
                            className="hm-entity-title-btn"
                            onClick={() => setSelected(type)}
                          >
                            {type.roomType}
                          </button>
                          <span className="hm-entity-sub">
                            {type.areaSqm != null ? `${type.areaSqm}m²` : '—'} · Tối đa{' '}
                            {type.capacity ?? '—'} người
                            {type.amenities?.length ? ` · ${type.amenities.length} tiện nghi` : ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="hm-tabular">
                      <strong className="hm-price-cell">{money(type.price)}</strong>
                    </td>
                    <td className="hm-tabular">{money(type.deposit)}</td>
                    <td>
                      {type.totalRooms != null ? (
                        <span className="hm-inline-stats">
                          <strong>{type.totalRooms}</strong> phòng ·{' '}
                          <span className={(type.vacantRooms ?? 0) > 0 ? 'is-emerald' : 'hm-muted'}>
                            {type.vacantRooms ?? 0} phòng trống
                          </span>
                        </span>
                      ) : (
                        <span className="hm-muted">Chưa có dữ liệu</span>
                      )}
                    </td>
                    <td>{renderRoomTypeStatusBadge(type)}<HostAvailabilityConfirmation type={type} onConfirmed={onCreated}/></td>
                    <td className="is-right">{renderTypeActions(type)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </HostResults>

      </section>

      <AnimatePresence>
        {excelImport && (
          <RoomTypeExcelImportModal
            property={property}
            types={types}
            onClose={() => setExcelImport(false)}
            onImported={draft => {
              setExcelDraft(draft);
              setExcelImport(false);
              setCreate(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(create || editing) && (
          <RoomTypeCreateModal
            key={editing?.roomTypeId || 'new'}
            property={property}
            type={editing}
            initialDraft={excelDraft}
            existingRoomNumbers={types.flatMap(item =>
              (item.rooms || []).map(room => room.roomNumber)
            )}
            onClose={() => {
              setCreate(false);
              setEditing(null);
              setExcelDraft(null);
            }}
            onCreated={record => {
              created(record);
              setExcelDraft(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selected && (
          <RoomTypeDetailModal
            id={typeof selected === 'object' ? selected.roomTypeId : selected}
            initialType={typeof selected === 'object' ? selected : null}
            onClose={() => setSelected(null)}
            onEdit={detail => {
              setSelected(null);
              setEditing(detail);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleting && (
          <Modal
            className="rt-delete-modal"
            title="Xóa loại phòng"
            onClose={() => {
              if (!busy) setDeleting(null);
            }}
          >
            <p>
              Bạn chắc chắn muốn xóa loại phòng <strong>{deleting.roomType}</strong>? Ảnh thuộc loại
              phòng cũng sẽ bị xóa. Thao tác này không thể hoàn tác.
            </p>
            {operationError && (
              <p className="rt-submit-error" role="alert">
                {operationError}
              </p>
            )}
            <div className="rt-modal-footer">
              <MotionButton className="p-button" disabled={busy} onClick={() => setDeleting(null)}>
                Hủy
              </MotionButton>
              <MotionButton
                className="p-button rt-delete-confirm"
                disabled={busy}
                onClick={remove}
              >
                {busy ? (
                  <>
                    <LoaderCircle className="spin" size={16} />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Xóa loại phòng
                  </>
                )}
              </MotionButton>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </HostManagementShell>
  );
}

export default function HostRoomTypesPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const propertyId = params.get('propertyId');
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, data: null, error: '' });
    hostApi
      .roomTypes(controller.signal, propertyId)
      .then(data => {
        if (!controller.signal.aborted) setState({ loading: false, data, error: '' });
      })
      .catch(error => {
        if (!controller.signal.aborted) setState({ loading: false, data: null, error: error.message });
      });
    return () => controller.abort();
  }, [user?.userId, propertyId, revision]);

  return (
    <div className="host-room-types-page">
      {state.loading ? (
        <HostManagementShell activePath="/host/room-types">
          <HostManagementSkeleton kind="room-types" />
        </HostManagementShell>
      ) : state.error ? (
        <HostManagementShell activePath="/host/room-types">
          <StateView kind="error" message={state.error}>
            <MotionButton
              className="hm-btn hm-btn-primary"
              onClick={() => setRevision(value => value + 1)}
            >
              Thử lại
            </MotionButton>
          </StateView>
        </HostManagementShell>
      ) : (
        <RoomTypesContent
          key={`${user?.userId}-${propertyId || ''}`}
          data={state.data}
          propertyId={propertyId}
          onRefresh={() => setRevision(value => value + 1)}
          onCreated={record =>
            setState(previous => ({
              ...previous,
              data: {
                ...previous.data,
                roomTypes: [
                  record,
                  ...previous.data.roomTypes.filter(type => type.roomTypeId !== record.roomTypeId),
                ],
              },
            }))
          }
          onDeleted={id =>
            setState(previous => ({
              ...previous,
              data: {
                ...previous.data,
                roomTypes: previous.data.roomTypes.filter(type => type.roomTypeId !== id),
              },
            }))
          }
        />
      )}
    </div>
  );
}
