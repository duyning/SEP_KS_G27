import ServicePrice from './ServicePrice.jsx';
import { PRICE_UNITS, normalizePriceUnit, suggestedPriceUnit } from '../services/service-price.js';
import { areaList, splitServiceAreas, serviceAreaText } from '../services/service-areas.js';
import ServiceAreaSelect from './ServiceAreaSelect.jsx';
import StatusBadge from './common/StatusBadge.jsx';
import UIField from './common/Field.jsx';
import UIButton from './common/Button.jsx';
import { serviceFileName } from '../services/service-form.js';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock3, Download, FileText, RefreshCw, X } from 'lucide-react';
import Modal from './common/Modal.jsx';
import ServiceGallery from './ServiceGallery.jsx';
import ServiceFormSelect from './ServiceFormSelect.jsx';
import ServiceMoneyInput from './ServiceMoneyInput.jsx';
import ServiceExpandableText from './ServiceExpandableText.jsx';
import '../styles/service-registration-form.css';
import { useAuth } from '../context/AuthContext.jsx';
import { serviceRegistrationApi as api, validateServiceRegistrationFields, serviceRegistrationFieldErrors } from '../services/service-registration.js';


const statuses = { PENDING: 'Chờ xét duyệt', NEEDS_SUPPLEMENT: 'Cần bổ sung hồ sơ', APPROVED: 'Đã được duyệt', REJECTED: 'Bị từ chối' };
const reasons = { HAS_CAPABILITY: 'Tài khoản đã có quyền cung cấp dịch vụ.', APPROVED: 'Hồ sơ của bạn đã được duyệt.', IN_REVIEW: 'Hồ sơ đang được xử lý. Bạn chưa thể gửi hồ sơ mới.' };
const inputStyle = { width: '100%', padding: '9px var(--space-3)', borderRadius: 8 };

