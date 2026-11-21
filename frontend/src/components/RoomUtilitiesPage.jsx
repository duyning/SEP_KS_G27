import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useShouldReduceMotion } from '@animate-ui/react/utils/motion';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Droplets,
  ExternalLink,
  Filter,
  LoaderCircle,
  RotateCcw,
  Save,
  Search,
  User,
  X,
  Zap,
} from 'lucide-react';
import HostManagementShell from './HostManagementShell.jsx';
import { Modal, useToast } from './PortalUI.jsx';
import { MotionButton } from './motion/MotionUI.jsx';
import { compareFloorNames, formatFloorHeading } from '../services/host-management.js';
import { money } from '../services/room-types.js';
import { leaseDateLabel } from '../services/rooms.js';
import {
  buildUtilityDraft,
  findCarriedHandover,
  formatMeterUsage,
  formatUtilityMonth,
  hasRealUtilityEdit,
  isUtilityRowFinal,
  partitionUtilitySaveBatch,
  roomUtilitiesApi,
  summarizeUtilityStats,
  utilityCurrentMonth,
  utilityPayload,
  utilityRowKey,
  validateUtilityRow,
} from '../services/room-utilities.js';
import '../styles/room-utilities.css';

const PAGE_SIZE = 25;

const amountText = value => (value === null || value === undefined ? '—' : money(value));

