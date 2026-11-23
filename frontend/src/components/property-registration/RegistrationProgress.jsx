import { AlertCircle, Check } from 'lucide-react';
import { STEPS } from '../../services/property-registration.js';

/**
 * 6-step horizontal progress indicator for Property Registration.
 * Shows clear visual states: upcoming, current, done (Check), error (AlertCircle).
 * Compact responsive progress bar on mobile so users always know their active step.
 */
export default function RegistrationProgress({
  step,
  furthestStep,
  stepErrors = {},
  disabled = false,
  onSelectStep
}) {
  const percent = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="prw-progress-wrap">
      {/* Compact mobile summary header */}
      <div className="prw-progress-mobile" aria-hidden="true">
        <div className="prw-progress-mobile-top">
          <span className="prw-progress-mobile-step">
            Bước {step + 1} / {STEPS.length}
          </span>
          <strong>{STEPS[step]}</strong>
        </div>
        <div className="prw-progress-bar">
          <span style={{ width: `${percent}%` }} />
        </div>
      </div>

      {/* Desktop / Tablet 6-step horizontal stepper */}
      <nav className="prw-stepper" aria-label="Các bước khai báo nhà trọ">
        {STEPS.map((label, index) => {
          const hasError = Boolean(stepErrors[index]);
          const isCurrent = index === step;
          const isDone = index < step && !hasError;
          const canJump = !disabled && index <= furthestStep;
          const stateClass = hasError
            ? 'is-error'
            : isCurrent
              ? 'is-current'
              : isDone
                ? 'is-done'
                : 'is-upcoming';

          return (
            <button
              key={label}
              type="button"
              className={`prw-step-btn ${stateClass}`}
              disabled={!canJump}
              aria-current={isCurrent ? 'step' : undefined}
              onClick={() => onSelectStep(index)}
            >
              <span className="prw-step-circle" aria-hidden="true">
                {hasError ? (
                  <AlertCircle size={15} />
                ) : isDone ? (
                  <Check size={15} strokeWidth={2.6} />
                ) : (
                  index + 1
                )}
              </span>
              <span className="prw-step-label">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
