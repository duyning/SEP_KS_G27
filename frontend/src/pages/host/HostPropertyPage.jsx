import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DoorOpen,
  Eye,
  FileCheck2,
  Grid2X2,
  House,
  ImageOff,
  Layers,
  List,
  LockKeyhole,
  MapPin,
  MessagesSquare,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { AnimatePresence, MotionButton } from '../../components/motion/MotionUI.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { hostApi } from '../../services/host.js';
import { Modal, StateView } from '../../components/PortalUI.jsx';
import { AMENITIES, formatRuleLabel } from '../../services/property-registration.js';
import { parseSupplementFeedback } from '../../services/supplement-request.js';
import {
  PROPERTY_PAGE_SIZE,
  filterPropertyRecords,
  propertyPage,
  propertyRecordKey,
} from '../../services/host-property-list.js';
import {
  computePortfolioSummary,
  computePropertyCardStats,
  getHostWorkspaceMemory,
  updateHostWorkspaceMemory,
} from '../../services/host-management.js';
import { RoomLocationMap } from '../../components/AccommodationMap.jsx';
import HostEmptyState from '../../components/HostEmptyState.jsx';
import HostActionMenu from '../../components/HostActionMenu.jsx';
import HostManagementShell, {
  HostManagementSkeleton,
  HostResults,
  HostSegmentedToggle,
} from '../../components/HostManagementShell.jsx';
import '../../styles/host-property-page.css';
import '../../styles/host-property-detail.css';
import '../../styles/host-management-saas.css';

export function HostPropertyEmpty() {
  return (
    <HostEmptyState
      id="stateNoProperty"
      title="Bạn chưa có nhà trọ nào"
      description="Đăng ký nhà trọ để bắt đầu quản lý thông tin, loại phòng và phòng thực tế. Bạn có thể quản lý nhiều nhà trọ trên cùng tài khoản."
      action={{ to: '/host/property/new', label: 'Đăng ký nhà trọ' }}
    >
      <details>
        <summary>Cần chuẩn bị gì để đăng ký?</summary>
        <ul>
          <li>Tên nhà trọ, địa chỉ, vị trí bản đồ và thông tin liên hệ.</li>
          <li>Ảnh thực tế của nhà trọ.</li>
          <li>Giấy phép kinh doanh, CCCD chủ trọ và chứng nhận an toàn PCCC.</li>
        </ul>
      </details>
    </HostEmptyState>
  );
}

const stateLabels = {
  VISIBLE: 'Đang hiển thị',
  PENDING: 'Hồ sơ đang chờ xét duyệt',
  NEEDS_SUPPLEMENT: 'Hồ sơ cần bổ sung',
  REJECTED: 'Hồ sơ chưa được duyệt',
  INACTIVE: 'Chưa hiển thị',
  APPROVED: 'Đã duyệt · Chưa hiển thị',
};

const date = value =>
  value && !Number.isNaN(new Date(value).getTime())
    ? new Date(value).toLocaleDateString('vi-VN')
    : 'Chưa cập nhật';

const documentLabels = [
  ['OWNERSHIP', 'Giấy phép kinh doanh'],
  ['ID_CARD', 'Căn cước công dân (CCCD / CMND) chủ trọ'],
  ['FIRE_SAFETY', 'Chứng nhận an toàn PCCC'],
];

function resolveEditableRegistration(record) {
  const visible = record.displayStatus === 'VISIBLE';
  const change = record.changeRequest;
  const changePending = change?.status === 'PENDING';
  const changeEditable = change && ['NEEDS_SUPPLEMENT', 'REJECTED'].includes(change.status);
  const editId = changeEditable ? change.registrationId : record.registrationId;
  const canEdit =
    Boolean(editId) &&
    !changePending &&
    (['NEEDS_SUPPLEMENT', 'REJECTED'].includes(record.displayStatus) ||
      visible ||
      record.displayStatus === 'APPROVED');
  const editLabel = changeEditable
    ? change.status === 'NEEDS_SUPPLEMENT'
      ? 'Bổ sung đề nghị thay đổi'
      : 'Sửa đề nghị bị từ chối'
    : record.displayStatus === 'NEEDS_SUPPLEMENT'
    ? 'Bổ sung hồ sơ'
    : record.displayStatus === 'REJECTED'
    ? 'Chỉnh sửa & Gửi lại'
    : 'Đề nghị thay đổi thông tin';
  return { canEdit, editId, editLabel, changePending };
}