export default function ServiceRegistrationModal({ onClose, applicationId, createNew = false, editService }) {
  const { user } = useAuth();
  const [customUnit, setCustomUnit] = useState(false);
  const unitChosen = useRef(false);
  const [form, setForm] = useState({ applicantName: user?.fullName || '', contactPhone: user?.phoneNumber || '', contactEmail: user?.email || '', categoryId: '', serviceName: '', description: '', serviceArea: '', customServiceAreas: '', otherAreasEnabled: false, pricingType: 'FIXED', price: '', priceUnit: '' });
  const [files, setFiles] = useState([]);
  const [image, setImage] = useState([]);
  const [preview, setPreview] = useState([]);
  useEffect(() => { const urls = image.map(file => URL.createObjectURL(file)); setPreview(urls); return () => urls.forEach(url => URL.revokeObjectURL(url)); }, [image]);
  const [categories, setCategories] = useState([]);
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const content = useRef(null); const focusError = useRef(false); const formId = useId();
  useEffect(() => {
    if (!focusError.current) return;
    const target = content.current?.querySelector('[aria-invalid="true"]') || content.current?.querySelector('[data-form-error]');
    if (target?.disabled) return;
    if (target) { target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    focusError.current = false;
  }, [fieldErrors, error, busy]);
  useEffect(() => {
    if (!submitted) return;
    const dialog = content.current?.closest('dialog');
    dialog?.scrollTo({ top: 0, behavior: 'instant' });
    content.current?.querySelector('.svc-submit-success')?.focus({ preventScroll: true });
  }, [submitted]);
  const clearFieldError = name => setFieldErrors(previous => { if (!previous[name]) return previous; const next = { ...previous }; delete next[name]; return next; });
  const feedback = (name, hint) => <small id={formId + '-' + name} className={fieldErrors[name] ? 'svc-field-error' : 'svc-field-hint'} role={fieldErrors[name] ? 'alert' : undefined}>{fieldErrors[name] || hint}</small>;
  const hints = { applicantName: 'Từ 2 đến 100 ký tự.', serviceName: 'Từ 3 đến 255 ký tự; tên không trùng với dịch vụ khác của bạn.', serviceArea: 'Từ 2 đến 500 ký tự, ví dụ: Tân Xã, Thạch Hòa.', contactPhone: 'Số di động Việt Nam: 10 số hoặc bắt đầu bằng +84.', contactEmail: 'Không bắt buộc; ví dụ: ten@example.com, tối đa 255 ký tự.' };
  const [reload, setReload] = useState(0);
  const [retained, setRetained] = useState([]);
  const [note, setNote] = useState('');
  const [stale, setStale] = useState(false);
  const supplement = state?.registration?.status === 'NEEDS_SUPPLEMENT';
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError(''); setFieldErrors({});
    Promise.all([api.categories(controller.signal), (applicationId ? api.mine(controller.signal).then(rows => { const registration = rows.find(row => row.registrationId === applicationId); if (!registration) throw new Error('Không tìm thấy hồ sơ.'); return { canRegister: false, reason: 'IN_REVIEW', registration }; }) : api.current(controller.signal))]).then(([rows, current]) => {
      if (controller.signal.aborted) return;
      setCategories(rows); setState(editService || createNew ? { canRegister: true, reason: 'ELIGIBLE', registration: null } : current); setStale(false);
      const loadedUnit = (editService || current.registration)?.priceUnit || '';
      if (editService || (!createNew && current.registration?.status === 'NEEDS_SUPPLEMENT')) { setCustomUnit(!!loadedUnit && !PRICE_UNITS.includes(loadedUnit)); unitChosen.current = true; }
      if (editService) setForm(previous => ({ ...Object.fromEntries(Object.keys(previous).map(key => [key, editService[key] ?? ''])), ...splitServiceAreas(editService) }));
      if (!editService && !createNew && current.registration?.status === 'NEEDS_SUPPLEMENT') {
        const row = current.registration;
        setForm(previous => ({ ...Object.fromEntries(Object.keys(previous).map(key => [key, row[key] ?? ''])), ...splitServiceAreas(row) }));
        setRetained(row.documents.map(doc => doc.documentId)); setFiles([]); setNote('');
      }
    }).catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user, reload, applicationId, createNew, editService]);
  const close = () => { if (!busy) onClose(); };
  const update = e => {
    const { name, value } = e.target;
    if (name === 'priceUnit') unitChosen.current = true;
    setForm(previous => ({ ...previous, [name]: value, ...(name === 'categoryId' && !unitChosen.current ? { priceUnit: suggestedPriceUnit(categories.find(item => String(item.categoryId) === String(value))?.name || '') } : {}) })); clearFieldError(name);
    if (['otherAreasEnabled', 'customServiceAreas'].includes(name)) clearFieldError('serviceArea');
    if (name === 'otherAreasEnabled') clearFieldError('customServiceAreas');
  };
  const validateField = name => {
    if (!name) return;
    const errors = validateServiceRegistrationFields(form, files, { customUnit,
      retainedCount: editService ? 1 : supplement ? retained.length : 0,
      image, imageRequired: !editService && !supplement, note, noteRequired: !!(supplement || editService), categories,
    });
    setFieldErrors(previous => ({ ...previous, [name]: errors[name] }));
  };
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const errors = validateServiceRegistrationFields(form, files, { customUnit,
      retainedCount: editService ? 1 : supplement ? retained.length : 0,
      image, imageRequired: !editService && !supplement, note, noteRequired: !!(supplement || editService), categories,
    });
    setFieldErrors(errors); setError('');
    if (Object.keys(errors).length) { focusError.current = true; return; }
    setBusy(true); setError('');
    try {
      const details = { ...form, priceUnit: normalizePriceUnit(form.priceUnit) || null, customServiceAreas: areaList(form.customServiceAreas).join(', '), categoryId: Number(form.categoryId), price: form.pricingType === 'NEGOTIABLE' ? null : Number(form.price) };
      const registration = editService ? await api.change(editService.serviceId, { operation: 'UPDATE', serviceRevision: editService.serviceRevision, details, note }, image) : supplement ? await api.resubmit(state.registration.registrationId,
        { details, revision: state.registration.revision, retainedDocumentIds: retained, note }, files, image) : await api.submit(details, files, image);
      setState({ canRegister: false, reason: 'IN_REVIEW', registration }); setFiles([]); setImage([]); setSubmitted(true);
    } catch (err) {
      const errors = serviceRegistrationFieldErrors(err);
      focusError.current = true; setFieldErrors(errors);
      if (Object.keys(errors).length) { setError(''); }
      else {
        setError(err.message);
        if (err.status === 409) {
          setStale(true); if (!supplement && !editService && !createNew) { try { setState(await api.current()); } catch { /* Keep error visible. */ } }
        }
      }
    } finally { setBusy(false); }
  }
  async function download(document) {
    setError('');
    try {
      const blob = await api.document(document.documentId);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = document.name; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err.message); }
  }
  const field = (name, label, props = {}) => <UIField style={{ display: 'grid', gap: 6 }} key={name}><span>{label.replace('*', '').trimEnd()}{props.required !== false && <span className="svc-required"> *</span>}</span><input className="svc-text-input" style={inputStyle} name={name} value={form[name]} onChange={update} required {...props} aria-invalid={!!fieldErrors[name]} aria-describedby={formId + '-' + name} />{feedback(name, hints[name])}</UIField>;
  const row = state?.registration;
  return <Modal title={editService ? "Cập nhật dịch vụ — chờ nhân viên duyệt" : "Hồ sơ cung cấp dịch vụ"} onClose={close} maxWidth="680px"><div className="svc-registration-content" ref={content}>
    {submitted && <p role="status" tabIndex={-1} className="svc-submit-success">Đã gửi hồ sơ thành công. Bạn có thể theo dõi kết quả xét duyệt tại đây.</p>}
    {!user ? <p>Bạn cần <Link to="/login" state={{ from: '/services' }}>đăng nhập</Link> để gửi và theo dõi hồ sơ.</p> : loading ? <p role="status">Đang tải hồ sơ...</p> : <>
      {error && <p role="alert" data-form-error tabIndex={-1} style={{ color: '#b91c1c' }}>{error}</p>}
      {!state && <UIButton className="svc-btn" onClick={() => setReload(v => v + 1)}>Thử lại</UIButton>}
      {supplement && <section className="svc-supplement-request" role="status" aria-label="Yêu cầu bổ sung từ nhân viên">
        <h4>Yêu cầu bổ sung từ nhân viên</h4>
        <p className="svc-supplement-reviewer">{row.reviewerName || 'Nhân viên xét duyệt'}{row.supplementRequestedAt && ` · ${new Date(row.supplementRequestedAt).toLocaleString('vi-VN')}`}</p>
        <p className="svc-supplement-instructions">{row.requestedChanges || row.reasonNote || 'Vui lòng liên hệ nhân viên xét duyệt để làm rõ nội dung cần bổ sung.'}</p>
        <p>Sửa thông tin, chọn tài liệu giữ lại hoặc thêm tệp mới bên dưới rồi nộp lại hồ sơ #{row.registrationId}.</p>
      </section>}
      {row && <section className="svc-application-summary" aria-label="Hồ sơ đã gửi">
        <div className="svc-application-heading"><h4>Hồ sơ #{row.registrationId}</h4><StatusBadge status={row.status} label={statuses[row.status] || row.status} /></div>
        <p>{row.serviceName} · {row.categoryName}</p>
        <p>Người đăng ký: {row.applicantName}</p>
        <ServiceExpandableText key={`${row.registrationId}-${row.revision}-description`} text={row.description} label="Mô tả dịch vụ" />
        <p>Khu vực: {serviceAreaText(row)}</p>
        <p>Giá: <ServicePrice service={row} /></p>
        <p>Liên hệ: {row.contactPhone} {row.contactEmail && `· ${row.contactEmail}`}</p>
        {row.resubmittedAt && <><p>Nộp lại: {new Date(row.resubmittedAt).toLocaleString('vi-VN')} · Phiên bản {row.revision}</p><ServiceExpandableText key={`${row.registrationId}-${row.revision}-note`} text={row.resubmissionNote} label="Nội dung thay đổi" /></>}
        {row.createdAt && <p>Ngày gửi: {new Date(row.createdAt).toLocaleString('vi-VN')}</p>}
        {row.hasImage && <ServiceGallery key={row.registrationId + "-" + row.revision} application={row} />}
        {!supplement && row.reasonNote && <ServiceExpandableText key={`${row.registrationId}-${row.revision}-reason`} text={row.reasonNote} label={row.status === 'REJECTED' || row.listingDecision === 'REJECT' ? 'Lý do từ chối:' : 'Nhận xét xét duyệt:'} />}
        {row.reviewedAt && row.status !== 'NEEDS_SUPPLEMENT' && <><p>Quyền Service Owner: {row.capabilityDecision === 'APPROVE' ? 'Đã cấp' : 'Từ chối'} · Quyết định nội dung: {row.listingDecision === 'APPROVE' ? 'Đã duyệt' : 'Từ chối công khai'}</p><p>Người duyệt: {row.reviewerName} · {new Date(row.reviewedAt).toLocaleString('vi-VN')}</p></>}
        {row.reviewedAt && row.status !== 'NEEDS_SUPPLEMENT' && <><p>Quyền Service Owner hiện tại: {row.capabilityActive ? 'Đang hoạt động' : 'Chưa được cấp / Đã ngừng'}. Vai trò tài khoản được giữ nguyên.</p><p>Mã nhà cung cấp: #{row.providerId}{row.serviceId && ` · Mã dịch vụ: #${row.serviceId}`}</p><p>{row.publicEligible ? 'Dịch vụ đang công khai.' : row.serviceId ? 'Dịch vụ hiện không đủ điều kiện công khai.' : 'Chưa có dịch vụ công khai.'}</p>{row.publicEligible && <Link to={`/services/detail?id=${row.serviceId}`} onClick={onClose}>Xem dịch vụ công khai</Link>}</>}
        <div className="svc-application-documents"><h5>Tài liệu xác minh <span>({row.documents.length})</span></h5><div className="svc-attachment-list">{row.documents.map(doc => <UIButton className="svc-attachment svc-attachment-download" key={doc.documentId} type="button" onClick={() => download(doc)} aria-label={`Tải xuống ${doc.name}`} title={doc.name}>
          <span className="svc-attachment-icon"><FileText size={19} aria-hidden="true" /></span><span className="svc-attachment-info"><span className="svc-attachment-name">{serviceFileName(doc.name)}</span><small>Tải xuống tài liệu</small></span><Download size={18} aria-hidden="true" />
        </UIButton>)}</div></div>
        {row.status === 'PENDING' && <div className="svc-application-notice" role="status"><Clock3 size={18} aria-hidden="true" /><p>Hồ sơ đã được gửi và đang chờ xét duyệt. Bạn có thể theo dõi kết quả tại đây.</p></div>}
      </section>}
      {row && <div className="svc-application-actions"><UIButton className="svc-btn" type="button" disabled={busy} onClick={() => setReload(value => value + 1)}><RefreshCw size={16} aria-hidden="true" />Cập nhật kết quả hồ sơ</UIButton></div>}
      {state && !state.canRegister && !supplement && row?.status !== 'PENDING' && <p className="svc-field-hint">{reasons[state.reason]}</p>}
      {(state?.canRegister || supplement) && <form noValidate aria-busy={busy} onBlur={event => validateField(event.target.name)} onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        {!supplement && <p style={{ margin: 0 }}>Gửi thông tin dịch vụ đầu tiên và giấy tờ xác minh để đăng ký cung cấp dịch vụ. Hồ sơ sẽ được nhân viên xét duyệt.</p>}
        <fieldset disabled={busy || stale} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 14 }}>
          <UIField style={{ display: 'grid', gap: 6 }}><span>Ảnh dịch vụ{!editService && !supplement && <span className="svc-required"> *</span>}</span><input name="image" aria-invalid={!!fieldErrors.image} aria-describedby={formId + '-image'} type="file" multiple accept="image/jpeg,image/png,image/webp" required={!editService && !supplement} onChange={e => {
            const chosen = Array.from(e.target.files || []); if (!chosen.length) return;
            const next = [...image, ...chosen];
            e.target.value = '';
            setImage(next); clearFieldError('image');
          }} />{feedback('image', `Tối đa 5 ảnh JPG, PNG, WEBP; 5 MB/ảnh. Ảnh đầu là ảnh đại diện.${editService || supplement ? ' Chọn ảnh mới để thay thế bộ ảnh hiện tại.' : ''}`)}</UIField>
          {preview.length ? <div className="svc-upload-gallery" role="list" aria-label="Ảnh dịch vụ đã chọn">{preview.map((url, index) => <div className="svc-upload-photo" role="listitem" key={url}><img className="svc-editor-photo" src={url} alt={`Ảnh dịch vụ mới chọn ${index + 1}`} /><span>{index === 0 ? 'Ảnh đại diện' : `Ảnh ${index + 1}`}</span><small className="svc-upload-file-name" title={image[index]?.name}>{serviceFileName(image[index]?.name)}</small><UIButton className="svc-remove-photo" type="button" aria-label={`Xóa ảnh ${index + 1}: ${image[index]?.name || 'ảnh dịch vụ'}`} onClick={() => { setImage(previous => previous.filter((_, i) => i !== index)); clearFieldError('image'); }}><X size={16} aria-hidden="true" /></UIButton></div>)}</div> : (editService || supplement && row)?.hasImage ? <ServiceGallery application={editService || row} /> : null}
          {field('applicantName', 'Họ tên người đăng ký *', { minLength: 2, maxLength: 100 })}
          {field('serviceName', 'Tên dịch vụ / đơn vị *', { minLength: 3, maxLength: 255 })}
          <ServiceFormSelect label="Danh mục" name="categoryId" value={form.categoryId} onChange={update} required error={fieldErrors.categoryId} options={categories.map(cat => ({ value: cat.categoryId, label: cat.name }))} />
          <UIField style={{ display: 'grid', gap: 6 }}><span>Mô tả dịch vụ<span className="svc-required"> *</span></span><textarea name="description" aria-invalid={!!fieldErrors.description} aria-describedby={formId + '-description'} required minLength={20} maxLength={5000} rows={4} value={form.description} onChange={update} className="svc-text-input" style={inputStyle} />{feedback('description', 'Từ 20 đến 5000 ký tự. Đã nhập: ' + form.description.trim().length + '/5000 ký tự.')}</UIField>
          <ServiceFormSelect label="Loại giá" name="pricingType" value={form.pricingType} onChange={update} required error={fieldErrors.pricingType} options={[{ value: 'FIXED', label: 'Giá cố định' }, { value: 'FROM', label: 'Giá từ' }, { value: 'NEGOTIABLE', label: 'Thỏa thuận' }]} />
          <div className="svc-price-fields">{form.pricingType !== 'NEGOTIABLE' && <ServiceMoneyInput value={form.price} error={fieldErrors.price} onChange={update} />}<div><ServiceFormSelect label="Đơn vị tính (tùy chọn)" name="priceUnit" value={customUnit ? 'OTHER' : form.priceUnit} onChange={event => { unitChosen.current = true; setCustomUnit(event.target.value === 'OTHER'); update({ target: { name: 'priceUnit', value: event.target.value === 'OTHER' ? '' : event.target.value } }); }} error={fieldErrors.priceUnit} options={[{ value: '', label: 'Không có đơn vị' }, ...PRICE_UNITS.map(value => ({ value, label: value })), { value: 'OTHER', label: 'Khác' }]} />{customUnit && field('priceUnit', 'Đơn vị khác', { required: true, minLength: 2, maxLength: 20, placeholder: 'VD: Bộ, Tháng', onBlur: event => { const unit = normalizePriceUnit(event.target.value); setForm(previous => ({ ...previous, priceUnit: unit })); } })}</div></div>
          <ServiceAreaSelect value={form.serviceArea} customValue={form.customServiceAreas} otherEnabled={form.otherAreasEnabled} onChange={update} error={fieldErrors.serviceArea} customError={fieldErrors.customServiceAreas} />
          {field('contactPhone', 'Số điện thoại liên hệ *', { type: 'tel', maxLength: 30 })}
          {field('contactEmail', 'Email liên hệ', { type: 'email', maxLength: 255, required: false })}
          {supplement && <div><strong>Tài liệu giữ lại</strong><div className="svc-attachment-list">{row.documents.map(doc => <UIField key={doc.documentId} className="svc-attachment svc-retained-file" title={doc.name}><input type="checkbox" checked={retained.includes(doc.documentId)} onChange={e => { setRetained(previous => e.target.checked ? [...previous, doc.documentId] : previous.filter(id => id !== doc.documentId)); clearFieldError('documents'); }} /><span className="svc-attachment-name">{serviceFileName(doc.name)}</span></UIField>)}</div><small>Bỏ chọn để xóa/thay thế khi nộp lại thành công. Tổng tài liệu giữ lại và mới: tối đa 5.</small></div>}
          {(supplement || editService) && <UIField><span>Nội dung thay đổi<span className="svc-required"> *</span></span><textarea name="note" aria-invalid={!!fieldErrors.note} aria-describedby={formId + '-note'} required minLength={10} maxLength={2000} rows={3} value={note} onChange={e => { setNote(e.target.value); clearFieldError('note'); }} className="svc-text-input" style={inputStyle} />{feedback('note', 'Mô tả thay đổi từ 10 đến 2000 ký tự.')}</UIField>}
          {!editService && <UIField style={{ display: 'grid', gap: 6 }}><span>Tài liệu xác minh<span className="svc-required"> *</span></span><input name="documents" aria-invalid={!!fieldErrors.documents} aria-describedby={formId + '-documents'} type="file" multiple required={!supplement || retained.length === 0} accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => { setFiles(Array.from(e.target.files || [])); clearFieldError('documents'); }} />{feedback('documents', 'Đính kèm giấy tờ định danh, giấy phép kinh doanh hoặc tài liệu chứng minh khả năng cung cấp dịch vụ. Tổng cộng 1–5 tệp PDF, JPG, PNG, WEBP; tối đa 10 MB/tệp.')}</UIField>}
          {!!files.length && <div className="svc-attachment-list" role="list" aria-label="Tài liệu đã chọn">{files.map((file, i) => <div className="svc-attachment" role="listitem" key={i} title={file.name}><span className="svc-attachment-icon"><FileText size={19} aria-hidden="true" /></span><span className="svc-attachment-info"><span className="svc-attachment-name">{serviceFileName(file.name)}</span><small>{(file.size / 1024).toFixed(1)} KB</small></span></div>)}</div>}
          <UIButton type="submit" className="p-button primary">{busy ? 'Đang gửi hồ sơ...' : editService ? 'Gửi cập nhật cho nhân viên duyệt' : supplement ? 'Nộp lại hồ sơ xét duyệt' : 'Gửi hồ sơ xét duyệt'}</UIButton>
        </fieldset>
      </form>}
    </>}
  </div></Modal>;
}
