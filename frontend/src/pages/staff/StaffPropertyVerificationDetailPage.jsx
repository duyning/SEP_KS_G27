import ReverificationNotice from '../../components/ReverificationNotice.jsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { AutoHeight } from '@animate-ui/react/primitives/effects/auto-height';
import { Highlight, HighlightItem } from '@animate-ui/react/primitives/effects/highlight';
import { useMotionTokens, useShouldReduceMotion, useTempoTransition } from '@animate-ui/react/utils/motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FilePenLine,
  FileText,
  History,
  House,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import { AnimatePresence, MotionButton } from '../../components/motion/MotionUI.jsx';
import { Modal, useToast } from '../../components/PortalUI.jsx';
import { StaffLoadState, StaffStatus, staffDate, useStaffLoad } from '../../components/StaffUI.jsx';
import { staffApi } from '../../services/staff.js';
import {
  VerificationDocuments,
  VerificationFields,
  VerificationHistory,
  VerificationOwnerInfo,
  VerificationPropertyInfo,
} from '../../components/VerificationDetailSections.jsx';
import SupplementRequestFields from '../../components/SupplementRequestFields.jsx';
import { composeSupplementNote, supplementGroups } from '../../services/supplement-request.js';
import VerificationChangeComparison from '../../components/VerificationChangeComparison.jsx';
import { classifyVerificationRecord, getVerificationDetailActions } from '../../services/staff-verifications.js';
import '../../styles/staff-verification-detail.css';
import '../../styles/staff-verifications-refinement.css';

const DETAIL_SECTIONS = [
  { id: 'svd-section-property', label: '1. Nhà trọ & Bản đồ', icon: House },
  { id: 'svd-section-owner', label: '2. Chủ trọ & Liên hệ', icon: UserRound },
  { id: 'svd-section-documents', label: '3. Tài liệu pháp lý', icon: FileText },
  { id: 'svd-section-history', label: '4. Lịch sử thẩm định', icon: History },
];

function StatusModeIcon({ mode }) {
  if (mode === 'FINAL_APPROVED') return <CheckCircle2 size={18} />;
  if (mode === 'FINAL_REJECTED') return <XCircle size={18} />;
  if (mode === 'WAITING_SUPPLEMENT') return <FilePenLine size={18} />;
  if (mode === 'ACTIVE_REVIEW') return <Clock3 size={18} />;
  return <ShieldCheck size={18} />;
}

