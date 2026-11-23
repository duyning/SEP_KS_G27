import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useIsPresent } from 'motion/react';
import { Highlight, HighlightItem } from '@animate-ui/react/primitives/effects/highlight';
import { SlidingNumber } from '@animate-ui/react/primitives/texts/sliding-number';
import { useMotionTokens, useShouldReduceMotion, useTempoTransition } from '@animate-ui/react/utils/motion';
import {
  ArrowUpDown,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  Eye,
  FileCheck2,
  FilePenLine,
  FileText,
  FileX2,
  FolderKanban,
  LoaderCircle,
  MapPin,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import { AnimatePresence, MotionButton } from '../../components/motion/MotionUI.jsx';
import { Modal, useToast } from '../../components/PortalUI.jsx';
import { StaffLoadState, StaffStatus, StaffThumbnail, staffDate, useStaffLoad } from '../../components/StaffUI.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { staffApi } from '../../services/staff.js';
import {
  SUBMISSION_KIND_FILTERS,
  VERIFICATION_SORT_OPTIONS,
  VERIFICATION_STATUS_TABS,
  classifyVerificationRecord,
  computeVerificationMetrics,
  filterAndSortVerifications,
  getVerificationRowActions,
} from '../../services/staff-verifications.js';
import '../../styles/staff-verifications-refinement.css';

const PAGE_SIZE = 8;
const VALID_STATUS_VALUES = new Set(VERIFICATION_STATUS_TABS.map(tab => tab.value));

const STATUS_TAB_ICONS = {
  ALL: FolderKanban,
  PENDING: Clock3,
  NEEDS_SUPPLEMENT: FilePenLine,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

function ActionPrimaryIcon({ id }) {
  if (id === 'inspect-review') return <ClipboardCheck size={15} />;
  if (id === 'track-supplement') return <Clock3 size={15} />;
  if (id === 'view-approved') return <FileCheck2 size={15} />;
  if (id === 'view-rejected') return <FileX2 size={15} />;
  if (id === 'supervise-pending' || id === 'supervise-supplement') return <ShieldCheck size={15} />;
  return <Eye size={15} />;
}

function VerificationQueueRow({ item, onQuickDecision, reflowSpring, fadeTransition, reduce }) {
  const present = useIsPresent();
  const meta = classifyVerificationRecord(item);
  const actions = getVerificationRowActions(item);
  const contactName = item.managerName || item.ownerName || 'Chưa cập nhật';
  const contactPhone = item.contactPhone || item.ownerPhone || 'Chưa có SĐT';

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, transform: reduce ? 'none' : 'scale(0.985)' }}
      animate={{ opacity: 1, transform: 'none', transition: fadeTransition }}
      exit={{ opacity: 0, transform: reduce ? 'none' : 'scale(0.985)', transition: fadeTransition }}
      transition={{ layout: reflowSpring }}
      inert={!present || undefined}
      className={`sv-queue-row status-${item.status.toLowerCase()}`}
      data-slot="verification-row"
    >
      <div className="sv-col sv-col-property" data-label="Hồ sơ nhà trọ">
        <div className="sv-property-media">
          <StaffThumbnail registrationId={item.registrationId} fileId={item.coverId} name={item.name} />
        </div>
        <div className="sv-property-body">
          <div className="sv-record-badges">
            <span className="sv-code-chip">HS-{item.registrationId}</span>
            <span className={`sv-kind-chip tone-${meta.submissionTone}`}>
              {meta.isResubmitted && <Sparkles size={11} />}
              {meta.submissionLabel}
            </span>
            {item.reverificationRequired && <span className="sv-kind-chip tone-orange">Tái xác minh</span>}
            {item.propertyType && <span className="sv-type-chip">{item.propertyType}</span>}
          </div>
          <Link className="sv-property-title" to={`/staff/verifications/detail?id=${item.registrationId}`}>
            {item.name || 'Nhà trọ chưa đặt tên'}
          </Link>
          <p className="sv-property-addr">
            <MapPin size={13} />
            <span>{item.address || 'Chưa cập nhật địa chỉ cụ thể'}</span>
          </p>
        </div>
      </div>

      <div className="sv-col sv-col-evidence" data-label="Chứng từ & Phân công">
        <div className={`sv-doc-pill ${meta.allDocsUploaded ? 'complete' : 'incomplete'}`}>
          <FileText size={13} />
          <span>{meta.docsUploaded}/3 tài liệu pháp lý</span>
        </div>
        <span className="sv-evidence-sub">
          {meta.allDocsUploaded
            ? 'Đủ GPKD · CCCD · PCCC'
            : meta.docsComplete
              ? 'Có GPKD & CCCD · Chưa có PCCC'
              : 'Thiếu giấy tờ bắt buộc'}
        </span>
        {typeof item.photoCount === 'number' && (
          <span className="sv-evidence-meta">
            {item.photoCount} ảnh thực tế
            {item.assignedStaffName ? ` · Phụ trách: ${item.assignedStaffName}` : ''}
          </span>
        )}
        {typeof item.photoCount !== 'number' && item.assignedStaffName && (
          <span className="sv-evidence-meta">
            <UserCheck size={12} /> Phụ trách: {item.assignedStaffName}
          </span>
        )}
      </div>

      <div className="sv-col sv-col-owner" data-label="Chủ trọ / Liên hệ">
        <strong className="sv-owner-name">{contactName}</strong>
        <span className="sv-owner-phone">
          <Phone size={12} />
          {contactPhone}
        </span>
        {item.ownerEmail && <small className="sv-owner-email">{item.ownerEmail}</small>}
      </div>

      <div className="sv-col sv-col-status" data-label="Trạng thái & Tiến độ">
        <div className="sv-status-stack">
          <StaffStatus status={item.status} />
          <span className="sv-status-time">
            {item.status === 'PENDING'
              ? `${meta.isResubmitted ? 'Gửi lại:' : 'Nộp:'} ${staffDate(item.submittedAt || item.createdAt)}`
              : item.reviewedAt
                ? `Cập nhật: ${staffDate(item.reviewedAt)}`
                : `Nộp: ${staffDate(item.createdAt)}`}
          </span>
          {item.reviewerName && item.status !== 'PENDING' && (
            <small className="sv-reviewer-by">Xử lý bởi {item.reviewerName}</small>
          )}
        </div>
        {meta.reasonPreview && ['NEEDS_SUPPLEMENT', 'REJECTED'].includes(item.status) && (
          <p className={`sv-inline-reason ${item.status.toLowerCase()}`} title={item.reasonNote}>
            {meta.reasonPreview}
          </p>
        )}
      </div>

      <div className="sv-col sv-col-actions" data-label="Hành động">
        <div className="sv-action-group">
          {actions.primary && (
            <Link className={`sv-row-btn ${actions.primary.tone}`} to={actions.primary.to}>
              <ActionPrimaryIcon id={actions.primary.id} />
              <span>{actions.primary.label}</span>
            </Link>
          )}
          {actions.secondary.length > 0 && (
            <div className="sv-secondary-actions" role="group" aria-label={`Tác vụ nhanh cho HS-${item.registrationId}`}>
              {actions.secondary.map(action =>
                action.kind === 'link' ? (
                  <Link
                    key={action.id}
                    className={`sv-quick-btn ${action.tone}`}
                    to={action.to}
                    target={action.external ? '_blank' : undefined}
                    rel={action.external ? 'noopener noreferrer' : undefined}
                    title={action.title}
                  >
                    {action.id === 'supplement' && <FilePenLine size={13} />}
                    {action.external && <ExternalLink size={13} />}
                    <span>{action.label}</span>
                  </Link>
                ) : (
                  <MotionButton
                    key={action.id}
                    type="button"
                    className={`sv-quick-btn ${action.tone}`}
                    title={action.title}
                    onClick={() => onQuickDecision(item, action.decision)}
                  >
                    {action.decision === 'APPROVE' ? <Check size={13} /> : <X size={13} />}
                    <span>{action.label}</span>
                  </MotionButton>
                )
              )}
            </div>
          )}
          {!actions.secondary.length && actions.statusHint && (
            <span className="sv-action-hint">{actions.statusHint}</span>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export default function StaffPropertyVerificationsPage() {
  const { user } = useAuth();
  const notify = useToast();
  const state = useStaffLoad('verifications');
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatusParam = searchParams.get('status');
  const status = VALID_STATUS_VALUES.has(initialStatusParam) ? initialStatusParam : 'ALL';

  const [kind, setKind] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('PRIORITY');
  const [page, setPage] = useState(1);

  const [quickTarget, setQuickTarget] = useState(null);
  const [quickNote, setQuickNote] = useState('');
  const [quickError, setQuickError] = useState('');
  const [quickBusy, setQuickBusy] = useState(false);
  const quickRequestRef = useRef(null);

  const reduce = useShouldReduceMotion();
  const tokens = useMotionTokens();
  const selectionSpring = useTempoTransition(tokens.spring.selection);
  const highlightSpring = useTempoTransition(tokens.spring.highlight);
  const reflowSpring = useTempoTransition(tokens.spring.reflow);
  const fadeTransition = useTempoTransition(tokens.transition.fade);
  const swapTransition = useTempoTransition(tokens.transition.swap);

  useEffect(() => () => quickRequestRef.current?.abort(), []);

  const selectStatus = nextValue => {
    if (!nextValue || !VALID_STATUS_VALUES.has(nextValue)) return;
    const nextParams = new URLSearchParams(searchParams);
    if (nextValue === 'ALL') nextParams.delete('status');
    else nextParams.set('status', nextValue);
    setSearchParams(nextParams, { replace: true });
    setPage(1);
  };

  const handleTabKeyDown = event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    const list = event.currentTarget.closest('[role="tablist"]');
    if (!list) return;
    const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
    const currentIndex = tabs.indexOf(event.currentTarget);
    if (currentIndex === -1) return;
    event.preventDefault();
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    const targetButton = tabs[nextIndex];
    if (targetButton) {
      targetButton.focus();
      const targetVal = targetButton.getAttribute('data-tab-value');
      if (targetVal) selectStatus(targetVal);
    }
  };

  const metrics = useMemo(() => computeVerificationMetrics(state.data || []), [state.data]);
  const rows = useMemo(
    () => filterAndSortVerifications(state.data || [], { status, kind, search, sort }),
    [state.data, status, kind, search, sort]
  );

  const openQuickDecision = (item, decision) => {
    if (quickBusy) return;
    setQuickTarget({ item, decision });
    setQuickNote('');
    setQuickError('');
  };

  const closeQuickDecision = () => {
    if (quickBusy) return;
    setQuickTarget(null);
    setQuickNote('');
    setQuickError('');
  };

  const submitQuickDecision = async event => {
    event.preventDefault();
    if (!quickTarget || quickRequestRef.current) return;
    const { item, decision } = quickTarget;
    const trimmed = quickNote.trim();
    if (decision === 'REJECT' && (trimmed.length < 10 || trimmed.length > 2000)) {
      setQuickError('Lý do từ chối cần từ 10 đến 2000 ký tự để chủ trọ nắm rõ nguyên nhân.');
      return;
    }
    if (decision === 'APPROVE' && trimmed.length > 2000) {
      setQuickError('Ghi chú phê duyệt không vượt quá 2000 ký tự.');
      return;
    }
    const controller = new AbortController();
    quickRequestRef.current = controller;
    setQuickBusy(true);
    setQuickError('');
    try {
      const updatedDetail = await staffApi.review(
        item.registrationId,
        decision,
        trimmed,
        controller.signal,
        undefined,
        item.assignmentVersion
      );
      if (controller.signal.aborted) return;
      const nextList = (state.data || []).map(row =>
        row.registrationId === item.registrationId ? updatedDetail.summary : row
      );
      state.replace(nextList);
      setQuickTarget(null);
      setQuickNote('');
      notify?.(
        decision === 'APPROVE'
          ? `Đã phê duyệt hồ sơ HS-${item.registrationId}. Nhà trọ đã được kích hoạt hiển thị.`
          : `Đã từ chối hồ sơ HS-${item.registrationId} và gửi lý do cho chủ trọ.`,
        'success'
      );
      window.dispatchEvent(new Event('hlrcs:staff-updated'));
    } catch (error) {
      if (!controller.signal.aborted) {
        setQuickError(error.message);
        if ([403, 404, 409].includes(error.status)) {
          setQuickTarget(null);
          state.reload();
          notify?.(error.message, 'error');
        }
      }
    } finally {
      if (quickRequestRef.current === controller) quickRequestRef.current = null;
      if (!controller.signal.aborted) setQuickBusy(false);
    }
  };

  if (state.loading || state.error) {
    return (
      <div className="sw-page">
        <StaffLoadState state={state} />
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pagedRows = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const activeTab = VERIFICATION_STATUS_TABS.find(tab => tab.value === status) || VERIFICATION_STATUS_TABS[0];
  const hasActiveFilters = status !== 'ALL' || kind !== 'ALL' || Boolean(search.trim()) || sort !== 'PRIORITY';

  const kpiCards = [
    {
      key: 'PENDING',
      label: 'Cần thẩm định ngay',
      value: metrics.counts.PENDING,
      hint:
        metrics.counts.PENDING > 0
          ? `${metrics.readyPendingCount} hồ sơ đủ giấy tờ bắt buộc`
          : 'Không có hồ sơ tồn đọng',
      icon: Clock3,
      tone: 'amber',
    },
    {
      key: 'NEEDS_SUPPLEMENT',
      label: 'Chờ chủ trọ bổ sung',
      value: metrics.counts.NEEDS_SUPPLEMENT,
      hint: 'Đã gửi ghi chú theo từng mục',
      icon: FilePenLine,
      tone: 'orange',
    },
    {
      key: 'APPROVED',
      label: 'Đã phê duyệt',
      value: metrics.counts.APPROVED,
      hint: 'Đạt chuẩn & hiển thị công khai',
      icon: CheckCircle2,
      tone: 'emerald',
    },
    {
      key: 'REJECTED',
      label: 'Đã từ chối',
      value: metrics.counts.REJECTED,
      hint: 'Đã đóng & lưu biên bản',
      icon: XCircle,
      tone: 'rose',
    },
  ];

  return (
    <div className="sw-page sv-list">
      <header className="sv-workspace-header">
        <div className="sv-workspace-intro">
          <div className="sv-workspace-eyebrow">
            <span className="sv-role-pill">
              <Building2 size={13} />
              {user?.role === 'ADMIN' ? 'Giám sát Quản trị viên' : 'Nghiệp vụ Thẩm định Nhà trọ'}
            </span>
            <span className={`sv-live-pill ${metrics.counts.PENDING > 0 ? 'busy' : 'calm'}`}>
              <span className="sv-live-dot" aria-hidden="true" />
              {metrics.counts.PENDING > 0
                ? `${metrics.counts.PENDING} hồ sơ đang chờ xử lý`
                : 'Hàng đợi thẩm định đã xử lý hết'}
            </span>
          </div>
          <h2>Quản lý &amp; Xác minh Hồ sơ Nhà trọ</h2>
          <p>
            Phân luồng hồ sơ theo trạng thái thực tế, kiểm tra chứng từ pháp lý bảo mật và thực hiện đúng hành động
            nghiệp vụ cho từng giai đoạn.
          </p>
        </div>
        <div className="sv-workspace-actions">
          <MotionButton
            type="button"
            className="p-button sv-refresh-btn"
            onClick={() => state.reload()}
            title="Làm mới danh sách hồ sơ từ máy chủ"
          >
            <RefreshCw size={15} />
            <span>Làm mới dữ liệu</span>
          </MotionButton>
        </div>
      </header>

      <section className="sv-kpis" aria-label="Tổng quan số lượng theo trạng thái">
        {kpiCards.map(card => {
          const Icon = card.icon;
          const active = status === card.key;
          return (
            <MotionButton
              type="button"
              key={card.key}
              className={`sv-kpi ${card.tone}`}
              aria-pressed={active}
              onClick={() => selectStatus(active ? 'ALL' : card.key)}
            >
              <span className="sv-kpi-label">
                <span>{card.label}</span>
                <span className="sv-kpi-icon">
                  <Icon size={18} />
                </span>
              </span>
              <strong className="sv-kpi-number">
                <SlidingNumber number={card.value} initiallyStable />
              </strong>
              <span className="sv-kpi-hint">{card.hint}</span>
            </MotionButton>
          );
        })}
      </section>

      <section className="sw-panel sv-results" aria-label="Không gian lọc và danh sách hồ sơ xác minh">
        <div className="sv-status-bar">
          <Highlight
            value={status}
            onValueChange={val => val && selectStatus(val)}
            controlledItems
            transition={selectionSpring}
            className="sv-tab-highlight"
          >
            <div className="sv-status-tabs" role="tablist" aria-label="Chia tag theo trạng thái hồ sơ">
              {VERIFICATION_STATUS_TABS.map(tab => {
                const TabIcon = STATUS_TAB_ICONS[tab.value] || FolderKanban;
                const isSelected = status === tab.value;
                return (
                  <HighlightItem
                    key={tab.value}
                    value={tab.value}
                    activeClassName={`tone-${tab.tone}`}
                    className="sv-tab-item"
                  >
                    <button
                      type="button"
                      role="tab"
                      id={`sv-tab-${tab.value}`}
                      data-tab-value={tab.value}
                      aria-selected={isSelected}
                      aria-controls="sv-verification-tabpanel"
                      tabIndex={isSelected ? 0 : -1}
                      className={`sv-tab-btn tone-${tab.tone} ${isSelected ? 'is-active' : ''}`}
                      onClick={() => selectStatus(tab.value)}
                      onKeyDown={handleTabKeyDown}
                    >
                      <TabIcon size={15} className="sv-tab-icon" />
                      <span className="sv-tab-label">{tab.label}</span>
                      <span className="sv-tab-count">{metrics.counts[tab.value] ?? 0}</span>
                    </button>
                  </HighlightItem>
                );
              })}
            </div>
          </Highlight>

          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={activeTab.value}
              initial={{ opacity: 0, filter: reduce ? 'none' : tokens.blur.icon }}
              animate={{ opacity: 1, filter: 'blur(0px)', transition: swapTransition }}
              exit={{ opacity: 0, filter: reduce ? 'none' : tokens.blur.icon, transition: swapTransition }}
              className={`sv-status-context tone-${activeTab.tone}`}
            >
              {activeTab.description}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="sv-toolbar">
          <div className="sv-kind-row" aria-label="Phân loại nguồn hồ sơ">
            <Highlight
              value={kind}
              onValueChange={val => {
                if (val) {
                  setKind(val);
                  setPage(1);
                }
              }}
              controlledItems
              transition={highlightSpring}
              className="sv-kind-highlight"
            >
              <div className="sv-kind-chips" role="group" aria-label="Lọc nhanh theo phân loại hồ sơ">
                {SUBMISSION_KIND_FILTERS.map(chip => {
                  const chipActive = kind === chip.value;
                  return (
                    <HighlightItem key={chip.value} value={chip.value} className="sv-kind-item">
                      <button
                        type="button"
                        aria-pressed={chipActive}
                        className={`sv-kind-filter-btn ${chipActive ? 'is-active' : ''}`}
                        onClick={() => {
                          setKind(chip.value);
                          setPage(1);
                        }}
                      >
                        <span>{chip.label}</span>
                        <small>{metrics.kinds[chip.value] ?? 0}</small>
                      </button>
                    </HighlightItem>
                  );
                })}
              </div>
            </Highlight>
          </div>

          <div className="sv-controls-row">
            <label className="sv-search-field">
              <span className="sr-only">Tìm kiếm hồ sơ</span>
              <div className="sw-search sv-search-box">
                <Search size={16} />
                <input
                  aria-label="Tìm hồ sơ"
                  value={search}
                  onChange={event => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Tìm theo tên nhà trọ, mã HS-..., chủ trọ, SĐT, email hoặc nhân viên phụ trách..."
                />
                {search && (
                  <button
                    type="button"
                    className="sv-clear-input"
                    aria-label="Xóa từ khóa tìm kiếm"
                    onClick={() => {
                      setSearch('');
                      setPage(1);
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </label>

            <label className="sv-sort-field">
              <ArrowUpDown size={15} aria-hidden="true" />
              <select
                aria-label="Sắp xếp hồ sơ"
                value={sort}
                onChange={event => {
                  setSort(event.target.value);
                  setPage(1);
                }}
              >
                {VERIFICATION_SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {hasActiveFilters && (
              <MotionButton
                type="button"
                className="p-button sv-reset"
                onClick={() => {
                  selectStatus('ALL');
                  setKind('ALL');
                  setSearch('');
                  setSort('PRIORITY');
                  setPage(1);
                }}
              >
                <RotateCcw size={14} />
                <span>Đặt lại bộ lọc</span>
              </MotionButton>
            )}
          </div>
        </div>

        <div className="sv-result-summary" role="status" aria-live="polite">
          <div>
            <strong>{rows.length} hồ sơ</strong>
            <span>
              {status === 'ALL' ? `trên tổng ${metrics.counts.ALL} hồ sơ` : `thuộc trạng thái "${activeTab.label}"`}
            </span>
          </div>
          <span className="sv-action-legend">
            Hành động trên từng dòng tự động phân quyền theo trạng thái hồ sơ
          </span>
        </div>

        <div
          id="sv-verification-tabpanel"
          role="tabpanel"
          aria-labelledby={`sv-tab-${status}`}
          className="sv-queue-wrapper"
        >
          {pagedRows.length > 0 ? (
            <div className="sv-queue-table">
              <div className="sv-queue-head" aria-hidden="true">
                <span>Hồ sơ Nhà trọ &amp; Phân loại</span>
                <span>Chứng từ &amp; Phân công</span>
                <span>Chủ trọ / Đại diện</span>
                <span>Trạng thái &amp; Tiến độ</span>
                <span>Hành động khả dụng</span>
              </div>
              <div className="sv-queue-body">
                <AnimatePresence mode="popLayout" initial={false}>
                  {pagedRows.map(item => (
                    <VerificationQueueRow
                      key={item.registrationId}
                      item={item}
                      onQuickDecision={openQuickDecision}
                      reflowSpring={reflowSpring}
                      fadeTransition={fadeTransition}
                      reduce={reduce}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="sv-empty-state">
              <div className={`sv-empty-icon tone-${activeTab.tone}`}>
                <FolderKanban size={26} />
              </div>
              <h3>{state.data.length ? activeTab.emptyTitle : 'Chưa có hồ sơ đăng ký nhà trọ được gửi lên'}</h3>
              <p>
                {search.trim() || kind !== 'ALL'
                  ? 'Không tìm thấy hồ sơ nào khớp với từ khóa hoặc bộ lọc phân loại hiện tại.'
                  : activeTab.emptyHint}
              </p>
              {hasActiveFilters && (
                <MotionButton
                  type="button"
                  className="p-button"
                  onClick={() => {
                    selectStatus('ALL');
                    setKind('ALL');
                    setSearch('');
                    setSort('PRIORITY');
                    setPage(1);
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Xem toàn bộ hồ sơ</span>
                </MotionButton>
              )}
            </div>
          )}
        </div>

        <footer className="sw-pagination sv-pagination">
          <span>
            {rows.length
              ? `Hiển thị ${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, rows.length)} / ${rows.length} hồ sơ`
              : '0 hồ sơ hiển thị'}
          </span>
          <div className="sv-page-controls">
            <MotionButton
              type="button"
              className="p-icon"
              aria-label="Trang trước"
              title="Trang trước"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft size={16} />
            </MotionButton>
            <span className="sv-page-indicator">
              Trang <strong>{current}</strong> / {totalPages}
            </span>
            <MotionButton
              type="button"
              className="p-icon"
              aria-label="Trang sau"
              title="Trang sau"
              disabled={current === totalPages}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight size={16} />
            </MotionButton>
          </div>
        </footer>
      </section>

      <AnimatePresence>
        {quickTarget && (
          <Modal
            className="sw-review-modal"
            title={
              quickTarget.decision === 'APPROVE'
                ? `Xác nhận phê duyệt nhanh · HS-${quickTarget.item.registrationId}`
                : `Từ chối hồ sơ nhà trọ · HS-${quickTarget.item.registrationId}`
            }
            onClose={closeQuickDecision}
          >
            <form onSubmit={submitQuickDecision} noValidate aria-busy={quickBusy}>
              <div className="sw-review-body">
                <div className="sv-modal-record-summary">
                  <div>
                    <span className="sv-code-chip">HS-{quickTarget.item.registrationId}</span>
                    <strong>{quickTarget.item.name}</strong>
                    <p>{quickTarget.item.address || 'Chưa cập nhật địa chỉ'}</p>
                  </div>
                  <Link
                    className="sv-modal-inspect-link"
                    to={`/staff/verifications/detail?id=${quickTarget.item.registrationId}`}
                  >
                    <Eye size={14} />
                    <span>Mở xem chi tiết chứng từ</span>
                  </Link>
                </div>

                <p>
                  {quickTarget.decision === 'APPROVE'
                    ? 'Hồ sơ đã ghi nhận đủ giấy tờ bắt buộc (GPKD, CCCD/CMND, ảnh đại diện và cam kết). Sau khi xác nhận, nhà trọ sẽ được xuất bản sang trạng thái Đang hiển thị.'
                    : 'Quyết định từ chối sẽ đóng hồ sơ này và gửi trực tiếp nguyên nhân từ chối đến chủ trọ.'}
                </p>

                <label className="sw-review-label" htmlFor="sv-quick-review-note">
                  {quickTarget.decision === 'REJECT' ? 'Lý do từ chối hồ sơ' : 'Ghi chú phê duyệt (tùy chọn)'}
                  {quickTarget.decision === 'REJECT' && <span className="sw-required"> *</span>}
                </label>
                <textarea
                  id="sv-quick-review-note"
                  autoFocus
                  rows={4}
                  maxLength={2000}
                  required={quickTarget.decision === 'REJECT'}
                  aria-invalid={Boolean(quickError)}
                  placeholder={
                    quickTarget.decision === 'REJECT'
                      ? 'Nêu rõ lý do hồ sơ không đạt yêu cầu xác minh (tối thiểu 10 ký tự)...'
                      : 'Nhập ghi chú thẩm định lưu vào nhật ký (không bắt buộc)...'
                  }
                  value={quickNote}
                  disabled={quickBusy}
                  onChange={event => {
                    setQuickNote(event.target.value);
                    setQuickError('');
                  }}
                />
                <small>
                  {quickNote.trim().length}/2000 ký tự
                  {quickTarget.decision === 'REJECT' ? ' · Tối thiểu 10 ký tự' : ''}
                </small>
                {quickError && (
                  <p className="sw-error" role="alert">
                    {quickError}
                  </p>
                )}
              </div>

              <footer className="sw-review-footer">
                <MotionButton type="button" className="p-button" disabled={quickBusy} onClick={closeQuickDecision}>
                  Hủy bỏ
                </MotionButton>
                <MotionButton
                  type="submit"
                  className={quickTarget.decision === 'APPROVE' ? 'sw-primary' : 'sw-danger'}
                  disabled={quickBusy}
                >
                  {quickBusy ? (
                    <>
                      <LoaderCircle size={16} className="spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : quickTarget.decision === 'APPROVE' ? (
                    <>
                      <Check size={16} />
                      <span>Xác nhận phê duyệt</span>
                    </>
                  ) : (
                    <>
                      <X size={16} />
                      <span>Xác nhận từ chối</span>
                    </>
                  )}
                </MotionButton>
              </footer>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
