import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  LoaderCircle,
  Save
} from 'lucide-react';
import { MotionButton } from '../motion/MotionUI.jsx';
import { ButtonLoading } from '../loading/index.js';

/**
 * Unified sticky-friendly action footer across all 6 steps.
 * Left: Back + Save Draft (with live saved/saving/failed badge).
 * Right: Continue (or Save & Return to Review) / Submit Application on Step 6.
 */
export default function WizardNavigation({
  step,
  totalSteps = 6,
  returnToReview = false,
  submitting = false,
  accessBlocked = false,
  canSubmit = true,
  hasOnboardingBack = false,
  draftState = 'idle', // idle | saving | saved | error
  draftMessage = '',
  onBack,
  onSaveDraft
}) {
  const isFirst = step === 0;
  const isLast = step === totalSteps - 1;
  const backDisabled = submitting || (isFirst && !hasOnboardingBack);
  const backLabel = isFirst && hasOnboardingBack ? 'Tài khoản & CCCD' : 'Quay lại';

  return (
    <div className="prw-nav-shell">
      <div
        className={`prw-draft-bar is-${draftState}`}
        role="status"
        aria-live="polite"
      >
        <span className="prw-draft-icon" aria-hidden="true">
          {draftState === 'saving' ? (
            <LoaderCircle size={14} className="spin" />
          ) : draftState === 'saved' ? (
            <CheckCircle2 size={14} />
          ) : draftState === 'error' ? (
            <AlertCircle size={14} />
          ) : (
            <Save size={14} />
          )}
        </span>
        <div className="prw-draft-copy">
          <strong>
            {draftMessage ||
              'Thông tin văn bản được tự động lưu bản nháp khi bạn nhập và chuyển bước.'}
          </strong>
          <small>
            Ảnh và giấy tờ xác minh chỉ giữ trong phiên hiện tại (không lưu vào bộ nhớ cục bộ để bảo mật).
          </small>
        </div>
      </div>

      <footer className="prw-actions">
        <div className="prw-actions-left">
          <MotionButton
            type="button"
            className="prw-btn prw-btn-secondary"
            disabled={backDisabled}
            onClick={onBack}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>{backLabel}</span>
          </MotionButton>

          {!isLast && (
            <MotionButton
              type="button"
              className="prw-btn prw-btn-ghost"
              disabled={submitting || accessBlocked}
              onClick={onSaveDraft}
            >
              <Save size={15} aria-hidden="true" />
              <span>Lưu bản nháp</span>
            </MotionButton>
          )}
        </div>

        <div className="prw-actions-right">
          <MotionButton
            type="submit"
            className="prw-btn prw-btn-primary prw-next-btn"
            disabled={submitting || accessBlocked || (isLast && !canSubmit)}
            aria-busy={submitting || undefined}
          >
            <ButtonLoading loading={submitting} loadingText="Đang gửi hồ sơ…">
              {isLast ? (
                <span className="prw-btn-inner">
                  <Check size={16} aria-hidden="true" />
                  <span>Gửi hồ sơ xét duyệt</span>
                </span>
              ) : (
                <span className="prw-btn-inner">
                  <span>{returnToReview ? 'Lưu & Quay lại kiểm tra' : 'Tiếp tục'}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </span>
              )}
            </ButtonLoading>
          </MotionButton>
        </div>
      </footer>
    </div>
  );
}
