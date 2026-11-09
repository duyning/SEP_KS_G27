import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  DoorOpen,
  ImageOff,
  Images,
  Maximize2,
  Minimize2,
  Pencil,
  Ruler,
  Users,
  Wallet,
} from 'lucide-react';
import HostDrawer from './HostDrawer.jsx';
import { MotionButton } from './motion/MotionUI.jsx';
import { StateView } from './PortalUI.jsx';
import RoomTypePhoto from './RoomTypePhoto.jsx';
import { hostApi } from '../services/host.js';
import { ROOM_AMENITIES, money } from '../services/room-types.js';
import { formatFloorHeading, getRoomVisualState } from '../services/host-management.js';

export default function RoomTypeDetailModal({ id, initialType = null, onClose, onEdit }) {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [revision, setRevision] = useState(0);
  const [zoom, setZoom] = useState(null);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, data: null, error: '' });
    setZoom(null);
    setActiveImage(0);
    hostApi
      .roomTypeDetail(id, controller.signal)
      .then(data => {
        if (!controller.signal.aborted) setState({ loading: false, data, error: '' });
      })
      .catch(error => {
        if (!controller.signal.aborted) setState({ loading: false, data: null, error: error.message });
      });
    return () => controller.abort();
  }, [id, revision]);

  const type = state.data || initialType;
  const fullType = state.data;
  const images = type?.images || [];
  const rooms = fullType?.rooms || [];
  const selectedImage = images[activeImage] || images[0];

  const availabilityBadge = type ? (
    (type.totalRooms ?? 0) === 0 ? (
      <span className="hm-badge tone-neutral">Chưa tạo phòng</span>
    ) : (type.vacantRooms ?? 0) > 0 ? (
      <span className="hm-badge tone-active">{type.vacantRooms}/{type.totalRooms} phòng trống</span>
    ) : (
      <span className="hm-badge tone-info">Đã lấp đầy ({type.totalRooms} phòng)</span>
    )
  ) : null;

  const stats = type
    ? [
        [Wallet, 'Giá thuê / tháng', money(type.price)],
        [Ruler, 'Diện tích', type.areaSqm == null ? 'Chưa cập nhật' : `${type.areaSqm} m²`],
        [Users, 'Sức chứa', type.capacity == null ? 'Chưa cập nhật' : `Tối đa ${type.capacity} người`],
        [
          DoorOpen,
          'Tình trạng phòng',
          type.vacantRooms == null || type.totalRooms == null
            ? 'Chưa có dữ liệu'
            : `${type.vacantRooms} trống / ${type.totalRooms} phòng`,
        ],
      ]
    : [];

  return (
    <HostDrawer
      size="lg"
      kicker="Chi tiết loại phòng"
      title={type?.roomType || 'Chi tiết loại phòng'}
      badge={availabilityBadge}
      subtitle={
        type
          ? `${money(type.price)} / tháng · ${type.areaSqm ?? '—'} m² · Tối đa ${type.capacity ?? '—'} người`
          : undefined
      }
      onClose={onClose}
      footer={
        <div className="hm-drawer-footer-bar">
          <div className="hm-drawer-footer-left">
            <MotionButton type="button" className="hm-btn" onClick={onClose}>
              Đóng
            </MotionButton>
            {type?.propertyId != null && (
              <Link
                className="hm-btn hm-btn-subtle"
                to={`/host/rooms?propertyId=${type.propertyId}&roomTypeId=${type.roomTypeId}`}
                onClick={onClose}
              >
                <DoorOpen size={15} />
                <span>Quản lý phòng</span>
              </Link>
            )}
          </div>
          {fullType && !state.loading && !state.error && (
            <MotionButton type="button" className="hm-btn hm-btn-primary" onClick={() => onEdit(fullType)}>
              <Pencil size={15} />
              <span>Chỉnh sửa loại phòng</span>
            </MotionButton>
          )}
        </div>
      }
    >
      {state.error ? (
        <StateView kind="error" message={state.error}>
          <MotionButton className="hm-btn hm-btn-primary" onClick={() => setRevision(v => v + 1)}>
            Thử lại
          </MotionButton>
        </StateView>
      ) : !type && state.loading ? (
        <div className="hm-drawer-loading" role="status">
          <div className="hm-skel-grid is-drawer">
            <div className="hm-skel-card is-compact" />
            <div className="hm-skel-card is-compact" />
          </div>
        </div>
      ) : (
        <div className="hm-drawer-sections">
          <dl className="hm-drawer-stat-grid">
            {stats.map(([Icon, label, value]) => (
              <div key={label} className="hm-drawer-stat">
                <dt>
                  <Icon size={14} aria-hidden="true" />
                  <span>{label}</span>
                </dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          <section className="hm-drawer-section" aria-label="Hình ảnh loại phòng">
            <header className="hm-drawer-section-head">
              <h3>
                <Images size={15} aria-hidden="true" />
                <span>Hình ảnh loại phòng</span>
              </h3>
              <span className="hm-section-meta">{images.length} ảnh</span>
            </header>

            {selectedImage ? (
              <div className="hm-rt-gallery">
                <MotionButton
                  type="button"
                  className={`hm-rt-main-photo ${zoom === selectedImage.imageId ? 'is-expanded' : ''}`}
                  aria-pressed={zoom === selectedImage.imageId}
                  aria-label={`${zoom === selectedImage.imageId ? 'Thu nhỏ' : 'Phóng to'} ảnh ${selectedImage.fileName || activeImage + 1}`}
                  onClick={() => setZoom(zoom === selectedImage.imageId ? null : selectedImage.imageId)}
                >
                  <RoomTypePhoto typeId={id} image={selectedImage} className="hm-rt-photo-img" />
                  <span className="hm-rt-photo-zoom">
                    {zoom === selectedImage.imageId ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                  </span>
                  <span className="hm-rt-photo-count">
                    {activeImage + 1} / {images.length}
                  </span>
                </MotionButton>

                {images.length > 1 && (
                  <div className="hm-rt-thumbs" aria-label="Chọn ảnh loại phòng">
                    {images.map((image, index) => (
                      <MotionButton
                        key={image.imageId}
                        type="button"
                        className={`hm-rt-thumb-btn ${activeImage === index ? 'is-active' : ''}`}
                        aria-label={`Xem ảnh ${index + 1}: ${image.fileName || 'Ảnh loại phòng'}`}
                        aria-pressed={activeImage === index}
                        onClick={() => {
                          setActiveImage(index);
                          setZoom(null);
                        }}
                      >
                        <RoomTypePhoto typeId={id} image={image} className="hm-rt-thumb-img" />
                      </MotionButton>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="hm-empty-inline">
                <ImageOff size={20} aria-hidden="true" />
                <span>Chưa có hình ảnh cho loại phòng này.</span>
              </div>
            )}
          </section>

          <section className="hm-drawer-section">
            <header className="hm-drawer-section-head">
              <h3>Tiền cọc & Chi phí dịch vụ</h3>
            </header>
            <dl className="hm-kv-list">
              <div className="hm-kv-row is-highlight">
                <dt>Tiền đặt cọc</dt>
                <dd>{money(type.deposit)}</dd>
              </div>
              {[
                ['Tiền điện', fullType?.electricityPrice, 'kWh'],
                ['Tiền nước', fullType?.waterPrice, 'm³'],
                ['Internet / Wifi', fullType?.internetPrice, 'phòng'],
                ['Dịch vụ chung', fullType?.servicePrice, 'người'],
              ].map(([label, value, unit]) => (
                <div key={label} className="hm-kv-row">
                  <dt>{label}</dt>
                  <dd>
                    {state.loading && !fullType ? (
                      <span className="hm-muted">Đang tải...</span>
                    ) : value == null ? (
                      <span className="hm-muted">Chưa cập nhật</span>
                    ) : (
                      <>
                        {money(value)} <small>/ {unit}</small>
                      </>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="hm-drawer-section">
            <header className="hm-drawer-section-head">
              <h3>Tiện nghi trong phòng</h3>
              <span className="hm-section-meta">{(type.amenities || []).length} tiện nghi</span>
            </header>
            {type.amenities?.length ? (
              <ul className="hm-chip-list">
                {type.amenities.map(key => (
                  <li key={key} className="hm-chip">
                    <Check size={13} aria-hidden="true" />
                    <span>{ROOM_AMENITIES.find(([val]) => val === key)?.[1] || key}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hm-muted">Chưa cập nhật tiện nghi.</p>
            )}
          </section>

          <section className="hm-drawer-section">
            <header className="hm-drawer-section-head">
              <h3>Mô tả loại phòng</h3>
            </header>
            <p className="hm-prose-text">
              {state.loading && !fullType ? 'Đang tải mô tả...' : fullType?.description || 'Chưa có mô tả chi tiết.'}
            </p>
          </section>

          <section className="hm-drawer-section">
            <header className="hm-drawer-section-head">
              <h3>Danh sách phòng thuộc loại này</h3>
              <span className="hm-section-meta">
                {state.loading && !fullType ? 'Đang tải...' : `${rooms.length} phòng`}
              </span>
            </header>
            {state.loading && !fullType ? (
              <p className="hm-muted">Đang tải danh sách phòng liên kết...</p>
            ) : rooms.length ? (
              <div className="hm-mini-table-wrap">
                <table className="hm-mini-table">
                  <thead>
                    <tr>
                      <th scope="col">Số phòng</th>
                      <th scope="col">Tầng</th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col">Giá thuê</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map(room => {
                      const visual = getRoomVisualState(room);
                      return (
                        <tr key={room.roomId}>
                          <th scope="row">{room.roomNumber}</th>
                          <td>{formatFloorHeading(room.floor)}</td>
                          <td>
                            <span className={`hm-room-pill is-${visual.tone}`}>
                              <span className="hm-status-dot" aria-hidden="true" />
                              {visual.fullLabel}
                            </span>
                          </td>
                          <td className="hm-tabular">{money(room.price)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="hm-muted">Chưa có phòng thực tế nào thuộc loại phòng này.</p>
            )}
          </section>
        </div>
      )}
    </HostDrawer>
  );
}
