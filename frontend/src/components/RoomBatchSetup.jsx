import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimate, useIsPresent } from 'motion/react';
import { Highlight, HighlightItem } from '@animate-ui/react/primitives/effects/highlight';
import { SlidingNumber } from '@animate-ui/react/primitives/texts/sliding-number';
import {
  blur,
  shift,
  spring,
  transition,
  useShouldReduceMotion,
  useTempoTransition,
} from '@animate-ui/react/utils/motion';
import {
  AlertCircle,
  Building2,
  Check,
  ChevronDown,
  ChevronsUpDown,
  DoorOpen,
  Hash,
  Layers,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { MotionButton } from './motion/MotionUI.jsx';
import {
  blankRoomGroup,
  formatRoomSequence,
  MAX_BATCH_ROOMS,
  MAX_FLOOR_GROUPS,
  parseFloorNumber,
  validateOddRoomCandidate,
} from '../services/room-batch.js';
import { money } from '../services/room-types.js';

export function useShakeEffect() {
  const [scope, animate] = useAnimate();
  const reduce = useShouldReduceMotion();
  const timing = useTempoTransition(transition.shake);

  const triggerShake = useCallback(() => {
    if (reduce || !scope.current) return;
    const distance = shift.shake;
    animate(
      scope.current,
      { x: [0, -distance, distance, -0.66 * distance, 0.66 * distance, -0.33 * distance, 0.33 * distance, 0] },
      timing,
    );
  }, [animate, reduce, scope, timing]);

  return [scope, triggerShake];
}

function RollingStatBadge({ roomsCount, floorsCount }) {
  const [scope, animate] = useAnimate();
  const reduce = useShouldReduceMotion();
  const bump = useTempoTransition(spring.bounce);
  const previous = useRef(roomsCount);

  useEffect(() => {
    const grew = roomsCount > previous.current;
    previous.current = roomsCount;
    if (grew && !reduce && scope.current) {
      animate(scope.current, { scale: [1.08, 1] }, bump);
    }
  }, [animate, bump, reduce, roomsCount]);

  return (
    <span
      ref={scope}
      className="rtc-s2-stat-pill"
      aria-label={`${roomsCount} phòng trên ${floorsCount} tầng`}
    >
      <strong><SlidingNumber number={roomsCount} initiallyStable /></strong>
      <span>phòng</span>
      <i aria-hidden="true">·</i>
      <strong><SlidingNumber number={floorsCount} initiallyStable /></strong>
      <span>tầng</span>
    </span>
  );
}

function leaveListItem(element, fallbackFocusRef) {
  if (!element) return;
  const neighbor = element.nextElementSibling ?? element.previousElementSibling;
  if (element.contains(document.activeElement)) {
    const target = neighbor?.querySelector('button:not([disabled]), input:not([disabled])') ?? fallbackFocusRef?.current;
    target?.focus();
  }
  element.inert = true;
}

function PresencePane({ children, ...props }) {
  const present = useIsPresent();
  return (
    <motion.div {...props} inert={!present || undefined}>
      {children}
    </motion.div>
  );
}

export default function RoomBatchSetup({
  data,
  groups,
  setGroups,
  oddRooms,
  setOddRooms,
  oddDraft,
  setOddDraft,
  mode,
  setMode,
  expandedFloors,
  setExpandedFloors,
  reconciled,
  existingRoomNumbers,
  showValidation,
  busy,
  onEdit,
  onRemoveRoom,
  onRemoveFloor,
  onRestoreGroupExcluded,
  onClearAll,
}) {
  const reduce = useShouldReduceMotion();
  const moveSpring = useTempoTransition(spring.reflow);
  const selectSpring = useTempoTransition(spring.selection);
  const fadeTiming = useTempoTransition(transition.fade);
  const swapTiming = useTempoTransition(transition.swap);
  const popOutTiming = useTempoTransition(transition.popOut);
  const disclosureTiming = useTempoTransition(transition.disclosure);

  const [touchedGroups, setTouchedGroups] = useState({});
  const [oddSubmitted, setOddSubmitted] = useState(false);
  const [oddFloorTouched, setOddFloorTouched] = useState(false);
  const [oddAddedHint, setOddAddedHint] = useState('');
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmFloorKey, setConfirmFloorKey] = useState(null);

  const addGroupBtnRef = useRef(null);
  const oddRoomInputRef = useRef(null);
  const oddAddedTimerRef = useRef(null);
  const [oddFormScope, shakeOddForm] = useShakeEffect();

  useEffect(() => () => clearTimeout(oddAddedTimerRef.current), []);

  const preventEnterSubmit = event => {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  };

  const updateGroupField = (groupId, field, value) => {
    setGroups(prev => prev.map(group => (group.id === groupId ? { ...group, [field]: value } : group)));
  };

  const markGroupTouched = (groupId, field) => {
    setTouchedGroups(prev => ({
      ...prev,
      [groupId]: { ...(prev[groupId] || {}), [field]: true },
    }));
  };

  const handleStartBlur = group => {
    markGroupTouched(group.id, 'start');
    const formatted = formatRoomSequence(group.start);
    if (formatted !== group.start) {
      updateGroupField(group.id, 'start', formatted);
    }
  };

  const handleAddGroup = () => {
    if (groups.length >= MAX_FLOOR_GROUPS) return;
    setGroups(prev => [...prev, blankRoomGroup()]);
  };

  const handleRemoveGroup = (group, event) => {
    if (groups.length <= 1) {
      setGroups([blankRoomGroup({ id: group.id })]);
      setTouchedGroups({});
      return;
    }
    const card = event.currentTarget.closest('[data-group-card]');
    leaveListItem(card, addGroupBtnRef);
    setGroups(prev => prev.filter(item => item.id !== group.id));
  };

  const parsedOddFloor = parseFloorNumber(oddDraft.floor);
  const liveOddCheck = validateOddRoomCandidate(oddDraft, {
    currentRows: reconciled.rows,
    existingRoomNumbers,
  });

  const oddFloorError = (oddSubmitted || (oddFloorTouched && oddDraft.floor.trim() !== '') || (!parsedOddFloor.empty && !parsedOddFloor.valid))
    ? liveOddCheck.errors.floor
    : '';
  const oddRoomError = (oddSubmitted || oddDraft.roomNumber.trim() !== '')
    ? liveOddCheck.errors.roomNumber
    : '';

  const handleAddOddRoom = () => {
    setOddSubmitted(true);
    const check = validateOddRoomCandidate(oddDraft, {
      currentRows: reconciled.rows,
      existingRoomNumbers,
    });
    if (!check.valid || !check.normalizedRoom) {
      shakeOddForm();
      return;
    }
    const created = {
      id: `odd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      roomNumber: check.normalizedRoom.roomNumber,
      floor: check.normalizedRoom.floor,
    };
    setOddRooms(prev => [...prev, created]);
    setOddDraft(prev => ({ floor: check.normalizedRoom.floorInput, roomNumber: '' }));
    setOddSubmitted(false);
    setOddAddedHint(`Đã thêm phòng ${created.roomNumber} (${created.floor})`);
    clearTimeout(oddAddedTimerRef.current);
    oddAddedTimerRef.current = setTimeout(() => setOddAddedHint(''), 2400);
    requestAnimationFrame(() => oddRoomInputRef.current?.focus());
  };

  const handleOddKeyDown = event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddOddRoom();
    }
  };

  const handleRemoveOddChip = (oddItem, event) => {
    const chip = event.currentTarget.closest('[data-odd-chip]');
    leaveListItem(chip, oddRoomInputRef);
    onRemoveRoom(oddItem);
  };

  const toggleFloorAccordion = floorKey => {
    setExpandedFloors(prev => {
      const next = new Set(prev);
      if (next.has(floorKey)) next.delete(floorKey);
      else next.add(floorKey);
      return next;
    });
  };

  const allFloorsExpanded = reconciled.floorBuckets.length > 0 &&
    reconciled.floorBuckets.every(bucket => expandedFloors.has(bucket.floorKey));

  const toggleExpandAll = () => {
    if (allFloorsExpanded) {
      setExpandedFloors(new Set());
    } else {
      setExpandedFloors(new Set(reconciled.floorBuckets.map(bucket => bucket.floorKey)));
    }
  };

  const oddFloorsDistinctCount = new Set(oddRooms.map(item => item.floor)).size;
  const effectiveDeposit = data.deposit === '' ? data.price : data.deposit;

  const disclosureCollapsed = {
    height: reduce ? 'auto' : 0,
    opacity: 0,
    filter: blur.disclosure,
  };
  const disclosureExpanded = {
    height: 'auto',
    opacity: 1,
    filter: 'blur(0px)',
    transitionEnd: { filter: 'none' },
  };

  return (
    <div className="rtc-s2-workspace">
      {/* Khu vực A — Thông tin loại phòng */}
      <section className="rtc-s2-summary" aria-label="Thông tin loại phòng đang thiết lập">
        <div className="rtc-s2-summary-main">
          <span className="rtc-s2-summary-icon" aria-hidden="true">
            <Building2 size={18} />
          </span>
          <div className="rtc-s2-summary-body">
            <div className="rtc-s2-summary-title-row">
              <strong>{data.roomType}</strong>
              {data.amenities?.length > 0 && (
                <span className="rtc-s2-amenity-pill">{data.amenities.length} tiện nghi</span>
              )}
            </div>
            <div className="rtc-s2-summary-metrics">
              <span className="is-price">{money(data.price)}/tháng</span>
              <i aria-hidden="true">·</i>
              <span>{data.areaSqm} m²</span>
              <i aria-hidden="true">·</i>
              <span>Tối đa {data.capacity} người</span>
              <i aria-hidden="true">·</i>
              <span>Cọc {money(effectiveDeposit)}</span>
            </div>
          </div>
        </div>
        <MotionButton
          type="button"
          className="p-button rtc-s2-edit-btn"
          disabled={busy}
          onClick={onEdit}
        >
          <Pencil size={13} />
          Chỉnh sửa
        </MotionButton>
      </section>

      {/* Khu vực B — Thiết lập phòng */}
      <section className="rtc-s2-card" aria-label="Thiết lập phòng">
        <div className="rtc-s2-card-head">
          <div>
            <h3>Thiết lập phòng</h3>
            <p>Tạo dãy phòng tự động theo tầng hoặc bổ sung các phòng lẻ không liên tiếp.</p>
          </div>

          <div className="rtc-mode-tabs" role="group" aria-label="Chế độ thiết lập phòng">
            <Highlight
              controlledItems
              value={mode}
              onValueChange={nextMode => { if (nextMode && !busy) setMode(nextMode); }}
              transition={selectSpring}
              className="rtc-mode-highlight"
            >
              <HighlightItem value="FLOOR">
                <button
                  type="button"
                  className={`rtc-mode-tab ${mode === 'FLOOR' ? 'is-active' : ''}`}
                  aria-pressed={mode === 'FLOOR'}
                  disabled={busy}
                  onClick={() => setMode('FLOOR')}
                >
                  <Layers size={14} />
                  <span>Theo tầng</span>
                  {reconciled.activeFloorGroupCount > 0 && (
                    <em className="rtc-mode-count">{reconciled.activeFloorGroupCount}</em>
                  )}
                </button>
              </HighlightItem>
              <HighlightItem value="ODD">
                <button
                  type="button"
                  className={`rtc-mode-tab ${mode === 'ODD' ? 'is-active' : ''}`}
                  aria-pressed={mode === 'ODD'}
                  disabled={busy}
                  onClick={() => setMode('ODD')}
                >
                  <Hash size={14} />
                  <span>Phòng lẻ</span>
                  {reconciled.oddRoomCount > 0 && (
                    <em className="rtc-mode-count">{reconciled.oddRoomCount}</em>
                  )}
                </button>
              </HighlightItem>
            </Highlight>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {mode === 'FLOOR' ? (
            <PresencePane
              key="mode-floor"
              initial={{ opacity: 0, x: reduce ? 0 : -shift.tabs }}
              animate={{ opacity: 1, x: 0, transition: swapTiming }}
              exit={{ opacity: 0, x: reduce ? 0 : -shift.tabs, transition: swapTiming }}
              className="rtc-s2-mode-pane"
            >
              <div className="rtc-s2-group-list">
                <AnimatePresence mode="popLayout" initial={false}>
                  {groups.map((group, index) => {
                    const meta = reconciled.groupMeta[group.id] || {};
                    const touched = touchedGroups[group.id] || {};
                    const nonBlank = !meta.blank;

                    const showFloorErr = Boolean(
                      meta.errors?.floor &&
                      ((group.floor.trim() !== '') || (nonBlank && (touched.floor || showValidation)) || (showValidation && reconciled.totalRooms === 0 && index === 0))
                    );
                    const showStartErr = Boolean(
                      meta.errors?.start &&
                      ((group.start.trim() !== '') || touched.start || showValidation)
                    );
                    const showCountErr = Boolean(
                      meta.errors?.count &&
                      ((group.count.trim() !== '') || (nonBlank && (touched.count || showValidation)) || (showValidation && reconciled.totalRooms === 0 && index === 0))
                    );
                    const overlapError = reconciled.groupErrors[group.id]?.overlap || '';

                    return (
                      <motion.div
                        key={group.id}
                        data-group-card=""
                        layout="position"
                        initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                        animate={{ opacity: 1, y: 0, transition: { ...moveSpring, opacity: fadeTiming } }}
                        exit={{ opacity: 0, scale: reduce ? 1 : 0.97, transition: fadeTiming }}
                        transition={moveSpring}
                        className={`rtc-s2-group-card ${overlapError || meta.existingConflicts?.length ? 'has-warning' : ''}`}
                      >
                        <div className="rtc-s2-group-grid">
                          {/* 3.1. Tầng */}
                          <div className="rtc-s2-input-col">
                            <label htmlFor={`rtc-floor-${group.id}`}>Tầng</label>
                            <div className="rtc-s2-floor-input-wrap">
                              <input
                                id={`rtc-floor-${group.id}`}
                                type="text"
                                inputMode="numeric"
                                maxLength={3}
                                disabled={busy}
                                placeholder="VD: 1, 2, 3"
                                value={group.floor}
                                aria-label={`Tầng nhóm ${index + 1}`}
                                aria-invalid={showFloorErr}
                                onKeyDown={preventEnterSubmit}
                                onBlur={() => markGroupTouched(group.id, 'floor')}
                                onChange={event => updateGroupField(group.id, 'floor', event.target.value)}
                              />
                              {meta.floorInfo?.valid && (
                                <span className="rtc-s2-floor-tag">{meta.floorInfo.label}</span>
                              )}
                            </div>
                            {showFloorErr && (
                              <small className="rtc-s2-field-err" role="alert">{meta.errors.floor}</small>
                            )}
                          </div>

                          {/* 3.2. Tên phòng (Read-only preview) */}
                          <div className="rtc-s2-input-col">
                            <label htmlFor={`rtc-preview-${group.id}`}>Tên phòng</label>
                            <div className="rtc-s2-readonly-wrap">
                              <input
                                id={`rtc-preview-${group.id}`}
                                type="text"
                                readOnly
                                tabIndex={-1}
                                value={meta.firstRoomPreview || ''}
                                placeholder="Tự động (VD: 101)"
                                aria-label={`Tên phòng đầu tiên nhóm ${index + 1}`}
                                className="rtc-s2-readonly-input"
                              />
                              <span className="rtc-s2-auto-badge">Mẫu</span>
                            </div>
                          </div>

                          {/* 3.3. Phòng bắt đầu */}
                          <div className="rtc-s2-input-col">
                            <label htmlFor={`rtc-start-${group.id}`}>Phòng bắt đầu</label>
                            <input
                              id={`rtc-start-${group.id}`}
                              type="text"
                              inputMode="numeric"
                              maxLength={3}
                              disabled={busy}
                              placeholder="01"
                              value={group.start}
                              aria-label={`Phòng bắt đầu nhóm ${index + 1}`}
                              aria-invalid={Boolean(showStartErr || overlapError)}
                              onKeyDown={preventEnterSubmit}
                              onBlur={() => handleStartBlur(group)}
                              onChange={event => updateGroupField(group.id, 'start', event.target.value)}
                            />
                            {showStartErr && (
                              <small className="rtc-s2-field-err" role="alert">{meta.errors.start}</small>
                            )}
                          </div>

                          {/* 3.4. Số lượng phòng */}
                          <div className="rtc-s2-input-col">
                            <label htmlFor={`rtc-count-${group.id}`}>Số lượng phòng</label>
                            <input
                              id={`rtc-count-${group.id}`}
                              type="text"
                              inputMode="numeric"
                              maxLength={3}
                              disabled={busy}
                              placeholder="VD: 5"
                              value={group.count}
                              aria-label={`Số lượng phòng nhóm ${index + 1}`}
                              aria-invalid={showCountErr}
                              onKeyDown={preventEnterSubmit}
                              onBlur={() => markGroupTouched(group.id, 'count')}
                              onChange={event => updateGroupField(group.id, 'count', event.target.value)}
                            />
                            {showCountErr && (
                              <small className="rtc-s2-field-err" role="alert">{meta.errors.count}</small>
                            )}
                          </div>

                          {/* Nút xóa nhóm */}
                          <div className="rtc-s2-group-del-col">
                            <MotionButton
                              type="button"
                              className="p-icon rtc-s2-group-del"
                              disabled={busy || (groups.length === 1 && meta.blank)}
                              title={groups.length > 1 ? `Xóa nhóm tầng ${index + 1}` : 'Đặt lại nhóm tầng'}
                              aria-label={groups.length > 1 ? `Xóa nhóm tầng ${index + 1}` : 'Đặt lại nhóm tầng'}
                              onClick={event => handleRemoveGroup(group, event)}
                            >
                              <Trash2 size={15} />
                            </MotionButton>
                          </div>
                        </div>

                        {/* Preview ngắn & cảnh báo trùng ngay dưới nhóm tầng */}
                        {meta.valid && !overlapError && (
                          <div className="rtc-s2-group-foot">
                            <span className="rtc-s2-range-preview">
                              <Check size={13} />
                              <span>{meta.rangeSummary}</span>
                            </span>
                            {meta.excludedRooms?.length > 0 && (
                              <span className="rtc-s2-excluded-note">
                                Đã loại bỏ {meta.excludedRooms.length} phòng ({meta.excludedRooms.slice(0, 3).join(', ')}{meta.excludedRooms.length > 3 ? '…' : ''})
                                <button
                                  type="button"
                                  className="rtc-s2-inline-link"
                                  disabled={busy}
                                  onClick={() => onRestoreGroupExcluded(group.id)}
                                >
                                  <RotateCcw size={11} />
                                  Khôi phục
                                </button>
                              </span>
                            )}
                            {meta.existingConflicts?.length > 0 && (
                              <span className="rtc-s2-conflict-note" role="alert">
                                <AlertCircle size={13} />
                                Phòng {meta.existingConflicts.slice(0, 3).join(', ')} đã có trong nhà trọ.
                                {meta.suggestedStart && meta.suggestedStart !== group.start && (
                                  <button
                                    type="button"
                                    className="rtc-s2-inline-link"
                                    disabled={busy}
                                    onClick={() => updateGroupField(group.id, 'start', meta.suggestedStart)}
                                  >
                                    Đặt bắt đầu {meta.suggestedStart}
                                  </button>
                                )}
                              </span>
                            )}
                          </div>
                        )}

                        {overlapError && (
                          <div className="rtc-s2-group-foot is-error" role="alert">
                            <span className="rtc-s2-conflict-note">
                              <AlertCircle size={13} />
                              {overlapError}
                            </span>
                            {meta.suggestedStart && (
                              <button
                                type="button"
                                className="rtc-s2-inline-fix"
                                disabled={busy}
                                onClick={() => updateGroupField(group.id, 'start', meta.suggestedStart)}
                              >
                                Đặt phòng bắt đầu: {meta.suggestedStart}
                              </button>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              <div className="rtc-s2-builder-actions">
                <MotionButton
                  ref={addGroupBtnRef}
                  type="button"
                  className="p-button rtc-s2-add-group-btn"
                  disabled={busy || groups.length >= MAX_FLOOR_GROUPS}
                  onClick={handleAddGroup}
                >
                  <Plus size={14} />
                  Thêm nhóm tầng
                </MotionButton>
                <span className="rtc-s2-rule-hint">
                  Quy tắc tự động: <code>Tầng + Số thứ tự (2 chữ số)</code> · VD: Tầng 3, bắt đầu 01 → <strong>301</strong>
                </span>
              </div>
            </PresencePane>
          ) : (
            <PresencePane
              key="mode-odd"
              initial={{ opacity: 0, x: reduce ? 0 : shift.tabs }}
              animate={{ opacity: 1, x: 0, transition: swapTiming }}
              exit={{ opacity: 0, x: reduce ? 0 : shift.tabs, transition: swapTiming }}
              className="rtc-s2-mode-pane"
            >
              <div ref={oddFormScope} className="rtc-s2-odd-box">
                <div className="rtc-s2-odd-grid">
                  <div className="rtc-s2-input-col">
                    <label htmlFor="rtc-odd-floor">Tầng</label>
                    <div className="rtc-s2-floor-input-wrap">
                      <input
                        id="rtc-odd-floor"
                        type="text"
                        inputMode="numeric"
                        maxLength={3}
                        disabled={busy}
                        placeholder="VD: 1"
                        value={oddDraft.floor}
                        aria-invalid={Boolean(oddFloorError)}
                        aria-describedby={oddFloorError ? 'rtc-odd-floor-err' : undefined}
                        onKeyDown={handleOddKeyDown}
                        onBlur={() => setOddFloorTouched(true)}
                        onChange={event => {
                          setOddDraft(prev => ({ ...prev, floor: event.target.value }));
                          setOddSubmitted(false);
                        }}
                      />
                      {parsedOddFloor.valid && (
                        <span className="rtc-s2-floor-tag">{parsedOddFloor.label}</span>
                      )}
                    </div>
                  </div>

                  <div className="rtc-s2-input-col">
                    <label htmlFor="rtc-odd-room">Tên phòng / Số phòng</label>
                    <input
                      ref={oddRoomInputRef}
                      id="rtc-odd-room"
                      type="text"
                      maxLength={30}
                      disabled={busy}
                      placeholder={
                        parsedOddFloor.valid
                          ? `VD: ${parsedOddFloor.canonical}05, ${parsedOddFloor.canonical}08`
                          : 'VD: 105, 108, 205...'
                      }
                      value={oddDraft.roomNumber}
                      aria-invalid={Boolean(oddRoomError)}
                      aria-describedby={oddRoomError ? 'rtc-odd-room-err' : undefined}
                      onKeyDown={handleOddKeyDown}
                      onChange={event => {
                        setOddDraft(prev => ({ ...prev, roomNumber: event.target.value }));
                        setOddSubmitted(false);
                      }}
                    />
                  </div>

                  <div className="rtc-s2-odd-action-col">
                    <MotionButton
                      type="button"
                      className="p-button primary rtc-s2-odd-add-btn"
                      disabled={busy || reconciled.totalRooms >= MAX_BATCH_ROOMS}
                      onClick={handleAddOddRoom}
                    >
                      <Plus size={15} />
                      Thêm phòng
                    </MotionButton>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {(oddFloorError || oddRoomError) ? (
                    <motion.p
                      key="odd-error"
                      id={oddRoomError ? 'rtc-odd-room-err' : 'rtc-odd-floor-err'}
                      initial={{ opacity: 0, y: reduce ? 0 : -4 }}
                      animate={{ opacity: 1, y: 0, transition: swapTiming }}
                      exit={{ opacity: 0, transition: swapTiming }}
                      className="rtc-s2-odd-feedback is-error"
                      role="alert"
                    >
                      <AlertCircle size={13} />
                      <span>{oddRoomError || oddFloorError}</span>
                    </motion.p>
                  ) : oddAddedHint ? (
                    <motion.p
                      key="odd-success"
                      initial={{ opacity: 0, y: reduce ? 0 : -4 }}
                      animate={{ opacity: 1, y: 0, transition: swapTiming }}
                      exit={{ opacity: 0, transition: swapTiming }}
                      className="rtc-s2-odd-feedback is-success"
                      role="status"
                    >
                      <Check size={13} />
                      <span>{oddAddedHint}</span>
                    </motion.p>
                  ) : null}
                </AnimatePresence>

                <div className="rtc-s2-odd-chips-area">
                  {oddRooms.length > 0 ? (
                    <>
                      <div className="rtc-s2-odd-chips-head">
                        <span>Phòng lẻ đã thêm ({oddRooms.length})</span>
                        <small>Nhấn Enter để thêm liên tiếp · Tự động gộp vào danh sách dự kiến</small>
                      </div>
                      <div className="rtc-s2-chip-cloud" role="list" aria-label="Danh sách phòng lẻ đã thêm">
                        <AnimatePresence mode="popLayout" initial={false}>
                          {oddRooms.map(item => (
                            <motion.span
                              key={item.id || item.roomNumber}
                              data-odd-chip=""
                              role="listitem"
                              layout="position"
                              initial={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
                              animate={{ opacity: 1, scale: 1, transition: { ...moveSpring, opacity: fadeTiming } }}
                              exit={{ opacity: 0, scale: reduce ? 1 : 0.9, transition: popOutTiming }}
                              transition={moveSpring}
                              className="rtc-s2-chip is-odd"
                              title={`${item.roomNumber} — ${item.floor}`}
                            >
                              {oddFloorsDistinctCount > 1 && (
                                <small>{item.floor.replace(/^Tầng\s+/iu, 'T')}</small>
                              )}
                              <strong>{item.roomNumber}</strong>
                              <button
                                type="button"
                                disabled={busy}
                                aria-label={`Xóa phòng lẻ ${item.roomNumber}`}
                                onClick={event => handleRemoveOddChip(item, event)}
                              >
                                <X size={12} />
                              </button>
                            </motion.span>
                          ))}
                        </AnimatePresence>
                      </div>
                    </>
                  ) : (
                    <p className="rtc-s2-odd-empty-hint">
                      <Sparkles size={13} />
                      <span>Chưa có phòng lẻ. Bạn có thể thêm các phòng không liên tiếp (VD: 105, 108, 110) ngay cả khi chưa tạo nhóm tầng.</span>
                    </p>
                  )}
                </div>
              </div>
            </PresencePane>
          )}
        </AnimatePresence>
      </section>

      {/* Khu vực C — Danh sách phòng dự kiến */}
      <section className="rtc-s2-card rtc-s2-preview-card" aria-label="Danh sách phòng dự kiến">
        <header className="rtc-s2-preview-head">
          <div className="rtc-s2-preview-title">
            <h3>Danh sách phòng dự kiến</h3>
            <RollingStatBadge roomsCount={reconciled.totalRooms} floorsCount={reconciled.totalFloors} />
          </div>

          {reconciled.totalRooms > 0 && (
            <div className="rtc-s2-preview-actions">
              <MotionButton
                type="button"
                className="p-button rtc-s2-ghost-btn"
                disabled={busy}
                onClick={toggleExpandAll}
              >
                <ChevronsUpDown size={13} />
                {allFloorsExpanded ? 'Thu gọn' : 'Xem tất cả'}
              </MotionButton>
              <MotionButton
                type="button"
                className="p-button rtc-s2-ghost-danger"
                disabled={busy}
                onClick={() => { setConfirmClearAll(true); setConfirmFloorKey(null); }}
              >
                <Trash2 size={13} />
                Xóa tất cả
              </MotionButton>
            </div>
          )}
        </header>

        <AnimatePresence initial={false}>
          {confirmClearAll && reconciled.totalRooms > 0 && (
            <motion.div
              key="confirm-clear-all"
              initial={disclosureCollapsed}
              animate={disclosureExpanded}
              exit={disclosureCollapsed}
              transition={disclosureTiming}
              style={{ overflow: 'hidden' }}
            >
              <div className="rtc-s2-inline-confirm" role="alertdialog" aria-label="Xác nhận xóa tất cả phòng dự kiến">
                <span>Xóa toàn bộ <strong>{reconciled.totalRooms} phòng</strong> trong danh sách dự kiến?</span>
                <div>
                  <MotionButton type="button" className="p-button" onClick={() => setConfirmClearAll(false)}>
                    Giữ lại
                  </MotionButton>
                  <MotionButton
                    type="button"
                    className="p-button rt-delete-confirm"
                    onClick={() => {
                      onClearAll();
                      setConfirmClearAll(false);
                    }}
                  >
                    Xóa tất cả
                  </MotionButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {reconciled.floorBuckets.length === 0 ? (
          <div className="rtc-s2-empty">
            <DoorOpen size={22} />
            <div>
              <strong>Chưa có phòng trong danh sách dự kiến</strong>
              <p>Nhập tầng và số lượng ở trên hoặc chuyển sang tab Phòng lẻ để thêm phòng.</p>
            </div>
          </div>
        ) : (
          <div className={`rtc-s2-accordion-list ${allFloorsExpanded ? 'is-expanded-all' : ''}`}>
            {reconciled.floorBuckets.map(bucket => {
              const isOpen = expandedFloors.has(bucket.floorKey);
              const isConfirmingFloor = confirmFloorKey === bucket.floorKey;

              return (
                <div
                  key={bucket.floorKey}
                  className={`rtc-s2-floor-item ${isOpen ? 'is-open' : ''} ${bucket.hasError ? 'has-error' : ''}`}
                >
                  <div className="rtc-s2-floor-bar">
                    <button
                      type="button"
                      className="rtc-s2-floor-trigger"
                      aria-expanded={isOpen}
                      onClick={() => toggleFloorAccordion(bucket.floorKey)}
                    >
                      <ChevronDown size={15} className={`rtc-s2-chevron ${isOpen ? 'is-open' : ''}`} />
                      <span className="rtc-s2-floor-heading">
                        <strong>{bucket.floor}</strong>
                        <span className="rtc-s2-floor-sep">—</span>
                        <span className="rtc-s2-floor-count">{bucket.count} phòng</span>
                        {bucket.hasError && (
                          <span className="rtc-s2-floor-alert-pill">Cần kiểm tra</span>
                        )}
                      </span>
                      <span className="rtc-s2-floor-inline-rooms">
                        {bucket.compactText}
                        {bucket.overflowCount > 0 ? ` … +${bucket.overflowCount}` : ''}
                      </span>
                    </button>

                    <MotionButton
                      type="button"
                      className="p-icon rtc-s2-floor-del-btn"
                      disabled={busy}
                      title={`Xóa toàn bộ ${bucket.floor}`}
                      aria-label={`Xóa toàn bộ ${bucket.floor}`}
                      onClick={() => {
                        setConfirmClearAll(false);
                        setConfirmFloorKey(prev => (prev === bucket.floorKey ? null : bucket.floorKey));
                      }}
                    >
                      <Trash2 size={14} />
                    </MotionButton>
                  </div>

                  <AnimatePresence initial={false}>
                    {isConfirmingFloor && (
                      <motion.div
                        key="floor-confirm"
                        initial={disclosureCollapsed}
                        animate={disclosureExpanded}
                        exit={disclosureCollapsed}
                        transition={disclosureTiming}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="rtc-s2-inline-confirm is-compact" role="alertdialog" aria-label={`Xác nhận xóa ${bucket.floor}`}>
                          <span>Xóa toàn bộ <strong>{bucket.count} phòng</strong> thuộc <strong>{bucket.floor}</strong>?</span>
                          <div>
                            <MotionButton type="button" className="p-button" onClick={() => setConfirmFloorKey(null)}>
                              Hủy
                            </MotionButton>
                            <MotionButton
                              type="button"
                              className="p-button rt-delete-confirm"
                              onClick={() => {
                                onRemoveFloor(bucket.floorKey);
                                setConfirmFloorKey(null);
                              }}
                            >
                              Xóa {bucket.floor}
                            </MotionButton>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <PresencePane
                        key="floor-body"
                        initial={disclosureCollapsed}
                        animate={disclosureExpanded}
                        exit={disclosureCollapsed}
                        transition={disclosureTiming}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="rtc-s2-floor-body">
                          <div className="rtc-s2-chip-cloud">
                            {bucket.rooms.map(room => (
                              <span
                                key={`${room.source}-${room.oddId || room.groupId || ''}-${room.roomNumber}`}
                                className={`rtc-s2-chip ${room.source === 'ODD' ? 'is-odd' : ''} ${room.error ? 'is-conflict' : ''}`}
                                title={room.error ? `${room.roomNumber}: ${room.error}` : room.source === 'ODD' ? `${room.roomNumber} (Phòng lẻ)` : room.roomNumber}
                              >
                                {room.error && <AlertCircle size={11} className="rtc-s2-chip-err-icon" />}
                                <strong>{room.roomNumber}</strong>
                                <button
                                  type="button"
                                  disabled={busy}
                                  aria-label={`Xóa phòng ${room.roomNumber}`}
                                  onClick={() => onRemoveRoom(room)}
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </PresencePane>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {(showValidation || reconciled.totalRooms > MAX_BATCH_ROOMS || Object.keys(reconciled.draftValidation.rows).length > 0) && reconciled.listError && (
          <p className="rtc-s2-list-error" role="alert">
            <AlertCircle size={14} />
            <span>{reconciled.listError}</span>
          </p>
        )}

        <p className="rtc-s2-footnote">
          Phòng mới mặc định ở trạng thái <strong>Trống</strong>, kế thừa giá và tiện nghi của loại phòng · Tối đa {MAX_BATCH_ROOMS} phòng mỗi lần tạo.
        </p>
      </section>
    </div>
  );
}