function InlineSupplementNote({ note, items, compact = false }) {
  if (items?.length) {
    return (
      <div className="hp-inline-note hp-inline-note-list" role="note">
        <AlertCircle size={15} />
        <div>
          <strong>Cần bổ sung hình ảnh ({items.length} mục):</strong>
          <ul>
            {items.map(item => (
              <li key={item.key}>
                <strong>{item.label}:</strong> {item.note}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  if (!note) return null;
  return (
    <div className={`hp-inline-note ${compact ? 'is-compact' : ''}`} role="note">
      <AlertCircle size={14} />
      <div>
        <strong>Cần bổ sung:</strong> <span>{note}</span>
      </div>
    </div>
  );
}

function PropertyDetail({ property }) {
  const [images, setImages] = useState({});
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const urls = [];
    setImages({});
    for (const photo of property.photos) {
      hostApi
        .propertyPhoto(photo.documentId, controller.signal)
        .then(blob => {
          if (controller.signal.aborted) return;
          const url = URL.createObjectURL(blob);
          urls.push(url);
          setImages(previous => ({ ...previous, [photo.documentId]: url }));
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setImages(previous => ({ ...previous, [photo.documentId]: null }));
          }
        });
    }
    return () => {
      controller.abort();
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [property.photos]);

  const cover = property.photos[0];
  const visible = property.displayStatus === 'VISIBLE';
  const pending = property.displayStatus === 'PENDING';
  const badge = (
    <span className={`hp-status ${property.displayStatus.toLowerCase()}`}>
      {pending ? <Clock3 size={13} /> : visible ? <Check size={13} /> : null}
      {stateLabels[property.displayStatus]}
    </span>
  );
  const filter =
    property.propertyId == null ? '' : `?${new URLSearchParams({ propertyId: property.propertyId })}`;
  const canManage =
    property.propertyId != null && !pending && property.displayStatus !== 'REJECTED';
  const change = property.changeRequest;
  const { canEdit, editId, editLabel, changePending } = resolveEditableRegistration(property);

  const edit = () =>
    canEdit ? (
      <Link className="hp-button primary" to={`/host/property/edit?registrationId=${editId}`}>
        <Pencil size={15} />
        {editLabel}
      </Link>
    ) : (
      <MotionButton
        type="button"
        className="hp-button"
        disabled
        title={
          changePending
            ? 'Đề nghị thay đổi đang chờ xét duyệt'
            : pending
            ? 'Hồ sơ đang chờ xét duyệt, tạm khóa chỉnh sửa'
            : 'Hồ sơ chưa đủ điều kiện chỉnh sửa'
        }
      >
        <LockKeyhole size={15} />
        {changePending ? 'Đề nghị đang chờ duyệt' : 'Tạm khóa chỉnh sửa'}
      </MotionButton>
    );

  const feedback = change ? change.reasonNote : property.reasonNote;
  const reviewStatus = change?.status || property.displayStatus;
  const supplement =
    reviewStatus === 'NEEDS_SUPPLEMENT'
      ? parseSupplementFeedback({
          reasonNote: feedback,
          requestedFields: change ? change.requestedFields : property.requestedFields,
          fieldNotes: change ? change.fieldNotes : property.fieldNotes,
        })
      : { hasInlineNotes: false, requestedKeys: [], notesByKey: {}, photoItems: [], generalNote: '' };
  const { notesByKey, photoItems } = supplement;
  const showReview = Boolean(
    change || feedback || ['PENDING', 'NEEDS_SUPPLEMENT', 'REJECTED'].includes(property.displayStatus)
  );
  const metricRows = [
    [Layers, 'Loại phòng', property.roomTypeCount, 'Giá & tiện nghi', '/host/room-types'],
    [DoorOpen, 'Tổng số phòng', property.totalRooms, 'Phòng thực tế', '/host/rooms'],
    [House, 'Phòng còn trống', property.vacantRooms, 'Tình trạng hiện tại', '/host/rooms'],
    [CalendarDays, 'Yêu cầu xem phòng', property.pendingViewingCount, 'Đang chờ phản hồi', '/host/viewings'],
  ];
  const factRows = [
    ['name', 'Tên nhà trọ', property.name],
    ['propertyType', 'Loại hình', property.propertyType],
    ['address', 'Địa chỉ chi tiết', property.addressDetail || property.address],
    ['commune', 'Xã / Khu vực', property.commune],
    ...(property.nearby || notesByKey.nearby
      ? [['nearby', 'Địa điểm lân cận', property.nearby]]
      : []),
  ];

  const renderImage = (photo, className) =>
    images[photo.documentId] ? (
      <img
        className={className}
        src={images[photo.documentId]}
        alt={`Ảnh nhà trọ ${property.name}`}
        onError={() => setImages(previous => ({ ...previous, [photo.documentId]: null }))}
      />
    ) : (
      <span className="hp-image-placeholder">
        <ImageOff size={28} />
        <span>{images[photo.documentId] === null ? 'Không tải được ảnh' : 'Đang tải ảnh'}</span>
      </span>
    );

  return (
    <article className="hp-detail" data-status={property.displayStatus}>
      <div className="hp-sheet">
        <section className="hp-summary">
          <div className="hp-cover">
            {cover ? (
              <MotionButton
                type="button"
                disabled={!images[cover.documentId]}
                title="Xem ảnh nhà trọ"
                aria-label="Xem ảnh đại diện nhà trọ"
                onClick={() => setPreview(cover)}
              >
                {renderImage(cover)}
              </MotionButton>
            ) : (
              <div className="hp-image-placeholder">
                <House size={40} />
                <span>Chưa có ảnh nhà trọ</span>
              </div>
            )}
            {property.verified && (
              <span className="hp-verified">
                <ShieldCheck size={12} />
                Đã xác minh
              </span>
            )}
          </div>
          <div className="hp-summary-copy">
            <div className="hp-summary-top">
              <div>
                <div className="hp-name-row">
                  <h2>{property.name}</h2>
                  {badge}
                </div>
                <p className="hp-address">
                  <MapPin size={15} />
                  <span>{property.address || 'Chưa cập nhật địa chỉ'}</span>
                </p>
              </div>
              <div className="hp-summary-actions">{edit()}</div>
            </div>
            <dl className={`hp-contact-grid ${notesByKey.contact ? 'is-flagged' : ''}`}>
              {[
                ['Người quản lý', property.managerName],
                ['Điện thoại', property.contactPhone],
                ['Zalo', property.zaloPhone],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    {label === 'Điện thoại' && value ? (
                      <a href={`tel:${value.replace(/[^+0-9]/g, '')}`}>{value}</a>
                    ) : (
                      value || 'Chưa cập nhật'
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            {!property.managerName && property.contactInfo && (
              <p className="hp-contact-fallback">{property.contactInfo}</p>
            )}
            <InlineSupplementNote note={notesByKey.contact} />
          </div>
        </section>

        {showReview && (
          <aside
            className={`hp-review-feedback ${
              reviewStatus === 'REJECTED'
                ? 'is-rejected'
                : reviewStatus === 'NEEDS_SUPPLEMENT'
                ? 'is-supplement'
                : reviewStatus === 'PENDING'
                ? 'is-pending'
                : 'is-reviewed'
            }`}
            aria-label="Phản hồi xét duyệt"
          >
            <span className="hp-feedback-icon">
              <MessagesSquare size={20} />
            </span>
            <div>
              <h3>
                {feedback || supplement.hasInlineNotes
                  ? 'Phản hồi xét duyệt'
                  : change
                  ? 'Đề nghị thay đổi đang được xử lý'
                  : 'Trạng thái xét duyệt'}
              </h3>
              {change && (
                <span className="hp-feedback-meta">
                  Đề nghị #{change.registrationId} ·{' '}
                  {change.status === 'PENDING'
                    ? 'Chờ xét duyệt'
                    : change.status === 'NEEDS_SUPPLEMENT'
                    ? 'Cần bổ sung'
                    : 'Đã từ chối'}
                </span>
              )}
              {supplement.hasInlineNotes ? (
                <>
                  <p className="hp-feedback-message">
                    Staff yêu cầu bổ sung <strong>{supplement.requestedKeys.length} mục</strong>{' '}
                    thông tin / hồ sơ. Ghi chú hướng dẫn đã được gắn trực tiếp tại từng nội dung cần
                    sửa bên dưới.
                  </p>
                  {supplement.generalNote && (
                    <p className="hp-feedback-general">
                      <strong>Ghi chú chung của Staff:</strong> {supplement.generalNote}
                    </p>
                  )}
                </>
              ) : (
                feedback && <p className="hp-feedback-message">{feedback}</p>
              )}
              {change ? (
                <p className="hp-feedback-context">
                  Thông tin đã duyệt của nhà trọ tiếp tục hiển thị trong khi đề nghị thay đổi được
                  xử lý.
                </p>
              ) : pending ? (
                <p className="hp-feedback-context">
                  Hồ sơ đang được kiểm tra. Nhà trọ chưa hiển thị công khai.
                </p>
              ) : reviewStatus === 'NEEDS_SUPPLEMENT' ? (
                <p className="hp-feedback-context">
                  Chọn <strong>{editLabel}</strong> để cập nhật các mục được đánh dấu và gửi lại xét
                  duyệt.
                </p>
              ) : null}
            </div>
          </aside>
        )}

        <section className="hp-overview-metrics" aria-label="Tổng quan nhà trọ">
          {metricRows.map(([Icon, label, value, hint, to]) => {
            const Tag = canManage ? Link : 'div';
            return (
              <Tag
                key={label}
                className="hp-overview-stat"
                {...(canManage ? { to: `${to}${filter}` } : {})}
              >
                <div className="hp-stat-heading">
                  <span>{label}</span>
                  <span className="hp-stat-icon">
                    <Icon size={18} />
                  </span>
                </div>
                <strong>{value == null ? '—' : value}</strong>
                <span className="hp-stat-hint">{value == null ? 'Chưa có dữ liệu' : hint}</span>
              </Tag>
            );
          })}
        </section>

        <section className="hp-information">
          <header className="hp-section-heading">
            <div>
              <h3>Thông tin nhà trọ</h3>
              <p>Chi tiết vị trí, tiện ích chung, quy định và mô tả cơ sở lưu trú của bạn.</p>
            </div>
          </header>
          <dl className="hp-facts">
            {factRows.map(([key, label, value]) => (
              <div
                key={key}
                className={notesByKey[key] ? 'hp-fact-item is-flagged' : 'hp-fact-item'}
              >
                <dt>{label}</dt>
                <dd>{value || 'Chưa cập nhật'}</dd>
                <InlineSupplementNote note={notesByKey[key]} compact />
              </div>
            ))}
          </dl>
          <div className={`hp-tag-section ${notesByKey.amenities ? 'is-flagged' : ''}`}>
            <h4>Tiện ích chung:</h4>
            <div className="hp-tags">
              {property.amenities.map(key => (
                <span key={key}>
                  <Check size={12} />
                  {AMENITIES.find(([id]) => id === key)?.[1] || key}
                </span>
              ))}
              {!property.amenities.length && <p>Chưa cập nhật tiện ích.</p>}
            </div>
            <InlineSupplementNote note={notesByKey.amenities} />
          </div>
          <div className={`hp-tag-section ${notesByKey.rules ? 'is-flagged' : ''}`}>
            <h4>Quy định nhà trọ:</h4>
            <div className="hp-tags">
              {property.selectedRules.map(key => (
                <span key={key}>
                  <Check size={12} />
                  {formatRuleLabel(key)}
                </span>
              ))}
              {!property.selectedRules.length && <p>Chưa cập nhật quy định.</p>}
            </div>
            {property.rules && <p className="hp-rules">{property.rules}</p>}
            <InlineSupplementNote note={notesByKey.rules} />
          </div>
          <div className={`hp-description ${notesByKey.description ? 'is-flagged' : ''}`}>
            <h4>Mô tả chi tiết:</h4>
            <p>{property.description || 'Chưa cập nhật mô tả.'}</p>
            <InlineSupplementNote note={notesByKey.description} />
          </div>
          <div className={`hp-gallery ${photoItems.length ? 'is-flagged' : ''}`}>
            <h4>Hình ảnh nhà trọ ({property.photos.length} ảnh):</h4>
            <InlineSupplementNote items={photoItems} />
            <div className="hp-gallery-items">
              {property.photos.map(photo => (
                <MotionButton
                  type="button"
                  key={photo.documentId}
                  title="Xem ảnh nhà trọ"
                  aria-label={`Xem ảnh ${photo.fileName || photo.documentId}`}
                  onClick={() => setPreview(photo)}
                  disabled={!images[photo.documentId]}
                >
                  {renderImage(photo)}
                </MotionButton>
              ))}
              {!property.photos.length && <p>Chưa có ảnh nhà trọ.</p>}
            </div>
          </div>
        </section>

        <section
          className={`hp-information hp-property-map ${notesByKey.coordinates ? 'is-flagged' : ''}`}
        >
          <header className="hp-section-heading">
            <div>
              <h3>Vị trí nhà trọ</h3>
              <p>Vị trí đã lưu trong hồ sơ nhà trọ của bạn.</p>
            </div>
          </header>
          <InlineSupplementNote note={notesByKey.coordinates} />
          <RoomLocationMap room={{ ...property, propertyName: property.name }} />
        </section>

        <section className="hp-review">
          <header className="hp-section-heading">
            <div>
              <h3>Hồ sơ & Xét duyệt</h3>
              <p>Thông tin kiểm định pháp lý và hồ sơ tài liệu lưu trữ bảo mật nội bộ.</p>
            </div>
            {badge}
          </header>
          <dl className="hp-review-state">
            <div>
              <dt>Trạng thái tin đăng:</dt>
              <dd>
                {visible
                  ? 'Đang hiển thị công khai trên hệ thống tìm kiếm'
                  : stateLabels[property.displayStatus]}
              </dd>
            </div>
            <div>
              <dt>Ngày khởi tạo:</dt>
              <dd>{date(property.createdAt)}</dd>
            </div>
            <div>
              <dt>Cập nhật gần nhất:</dt>
              <dd>{date(property.updatedAt)}</dd>
            </div>
          </dl>
          <h4>Hồ sơ xác minh đã gửi (Bảo mật cho Chủ trọ):</h4>
          <div className="hp-documents">
            {documentLabels.map(([type, label]) => {
              const file = property.documents.find(item => item.type === type);
              const approved = file && ['APPROVED', 'VERIFIED'].includes(file.verificationStatus);
              const flagged = Boolean(notesByKey[type]);
              return (
                <div key={type} className={flagged ? 'is-flagged' : undefined}>
                  <FileCheck2 size={22} />
                  <div className="hp-document-copy">
                    <strong>{label}</strong>
                    <p className={flagged ? 'waiting' : approved ? 'approved' : file ? 'waiting' : ''}>
                      {flagged
                        ? 'Cần bổ sung theo yêu cầu Staff'
                        : approved
                        ? 'Đã xác minh'
                        : file?.verificationStatus === 'REJECTED'
                        ? 'Tài liệu chưa hợp lệ'
                        : file
                        ? 'Đã tiếp nhận · Chờ kiểm tra'
                        : 'Chưa đính kèm'}
                    </p>
                    <InlineSupplementNote note={notesByKey[type]} compact />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="hp-privacy">
            <ShieldCheck size={13} />
            Tài liệu xác minh được lưu trữ riêng tư, phục vụ xét duyệt và không hiển thị công khai
            tới người tìm phòng.
          </p>
        </section>
      </div>

      <AnimatePresence>
        {preview && images[preview.documentId] && (
          <Modal title="Hình ảnh nhà trọ" onClose={() => setPreview(null)}>
            <img
              className="hp-lightbox"
              src={images[preview.documentId]}
              alt={`Ảnh nhà trọ ${property.name}`}
            />
          </Modal>
        )}
      </AnimatePresence>
    </article>
  );
}

function PropertyThumb({ property, compact = false }) {
  const id = property.photos?.[0]?.documentId;
  const [image, setImage] = useState('');

  useEffect(() => {
    setImage('');
    if (!id) return;
    const controller = new AbortController();
    let url;
    hostApi
      .propertyPhoto(id, controller.signal)
      .then(blob => {
        if (!controller.signal.aborted) {
          url = URL.createObjectURL(blob);
          setImage(url);
        }
      })
      .catch(() => {});
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  return (
    <div className={`hm-prop-thumb ${compact ? 'is-row' : ''}`}>
      {image ? (
        <img
          src={image}
          alt={`Ảnh nhà trọ ${property.name}`}
          onError={() => setImage('')}
        />
      ) : (
        <div className="hm-prop-placeholder">
          <House size={compact ? 18 : 24} aria-hidden="true" />
          {!compact && <span>{id ? 'Chưa tải được ảnh' : 'Chưa có ảnh'}</span>}
        </div>
      )}
      {!compact && property.verified && (
        <span className="hm-prop-verified">
          <ShieldCheck size={11} aria-hidden="true" />
          <span>Đã xác minh</span>
        </span>
      )}
    </div>
  );
}

export function HostPropertyContent({ data, selectedId, selectedRegistrationId, onRefresh }) {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const memory = getHostWorkspaceMemory(user?.userId);
  const [viewMode, setViewMode] = useState(memory.propertyView || 'grid');

  // Keep hooks unconditional when switching between the portfolio and a detail URL.
  const search = params.get('search') || '';
  const status = params.get('status') || 'ALL';
  const sort = params.get('sort') || 'NEWEST';
  const portfolio = useMemo(() => computePortfolioSummary(data.records), [data.records]);
  const filtered = useMemo(
    () => filterPropertyRecords(data.records, { search, status, sort }),
    [data.records, search, status, sort]
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [selectedId, selectedRegistrationId]);

  const selected = selectedId
    ? data.records.find(record => record.propertyId != null && String(record.propertyId) === selectedId)
    : selectedRegistrationId
    ? data.records.find(record => String(record.registrationId) === selectedRegistrationId)
    : null;

  useEffect(() => {
    if (selected?.propertyId != null) {
      updateHostWorkspaceMemory(user?.userId, { selectedPropertyId: String(selected.propertyId) });
    }
  }, [selected?.propertyId, user?.userId]);

  const changeView = nextView => {
    setViewMode(nextView);
    updateHostWorkspaceMemory(user?.userId, { propertyView: nextView });
  };

  const change = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === '' || value === 'ALL' || (key === 'sort' && value === 'NEWEST')) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: key === 'search' });
  };

  const reset = () => {
    const next = new URLSearchParams(params);
    for (const key of ['search', 'status', 'sort', 'page']) next.delete(key);
    setParams(next);
  };

  const headerActions = (
    <Link className="hm-btn hm-btn-primary" to="/host/property/new">
      <Plus size={16} aria-hidden="true" />
      <span>Thêm nhà trọ</span>
    </Link>
  );

  if (selectedId || selectedRegistrationId) {
    const back = new URLSearchParams(params);
    back.delete('id');
    back.delete('registrationId');
    return (
      <HostManagementShell activePath="/host/property" actions={headerActions}>
        <div className="hm-detail-subbar">
          <Link className="hm-back-btn" to={`/host/property${back.size ? `?${back}` : ''}`}>
            <ArrowLeft size={15} />
            <span>Quay lại danh sách nhà trọ</span>
          </Link>
          {selected?.propertyId != null && ['VISIBLE', 'APPROVED', 'INACTIVE'].includes(selected.displayStatus) && (
            <div className="hm-detail-quick-links">
              <Link
                className="hm-btn hm-btn-subtle"
                to={`/host/room-types?propertyId=${selected.propertyId}`}
              >
                <Layers size={14} />
                <span>Loại phòng</span>
              </Link>
              <Link
                className="hm-btn hm-btn-subtle"
                to={`/host/rooms?propertyId=${selected.propertyId}`}
              >
                <DoorOpen size={14} />
                <span>Danh sách phòng</span>
              </Link>
            </div>
          )}
        </div>
        {selected ? (
          <PropertyDetail key={propertyRecordKey(selected)} property={selected} />
        ) : (
          <StateView
            kind="error"
            message="Không tìm thấy nhà trọ hoặc hồ sơ này trong danh sách bạn được phép quản lý."
          />
        )}
      </HostManagementShell>
    );
  }

  if (!data.records.length) {
    return (
      <HostManagementShell activePath="/host/property" actions={headerActions}>
        <HostPropertyEmpty onRefresh={onRefresh} />
      </HostManagementShell>
    );
  }

  const current = propertyPage(filtered, params.get('page') || 1);

  const detailLink = record => {
    const next = new URLSearchParams(params);
    next.set(record.propertyId != null ? 'id' : 'registrationId', record.propertyId ?? record.registrationId);
    return `/host/property?${next}`;
  };

  const rememberProperty = record => {
    if (record.propertyId != null) {
      updateHostWorkspaceMemory(user?.userId, { selectedPropertyId: String(record.propertyId) });
    }
  };

  const summaryMetrics = [
    { key: 'props', label: 'Tổng nhà trọ', value: portfolio.totalProperties, icon: Building2 },
    { key: 'types', label: 'Tổng loại phòng', value: portfolio.totalRoomTypes, icon: Layers },
    {
      key: 'rooms',
      label: 'Tổng số phòng',
      value: portfolio.hasAnyRoomData ? portfolio.totalRooms : '—',
      icon: DoorOpen,
    },
    {
      key: 'vacant',
      label: 'Số phòng trống',
      value: portfolio.hasAnyRoomData ? portfolio.vacantRooms : '—',
      tone: 'emerald',
      icon: House,
    },
    {
      key: 'occupied',
      label: 'Đang thuê',
      value: portfolio.hasAnyRoomData ? portfolio.occupiedRooms : '—',
      tone: 'blue',
      icon: Users,
    },
  ];

  const renderRecordActions = record => {
    const stats = computePropertyCardStats(record);
    const { canEdit, editId, editLabel } = resolveEditableRegistration(record);
    const primaryHref = stats.canManageRooms
      ? `/host/rooms?propertyId=${record.propertyId}`
      : stats.needsSupplement && canEdit
      ? `/host/property/edit?registrationId=${editId}`
      : detailLink(record);
    const primaryLabel = stats.canManageRooms
      ? 'Quản lý'
      : stats.needsSupplement && canEdit
      ? 'Bổ sung'
      : 'Xem hồ sơ';

    const menuItems = [
      {
        key: 'detail',
        label: 'Xem chi tiết & hồ sơ',
        icon: Eye,
        to: detailLink(record),
        onSelect: () => rememberProperty(record),
      },
      stats.canManageRooms && {
        key: 'types',
        label: 'Quản lý loại phòng',
        icon: Layers,
        to: `/host/room-types?propertyId=${record.propertyId}`,
        onSelect: () => rememberProperty(record),
      },
      stats.canManageRooms && {
        key: 'rooms',
        label: 'Danh sách phòng',
        icon: DoorOpen,
        to: `/host/rooms?propertyId=${record.propertyId}`,
        onSelect: () => rememberProperty(record),
      },
      canEdit && { divider: true },
      canEdit && {
        key: 'edit',
        label: editLabel,
        icon: Pencil,
        to: `/host/property/edit?registrationId=${editId}`,
      },
    ];

    return (
      <div className="hm-card-action-group">
        <Link
          className={`hm-btn ${stats.canManageRooms ? 'hm-btn-tonal' : 'hm-btn-subtle'} hm-btn-sm`}
          to={primaryHref}
          onClick={() => rememberProperty(record)}
        >
          <span>{primaryLabel}</span>
        </Link>
        <HostActionMenu items={menuItems} label={`Tùy chọn cho ${record.name}`} />
      </div>
    );
  };

  return (
    <HostManagementShell
      activePath="/host/property"
      actions={headerActions}
      metrics={summaryMetrics}
      summaryLabel="Tổng quan danh mục nhà trọ"
    >
      <section className="hm-surface" aria-label="Danh sách nhà trọ của tôi">
        <div className="hm-toolbar hm-property-toolbar">
          <label className="hm-search-box">
            <Search size={15} aria-hidden="true" />
            <input
              aria-label="Tìm nhà trọ"
              placeholder="Tìm tên nhà trọ, địa chỉ, người quản lý..."
              value={search}
              onChange={event => change('search', event.target.value)}
            />
          </label>

          <div className="hm-toolbar-controls">
            <select
              className="hm-select"
              aria-label="Lọc trạng thái nhà trọ"
              value={status}
              onChange={event => change('status', event.target.value)}
            >
              <option value="ALL">Tất cả trạng thái ({data.records.length})</option>
              {Object.entries(stateLabels).map(([key, label]) => {
                const count = data.records.filter(record => record.displayStatus === key).length;
                return count > 0 || status === key ? (
                  <option key={key} value={key}>
                    {label} ({count})
                  </option>
                ) : null;
              })}
            </select>

            <select
              className="hm-select"
              aria-label="Sắp xếp nhà trọ"
              value={sort}
              onChange={event => change('sort', event.target.value)}
            >
              <option value="NEWEST">Mới đăng ký</option>
              <option value="NAME">Tên A–Z</option>
              <option value="ROOMS">Nhiều phòng nhất</option>
            </select>

            {(search || status !== 'ALL' || sort !== 'NEWEST') && (
              <MotionButton type="button" className="hm-btn hm-btn-ghost hm-btn-sm hm-filter-reset" onClick={reset}>
                <RotateCcw size={14} />
                <span>Đặt lại</span>
              </MotionButton>
            )}

            <HostSegmentedToggle
              value={viewMode}
              onChange={changeView}
              ariaLabel="Kiểu hiển thị nhà trọ"
              options={[
                { value: 'grid', icon: Grid2X2, title: 'Dạng lưới', ariaLabel: 'Dạng lưới' },
                { value: 'list', icon: List, title: 'Dạng danh sách', ariaLabel: 'Dạng danh sách' },
              ]}
            />
          </div>
        </div>

        <HostResults revision={`${viewMode}:${search}:${status}:${sort}:${current.page}`}>
        {!current.items.length ? (
          <div className="hm-empty-box">
            <Search size={28} aria-hidden="true" />
            <h3>Không tìm thấy nhà trọ phù hợp</h3>
            <p>Thử điều chỉnh từ khóa tìm kiếm hoặc bộ lọc trạng thái.</p>
            <MotionButton type="button" className="hm-btn" onClick={reset}>
              Đặt lại bộ lọc
            </MotionButton>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="hm-prop-grid">
            {current.items.map(record => {
              const stats = computePropertyCardStats(record);
              return (
                <article
                  key={propertyRecordKey(record)}
                  className="hm-prop-card"
                  data-status={record.displayStatus}
                >
                  <Link
                    to={detailLink(record)}
                    className="hm-prop-cover-link"
                    onClick={() => rememberProperty(record)}
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    <PropertyThumb property={record} />
                    <span className={`hm-badge hm-prop-status tone-${stats.statusMeta.tone}`}>
                      {stats.statusMeta.label}
                    </span>
                  </Link>

                  <div className="hm-prop-body">
                    <div className="hm-prop-head">
                      <h2 className="hm-prop-name">
                        <Link to={detailLink(record)} title={record.name} onClick={() => rememberProperty(record)}>
                          {record.name}
                        </Link>
                      </h2>
                      <p className="hm-prop-address" title={stats.shortAddress}>
                        <MapPin size={13} aria-hidden="true" />
                        <span>{stats.shortAddress}</span>
                      </p>
                    </div>

                    <div className="hm-prop-metrics-line">
                      {stats.hasRoomStats ? (
                        <>
                          <span>
                            <strong>{stats.totalRooms}</strong> phòng
                          </span>
                          <span className="hm-dot-sep" aria-hidden="true">·</span>
                          <span className="is-vacant">
                            <strong>{stats.vacantRooms}</strong> trống
                          </span>
                          <span className="hm-dot-sep" aria-hidden="true">·</span>
                          <span className="is-occupied">
                            <strong>{stats.occupiedRooms}</strong> đang thuê
                          </span>
                        </>
                      ) : (
                        <span className="hm-muted">
                          {stats.needsSupplement
                            ? 'Cần bổ sung hồ sơ theo phản hồi Staff'
                            : record.displayStatus === 'PENDING'
                            ? 'Đang chờ Staff thẩm định hồ sơ'
                            : 'Chưa khởi tạo danh sách phòng'}
                        </span>
                      )}
                    </div>

                    <div className="hm-prop-occupancy">
                      {stats.occupancyRate != null ? (
                        <>
                          <div className="hm-occ-row">
                            <span>Tỷ lệ lấp đầy</span>
                            <strong>{stats.occupancyRate}%</strong>
                          </div>
                          <div className="hm-occ-track" aria-hidden="true">
                            <span style={{ width: `${stats.occupancyRate}%` }} />
                          </div>
                        </>
                      ) : (
                        <div className="hm-occ-row is-empty">
                          <span>Loại phòng: {stats.roomTypeCount}</span>
                          <span>{record.propertyId != null ? `NT-${record.propertyId}` : `HS-${record.registrationId}`}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <footer className="hm-prop-footer">
                    <span className="hm-prop-code">
                      {stats.roomTypeCount > 0 ? `${stats.roomTypeCount} loại phòng` : `Đăng ký ${date(record.createdAt)}`}
                    </span>
                    {renderRecordActions(record)}
                  </footer>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="hm-table-wrap">
            <table className="hm-table">
              <thead>
                <tr>
                  <th scope="col">Nhà trọ</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Quy mô phòng</th>
                  <th scope="col">Lấp đầy</th>
                  <th scope="col" className="is-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {current.items.map(record => {
                  const stats = computePropertyCardStats(record);
                  return (
                    <tr key={propertyRecordKey(record)}>
                      <td>
                        <div className="hm-entity-cell">
                          <PropertyThumb property={record} compact />
                          <div className="hm-entity-copy">
                            <Link
                              to={detailLink(record)}
                              className="hm-entity-title"
                              onClick={() => rememberProperty(record)}
                            >
                              {record.name}
                            </Link>
                            <span className="hm-entity-sub">{stats.shortAddress}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`hm-badge tone-${stats.statusMeta.tone}`}>
                          {stats.statusMeta.label}
                        </span>
                      </td>
                      <td>
                        {stats.hasRoomStats ? (
                          <span className="hm-inline-stats">
                            <strong>{stats.totalRooms}</strong> phòng ·{' '}
                            <span className="is-emerald">{stats.vacantRooms} trống</span> ·{' '}
                            <span>{stats.occupiedRooms} thuê</span>
                          </span>
                        ) : (
                          <span className="hm-muted">Chưa có phòng</span>
                        )}
                      </td>
                      <td>
                        {stats.occupancyRate != null ? (
                          <div className="hm-table-occ">
                            <strong className="hm-tabular">{stats.occupancyRate}%</strong>
                            <div className="hm-occ-track is-sm" aria-hidden="true">
                              <span style={{ width: `${stats.occupancyRate}%` }} />
                            </div>
                          </div>
                        ) : (
                          <span className="hm-muted">—</span>
                        )}
                      </td>
                      <td className="is-right">{renderRecordActions(record)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        </HostResults>

        {filtered.length > PROPERTY_PAGE_SIZE && (
          <footer className="hm-pagination" aria-label="Phân trang nhà trọ">
            <span className="hm-page-info">
              Hiển thị {(current.page - 1) * PROPERTY_PAGE_SIZE + 1}–
              {Math.min(current.page * PROPERTY_PAGE_SIZE, filtered.length)} / {filtered.length} nhà trọ
            </span>
            <div className="hm-page-controls">
              <MotionButton
                type="button"
                className="hm-btn hm-btn-sm"
                disabled={current.page <= 1}
                onClick={() => change('page', current.page - 1)}
              >
                <ChevronLeft size={15} />
                <span>Trước</span>
              </MotionButton>
              <span className="hm-page-counter">
                {current.page} / {current.pages}
              </span>
              <MotionButton
                type="button"
                className="hm-btn hm-btn-sm"
                disabled={current.page >= current.pages}
                onClick={() => change('page', current.page + 1)}
              >
                <span>Sau</span>
                <ChevronRight size={15} />
              </MotionButton>
            </div>
          </footer>
        )}
      </section>
    </HostManagementShell>
  );
}

export default function HostPropertyPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [revision, setRevision] = useState(0);
  const selectedId = params.get('id');
  const selectedRegistrationId = params.get('registrationId');

  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, data: null, error: '' });
    hostApi
      .property(controller.signal, selectedId)
      .then(data => {
        if (!controller.signal.aborted) setState({ loading: false, data, error: '' });
      })
      .catch(error => {
        if (!controller.signal.aborted) setState({ loading: false, data: null, error: error.message });
      });
    return () => controller.abort();
  }, [user?.userId, revision, selectedId]);

  return (
    <div className="host-property-page">
      {state.loading ? (
        <HostManagementShell activePath="/host/property">
          <HostManagementSkeleton kind="property" />
        </HostManagementShell>
      ) : state.error ? (
        <HostManagementShell activePath="/host/property">
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
        <HostPropertyContent
          data={state.data}
          selectedId={selectedId}
          selectedRegistrationId={selectedRegistrationId}
          onRefresh={() => setRevision(value => value + 1)}
        />
      )}
    </div>
  );
}
