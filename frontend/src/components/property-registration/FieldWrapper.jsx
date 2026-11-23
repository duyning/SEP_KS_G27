import { AlertCircle } from 'lucide-react';
import UIField from '../common/Field.jsx';

export default function FieldWrapper({
  name,
  label,
  required = false,
  optional = false,
  count,
  max,
  hint,
  error,
  children
}) {
  return (
    <div className={`prw-field${error ? ' has-error' : ''}`}>
      <div className="prw-field-head">
        <UIField htmlFor={name} className="prw-field-label">
          <span>{label}</span>
          {required && (
            <span className="prw-required" aria-label="bắt buộc">
              *
            </span>
          )}
          {optional && <span className="prw-optional-pill">Tùy chọn</span>}
        </UIField>
        {typeof max === 'number' && (
          <span
            className={`prw-char-count${count > max * 0.9 ? ' is-near' : ''}${
              count > max ? ' is-over' : ''
            }`}
          >
            {Number(count || 0).toLocaleString('vi-VN')}/{max.toLocaleString('vi-VN')}
          </span>
        )}
      </div>

      {children}

      {error ? (
        <p className="prw-field-error" id={`${name}-error`} role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="prw-field-hint" id={`${name}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
