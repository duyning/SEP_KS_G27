import { useId } from 'react';
import Field from './common/Field.jsx';
import { ALL_SERVICE_AREAS, STANDARD_SERVICE_AREAS, areaList } from '../services/service-areas.js';

export default function ServiceAreaSelect({ value, customValue, otherEnabled, onChange, error, customError }) {
  const id = useId();
  const selected = areaList(value);
  const all = selected.includes(ALL_SERVICE_AREAS);
  const update = (name, next) => onChange({ target: { name, value: next } });
  return <fieldset className="svc-area-select" tabIndex={-1} aria-invalid={!!error} aria-describedby={id}>
    <legend>Khu vực phục vụ<span className="svc-required" aria-hidden="true"> *</span></legend>
    <div className="svc-area-options">
      <Field className="svc-area-option"><input type="checkbox" name="serviceArea" checked={all} onChange={event => {
        update('serviceArea', event.target.checked ? ALL_SERVICE_AREAS : '');
        update('otherAreasEnabled', false); update('customServiceAreas', '');
      }} /><span>{ALL_SERVICE_AREAS}</span></Field>
      {STANDARD_SERVICE_AREAS.map(area => <Field key={area} className="svc-area-option">
        <input type="checkbox" name="serviceArea" disabled={all} checked={!all && selected.includes(area)} onChange={event => {
          const next = event.target.checked ? [...selected, area] : selected.filter(item => item !== area);
          update('serviceArea', next.join(', '));
        }} /><span>{area}</span>
      </Field>)}
      <Field className="svc-area-option"><input type="checkbox" disabled={all} checked={!all && otherEnabled} onChange={event => {
        update('otherAreasEnabled', event.target.checked);
        if (!event.target.checked) update('customServiceAreas', '');
      }} /><span>Khu vực khác</span></Field>
    </div>
    {otherEnabled && !all && <Field label={<>Khu vực khác<span className="svc-required" aria-hidden="true"> *</span></>} error={customError} helper="Ngăn cách bằng dấu phẩy; tối đa 5 mục, mỗi mục 2–100 ký tự.">
      <input className="svc-text-input" type="text" name="customServiceAreas" required maxLength={2000} value={customValue} placeholder="VD: Yên Bình, Phú Cát"
        onChange={event => update('customServiceAreas', event.target.value)} onBlur={() => update('customServiceAreas', areaList(customValue).join(', '))} />
    </Field>}
    <small id={id} className={error ? 'svc-field-error' : 'svc-field-hint'} role={error ? 'alert' : undefined}>{error || 'Chọn một hoặc nhiều khu vực phục vụ.'}</small>
  </fieldset>;
}