function UtilityField({
  label,
  name,
  draft,
  min,
  max,
  suffix,
  placeholder,
  hint,
  type = 'text',
  mode = 'decimal',
  errors,
  onChange,
  onBlurField,
  onEnterKey,
}) {
  const id = useId();
  const errorMessage = errors[name];
  const describedBy = [errorMessage ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;

  return (
    <label className="hu-field">
      <span id={`${id}-label`} className="hu-field-label">{label}</span>
      <span className={`hu-input ${suffix ? 'has-suffix' : ''}`}>
        <input
          name={name}
          type={type}
          inputMode={type === 'text' ? mode : undefined}
          min={min}
          max={max}
          maxLength={type === 'text' ? 14 : undefined}
          value={draft[name] ?? ''}
          placeholder={placeholder}
          data-utility-input="true"
          aria-labelledby={`${id}-label`}
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={describedBy}
          onChange={event =>
            onChange(name, type === 'text' ? event.target.value.replace(',', '.') : event.target.value)
          }
          onBlur={() => onBlurField?.(name)}
          onKeyDown={onEnterKey}
        />
        {suffix && <span className="hu-suffix" aria-hidden="true">{suffix}</span>}
      </span>
      {hint && !errorMessage && <small id={`${id}-hint`} className="hu-field-hint">{hint}</small>}
      {errorMessage && <small id={`${id}-err`} className="hu-field-error" role="alert">{errorMessage}</small>}
    </label>
  );
}

const UtilityRoomCard = memo(function UtilityRoomCard({
  rowKeyId,
  propertyId,
  row,
  draft,
  validation,
  edited,
  justSaved,
  blockedByPrior,
  showAllErrors,
  editable,
  preview,
  carried,
  onFieldChange,
  onEnterKey,
  onNavigateTenancy,
}) {
  const titleId = useId();
  const reduceMotion = useShouldReduceMotion();
  const [touchedFields, setTouchedFields] = useState({});

  useEffect(() => {
    if (!edited) setTouchedFields({});
  }, [edited]);

  const markTouched = useCallback(fieldName => {
    setTouchedFields(prev => (prev[fieldName] ? prev : { ...prev, [fieldName]: true }));
  }, []);

  const visibleErrors = useMemo(() => {
    if (showAllErrors) return validation.errors;
    return Object.fromEntries(
      Object.entries(validation.errors).filter(([key, message]) => {
        if (touchedFields[key]) return true;
        return edited && key.endsWith('End') && message === 'Chỉ số mới thấp hơn chỉ số đầu.';
      })
    );
  }, [showAllErrors, validation.errors, touchedFields, edited]);

  const hasVisibleErrors = Object.keys(visibleErrors).length > 0 || blockedByPrior;
  const isFinalRow = isUtilityRowFinal(row);

  let statusLabel = preview ? 'Xem trước' : 'Chưa ghi';
  let statusTone = 'neutral';
  if (row.issue || hasVisibleErrors) {
    statusLabel = 'Có lỗi cần xử lý';
    statusTone = 'error';
  } else if (edited) {
    statusLabel = 'Đã thay đổi, chưa lưu';
    statusTone = 'warning';
  } else if (isFinalRow) {
    statusLabel = row.handover && row.saved.readOn === row.periodEnd ? 'Đã chốt bàn giao' : 'Đã chốt kỳ';
    statusTone = 'success';
  }

  const electricityAmount = edited
    ? validation.electricityAmount
    : row.saved
      ? BigInt(row.saved.electricityAmount)
      : null;
  const waterAmount = edited
    ? validation.waterAmount
    : row.saved
      ? BigInt(row.saved.waterAmount)
      : null;
  const totalAmount =
    electricityAmount !== null && waterAmount !== null ? electricityAmount + waterAmount : null;

  const effectiveOccupants =
    draft.occupantCount === '' ? draft.suggestedOccupants : draft.occupantCount;

  const handleChange = useCallback(
    (name, value) => onFieldChange(row, name, value),
    [onFieldChange, row]
  );

  const renderInput = (name, label, options = {}) => (
    <UtilityField
      name={name}
      label={label}
      draft={draft}
      errors={visibleErrors}
      onChange={handleChange}
      onBlurField={markTouched}
      onEnterKey={onEnterKey}
      {...options}
    />
  );

  const cardClasses = [
    'hu-card',
    edited ? 'is-dirty' : '',
    hasVisibleErrors || row.issue ? 'is-error' : '',
    justSaved ? 'is-just-saved' : '',
    isFinalRow && !edited ? 'is-saved' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={cardClasses}
      data-row-key={rowKeyId}
      aria-labelledby={titleId}
    >
      {/* KHU VỰC A: THÔNG TIN PHÒNG & ĐỢT THUÊ */}
      <header className="hu-zone-room">
        <div className="hu-room-top">
          <div className="hu-room-id">
            <h3 id={titleId}>Phòng {row.roomNumber}</h3>
            <span className="hu-floor-chip">{formatFloorHeading(row.floor)}</span>
          </div>
          <span className={`hu-status-badge is-${statusTone}`}>
            <span className="hu-status-dot" aria-hidden="true" />
            {statusLabel}
          </span>
        </div>

        <div className="hu-room-meta">
          <div className="hu-tenant-line">
            <User size={14} aria-hidden="true" />
            {row.tenantName ? (
              <strong>{row.tenantName}</strong>
            ) : (
              <span className="hu-muted-italic">Chưa có hồ sơ người thuê</span>
            )}
          </div>

          {row.periodStart && (
            <div className="hu-period-line">
              <Calendar size={13} aria-hidden="true" />
              <span>
                {leaseDateLabel(row.periodStart)} – {leaseDateLabel(row.periodEnd)}
              </span>
            </div>
          )}

          {row.handover && (
            <span className="hu-handover-tag">Kỳ bàn giao trả phòng</span>
          )}

          {(row.previousReadOn || carried) && (
            <small className="hu-anchor-note">
              {carried
                ? `Mốc đầu nối tiếp từ bàn giao ${leaseDateLabel(carried)}`
                : `Mốc đầu từ chỉ số chốt ${leaseDateLabel(row.previousReadOn)}`}
            </small>
          )}

          {blockedByPrior && (
            <small className="hu-field-error" role="alert">
              Cần hoàn thiện chỉ số kỳ bàn giao liền trước của phòng này trước khi lưu.
            </small>
          )}
        </div>
      </header>

      {/* TRƯỜNG HỢP PHÒNG THIẾU HOẶC LỖI HỒ SƠ ĐỢT THUÊ */}
      {row.issue ? (
        <div className="hu-issue-panel" role="alert">
          <div className="hu-issue-copy">
            <AlertTriangle size={18} aria-hidden="true" />
            <div>
              <strong>Chưa thể ghi điện nước cho phòng {row.roomNumber}</strong>
              <p>{row.issue}</p>
            </div>
          </div>
          <button
            type="button"
            className="hm-btn hu-tenancy-link"
            onClick={() => onNavigateTenancy(`/host/rooms?propertyId=${propertyId}&detailRoomId=${row.roomId}`)}
          >
            <span>Bổ sung hồ sơ đợt thuê</span>
            <ExternalLink size={14} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <fieldset disabled={!editable} className="hu-card-body">
          {/* KHU VỰC B: CHỈ SỐ ĐIỆN */}
          <section className="hu-zone-meter hu-zone-electric" aria-label={`Chỉ số điện phòng ${row.roomNumber}`}>
            <div className="hu-zone-head">
              <span className="hu-zone-title is-electric">
                <span className="hu-zone-icon" aria-hidden="true"><Zap size={14} /></span>
                Điện
              </span>
              <span className="hu-usage-pill" title="Số điện tiêu thụ = Chỉ số mới − Chỉ số đầu">
                {validation.electricityUsage !== null
                  ? `${formatMeterUsage(validation.electricityUsage)} kWh`
                  : '— kWh'}
              </span>
            </div>
            <div className="hu-meter-pair">
              {renderInput('electricityStart', 'Chỉ số đầu', { suffix: 'kWh', placeholder: '0' })}
              {renderInput('electricityEnd', 'Chỉ số mới', { suffix: 'kWh', placeholder: 'Nhập số' })}
            </div>
            {renderInput('electricityRate', 'Đơn giá điện', { suffix: 'đ/kWh', mode: 'numeric', placeholder: '0' })}
          </section>

          {/* KHU VỰC C: CHỈ SỐ NƯỚC */}
          <section className="hu-zone-meter hu-zone-water" aria-label={`Chỉ số nước phòng ${row.roomNumber}`}>
            <div className="hu-zone-head">
              <span className="hu-zone-title is-water">
                <span className="hu-zone-icon" aria-hidden="true"><Droplets size={14} /></span>
                Nước
              </span>
              <span className="hu-usage-pill">
                {draft.waterMode === 'METER'
                  ? validation.waterUsage !== null
                    ? `${formatMeterUsage(validation.waterUsage)} m³`
                    : '— m³'
                  : draft.waterMode === 'PER_PERSON'
                    ? `${effectiveOccupants} người`
                    : 'Cố định'}
              </span>
            </div>

            <label className="hu-field">
              <span id={`${titleId}-water-mode`} className="hu-field-label">Cách tính nước</span>
              <select
                aria-labelledby={`${titleId}-water-mode`}
                data-utility-input="true"
                value={draft.waterMode}
                onChange={event => handleChange('waterMode', event.target.value)}
                onKeyDown={onEnterKey}
              >
                <option value="METER">Theo đồng hồ (m³)</option>
                <option value="PER_PERSON">Theo đầu người</option>
                <option value="FIXED">Cố định hàng tháng</option>
              </select>
            </label>

            {draft.waterMode === 'METER' && (
              <div className="hu-meter-pair">
                {renderInput('waterStart', 'Chỉ số nước đầu', { suffix: 'm³', placeholder: '0' })}
                {renderInput('waterEnd', 'Chỉ số nước mới', { suffix: 'm³', placeholder: 'Nhập số' })}
              </div>
            )}

            {draft.waterMode === 'PER_PERSON' &&
              renderInput('occupantCount', 'Số người tính tiền', {
                placeholder: String(draft.suggestedOccupants),
                hint: `Theo hồ sơ đợt thuê kỳ này: ${draft.suggestedOccupants} người`,
                mode: 'numeric',
              })}

            {renderInput(
              'waterRate',
              draft.waterMode === 'FIXED'
                ? 'Số tiền nước cố định'
                : draft.waterMode === 'PER_PERSON'
                  ? 'Đơn giá / người'
                  : 'Đơn giá nước',
              {
                suffix: { METER: 'đ/m³', PER_PERSON: 'đ/người', FIXED: 'đ' }[draft.waterMode],
                mode: 'numeric',
                placeholder: '0',
              }
            )}
          </section>

          {/* KHU VỰC D: KẾT QUẢ TÍNH TIỀN */}
          <section className="hu-zone-summary" aria-label={`Kết quả tính tiền điện nước phòng ${row.roomNumber}`}>
            {renderInput('readOn', 'Ngày ghi chỉ số', {
              type: 'date',
              min: row.periodStart,
              max: row.latestReadOn,
              hint: row.saved && !edited
                ? `Đã chốt theo số đo ngày ${leaseDateLabel(row.saved.readOn)}.`
                : undefined,
            })}

            <dl className="hu-summary-breakdown">
              <div>
                <dt>Tiền điện</dt>
                <dd>{amountText(electricityAmount)}</dd>
              </div>
              <div>
                <dt>Tiền nước</dt>
                <dd>{amountText(waterAmount)}</dd>
              </div>
            </dl>

            <div className={`hu-total-panel ${totalAmount !== null ? 'has-value' : ''}`}>
              <div className="hu-total-row">
                <span>Tổng cộng</span>
                <motion.strong
                  key={totalAmount === null ? 'empty' : totalAmount.toString()}
                  initial={reduceMotion ? false : { scale: 0.96, opacity: 0.7 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.16 }}
                >
                  {amountText(totalAmount)}
                </motion.strong>
              </div>
              <small>Chỉ gồm tiền điện &amp; nước kỳ này</small>
            </div>
          </section>
        </fieldset>
      )}
    </article>
  );
});

export default function RoomUtilitiesPage({ property, properties }) {
  const filtersId = useId();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const month = params.get('month') || utilityCurrentMonth();

  const [ledger, setLedger] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const [retried, setRetried] = useState(0);
  const [edits, setEdits] = useState({});
  const [attempted, setAttempted] = useState(false);
  const [justSavedKeys, setJustSavedKeys] = useState(() => new Set());
  const [searchQuery, setSearchQuery] = useState(params.get('q') || '');
  const [page, setPage] = useState(1);
  const [pendingLeave, setPendingLeave] = useState(null); // { title, message, confirmLabel, onConfirm }

  const floor = params.get('floor') || '';
  const roomFilter = params.get('roomId') || '';
  const needsWork = params.get('pending') === '1';

  const requestRef = useRef(null);
  const errorRef = useRef(null);
  const listRef = useRef(null);
  const savedFlashTimerRef = useRef(null);

  const { propertyId } = property;

  useEffect(() => {
    const controller = new AbortController();
    setLedger(null);
    setError('');
    setNotice('');
    setEdits({});
    setAttempted(false);
    setPage(1);
    roomUtilitiesApi
      .list(propertyId, month, controller.signal)
      .then(data => {
        if (!controller.signal.aborted) setLedger(data);
      })
      .catch(failure => {
        if (!controller.signal.aborted) setError(failure.message || 'Không thể tải danh sách chỉ số điện nước.');
      });
    return () => controller.abort();
  }, [month, propertyId, retried]);

  useEffect(() => () => {
    requestRef.current?.abort();
    clearTimeout(savedFlashTimerRef.current);
  }, []);

  const ledgerRows = ledger?.rows || [];
  const previewMonth = Boolean(ledger && ledger.month > ledger.currentMonth);
  const batch = useMemo(() => partitionUtilitySaveBatch(ledgerRows, edits), [ledgerRows, edits]);
  const stats = useMemo(() => summarizeUtilityStats(ledgerRows, edits), [ledgerRows, edits]);

  const hasEdits = stats.dirty > 0;
  const validDirtyCount = stats.validDirty;
  const invalidDirtyCount = stats.invalidDirty;

  // Warn browser tab close/reload if unsaved changes exist.
  useEffect(() => {
    if (!hasEdits) return undefined;
    const onBeforeUnload = event => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasEdits]);

  const floors = useMemo(
    () => [...new Set(ledgerRows.map(row => formatFloorHeading(row.floor)))].sort(compareFloorNames),
    [ledgerRows]
  );

  const roomOptions = useMemo(() => {
    const scoped = floor
      ? ledgerRows.filter(row => formatFloorHeading(row.floor) === floor)
      : ledgerRows;
    return [...new Map(scoped.map(row => [String(row.roomId), row.roomNumber]))];
  }, [ledgerRows, floor]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ledgerRows.filter(row => {
      if (floor && formatFloorHeading(row.floor) !== floor) return false;
      if (roomFilter && String(row.roomId) !== roomFilter) return false;
      if (needsWork && !row.issue && isUtilityRowFinal(row)) return false;
      if (q) {
        const roomMatch = `p.${row.roomNumber} phòng ${row.roomNumber} ${row.roomNumber}`.toLowerCase().includes(q);
        const tenantMatch = (row.tenantName || '').toLowerCase().includes(q);
        if (!roomMatch && !tenantMatch) return false;
      }
      return true;
    });
  }, [ledgerRows, floor, roomFilter, needsWork, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, safePage]);

  const updateFilterParam = useCallback(
    updates => {
      const next = new URLSearchParams(params);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '' || value === false) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      setPage(1);
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  const guardNavigation = useCallback(
    (actionLabel, onProceed) => {
      if (!hasEdits) {
        onProceed();
        return;
      }
      setPendingLeave({
        title: 'Bạn có thay đổi chưa lưu',
        message: `Hiện có ${stats.dirty} bản ghi điện nước đã chỉnh sửa nhưng chưa lưu. Nếu ${actionLabel}, các thay đổi này sẽ bị hủy.`,
        confirmLabel: 'Bỏ thay đổi & tiếp tục',
        onConfirm: () => {
          setPendingLeave(null);
          setEdits({});
          setAttempted(false);
          onProceed();
        },
      });
    },
    [hasEdits, stats.dirty]
  );

  const handlePropertyChange = nextPropertyId => {
    if (String(nextPropertyId) === String(propertyId)) return;
    guardNavigation('chuyển nhà trọ', () => {
      setSearchQuery('');
      setParams(new URLSearchParams({ propertyId: String(nextPropertyId), utilities: '1', month }));
    });
  };

  const handleMonthChange = nextMonth => {
    if (!nextMonth || nextMonth === month) return;
    guardNavigation('đổi tháng ghi', () => {
      const next = new URLSearchParams({ propertyId: String(propertyId), utilities: '1', month: nextMonth });
      if (floor) next.set('floor', floor);
      if (roomFilter) next.set('roomId', roomFilter);
      setSearchQuery('');
      setParams(next);
    });
  };

  const handleBackToRooms = () => {
    guardNavigation('rời trang Ghi điện nước', () => {
      navigate(`/host/rooms?propertyId=${propertyId}`);
    });
  };

  const handleNavigateTenancy = useCallback(
    href => {
      guardNavigation('mở hồ sơ đợt thuê', () => navigate(href));
    },
    [guardNavigation, navigate]
  );

  const handleDiscardEdits = () => {
    if (!hasEdits || pending) return;
    setPendingLeave({
      title: 'Bỏ toàn bộ thay đổi chưa lưu?',
      message: `Khôi phục ${stats.dirty} mục điện nước về dữ liệu đã lưu gần nhất trên hệ thống.`,
      confirmLabel: 'Bỏ thay đổi',
      onConfirm: () => {
        setPendingLeave(null);
        setEdits({});
        setAttempted(false);
        setError('');
        setNotice('');
      },
    });
  };

  const clearLocalFilters = () => {
    setSearchQuery('');
    updateFilterParam({ floor: '', roomId: '', pending: '', q: '' });
  };

  const handleFieldChange = useCallback((row, key, value) => {
    setError('');
    setNotice('');
    const id = utilityRowKey(row);
    setEdits(previous => ({
      ...previous,
      [id]: { ...(previous[id] || {}), [key]: value },
    }));
  }, []);

  // Fast bulk entry: Enter advances focus to the next editable utility control; Shift+Enter moves backward.
  const handleEnterKey = useCallback(event => {
    if (event.key !== 'Enter') return;
    const container = listRef.current;
    if (!container) return;
    const controls = Array.from(container.querySelectorAll('[data-utility-input="true"]:not(:disabled)'));
    const idx = controls.indexOf(event.currentTarget);
    if (idx < 0) return;
    event.preventDefault();
    const target = controls[idx + (event.shiftKey ? -1 : 1)];
    if (target) {
      target.focus();
      if (target.tagName === 'INPUT' && target.type !== 'date') {
        target.select();
      }
    }
  }, []);

  const focusFirstInvalidCard = () => {
    setAttempted(true);
    const firstInvalid = batch.invalidItems[0];
    if (!firstInvalid) return;
    const isHidden = !filteredRows.some(r => utilityRowKey(r) === firstInvalid.key);
    if (isHidden) {
      clearLocalFilters();
    }
    const targetIdx = (isHidden ? ledgerRows : filteredRows).findIndex(
      r => utilityRowKey(r) === firstInvalid.key
    );
    if (targetIdx >= 0) {
      setPage(Math.floor(targetIdx / PAGE_SIZE) + 1);
    }
    requestAnimationFrame(() => {
      const card = listRef.current?.querySelector(`[data-row-key="${CSS.escape(firstInvalid.key)}"]`);
      const firstInput = card?.querySelector('[aria-invalid="true"], input, select');
      card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstInput?.focus();
    });
  };

  const showFailure = message => {
    setError(message);
    toast?.(message, 'error');
    requestAnimationFrame(() => errorRef.current?.focus());
  };

  async function saveValidBatch() {
    if (requestRef.current || pending || !ledger?.editable) return;
    setAttempted(true);

    if (batch.validItems.length === 0) {
      if (batch.invalidItems.length > 0) {
        focusFirstInvalidCard();
        showFailure(
          `Chưa có bản ghi hợp lệ để lưu. Kiểm tra ${batch.invalidItems.length} phòng đang thiếu hoặc sai chỉ số.`
        );
      }
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    setPending(true);
    setError('');

    const validKeys = new Set(batch.validItems.map(item => item.key));
    const remainingInvalidCount = batch.invalidItems.length;

    try {
      const updated = await roomUtilitiesApi.save(
        {
          propertyId,
          month,
          entries: batch.validItems.map(({ row, draft }) => utilityPayload(row, draft)),
        },
        controller.signal
      );
      if (controller.signal.aborted) return;

      setLedger(updated);
      // Partial bulk save: clear ONLY the saved valid rows, preserve any invalid/incomplete edits untouched!
      setEdits(previous =>
        Object.fromEntries(Object.entries(previous).filter(([key]) => !validKeys.has(key)))
      );
      if (remainingInvalidCount === 0) setAttempted(false);

      setJustSavedKeys(validKeys);
      clearTimeout(savedFlashTimerRef.current);
      savedFlashTimerRef.current = setTimeout(() => setJustSavedKeys(new Set()), 2600);

      const message =
        remainingInvalidCount > 0
          ? `Đã chốt ${validKeys.size} bản ghi. Còn ${remainingInvalidCount} mục chưa hợp lệ được giữ lại để hoàn thiện.`
          : `Đã chốt ${validKeys.size} bản ghi điện nước cho ${formatUtilityMonth(month)}.`;
      setNotice(message);
      toast?.(message, 'success');
    } catch (failure) {
      if (!controller.signal.aborted) {
        showFailure(failure.message || 'Chưa lưu được chỉ số. Toàn bộ dữ liệu đang nhập vẫn được giữ nguyên.');
      }
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }

  const rowContexts = useMemo(() => {
    const blockedKeys = new Set(batch.invalidItems.filter(i => i.blockedByPrior).map(i => i.key));
    return visibleRows.map(row => {
      const key = utilityRowKey(row);
      const { linkedDraft, carriedDate } = findCarriedHandover(row, ledgerRows, edits);
      const draft = buildUtilityDraft(row, edits[key], linkedDraft);
      const edited = hasRealUtilityEdit(row, edits[key], linkedDraft);
      const validation = validateUtilityRow(row, draft);
      return {
        key,
        row,
        draft,
        carried: carriedDate,
        edited,
        validation,
        blockedByPrior: blockedKeys.has(key),
      };
    });
  }, [visibleRows, ledgerRows, edits, batch.invalidItems]);

  const hasActiveLocalFilters = Boolean(floor || roomFilter || needsWork || searchQuery.trim());

  return (
    <HostManagementShell activePath="/host/rooms">
      <section className="hu-page" aria-label="Ghi điện nước hàng loạt theo tháng">
        {/* HEADER */}
        <header className="hu-header-card">
          <div className="hu-header-left">
            <button
              type="button"
              className="hm-btn hu-back-btn"
              onClick={handleBackToRooms}
              title="Quay lại Danh sách phòng"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Danh sách phòng</span>
            </button>
            <div className="hu-title-block">
              <div className="hu-title-emblem" aria-hidden="true">
                <Zap size={16} className="hu-emblem-elec" />
                <Droplets size={16} className="hu-emblem-water" />
              </div>
              <div className="hu-title-copy">
                <div className="hu-title-row">
                  <h2>Ghi điện nước</h2>
                  <span className="hu-month-pill">{formatUtilityMonth(month)}</span>
                </div>
                <p>{property.name}</p>
              </div>
            </div>
          </div>

          <div className="hu-header-actions">
            {hasEdits && (
              <button
                type="button"
                className="hm-btn hu-discard-btn"
                disabled={pending}
                onClick={handleDiscardEdits}
              >
                <RotateCcw size={15} aria-hidden="true" />
                <span>Bỏ thay đổi</span>
              </button>
            )}
            <MotionButton
              type="button"
              className="hm-btn hm-btn-primary hu-save-btn"
              disabled={validDirtyCount === 0 || pending || !ledger?.editable}
              onClick={saveValidBatch}
              title={
                validDirtyCount === 0 && invalidDirtyCount > 0
                  ? `Có ${invalidDirtyCount} bản ghi chưa hợp lệ cần sửa trước khi lưu`
                  : undefined
              }
            >
              {pending ? (
                <LoaderCircle size={16} className="spin" aria-hidden="true" />
              ) : (
                <Save size={16} aria-hidden="true" />
              )}
              <span>
                {pending
                  ? 'Đang lưu chỉ số…'
                  : `Lưu và chốt${validDirtyCount > 0 ? ` (${validDirtyCount})` : ''}`}
              </span>
            </MotionButton>
          </div>
        </header>

        {/* FILTER CARD + COMPACT STATS BAR */}
        <section className="hu-filter-card" aria-label="Bộ lọc và tổng quan ghi điện nước">
          <div className="hu-filters-grid">
            <label className="hu-field">
              <span id={`${filtersId}-property`} className="hu-field-label">Nhà trọ</span>
              <select
                aria-labelledby={`${filtersId}-property`}
                value={propertyId}
                disabled={pending}
                onChange={event => handlePropertyChange(event.target.value)}
              >
                {properties.map(item => (
                  <option key={item.propertyId} value={item.propertyId}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="hu-field">
              <span id={`${filtersId}-month`} className="hu-field-label">Tháng ghi</span>
              <input
                aria-labelledby={`${filtersId}-month`}
                type="month"
                value={month}
                min="1900-01"
                max="9998-12"
                disabled={pending}
                onChange={event => handleMonthChange(event.target.value)}
              />
            </label>

            <label className="hu-field">
              <span id={`${filtersId}-floor`} className="hu-field-label">Tầng / Khu vực</span>
              <select
                aria-labelledby={`${filtersId}-floor`}
                value={floor}
                onChange={event => updateFilterParam({ floor: event.target.value, roomId: '' })}
              >
                <option value="">Tất cả tầng</option>
                {floors.map(value => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="hu-field">
              <span id={`${filtersId}-room`} className="hu-field-label">Phòng</span>
              <select
                aria-labelledby={`${filtersId}-room`}
                value={roomFilter}
                onChange={event => updateFilterParam({ roomId: event.target.value })}
              >
                <option value="">Tất cả phòng</option>
                {roomOptions.map(([id, number]) => (
                  <option key={id} value={id}>
                    Phòng {number}
                  </option>
                ))}
              </select>
            </label>

            <label className="hu-field hu-search-field">
              <span id={`${filtersId}-search`} className="hu-field-label">Tìm nhanh</span>
              <span className="hu-search-wrap">
                <Search size={15} className="hu-search-icon" aria-hidden="true" />
                <input
                  aria-labelledby={`${filtersId}-search`}
                  type="search"
                  placeholder="Mã phòng, tên người thuê…"
                  value={searchQuery}
                  onChange={event => {
                    const val = event.target.value;
                    setSearchQuery(val);
                    setPage(1);
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="hu-search-clear"
                    aria-label="Xóa từ khóa tìm kiếm"
                    onClick={() => {
                      setSearchQuery('');
                      setPage(1);
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </span>
            </label>

            <label className="hu-check-control">
              <input
                type="checkbox"
                checked={needsWork}
                onChange={event => updateFilterParam({ pending: event.target.checked ? '1' : '' })}
              />
              <span>Chỉ hiện mục chưa chốt</span>
            </label>
          </div>

          {/* COMPACT STATS STRIP */}
          {ledger && (
            <div className="hu-stats-strip" aria-label="Thống kê tiến độ ghi điện nước">
              <div className="hu-stat-item">
                <span>{previewMonth ? 'Đợt thuê xem trước' : 'Tổng cần ghi'}</span>
                <strong>{stats.total}</strong>
              </div>
              {!previewMonth && (
                <>
                  <div className="hu-stat-item is-success">
                    <span>Đã chốt</span>
                    <strong>{stats.completed}</strong>
                  </div>
                  <div className="hu-stat-item is-pending">
                    <span>Chưa ghi</span>
                    <strong>{stats.unrecorded}</strong>
                  </div>
                  {stats.issueCount > 0 && (
                    <div className="hu-stat-item">
                      <span>Cần kiểm tra</span>
                      <strong>{stats.issueCount}</strong>
                    </div>
                  )}
                  <div className={`hu-stat-item ${stats.dirty > 0 ? 'is-dirty' : ''}`}>
                    <span>Chưa lưu</span>
                    <strong>
                      {stats.dirty}
                      {stats.invalidDirty > 0 && (
                        <small> ({stats.validDirty} hợp lệ)</small>
                      )}
                    </strong>
                  </div>
                </>
              )}

              {hasActiveLocalFilters && (
                <button type="button" className="hu-clear-filters-btn" onClick={clearLocalFilters}>
                  <Filter size={13} aria-hidden="true" />
                  <span>Xóa bộ lọc</span>
                </button>
              )}
            </div>
          )}
        </section>

        {/* BANNERS & ALERTS */}
        {notice && (
          <div className="hu-banner is-success" role="status">
            <CheckCircle2 size={17} aria-hidden="true" />
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className="hu-banner is-error" ref={errorRef} tabIndex={-1} role="alert">
            <AlertCircle size={17} aria-hidden="true" />
            <span>{error}</span>
            {!ledger && (
              <button type="button" className="hm-btn hu-retry-btn" onClick={() => setRetried(v => v + 1)}>
                Thử lại
              </button>
            )}
          </div>
        )}

        {previewMonth && (
          <div className="hu-banner is-warning" role="status">
            <Calendar size={17} aria-hidden="true" />
            <span><strong>Xem trước tháng tương lai.</strong> Chỉ số đầu kỳ lấy từ lần chốt gần nhất. Tháng này chưa nhận bản ghi mới.</span>
          </div>
        )}

        {ledger && !ledger.editable && !previewMonth && (
          <div className="hu-banner is-warning" role="status">
            <AlertTriangle size={17} aria-hidden="true" />
            <span>Nhà trọ cần ở trạng thái đang hoạt động và đã duyệt để lưu chỉ số điện nước.</span>
          </div>
        )}

        {invalidDirtyCount > 0 && (
          <div className="hu-banner is-warning" role="status">
            <AlertTriangle size={17} aria-hidden="true" />
            <span>
              Có <strong>{invalidDirtyCount}</strong> mục đang chỉnh sửa nhưng chưa đủ hoặc có lỗi chỉ số.
              {validDirtyCount > 0
                ? ` Bạn vẫn có thể lưu ngay ${validDirtyCount} mục hợp lệ.`
                : ' Hoàn thiện các trường lỗi để bật nút lưu.'}
            </span>
            <button type="button" className="hu-inline-link" onClick={focusFirstInvalidCard}>
              Đi tới mục cần sửa
            </button>
          </div>
        )}

        {/* LOADING SKELETON */}
        {!ledger && !error && (
          <div className="hu-skeleton-list" role="status" aria-label="Đang tải chỉ số điện nước">
            <p className="hu-loading-line">
              <LoaderCircle size={16} className="spin" aria-hidden="true" />
              <span>Đang tải danh sách phòng và chỉ số kỳ {formatUtilityMonth(month)}…</span>
            </p>
            {[1, 2, 3].map(idx => (
              <div key={idx} className="hu-skeleton-card hm-skel-card" aria-hidden="true" />
            ))}
          </div>
        )}

        {/* ROOM LIST / EMPTY STATE */}
        {ledger && (
          <>
            {filteredRows.length === 0 ? (
              <div className="hu-empty-card" role="status">
                <div className="hu-empty-icon" aria-hidden="true">
                  <Droplets size={24} />
                </div>
                <h3>
                  {ledgerRows.length
                    ? 'Không tìm thấy phòng phù hợp với bộ lọc'
                    : `Chưa có đợt thuê cần ghi trong ${formatUtilityMonth(month)}`}
                </h3>
                <p>
                  {ledgerRows.length
                    ? 'Thử đổi bộ lọc hoặc bỏ chọn “Chỉ hiện mục chưa chốt”.'
                    : 'Chỉ các phòng có hồ sơ đợt thuê hoạt động trong tháng hoặc đang thuê cần bổ sung hồ sơ mới hiển thị tại đây.'}
                </p>
                {ledgerRows.length > 0 ? (
                  <button type="button" className="hm-btn" onClick={clearLocalFilters}>
                    Hiển thị tất cả phòng ({ledgerRows.length})
                  </button>
                ) : (
                  <button type="button" className="hm-btn" onClick={handleBackToRooms}>
                    Về danh sách phòng
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="hu-keyboard-hint">
                  <span>Mẹo nhập nhanh: dùng <strong>Tab</strong> hoặc <strong>Enter</strong> để chuyển liên tiếp sang ô kế tiếp.</span>
                  {filteredRows.length > PAGE_SIZE && (
                    <span>
                      Hiển thị {(safePage - 1) * PAGE_SIZE + 1}–
                      {Math.min(safePage * PAGE_SIZE, filteredRows.length)} / {filteredRows.length} mục
                    </span>
                  )}
                </div>

                <div className="hu-cards-list" ref={listRef}>
                  {rowContexts.map(ctx => (
                    <UtilityRoomCard
                      key={ctx.key}
                      rowKeyId={ctx.key}
                      propertyId={propertyId}
                      row={ctx.row}
                      draft={ctx.draft}
                      validation={ctx.validation}
                      edited={ctx.edited}
                      justSaved={justSavedKeys.has(ctx.key)}
                      blockedByPrior={ctx.blockedByPrior}
                      showAllErrors={attempted && ctx.edited}
                      editable={ledger.editable && !pending}
                      preview={previewMonth}
                      carried={ctx.carried}
                      onFieldChange={handleFieldChange}
                      onEnterKey={handleEnterKey}
                      onNavigateTenancy={handleNavigateTenancy}
                    />
                  ))}
                </div>

                {/* PAGINATION FOR LARGE PROPERTIES */}
                {totalPages > 1 && (
                  <nav className="hu-pagination" aria-label="Phân trang danh sách phòng ghi điện nước">
                    <span>
                      Trang <strong>{safePage}</strong> / {totalPages} ({filteredRows.length} mục)
                    </span>
                    <div className="hu-pagination-actions">
                      <button
                        type="button"
                        className="hm-btn"
                        disabled={safePage <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                      >
                        <ChevronLeft size={15} aria-hidden="true" />
                        <span>Trang trước</span>
                      </button>
                      <button
                        type="button"
                        className="hm-btn"
                        disabled={safePage >= totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      >
                        <span>Trang sau</span>
                        <ChevronRight size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </nav>
                )}

                {hasEdits && (
                  <div className="hu-sticky-footer" role="region" aria-label="Thanh lưu nhanh thay đổi điện nước">
                    <div className="hu-sticky-info">
                      <strong>{stats.dirty} mục đã thay đổi</strong>
                      <span>
                        {validDirtyCount} hợp lệ sẵn sàng lưu
                        {invalidDirtyCount > 0 ? ` · ${invalidDirtyCount} cần sửa` : ''}
                        {' '}— bao gồm cả các phòng đang ẩn bởi bộ lọc.
                      </span>
                    </div>
                    <div className="hu-sticky-actions">
                      <button type="button" className="hm-btn" disabled={pending} onClick={handleDiscardEdits}>
                        Bỏ thay đổi
                      </button>
                      <MotionButton
                        type="button"
                        className="hm-btn hm-btn-primary"
                        disabled={validDirtyCount === 0 || pending || !ledger?.editable}
                        onClick={saveValidBatch}
                      >
                        {pending ? <LoaderCircle size={15} className="spin" aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
                        <span>{pending ? 'Đang lưu…' : `Lưu và chốt (${validDirtyCount})`}</span>
                      </MotionButton>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* UNSAVED CHANGES / DISCARD CONFIRMATION MODAL */}
        {pendingLeave && (
          <Modal title={pendingLeave.title} onClose={() => setPendingLeave(null)} className="hu-confirm-modal">
            <p className="hu-confirm-copy">{pendingLeave.message}</p>
            <footer className="hu-confirm-footer">
              <MotionButton type="button" className="hm-btn" onClick={() => setPendingLeave(null)}>
                Ở lại trang
              </MotionButton>
              <MotionButton
                type="button"
                className="hm-btn hm-btn-primary"
                onClick={pendingLeave.onConfirm}
              >
                {pendingLeave.confirmLabel}
              </MotionButton>
            </footer>
          </Modal>
        )}
      </section>
    </HostManagementShell>
  );
}
