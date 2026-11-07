import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useMotionTokens, useShouldReduceMotion } from '@animate-ui/react/utils/motion';
import {
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DoorOpen,
  Eye,
  Filter,
  House,
  Info,
  Layers,
  LayoutGrid,
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
import { hostApi } from '../../services/host.js';
import { Modal, StateView, useToast } from '../../components/PortalUI.jsx';
import RoomDetailModal from '../../components/RoomDetailModal.jsx';
import RoomEditorModal from '../../components/RoomEditorModal.jsx';
import HostSetupRequired from '../../components/HostSetupRequired.jsx';
import HostActionMenu from '../../components/HostActionMenu.jsx';
import HostManagementShell, {
  HostInlinePropertySelect,
  HostManagementSkeleton,
  HostSegmentedToggle,
} from '../../components/HostManagementShell.jsx';
import { money } from '../../services/room-types.js';
import { editRoom, roomPayload } from '../../services/rooms.js';
import {
  ROOM_TABLE_PAGE_SIZE,
  compareFloorNames,
  filterAndSortRooms,
  formatFloorHeading,
  getHostWorkspaceMemory,
  getRoomVisualState,
  groupRoomsByFloor,
  paginateItems,
  updateHostWorkspaceMemory,
} from '../../services/host-management.js';
import '../../styles/host-rooms-page.css';
import '../../styles/host-rooms-refinement.css';
import '../../styles/host-management-saas.css';

export function RoomsNoProperty({ onRefresh, pendingCount = 0 }) {
  return <HostSetupRequired kind="rooms" onRefresh={onRefresh} pendingCount={pendingCount} />;
}

function FloorAccordionSection({ group, expanded, onToggle, onSelectRoom }) {
  const reduce = useShouldReduceMotion();
  const { transition, blur } = useMotionTokens();

  return (
    <section className={`hm-floor-card ${expanded ? 'is-open' : ''}`} aria-label={group.floor}>
      <button
        type="button"
        className="hm-floor-header"
        aria-expanded={expanded}
        onClick={() => onToggle(group.key)}
      >
        <div className="hm-floor-title-group">
          <ChevronDown
            size={16}
            className={`hm-floor-chevron ${expanded ? 'is-open' : ''}`}
            aria-hidden="true"
          />
          <h2 className="hm-floor-title">{group.floor}</h2>
          <span className="hm-floor-count">{group.total} phòng</span>
          {group.roomTypeCount > 0 && (
            <span className="hm-floor-types hm-hide-xs">
              {group.roomTypeCount === 1 ? group.roomTypes[0] : `${group.roomTypeCount} loại phòng`}
            </span>
          )}
        </div>

        <div className="hm-floor-stats">
          <span className="hm-floor-stat is-vacant">{group.vacant} trống</span>
          <span className="hm-dot-sep" aria-hidden="true">·</span>
          <span className="hm-floor-stat is-occupied">{group.occupied} đang thuê</span>
          {group.maintenance > 0 && (
            <>
              <span className="hm-dot-sep" aria-hidden="true">·</span>
              <span className="hm-floor-stat is-maintenance">{group.maintenance} bảo trì</span>
            </>
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="floor-body"
            className="hm-floor-collapse"
            data-ui-motion="disclosure"
            initial={{
              height: 0,
              opacity: 0,
              filter: reduce ? 'none' : `blur(${blur.disclosure}px)`,
            }}
            animate={{
              height: 'auto',
              opacity: 1,
              filter: 'blur(0px)',
              transition: reduce ? { duration: 0 } : transition.disclosure,
              transitionEnd: { filter: 'none', height: 'auto' },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: reduce ? { duration: 0 } : transition.dismiss,
            }}
          >
            <div className="hm-tile-grid">
              {group.rooms.map(room => {
                const visual = getRoomVisualState(room);
                return (
                  <MotionButton
                    key={room.roomId}
                    type="button"
                    className={`hm-room-tile is-${visual.tone}`}
                    onClick={() => onSelectRoom(room)}
                    aria-label={`Phòng ${room.roomNumber} · ${visual.fullLabel} · ${room.roomType || ''} · ${money(room.price)}`}
                    title={`${room.roomNumber} · ${room.roomType} · ${money(room.price)}/tháng${visual.unconfirmed ? ' (Chưa xác nhận)' : ''}`}
                  >
                    <div className="hm-tile-top">
                      <strong className="hm-tile-number">{room.roomNumber}</strong>
                      <span className="hm-tile-indicators">
                        {visual.unconfirmed && (
                          <span
                            className="hm-unconfirmed-dot"
                            title="Chưa xác nhận tình trạng phòng"
                            aria-hidden="true"
                          />
                        )}
                        <span className="hm-status-dot" aria-hidden="true" />
                      </span>
                    </div>
                    <span className="hm-tile-status">{visual.shortLabel}</span>
                    <span className="hm-tile-meta">{room.roomType}</span>
                  </MotionButton>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function RoomsContent({ data, propertyId, roomTypeId, onRefresh, onSaved, onDeleted }) {
  const { user } = useAuth();
  const notify = useToast();
  const memory = getHostWorkspaceMemory(user?.userId);

  const [view, setView] = useState(memory.rooms.view || 'floors');
  const [search, setSearch] = useState(memory.rooms.search || '');
  const [typeFilter, setTypeFilter] = useState(roomTypeId || memory.rooms.typeFilter || 'ALL');
  const [floor, setFloor] = useState(memory.rooms.floor || 'ALL');
  const [status, setStatus] = useState(memory.rooms.status || 'ALL');
  const [sort, setSort] = useState(memory.rooms.sort || 'ASC');
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [collapsedFloors, setCollapsedFloors] = useState(() => new Set());

  const [editor, setEditor] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef();

  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (roomTypeId) setTypeFilter(roomTypeId);
  }, [roomTypeId]);

  useEffect(() => {
    updateHostWorkspaceMemory(user?.userId, {
      rooms: {
        search,
        typeFilter: roomTypeId ? memory.rooms.typeFilter : typeFilter,
        floor,
        status,
        sort,
        view,
      },
    });
  }, [user?.userId, search, typeFilter, floor, status, sort, view, roomTypeId, memory.rooms.typeFilter]);

  const linkedPropertyId = roomTypeId
    ? data.roomTypes.find(type => String(type.roomTypeId) === String(roomTypeId))?.propertyId
    : null;

  const effectivePropertyId = propertyId || linkedPropertyId || memory.selectedPropertyId;
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
    () => data.roomTypes.filter(type => type.propertyId === property?.propertyId),
    [data.roomTypes, property?.propertyId]
  );

  const rows = useMemo(
    () => data.rooms.filter(room => room.propertyId === property?.propertyId),
    [data.rooms, property?.propertyId]
  );

  // Reset stale type/floor filter if property switched and value no longer exists
  useEffect(() => {
    if (typeFilter !== 'ALL' && !types.some(t => String(t.roomTypeId) === String(typeFilter))) {
      setTypeFilter('ALL');
    }
  }, [types, typeFilter]);

  const floors = useMemo(
    () => [...new Set(rows.map(room => formatFloorHeading(room.floor)))].sort(compareFloorNames),
    [rows]
  );

  useEffect(() => {
    if (floor !== 'ALL' && !floors.includes(floor)) {
      setFloor('ALL');
    }
  }, [floors, floor]);

  const filtered = useMemo(
    () => filterAndSortRooms(rows, { search, typeFilter, floor, status, sort }),
    [rows, search, typeFilter, floor, status, sort]
  );

  const floorGroups = useMemo(() => groupRoomsByFloor(filtered), [filtered]);
  const pagedTable = useMemo(
    () => paginateItems(filtered, page, ROOM_TABLE_PAGE_SIZE),
    [filtered, page]
  );

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, floor, status, sort, property?.propertyId]);

  const detailRoom = useMemo(
    () => (detailId != null ? rows.find(item => item.roomId === detailId) || null : null),
    [rows, detailId]
  );

  if (!property) {
    return (
      <HostManagementShell activePath="/host/rooms">
        <RoomsNoProperty onRefresh={onRefresh} pendingCount={data.pendingRegistrationCount} />
      </HostManagementShell>
    );
  }

  const canManage = property.status === 'ACTIVE';
  const vacant = rows.filter(room => room.status === 'VACANT').length;
  const occupied = rows.filter(room => room.status === 'OCCUPIED').length;
  const unconfirmed = rows.filter(room => !room.confirmedAt).length;

  const activeFilterCount =
    (typeFilter !== 'ALL' ? 1 : 0) +
    (floor !== 'ALL' ? 1 : 0) +
    (status !== 'ALL' ? 1 : 0) +
    (sort !== 'ASC' ? 1 : 0);

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('ALL');
    setFloor('ALL');
    setStatus('ALL');
    setSort('ASC');
  };

  const openCreateRoom = () => {
    const defaultType =
      typeFilter !== 'ALL' && types.some(t => String(t.roomTypeId) === String(typeFilter))
        ? typeFilter
        : types[0]?.roomTypeId || '';
    setEditor({ room: null, defaultTypeId: defaultType });
  };

  const handleSaved = room => {
    const wasCreating = !editor?.room;
    onSaved(room);
    setEditor(null);
    notify?.(
      wasCreating
        ? `Đã thêm phòng ${room.roomNumber} thành công.`
        : `Đã cập nhật phòng ${room.roomNumber} thành công.`,
      'success'
    );
  };

  const handleQuickSaved = (updatedRoom, message) => {
    onSaved(updatedRoom);
    notify?.(message || `Đã cập nhật phòng ${updatedRoom.roomNumber}.`, 'success');
  };

  const quickToggleFromMenu = async (room, nextStatus) => {
    if (!canManage || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setFailure('');
    try {
      const updated = await hostApi.saveRoom(
        room.roomId,
        roomPayload({ ...editRoom(room), status: nextStatus }),
        controller.signal
      );
      if (!controller.signal.aborted) {
        onSaved(updated);
        notify?.(
          `Đã cập nhật phòng ${updated.roomNumber}: ${nextStatus === 'VACANT' ? 'Còn trống' : 'Đang thuê'}.`,
          'success'
        );
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        notify?.(error.message || 'Không thể cập nhật trạng thái phòng.', 'error');
      }
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  const remove = async () => {
    if (request.current || !deleting) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setFailure('');
    try {
      await hostApi.deleteRoom(deleting.roomId, controller.signal);
      if (!controller.signal.aborted) {
        if (detailId === deleting.roomId) setDetailId(null);
        onDeleted(deleting.roomId);
        setDeleting(null);
        notify?.('Đã xóa phòng.', 'success');
      }
    } catch (error) {
      if (!controller.signal.aborted) setFailure(error.message);
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  const toggleFloor = key => {
    setCollapsedFloors(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allCollapsed =
    floorGroups.length > 0 && floorGroups.every(group => collapsedFloors.has(group.key));

  const toggleAllFloors = () => {
    if (allCollapsed) {
      setCollapsedFloors(new Set());
    } else {
      setCollapsedFloors(new Set(floorGroups.map(group => group.key)));
    }
  };

  const toggleColumnSort = column => {
    if (column === 'ROOM') setSort(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    else if (column === 'FLOOR') setSort('FLOOR');
    else if (column === 'PRICE') setSort(prev => (prev === 'PRICE_ASC' ? 'PRICE_DESC' : 'PRICE_ASC'));
    else if (column === 'STATUS') setSort('STATUS');
  };

  const headerActions = (
    <>
      <Link
        className="hm-btn hm-btn-subtle"
        to={`/host/room-types?propertyId=${property.propertyId}`}
      >
        <Layers size={15} />
        <span className="hm-hide-xs">Loại phòng ({types.length})</span>
      </Link>
      <MotionButton
        type="button"
        className="hm-btn hm-btn-primary"
        disabled={!canManage || !types.length}
        title={
          !canManage
            ? 'Nhà trọ cần đang hoạt động để thêm phòng'
            : !types.length
            ? 'Cần tạo ít nhất một loại phòng trước khi thêm phòng lẻ'
            : 'Thêm phòng mới cho nhà trọ'
        }
        onClick={openCreateRoom}
      >
        <Plus size={16} />
        <span>Thêm phòng</span>
      </MotionButton>
    </>
  );

  const summaryMetrics = [
    {
      key: 'ALL',
      label: 'Tổng số phòng',
      value: rows.length,
      icon: DoorOpen,
      active: status === 'ALL',
      onClick: () => setStatus('ALL'),
    },
    {
      key: 'VACANT',
      label: 'Số phòng trống',
      value: vacant,
      tone: 'emerald',
      icon: CheckCircle2,
      active: status === 'VACANT',
      onClick: () => setStatus(prev => (prev === 'VACANT' ? 'ALL' : 'VACANT')),
    },
    {
      key: 'OCCUPIED',
      label: 'Đang thuê',
      value: occupied,
      tone: 'blue',
      icon: Users,
      active: status === 'OCCUPIED',
      onClick: () => setStatus(prev => (prev === 'OCCUPIED' ? 'ALL' : 'OCCUPIED')),
    },
    unconfirmed > 0 && {
      key: 'UNCONFIRMED',
      label: 'Chưa xác nhận',
      value: unconfirmed,
      tone: 'amber',
      icon: Clock3,
      active: status === 'UNCONFIRMED',
      onClick: () => setStatus(prev => (prev === 'UNCONFIRMED' ? 'ALL' : 'UNCONFIRMED')),
    },
  ];

  const renderRowActions = room => {
    const nextStatus = room.status === 'VACANT' ? 'OCCUPIED' : 'VACANT';
    const menuItems = [
      {
        key: 'edit',
        label: 'Chỉnh sửa thông tin',
        icon: Pencil,
        disabled: !canManage || busy,
        onSelect: () => setEditor({ room }),
      },
      canManage && {
        key: 'toggle',
        label: nextStatus === 'VACANT' ? 'Đánh dấu Còn trống' : 'Đánh dấu Đang thuê',
        icon: CheckCircle2,
        disabled: busy,
        onSelect: () => quickToggleFromMenu(room, nextStatus),
      },
      { divider: true },
      {
        key: 'delete',
        label: 'Xóa phòng',
        icon: Trash2,
        tone: 'danger',
        disabled: !canManage || busy || room.status === 'OCCUPIED',
        hint:
          room.status === 'OCCUPIED'
            ? 'Cần chuyển phòng về Còn trống trước khi xóa'
            : undefined,
        onSelect: () => {
          setFailure('');
          setDeleting(room);
        },
      },
    ];

    return (
      <div className="hm-card-action-group">
        <MotionButton
          type="button"
          className="hm-btn hm-btn-tonal hm-btn-sm"
          onClick={() => setDetailId(room.roomId)}
        >
          <Eye size={14} />
          <span>Chi tiết</span>
        </MotionButton>
        <HostActionMenu items={menuItems} label={`Thao tác phòng ${room.roomNumber}`} />
      </div>
    );
  };

  return (
    <HostManagementShell
      activePath="/host/rooms"
      actions={headerActions}
      metrics={summaryMetrics}
      summaryLabel={`Tình trạng phòng tại ${property.name}`}
    >
      <section className="hm-surface" aria-label="Danh sách phòng của nhà trọ">
        <div className="hm-toolbar hm-rooms-toolbar">
          <HostInlinePropertySelect
            properties={data.properties}
            selectedPropertyId={property.propertyId}
          />

          <label className="hm-search-box">
            <Search size={15} aria-hidden="true" />
            <input
              aria-label="Tìm phòng"
              placeholder="Tìm số phòng, loại phòng..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </label>

          <MotionButton
            type="button"
            className={`hm-btn hm-btn-subtle hm-mobile-filter-btn ${mobileFiltersOpen || activeFilterCount ? 'is-active' : ''}`}
            aria-expanded={mobileFiltersOpen}
            onClick={() => setMobileFiltersOpen(prev => !prev)}
          >
            <Filter size={15} />
            <span>Bộ lọc{activeFilterCount ? ` (${activeFilterCount})` : ''}</span>
          </MotionButton>

          <div className={`hm-toolbar-controls hm-rooms-filters ${mobileFiltersOpen ? 'is-open' : ''}`}>
            <select
              className="hm-select"
              aria-label="Lọc theo tầng"
              value={floor}
              onChange={event => setFloor(event.target.value)}
            >
              <option value="ALL">Tất cả tầng ({floors.length})</option>
              {floors.map(item => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              className="hm-select"
              aria-label="Lọc theo loại phòng"
              value={typeFilter}
              onChange={event => setTypeFilter(event.target.value)}
            >
              <option value="ALL">Tất cả loại phòng</option>
              {types.map(type => (
                <option key={type.roomTypeId} value={String(type.roomTypeId)}>
                  {type.roomType}
                </option>
              ))}
            </select>

            <select
              className="hm-select"
              aria-label="Lọc theo trạng thái phòng"
              value={status}
              onChange={event => setStatus(event.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="VACANT">Còn trống ({vacant})</option>
              <option value="OCCUPIED">Đang thuê ({occupied})</option>
              {unconfirmed > 0 && <option value="UNCONFIRMED">Chưa xác nhận ({unconfirmed})</option>}
            </select>

            <select
              className="hm-select"
              aria-label="Sắp xếp phòng"
              value={sort}
              onChange={event => setSort(event.target.value)}
            >
              <option value="ASC">Số phòng tăng dần</option>
              <option value="DESC">Số phòng giảm dần</option>
              <option value="FLOOR">Theo tầng</option>
              <option value="PRICE_ASC">Giá thấp → cao</option>
              <option value="PRICE_DESC">Giá cao → thấp</option>
            </select>

            {(search || activeFilterCount > 0) && (
              <MotionButton
                type="button"
                className="hm-btn hm-btn-ghost hm-btn-sm"
                onClick={resetFilters}
              >
                <RotateCcw size={14} />
                <span>Đặt lại</span>
              </MotionButton>
            )}
          </div>

          <HostSegmentedToggle
            value={view}
            onChange={setView}
            ariaLabel="Chế độ xem danh sách phòng"
            options={[
              { value: 'floors', icon: LayoutGrid, label: 'Theo tầng', title: 'Xem sơ đồ theo tầng' },
              { value: 'table', icon: List, label: 'Danh sách', title: 'Xem bảng dữ liệu' },
            ]}
          />
        </div>

        {!types.length ? (
          <div className="hm-empty-box">
            <Layers size={30} aria-hidden="true" />
            <h3>Nhà trọ chưa có loại phòng</h3>
            <p>
              Hãy tạo loại phòng trước để thiết lập giá thuê, tiện nghi và khởi tạo danh sách phòng
              theo tầng hoặc phòng lẻ.
            </p>
            <Link
              className="hm-btn hm-btn-primary"
              to={`/host/room-types?propertyId=${property.propertyId}`}
            >
              <Plus size={16} />
              <span>Thiết lập loại phòng</span>
            </Link>
          </div>
        ) : !rows.length ? (
          <div className="hm-empty-box">
            <House size={30} aria-hidden="true" />
            <h3>Chưa có phòng thực tế nào</h3>
            <p>
              Bạn có thể thêm phòng trực tiếp tại đây hoặc tạo hàng loạt theo tầng trong phần Quản lý
              loại phòng.
            </p>
            <div className="hm-empty-actions">
              <MotionButton
                type="button"
                className="hm-btn hm-btn-primary"
                disabled={!canManage}
                onClick={openCreateRoom}
              >
                <Plus size={16} />
                <span>Thêm phòng ngay</span>
              </MotionButton>
              <Link
                className="hm-btn hm-btn-subtle"
                to={`/host/room-types?propertyId=${property.propertyId}`}
              >
                <Layers size={15} />
                <span>Quản lý loại phòng</span>
              </Link>
            </div>
          </div>
        ) : !filtered.length ? (
          <div className="hm-empty-box">
            <Search size={28} aria-hidden="true" />
            <h3>Không tìm thấy phòng phù hợp</h3>
            <p>Không có phòng nào khớp với điều kiện lọc hiện tại.</p>
            <MotionButton type="button" className="hm-btn" onClick={resetFilters}>
              Đặt lại bộ lọc
            </MotionButton>
          </div>
        ) : view === 'floors' ? (
          <>
            <div className="hm-floor-subbar">
              <div className="hm-room-legend" aria-label="Chú giải màu trạng thái phòng">
                <span className="hm-legend-item is-vacant">
                  <span className="hm-status-dot" aria-hidden="true" />
                  <span>Còn trống</span>
                </span>
                <span className="hm-legend-item is-occupied">
                  <span className="hm-status-dot" aria-hidden="true" />
                  <span>Đang thuê</span>
                </span>
                {unconfirmed > 0 && (
                  <span className="hm-legend-item">
                    <span className="hm-unconfirmed-dot" aria-hidden="true" />
                    <span>Chưa xác nhận</span>
                  </span>
                )}
              </div>

              <div className="hm-floor-subbar-right">
                <span className="hm-result-summary">
                  Hiển thị <strong>{filtered.length}</strong>/{rows.length} phòng ·{' '}
                  <strong>{floorGroups.length}</strong> tầng
                </span>
                {floorGroups.length > 1 && (
                  <button type="button" className="hm-text-btn" onClick={toggleAllFloors}>
                    {allCollapsed ? 'Mở tất cả tầng' : 'Thu gọn tất cả'}
                  </button>
                )}
              </div>
            </div>

            <div className="hm-floor-list">
              {floorGroups.map(group => (
                <FloorAccordionSection
                  key={group.key}
                  group={group}
                  expanded={!collapsedFloors.has(group.key)}
                  onToggle={toggleFloor}
                  onSelectRoom={room => setDetailId(room.roomId)}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="hm-table-wrap hm-rooms-table-wrap">
              <table className="hm-table hm-sticky-table">
                <thead>
                  <tr>
                    <th scope="col">
                      <button
                        type="button"
                        className="hm-th-sort"
                        onClick={() => toggleColumnSort('ROOM')}
                      >
                        <span>Số phòng</span>
                        <ArrowUpDown size={13} aria-hidden="true" />
                      </button>
                    </th>
                    <th scope="col">
                      <button
                        type="button"
                        className="hm-th-sort"
                        onClick={() => toggleColumnSort('FLOOR')}
                      >
                        <span>Tầng</span>
                        <ArrowUpDown size={13} aria-hidden="true" />
                      </button>
                    </th>
                    <th scope="col">Loại phòng</th>
                    <th scope="col">
                      <button
                        type="button"
                        className="hm-th-sort"
                        onClick={() => toggleColumnSort('PRICE')}
                      >
                        <span>Giá thuê</span>
                        <ArrowUpDown size={13} aria-hidden="true" />
                      </button>
                    </th>
                    <th scope="col">
                      <button
                        type="button"
                        className="hm-th-sort"
                        onClick={() => toggleColumnSort('STATUS')}
                      >
                        <span>Trạng thái</span>
                        <ArrowUpDown size={13} aria-hidden="true" />
                      </button>
                    </th>
                    <th scope="col" className="is-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTable.items.map(room => {
                    const visual = getRoomVisualState(room);
                    return (
                      <tr key={room.roomId}>
                        <td>
                          <button
                            type="button"
                            className="hm-room-code-btn"
                            onClick={() => setDetailId(room.roomId)}
                          >
                            <strong>{room.roomNumber}</strong>
                            {visual.unconfirmed && (
                              <span
                                className="hm-unconfirmed-dot"
                                title="Chưa xác nhận tình trạng"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        </td>
                        <td>{formatFloorHeading(room.floor)}</td>
                        <td>{room.roomType}</td>
                        <td className="hm-tabular">
                          <strong className="hm-price-cell">{money(room.price)}</strong>
                          {room.customPrice != null && (
                            <span className="hm-mini-tag">Giá riêng</span>
                          )}
                        </td>
                        <td>
                          <span className={`hm-room-pill is-${visual.tone}`}>
                            <span className="hm-status-dot" aria-hidden="true" />
                            <span>{visual.fullLabel}</span>
                          </span>
                        </td>
                        <td className="is-right">{renderRowActions(room)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pagedTable.pages > 1 && (
              <footer className="hm-pagination" aria-label="Phân trang danh sách phòng">
                <span className="hm-page-info">
                  Hiển thị {pagedTable.from}–{pagedTable.to} / {pagedTable.total} phòng
                </span>
                <div className="hm-page-controls">
                  <MotionButton
                    type="button"
                    className="hm-btn hm-btn-sm"
                    disabled={pagedTable.page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft size={15} />
                    <span>Trước</span>
                  </MotionButton>
                  <span className="hm-page-counter">
                    {pagedTable.page} / {pagedTable.pages}
                  </span>
                  <MotionButton
                    type="button"
                    className="hm-btn hm-btn-sm"
                    disabled={pagedTable.page >= pagedTable.pages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <span>Sau</span>
                    <ChevronRight size={15} />
                  </MotionButton>
                </div>
              </footer>
            )}
          </>
        )}

        <p className="hm-footnote">
          <Info size={14} aria-hidden="true" />
          <span>
            Nhấn vào ô phòng bất kỳ để xem nhanh chi tiết và đổi trạng thái. Lịch hẹn xem phòng không
            tự động khóa phòng trống.
          </span>
        </p>
      </section>

      <AnimatePresence>
        {editor && (
          <RoomEditorModal
            key={editor.room?.roomId || 'new-room'}
            room={editor.room}
            defaultTypeId={editor.defaultTypeId}
            types={types}
            onClose={() => setEditor(null)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailRoom && (
          <RoomDetailModal
            room={detailRoom}
            canManage={canManage}
            onClose={() => setDetailId(null)}
            onEdit={room => {
              setDetailId(null);
              setEditor({ room });
            }}
            onDelete={room => {
              setFailure('');
              setDeleting(room);
            }}
            onQuickSaved={handleQuickSaved}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleting && (
          <Modal
            title="Xóa phòng thực tế"
            onClose={() => {
              if (!busy) setDeleting(null);
            }}
          >
            <p>
              Bạn chắc chắn muốn xóa phòng <strong>{deleting.roomNumber}</strong>? Thao tác này không
              thể hoàn tác.
            </p>
            {failure && (
              <p className="hr-error" role="alert">
                {failure}
              </p>
            )}
            <div className="hr-modal-footer">
              <MotionButton className="p-button" disabled={busy} onClick={() => setDeleting(null)}>
                Hủy bỏ
              </MotionButton>
              <MotionButton className="p-button hr-danger" disabled={busy} onClick={remove}>
                {busy ? (
                  <>
                    <LoaderCircle size={15} className="spin" />
                    Đang xóa...
                  </>
                ) : (
                  'Xác nhận xóa'
                )}
              </MotionButton>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </HostManagementShell>
  );
}

export default function HostRoomsPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const propertyId = params.get('propertyId');
  const roomTypeId = params.get('roomTypeId');
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, data: null, error: '' });
    hostApi
      .rooms(controller.signal, propertyId, roomTypeId)
      .then(data => {
        if (!controller.signal.aborted) setState({ loading: false, data, error: '' });
      })
      .catch(error => {
        if (!controller.signal.aborted) setState({ loading: false, data: null, error: error.message });
      });
    return () => controller.abort();
  }, [user?.userId, propertyId, roomTypeId, revision]);

  return (
    <div className="host-rooms-page">
      {state.loading ? (
        <HostManagementShell activePath="/host/rooms">
          <HostManagementSkeleton kind="rooms" />
        </HostManagementShell>
      ) : state.error ? (
        <HostManagementShell activePath="/host/rooms">
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
        <RoomsContent
          key={`${user?.userId}-${propertyId || ''}-${roomTypeId || ''}`}
          data={state.data}
          propertyId={propertyId}
          roomTypeId={roomTypeId}
          onRefresh={() => setRevision(value => value + 1)}
          onSaved={record =>
            setState(previous => {
              const exists = previous.data.rooms.some(room => room.roomId === record.roomId);
              const nextRooms = exists
                ? previous.data.rooms.map(room => (room.roomId === record.roomId ? record : room))
                : [record, ...previous.data.rooms];
              return {
                ...previous,
                data: { ...previous.data, rooms: nextRooms },
              };
            })
          }
          onDeleted={id =>
            setState(previous => ({
              ...previous,
              data: {
                ...previous.data,
                rooms: previous.data.rooms.filter(room => room.roomId !== id),
              },
            }))
          }
        />
      )}
    </div>
  );
}