export default function StaffPropertyVerificationDetailPage() {
  const [params, setParams] = useSearchParams();
  const id = params.get('id');
  const requestedDecisionParam = params.get('decision');
  const state = useStaffLoad('detail', id);
  const notify = useToast();

  const [activeSection, setActiveSection] = useState('svd-section-property');
  const [preview, setPreview] = useState(null);
  const [fileError, setFileError] = useState('');
  const [fileLoading, setFileLoading] = useState(false);
  const [decision, setDecision] = useState(null);
  const [note, setNote] = useState('');
  const [selectedFields, setSelectedFields] = useState([]);
  const [fieldNotes, setFieldNotes] = useState({});
  const [reviewError, setReviewError] = useState('');
  const [busy, setBusy] = useState(false);

  const fileRequest = useRef();
  const reviewRequest = useRef();
  const previewUrl = useRef();

  const reduce = useShouldReduceMotion();
  const tokens = useMotionTokens();
  const highlightSpring = useTempoTransition(tokens.spring.highlight);
  const swapTransition = useTempoTransition(tokens.transition.swap);

  useEffect(() => {
    setPreview(null);
    setDecision(null);
    setSelectedFields([]);
    setFieldNotes({});
    setFileError('');
    setFileLoading(false);
    setBusy(false);
    return () => {
      fileRequest.current?.abort();
      reviewRequest.current?.abort();
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    };
  }, [id]);

  const decisionConfig = useMemo(() => getVerificationDetailActions(state.data), [state.data]);

  // Support deep-linked action from list row (e.g. ?id=105&decision=REQUEST_SUPPLEMENT) when valid & actionable.
  useEffect(() => {
    if (!state.data || state.loading || !requestedDecisionParam) return;
    const matched = decisionConfig.decisions.find(
      item => item.decision === requestedDecisionParam && !item.disabled
    );
    const nextParams = new URLSearchParams(params);
    nextParams.delete('decision');
    setParams(nextParams, { replace: true });
    if (matched) {
      setDecision(matched.decision);
      setSelectedFields([]);
      setFieldNotes({});
      setNote('');
      setReviewError('');
    }
  }, [state.data, state.loading, requestedDecisionParam, decisionConfig.decisions, params, setParams]);

  useEffect(() => {
    if (!state.data || state.loading || busy) return;
    const controller = new AbortController();
    let checking = false;
    const check = async () => {
      if (checking || document.visibilityState === 'hidden') return;
      checking = true;
      try {
        const next = await staffApi.detail(controller.signal, id);
        if (
          !controller.signal.aborted &&
          (next.assignmentVersion !== state.data.assignmentVersion ||
            next.summary.status !== state.data.summary.status)
        ) {
          closePreview();
          setDecision(null);
          state.replace(next);
        }
      } catch (error) {
        if (!controller.signal.aborted && [403, 404].includes(error.status)) {
          closePreview();
          setDecision(null);
          state.deny(error);
        }
      } finally {
        checking = false;
      }
    };
    const timer = setInterval(check, 30000);
    window.addEventListener('focus', check);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener('focus', check);
    };
  }, [id, state.data, state.loading, busy]);

  const closePreview = () => {
    setPreview(null);
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
  };

  const scrollToTarget = targetId => {
    setActiveSection(targetId);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  };

  const openFile = async file => {
    fileRequest.current?.abort();
    const controller = new AbortController();
    fileRequest.current = controller;
    setFileLoading(true);
    setFileError('');
    try {
      const blob = await staffApi.file(id, file.documentId, controller.signal);
      if (controller.signal.aborted) return;
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      const url = URL.createObjectURL(blob);
      previewUrl.current = url;
      setPreview({ url, type: blob.type, name: file.fileName || 'tai-lieu' });
    } catch (error) {
      if (!controller.signal.aborted) {
        setFileError(error.message);
        if ([403, 404].includes(error.status)) {
          closePreview();
          setDecision(null);
          state.deny(error);
        }
      }
    } finally {
      if (!controller.signal.aborted) setFileLoading(false);
    }
  };

  const openDecisionModal = nextDecision => {
    setDecision(nextDecision);
    setSelectedFields([]);
    setFieldNotes({});
    setNote('');
    setReviewError('');
  };

  const review = async event => {
    event.preventDefault();
    if (reviewRequest.current) return;
    const supplement = decision === 'REQUEST_SUPPLEMENT';
    if (supplement && !selectedFields.length) {
      setReviewError('Vui lòng chọn ít nhất một mục cần chủ trọ bổ sung.');
      return;
    }
    const cleanedFieldNotes = supplement
      ? Object.fromEntries(
          selectedFields
            .map(key => [key, (fieldNotes[key] || '').trim()])
            .filter(([, value]) => Boolean(value))
        )
      : undefined;
    const reviewNote = supplement
      ? composeSupplementNote(supplementGroups(state.data), selectedFields, note, cleanedFieldNotes)
      : note.trim();
    if (decision !== 'APPROVE' && (reviewNote.length < 10 || reviewNote.length > 2000)) {
      setReviewError('Nội dung yêu cầu và ghi chú cần từ 10 đến 2000 ký tự. Vui lòng rút gọn ghi chú nếu quá dài.');
      return;
    }
    const controller = new AbortController();
    reviewRequest.current = controller;
    setBusy(true);
    setReviewError('');
    try {
      const data = await staffApi.review(
        id,
        decision,
        reviewNote,
        controller.signal,
        supplement ? selectedFields : undefined,
        state.data.assignmentVersion,
        cleanedFieldNotes
      );
      if (controller.signal.aborted) return;
      state.replace(data);
      setDecision(null);
      setNote('');
      setFieldNotes({});
      notify?.(
        decision === 'REQUEST_SUPPLEMENT'
          ? 'Đã gửi yêu cầu bổ sung. Chủ trọ có thể xem ghi chú tại từng mục trong Nhà trọ của tôi.'
          : decision === 'APPROVE'
            ? 'Đã phê duyệt hồ sơ. Nhà trọ được chuyển sang trạng thái Đang hiển thị.'
            : 'Đã từ chối hồ sơ và lưu lý do cho chủ trọ.',
        'success'
      );
      window.dispatchEvent(new Event('hlrcs:staff-updated'));
    } catch (error) {
      if (!controller.signal.aborted) {
        setReviewError(error.message);
        if ([403, 404].includes(error.status)) {
          closePreview();
          setDecision(null);
          state.deny(error);
        } else if (error.status === 409) {
          setDecision(null);
          state.reload();
          notify?.(error.message, 'error');
        }
      }
    } finally {
      if (reviewRequest.current === controller) reviewRequest.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  if (state.loading || state.error) {
    return (
      <div className="sw-page">
        <Link className="sw-back" to="/staff/verifications">
          <ArrowLeft size={16} />
          Danh sách hồ sơ
        </Link>
        <StaffLoadState state={state} />
      </div>
    );
  }

  const { summary, submission: form, photos, documents, history, reasonNote } = state.data;
  const recordMeta = classifyVerificationRecord(summary);
  const supplement = decision === 'REQUEST_SUPPLEMENT';
  const feedbackTone =
    summary.status === 'APPROVED' ? 'approved' : summary.status === 'REJECTED' ? 'rejected' : 'supplement';

  return (
    <div className="sw-page svd-page">
      <header className="sw-page-heading svd-page-toolbar">
        <Link className="sw-back" to="/staff/verifications">
          <ArrowLeft size={15} />
          Quay lại danh sách xác minh
        </Link>
        <div className="sw-heading-actions">
          <span className="svd-record-code">HS-{summary.registrationId}</span>
          <span className={`sv-kind-chip tone-${recordMeta.submissionTone}`}>
            {recordMeta.isResubmitted && <Sparkles size={11} />}
            {recordMeta.submissionLabel}
          </span>
          <StaffStatus status={summary.status} />
        </div>
      </header>

      <nav className="svd-section-nav" aria-label="Điều hướng nhanh các phần thẩm định">
        <Highlight
          value={activeSection}
          onValueChange={val => val && scrollToTarget(val)}
          controlledItems
          transition={highlightSpring}
          className="svd-nav-highlight"
        >
          <div className="svd-nav-pills">
            {DETAIL_SECTIONS.map(section => {
              const Icon = section.icon;
              const isCurrent = activeSection === section.id;
              return (
                <HighlightItem key={section.id} value={section.id} className="svd-nav-item">
                  <button
                    type="button"
                    className={`svd-nav-btn ${isCurrent ? 'is-active' : ''}`}
                    aria-current={isCurrent ? 'location' : undefined}
                    onClick={() => scrollToTarget(section.id)}
                  >
                    <Icon size={14} />
                    <span>{section.label}</span>
                  </button>
                </HighlightItem>
              );
            })}
          </div>
        </Highlight>
      </nav>

      {reasonNote && (
        <section
          id="svd-feedback-banner"
          className={`sv-review-feedback tone-${feedbackTone}`}
          aria-label="Phản hồi xét duyệt"
        >
          {summary.status === 'APPROVED' ? (
            <CheckCircle2 size={20} />
          ) : summary.status === 'REJECTED' ? (
            <XCircle size={20} />
          ) : (
            <FilePenLine size={20} />
          )}
          <div>
            <strong>
              {summary.status === 'APPROVED'
                ? 'Ghi chú phê duyệt hồ sơ'
                : summary.status === 'REJECTED'
                  ? 'Biên bản / Lý do từ chối hồ sơ'
                  : 'Nội dung đã yêu cầu chủ trọ bổ sung'}
            </strong>
            <p>{reasonNote}</p>
          </div>
        </section>
      )}

      <ReverificationNotice required={summary.reverificationRequired} reasons={summary.reverificationReasons} status={summary.status} staff/>
      <div className="sw-detail-layout svd-grid">
        <div className="svd-main">
          <VerificationChangeComparison
            previous={state.data.publishedSubmission}
            current={form}
            propertyId={summary.targetPropertyId}
          />
          <VerificationPropertyInfo summary={summary} submission={form} photos={photos} onOpen={openFile} />
          <VerificationOwnerInfo summary={summary} submission={form} />
          <VerificationDocuments documents={documents} onOpen={openFile} loading={fileLoading} error={fileError} />
          <VerificationHistory summary={summary} history={history} submissionEvents={state.data.submissionEvents} />
        </div>

        <aside className="svd-decision-column">
          <section className="sw-panel svd-decision-card">
            <header>
              <h3>Quyết định thẩm định</h3>
              <span className="svd-reviewer-tag">
                {state.data.canReview ? 'Có quyền xử lý' : 'Chế độ tra cứu'}
              </span>
            </header>

            <div className="svd-current-status">
              <span>Trạng thái hiện tại:</span>
              <StaffStatus status={summary.status} />
            </div>

            <VerificationFields
              rows={[
                ['Mã hồ sơ', `HS-${summary.registrationId}`],
                ['Phân loại hồ sơ', recordMeta.submissionLabel],
                ['Ngày nộp ban đầu', staffDate(summary.createdAt)],
                ['Gửi lại gần nhất', staffDate(summary.submittedAt || summary.createdAt)],
                ['Cập nhật xét duyệt', summary.reviewedAt ? staffDate(summary.reviewedAt) : 'Chưa xử lý'],
                ...(state.data.assignedStaffName ? [['Staff phụ trách', state.data.assignedStaffName]] : []),
                ['Người xử lý cuối', summary.reviewerName || 'Chưa có người xử lý'],
              ]}
            />

            <div className="svd-checklist-box" aria-label="Bảng kiểm điều kiện hồ sơ">
              <div className="svd-checklist-header">
                <h4 className="svd-label">Kiểm tra điều kiện hồ sơ</h4>
                <span className={`svd-ready-tag ${decisionConfig.mandatoryReady ? 'ready' : 'missing'}`}>
                  {decisionConfig.mandatoryReady ? 'Đủ mục bắt buộc' : 'Thiếu mục bắt buộc'}
                </span>
              </div>
              <ul className="svd-checklist">
                {decisionConfig.checklist.map(item => (
                  <li key={item.key} className={item.passed ? 'passed' : item.required ? 'missing' : 'optional'}>
                    <span className="svd-check-mark" aria-hidden="true">
                      {item.passed ? <Check size={12} /> : item.required ? <AlertTriangle size={12} /> : '•'}
                    </span>
                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <AutoHeight deps={[decisionConfig.mode, summary.status, decisionConfig.mandatoryReady]}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={`${decisionConfig.mode}-${summary.status}`}
                  initial={{ opacity: 0, filter: reduce ? 'none' : tokens.blur.icon }}
                  animate={{ opacity: 1, filter: 'blur(0px)', transition: swapTransition }}
                  exit={{ opacity: 0, filter: reduce ? 'none' : tokens.blur.icon, transition: swapTransition }}
                  className="svd-state-action-zone"
                >
                  <div className={`svd-mode-banner tone-${decisionConfig.tone}`}>
                    <StatusModeIcon mode={decisionConfig.mode} />
                    <div>
                      <strong>{decisionConfig.headline}</strong>
                      <p>{decisionConfig.description}</p>
                    </div>
                  </div>

                  {decisionConfig.decisions.length > 0 && (
                    <>
                      <h4 className="svd-label">Hành động khả dụng ở trạng thái này</h4>
                      <div className="sw-review-actions">
                        {decisionConfig.decisions.map(action => {
                          const btnClass =
                            action.variant === 'primary'
                              ? 'sw-primary'
                              : action.variant === 'amber'
                                ? 'sw-amber-outline'
                                : 'sw-danger';
                          return (
                            <div key={action.decision} className="svd-decision-item">
                              <MotionButton
                                type="button"
                                className={`${btnClass} ${action.recommended ? 'is-recommended' : ''}`}
                                disabled={action.disabled || busy}
                                title={action.disabledReason || undefined}
                                onClick={() => openDecisionModal(action.decision)}
                              >
                                {action.decision === 'APPROVE' && <Check size={16} />}
                                {action.decision === 'REQUEST_SUPPLEMENT' && <FilePenLine size={16} />}
                                {action.decision === 'REJECT' && <X size={16} />}
                                <span>{action.label}</span>
                                {action.recommended && <span className="svd-rec-pill">Đề xuất</span>}
                              </MotionButton>
                              {action.disabled && action.disabledReason && (
                                <small className="svd-disabled-reason">{action.disabledReason}</small>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {(decisionConfig.publicPropertyUrl || decisionConfig.jumpLinks.length > 0) && (
                    <div className="svd-post-actions">
                      <h4 className="svd-label">
                        {decisionConfig.decisions.length > 0 ? 'Lối tắt kiểm tra nhanh' : 'Tác vụ tra cứu hồ sơ'}
                      </h4>
                      <div className="svd-jump-links">
                        {decisionConfig.publicPropertyUrl && (
                          <Link
                            className="svd-public-link"
                            to={decisionConfig.publicPropertyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink size={14} />
                            <span>Xem tin đăng nhà trọ công khai</span>
                          </Link>
                        )}
                        {decisionConfig.jumpLinks.map(jump => (
                          <button
                            key={jump.target}
                            type="button"
                            className="svd-jump-btn"
                            onClick={() => scrollToTarget(jump.target)}
                          >
                            <span>{jump.label}</span>
                            <ArrowUpRight size={14} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </AutoHeight>
          </section>
        </aside>
      </div>

      <AnimatePresence>
        {preview && (
          <Modal title={preview.name} onClose={closePreview}>
            {preview.type === 'application/pdf' ? (
              <iframe
                className="sw-document-preview"
                src={preview.url}
                title="Xem tài liệu PDF"
                sandbox="allow-same-origin"
              />
            ) : (
              <img className="sw-image-preview" src={preview.url} alt={preview.name} />
            )}
            <a className="sw-outline" href={preview.url} download={preview.name}>
              <Download size={16} />
              Tải tài liệu
            </a>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {decision && (
          <Modal
            className={`sw-review-modal ${supplement ? 'sw-supplement-modal' : ''}`}
            title={
              supplement ? (
                <>
                  <FilePenLine size={24} />
                  Yêu cầu Chủ trọ Bổ sung thông tin / Hồ sơ
                </>
              ) : decision === 'APPROVE' ? (
                'Phê duyệt hồ sơ nhà trọ'
              ) : (
                'Từ chối hồ sơ nhà trọ'
              )
            }
            onClose={() => {
              if (!busy) setDecision(null);
            }}
          >
            <form onSubmit={review} noValidate aria-busy={busy}>
              {supplement ? (
                <SupplementRequestFields
                  detail={state.data}
                  selected={selectedFields}
                  onChange={value => {
                    setSelectedFields(value);
                    setReviewError('');
                  }}
                  fieldNotes={fieldNotes}
                  onFieldNoteChange={(key, value) => {
                    setFieldNotes(previous => ({ ...previous, [key]: value }));
                    setReviewError('');
                  }}
                  note={note}
                  onNoteChange={value => {
                    setNote(value);
                    setReviewError('');
                  }}
                  busy={busy}
                  error={reviewError}
                />
              ) : (
                <div className="sw-review-body">
                  <p>
                    {decision === 'APPROVE'
                      ? 'Xác nhận đã kiểm tra đầy đủ thông tin và tài liệu. Nếu là đề nghị thay đổi, bản mới sẽ được áp dụng cho nhà trọ hiện tại sau khi phê duyệt.'
                      : 'Lý do từ chối sẽ được lưu và hiển thị cho chủ trọ.'}
                  </p>
                  <label className="sw-review-label" htmlFor="staff-review-note">
                    {decision === 'REJECT' ? 'Lý do từ chối' : 'Ghi chú xét duyệt (tùy chọn)'}
                    {decision !== 'APPROVE' && <span className="sw-required"> *</span>}
                  </label>
                  <textarea
                    id="staff-review-note"
                    autoFocus
                    rows={4}
                    maxLength={2000}
                    required={decision !== 'APPROVE'}
                    aria-invalid={Boolean(reviewError)}
                    aria-describedby={reviewError ? 'staff-review-error' : 'staff-review-count'}
                    placeholder={
                      decision === 'REJECT'
                        ? 'Nêu rõ lý do hồ sơ chưa đáp ứng yêu cầu...'
                        : 'Nhập ghi chú xét duyệt...'
                    }
                    value={note}
                    disabled={busy}
                    onChange={event => {
                      setNote(event.target.value);
                      setReviewError('');
                    }}
                  />
                  <small id="staff-review-count">
                    {note.trim().length}/2000 ký tự
                    {decision !== 'APPROVE' ? ' · Tối thiểu 10 ký tự' : ''}
                  </small>
                  {reviewError && (
                    <p id="staff-review-error" className="sw-error" role="alert">
                      {reviewError}
                    </p>
                  )}
                </div>
              )}
              <footer className="sw-review-footer">
                <MotionButton type="button" className="p-button" disabled={busy} onClick={() => setDecision(null)}>
                  Hủy bỏ
                </MotionButton>
                <MotionButton
                  type="submit"
                  className={supplement ? 'sw-amber' : decision === 'APPROVE' ? 'sw-primary' : 'sw-danger'}
                  disabled={busy}
                >
                  {busy ? (
                    <>
                      <LoaderCircle size={16} className="spin" />
                      Đang lưu...
                    </>
                  ) : supplement ? (
                    'Gửi yêu cầu bổ sung'
                  ) : (
                    'Xác nhận quyết định'
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
