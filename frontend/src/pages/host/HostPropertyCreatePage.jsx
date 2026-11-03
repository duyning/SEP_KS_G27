import { MotionButton } from '../../components/motion/MotionUI.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/host-empty-state.css';
import '../../styles/host-registration-refinement.css';
import { AlertCircle, ArrowLeft, ArrowRight, Building2, Check, ClipboardList, Clock3, FileText, ImagePlus, Info, LoaderCircle, LockKeyhole, Pencil, Save, Star, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import PropertyLocationMap from '../../components/PropertyLocationMap.jsx';
import PropertyAddressLookup from '../../components/PropertyAddressLookup.jsx';
import { StateView, useToast } from '../../components/PortalUI.jsx';
import { hostApi } from '../../services/host.js';
import { AMENITIES, AREAS, DOCUMENTS, PROPERTY_TYPES, REQUIRED_DOCUMENTS, RULES, STEPS, createPropertyForm, propertyDraft, propertyDraftStep, restorePropertyDraft, validatePropertyStep, validateRegistrationFile } from '../../services/property-registration.js';
import '../../styles/host-property-registration.css';

const hintFields = new Set(['name', 'propertyType', 'description', 'managerName', 'contactPhone', 'zaloPhone', 'addressDetail', 'commune', 'nearby']);

function Field({ name, label, required, count, max, hint, error, children }) {
  return <div className="registration-field"><div className="registration-label"><label htmlFor={name}>{label}{required && <span className="registration-required"> *</span>}</label>{max && <span>{count}/{max}</span>}</div>{children}{hint && <p className="registration-hint" id={`${name}-hint`}>{hint}</p>}{error && <p className="registration-error" id={`${name}-error`} role="alert">{error}</p>}</div>;
}

function PhotoPreview({ file, onRemove, onCover, cover }) {
  const [url, setUrl] = useState('');
  useEffect(() => { const value = URL.createObjectURL(file); setUrl(value); return () => URL.revokeObjectURL(value); }, [file]);
  return <figure><img src={url || undefined} alt={file.name} />{cover && <span className="registration-cover"><Star size={12} fill="currentColor" />Ảnh đại diện</span>}<figcaption>{file.name}</figcaption>{onRemove && <MotionButton type="button" className="p-icon registration-photo-remove" title={`Xóa ảnh ${file.name}`} aria-label={`Xóa ảnh ${file.name}`} onClick={onRemove}><Trash2 size={16} /></MotionButton>}{onCover && !cover && <MotionButton type="button" className="registration-make-cover" onClick={onCover}><Star size={13} />Đặt làm ảnh đại diện</MotionButton>}</figure>;
}

function ReviewSection({ title, onEdit, children }) {
  return <section className="registration-review-section"><header><h4>{title}</h4><MotionButton type="button" aria-label={`Chỉnh sửa ${title.replace(/^\d+\.\s*/, '')}`} onClick={onEdit}><Pencil size={14} />Chỉnh sửa</MotionButton></header>{children}</section>;
}

function ReviewFields({ rows }) {
  return <dl className="registration-review">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Chưa cung cấp'}</dd></div>)}</dl>;
}

function RegistrationForm({ user, accessBlocked = false }) {
  const notify = useToast();
  const [pending, setPending] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submission = useRef();
  useEffect(() => () => submission.current?.abort(), []);
  const [data, setData] = useState(() => createPropertyForm(user));
  const [step, setStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [returnToReview, setReturnToReview] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [manualCoordinatesOpen, setManualCoordinatesOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const formRef = useRef();
  const draftKey = user?.userId == null ? null : `hlrcs:property-draft:${user.userId}`;
  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey) || sessionStorage.getItem(draftKey);
      if (raw) {
        const restored = restorePropertyDraft(raw, user);
        const resume = propertyDraftStep(raw, restored);
        setData(restored); setStep(resume); setFurthestStep(resume); setDraftSaved(true);
        setDraftStatus('Đã khôi phục bản nháp trên thiết bị này.');
        setNotice('Thông tin đã nhập được giữ nguyên. Vui lòng chọn lại ảnh và tài liệu khi tiếp tục hồ sơ.');
      }
    } catch { setNotice('Không thể đọc bản nháp trên trình duyệt. Bạn có thể nhập hồ sơ mới.'); }
  }, [draftKey]);
  const update = (name, value) => {
    setData(previous => ({ ...previous, [name]: value }));
    setErrors(previous => ({ ...previous, [name]: undefined, ...(['latitude', 'longitude'].includes(name) ? { location: undefined } : {}) }));
    setNotice('');
  };
  const selectLocation = (latitude, longitude, commune) => {
    setData(previous => ({ ...previous, latitude: latitude.toFixed(6), longitude: longitude.toFixed(6), ...(commune ? { commune } : {}) }));
    setErrors(previous => ({ ...previous, location: undefined, latitude: undefined, longitude: undefined, ...(commune ? { commune: undefined } : {}) }));
    setNotice('');
  };
  const input = name => ({ id: name, name, value: data[name], onChange: event => update(name, event.target.value), onBlur: () => setErrors(previous => ({ ...previous, [name]: validatePropertyStep(data, step)[name] })), 'aria-invalid': Boolean(errors[name]), 'aria-describedby': [hintFields.has(name) && `${name}-hint`, errors[name] && `${name}-error`].filter(Boolean).join(' ') || undefined });
  const showErrors = found => {
    setErrors(found);
    if (found.latitude || found.longitude) setManualCoordinatesOpen(true);
    requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
  };
  const move = target => { setStep(target); setFurthestStep(previous => Math.max(previous, target)); setErrors({}); setNotice(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const persistDraft = (resumeStep, manual = false) => {
    try {
      if (!draftKey) throw new Error('Missing account');
      const snapshot = propertyDraft(data, resumeStep);
      localStorage.setItem(draftKey, JSON.stringify(snapshot));
      sessionStorage.removeItem(draftKey);
      setDraftSaved(true);
      setDraftStatus(`Đã ${manual ? 'lưu' : 'tự động lưu'} bản nháp lúc ${new Date(snapshot.savedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.`);
      if (manual) setNotice('Đã lưu thông tin trên thiết bị này. Ảnh và tài liệu cần chọn lại khi tải lại trang.');
    } catch { setDraftStatus('Chưa lưu được bản nháp. Hãy kiểm tra quyền lưu trữ của trình duyệt.'); }
  };
  const navigateStep = target => {
    if (target > step) for (let index = 0; index < target; index++) {
      const found = validatePropertyStep(data, index);
      if (Object.keys(found).length) { move(index); showErrors(found); return; }
    }
    persistDraft(target);
    setReturnToReview(false);
    move(target);
  };
  const editStep = target => { move(target); setReturnToReview(true); };
  const next = () => {
    const found = validatePropertyStep(data, step);
    if (Object.keys(found).length) return showErrors(found);
    persistDraft(returnToReview ? 5 : step + 1);
    if (returnToReview) {
      for (let index = 0; index < 5; index++) {
        const invalid = validatePropertyStep(data, index);
        if (Object.keys(invalid).length) { move(index); showErrors(invalid); return; }
      }
      move(5);
      setReturnToReview(false);
    } else move(step + 1);
  };
  const saveDraft = () => persistDraft(step, true);
  const addPhotos = selected => {
    const files = Array.from(selected || []);
    const invalid = files.map(file => validateRegistrationFile(file)).find(Boolean);
    if (invalid) return showErrors({ photos: invalid });
    const unique = [...data.photos];
    for (const file of files) if (!unique.some(existing => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified)) unique.push(file);
    if (unique.length > 10) return showErrors({ photos: 'Chỉ được chọn tối đa 10 ảnh.' });
    update('photos', unique);
  };
  const addDocument = (key, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const error = validateRegistrationFile(file, true);
    if (error) return showErrors({ [key]: error });
    update('documents', { ...data.documents, [key]: file });
    setErrors(previous => ({ ...previous, [key]: undefined }));
  };
  const submit = async event => {
    event.preventDefault();
    if (submission.current || accessBlocked) return;
    if (step < 5) return next();
    for (let index = 0; index < STEPS.length; index++) {
      const found = validatePropertyStep(data, index);
      if (Object.keys(found).length) { setStep(index); showErrors(found); return; }
    }
    const controller = new AbortController();
    submission.current = controller;
    setSubmitting(true);
    setSubmitError('');
    const received = record => {
      setPending(record);
      setData(previous => ({ ...previous, photos: [], documents: {} }));
      try { if (draftKey) { localStorage.removeItem(draftKey); sessionStorage.removeItem(draftKey); } } catch { /* A saved server record must not be treated as failed because local storage is unavailable. */ }
      notify?.('Đã gửi đăng ký nhà trọ. Hồ sơ đang chờ xét duyệt.', 'success');
    };
    try {
      const record = await hostApi.submitRegistration(data, controller.signal);
      if (!controller.signal.aborted) received(record);
    } catch (error) {
      if (controller.signal.aborted) return;
      setSubmitError(error.message);
    } finally {
      submission.current = undefined;
      if (!controller.signal.aborted) setSubmitting(false);
    }
  };
  if (pending) return <section className="registration-pending" role="status"><div className="registration-pending-icon"><Clock3 size={34} /></div><span className="registration-pending-badge">{pending.status==='NEEDS_SUPPLEMENT'?'Cần bổ sung':'Chờ xét duyệt'}</span><h2>{pending.status==='NEEDS_SUPPLEMENT'?'Hồ sơ đăng ký nhà trọ cần bổ sung':'Hồ sơ đăng ký nhà trọ đang chờ xét duyệt'}</h2><p>Đã tiếp nhận hồ sơ <strong>{pending.name}</strong>.{pending.status==='NEEDS_SUPPLEMENT'?' Vui lòng xem nội dung yêu cầu của staff bên dưới.':' Vui lòng chờ Ban Quản Trị HL_RCS kiểm tra và xét duyệt.'}</p>{pending.reasonNote&&<p className="hp-review-note">{pending.reasonNote}</p>}<dl><div><dt>Mã hồ sơ</dt><dd>#{pending.registrationId}</dd></div><div><dt>Trạng thái</dt><dd>{pending.status==='NEEDS_SUPPLEMENT'?'Cần bổ sung':'Chờ xét duyệt'}</dd></div></dl><p>Nhà trọ chưa được hiển thị công khai khi chưa được phê duyệt.</p><div className="portal-actions"><Link className="p-button primary" to="/host/property">Nhà trọ của tôi</Link><MotionButton type="button" className="p-button" onClick={()=>{setPending(null);setData(createPropertyForm(user));setStep(0);setFurthestStep(0);setReturnToReview(false);setErrors({});setSubmitError('');setDraftSaved(false);setDraftStatus('');setNotice('');}}>Đăng ký nhà trọ khác</MotionButton></div></section>;
  return <div className="property-registration">
    <nav className="registration-steps" aria-label="Các bước đăng ký">{STEPS.map((label, index) => <MotionButton type="button" key={label} disabled={submitting || index > furthestStep} aria-current={index === step ? 'step' : undefined} className={index === step ? 'current' : index < step ? 'done' : ''} onClick={() => navigateStep(index)}><span className="registration-step-number">{index < step ? <Check size={16} /> : index + 1}</span><span>{label}</span></MotionButton>)}</nav>
    <div className="registration-grid"><form ref={formRef} onSubmit={submit} noValidate aria-busy={submitting}><fieldset className="registration-form-lock" disabled={submitting || accessBlocked}>
      <section className="registration-panel">
        <header className="registration-panel-header"><h3>{['Thông tin cơ bản', 'Vị trí nhà trọ', 'Thông tin & Tiện ích chung', 'Hình ảnh nhà trọ', 'Hồ sơ xác minh', 'Kiểm tra thông tin'][step]}</h3><p>{['Nhập các thông tin chính để nhận diện nhà trọ trên hệ thống HL_RCS.', 'Nhập địa chỉ nhà trọ tại Hòa Lạc. Vị trí trên bản đồ có thể bổ sung sau.', 'Chọn các tiện ích thuộc cấp độ toàn nhà trọ và quy định sinh hoạt chung.', 'Thêm hình ảnh giúp người thuê hiểu rõ hơn về không gian và cảnh quan nhà trọ.', 'Cung cấp các tài liệu được yêu cầu để HL_RCS có thể kiểm tra và thẩm định thông tin nhà trọ.', 'Kiểm tra lại toàn bộ thông tin trước khi gửi nhà trọ để Ban Quản Trị HL_RCS xem xét.'][step]}</p></header>
        {step === 0 && <>
          <Field name="name" label="Tên nhà trọ" required count={data.name.length} max={100} hint={'Tên riêng đại diện cho nhà trọ. Không cần thêm tiền tố "Nhà trọ" nếu không muốn.'} error={errors.name}><input {...input('name')} maxLength={100} required placeholder="Ví dụ: Nhà trọ An Khang" autoComplete="organization" /></Field>
          <Field name="propertyType" label="Loại hình nhà trọ" required hint="Phân loại giúp người thuê lọc tìm kiếm chính xác nhu cầu lưu trú." error={errors.propertyType}><select {...input('propertyType')} required>{PROPERTY_TYPES.map(type => <option key={type}>{type}</option>)}</select></Field>
          <Field name="description" label="Mô tả nhà trọ" required count={data.description.length} max={2000} hint="Mô tả từ 30 đến 2000 ký tự về không gian, an ninh và những điểm nổi bật của nhà trọ." error={errors.description}><textarea {...input('description')} rows={6} maxLength={2000} required placeholder="Mô tả ngắn về nhà trọ, không gian, môi trường sống, an ninh và những điểm nổi bật xung quanh..." /></Field>
          <fieldset className="registration-contact"><legend>Thông tin liên hệ quản lý tiếp khách</legend><div className="registration-contact-grid">
            <Field name="managerName" label="Người đón khách" required hint="Người đón khách xem phòng" error={errors.managerName}><input {...input('managerName')} maxLength={100} autoComplete="name" placeholder="Họ tên người quản lý" required /></Field>
            <Field name="contactPhone" label="Hotline trực tiếp" required hint="Số di động liên hệ" error={errors.contactPhone}><input {...input('contactPhone')} type="tel" maxLength={20} autoComplete="tel" placeholder="Nhập số điện thoại" required /></Field>
            <Field name="zaloPhone" label="Zalo tư vấn" hint="Không bắt buộc" error={errors.zaloPhone}><input {...input('zaloPhone')} type="tel" maxLength={20} placeholder="Số điện thoại Zalo" /></Field>
          </div></fieldset>
        </>}
        {step === 1 && <>
          <PropertyAddressLookup locationKey={[data.addressDetail,data.commune,data.latitude,data.longitude].join('|')} onApply={location=>{setData(previous=>({...previous,addressDetail:location.addressDetail,commune:location.commune,latitude:location.latitude,longitude:location.longitude,nearby:''}));setErrors(previous=>({...previous,addressDetail:undefined,commune:undefined,latitude:undefined,longitude:undefined,location:undefined}));setNotice('');}}/>
          <div className="registration-two-columns registration-location-address">
            <Field name="addressDetail" label="Địa chỉ chi tiết" required hint="Số nhà, ngõ, xóm, thôn; từ 10 đến 255 ký tự." error={errors.addressDetail}><input {...input('addressDetail')} maxLength={255} autoComplete="street-address" required placeholder="Ví dụ: Số 18, ngõ 12, Thôn 2" /></Field>
            <Field name="commune" label="Xã / Khu vực tại Hòa Lạc" required hint="Chọn khu vực nhà trọ tại Hòa Lạc." error={errors.commune}><select {...input('commune')} required><option value="">Chọn khu vực</option>{AREAS.map(area => <option key={area} value={area}>{area === 'Tân Xã' ? 'Tân Xã (Gần ĐH FPT, hồ Tân Xã)' : area}</option>)}</select></Field>
          </div>
          <Field name="nearby" label="Vị trí gần các địa điểm chính (Tùy chọn)" hint="Giúp người thuê dễ dàng hình dung quãng đường di chuyển hằng ngày." error={errors.nearby}><input {...input('nearby')} maxLength={255} placeholder="Ví dụ: Cách ĐH FPT 800m, Cách ĐHQG Hòa Lạc 2.5km, Gần chợ Tân Xã..." /></Field>
          <div className="registration-map-heading"><strong>Xác định vị trí trên bản đồ Hòa Lạc (Tùy chọn)</strong><span>Có thể bỏ qua nếu bản đồ chưa khả dụng.</span></div>
          <PropertyLocationMap commune={data.commune} latitude={data.latitude} longitude={data.longitude} address={[data.addressDetail.trim(), data.commune].filter(Boolean).join(', ')} error={errors.location} onSelect={selectLocation} />
          {errors.location && <p className="registration-error" id="location-error" role="alert">{errors.location}</p>}
          <details className="registration-manual-coordinates" open={manualCoordinatesOpen} onToggle={event => setManualCoordinatesOpen(event.currentTarget.open)}><summary>Nhập tọa độ thủ công</summary><div className="registration-two-columns">{[['latitude', 'Vĩ độ'], ['longitude', 'Kinh độ']].map(([name, label]) => <Field key={name} name={name} label={label} error={errors[name]}><input {...input(name)} inputMode="decimal" placeholder={label} /></Field>)}</div></details>
        </>}
        {step === 2 && <>
          {[['amenities', AMENITIES, 'Tiện ích & Cơ sở vật chất chung', Building2], ['selectedRules', RULES, 'Quy định chung của nhà trọ', ClipboardList]].map(([name, choices, title, Icon]) => <fieldset key={name} className="registration-contact registration-choice-group" aria-describedby={errors[name] ? `${name}-error` : undefined}><legend><Icon size={16} />{title}</legend><div className="registration-amenities">{choices.map(([key, label]) => <label key={key}><input type="checkbox" checked={data[name].includes(key)} onChange={event => update(name, event.target.checked ? [...data[name], key] : data[name].filter(value => value !== key))} />{label}</label>)}</div>{errors[name] && <p id={`${name}-error`} className="registration-error" role="alert">{errors[name]}</p>}</fieldset>)}
          <details className="registration-other-rules" open={Boolean(errors.rules) || undefined}><summary>Quy định khác (không bắt buộc)</summary><Field name="rules" label="Nội quy bổ sung" count={data.rules.length} max={2000} error={errors.rules}><textarea {...input('rules')} rows={4} maxLength={2000} placeholder="Nhập thêm quy định riêng nếu có..." /></Field></details>
        </>}
        {step === 3 && <>
          <div className={`registration-upload ${dragging ? 'dragging' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={event => { event.preventDefault(); setDragging(false); addPhotos(event.dataTransfer.files); }}>
            <span className="registration-upload-icon"><ImagePlus size={24} /></span><strong>Kéo thả hình ảnh vào đây hoặc bấm để chọn</strong><p id="photos-hint">Hỗ trợ JPG, PNG, WEBP. Tối đa 5MB mỗi ảnh, tối đa 10 ảnh. Tối thiểu 1 ảnh.</p>
            <label className="registration-file-button" htmlFor="photos"><Upload size={16} />Chọn ảnh từ thiết bị</label><input className="registration-file-input" id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => { addPhotos(event.target.files); event.target.value = ''; }} aria-label="Chọn ảnh nhà trọ" aria-invalid={Boolean(errors.photos)} aria-describedby={errors.photos ? 'photos-hint photos-error' : 'photos-hint'} />
          </div>
          {errors.photos && <p id="photos-error" className="registration-error" role="alert">{errors.photos}</p>}
          <div className="registration-photos" aria-label="Ảnh nhà trọ đã chọn">{data.photos.map((file, index) => <PhotoPreview key={`${file.name}-${file.lastModified}-${file.size}`} file={file} cover={index === 0} onRemove={() => update('photos', data.photos.filter((_, position) => position !== index))} onCover={() => update('photos', [file, ...data.photos.filter((_, position) => position !== index)])} />)}</div>
        </>}
        {step === 4 && <>
          <div className="registration-info registration-privacy"><LockKeyhole size={22} /><p><strong>Cam kết bảo mật tài liệu:</strong> Các hồ sơ xác minh dưới đây là dữ liệu nhạy cảm, không được hiển thị công khai trên trang tìm kiếm của người thuê. Tài liệu chỉ phục vụ xét duyệt hồ sơ và được giới hạn truy cập theo vai trò trong hệ thống.</p></div>
          {DOCUMENTS.map(([key, label], index) => <section className="registration-document-section" key={key}>
            <h4><label htmlFor={key}>{index + 1}. {label}</label><span className={REQUIRED_DOCUMENTS.includes(key) ? 'required' : ''}>{REQUIRED_DOCUMENTS.includes(key) ? 'BẮT BUỘC' : 'KHUYẾN KHÍCH'}</span></h4>
            <p id={`${key}-hint`}>{['Giấy tờ quyền sở hữu hoặc quyền sử dụng cơ sở. Nếu quản lý thay chủ sở hữu, đính kèm hợp đồng / văn bản ủy quyền và giấy tờ liên quan trong cùng một tệp.', 'Bản chụp rõ hai mặt thẻ căn cước / CCCD của chủ cơ sở hoặc người đại diện quản lý, gộp trong một tệp.', 'Biên bản kiểm tra an toàn PCCC hoặc bản cam kết có chữ ký của chủ cơ sở; nêu rõ địa chỉ nhà trọ, phương án thoát nạn và trang thiết bị chữa cháy.'][index]} PDF, JPG, PNG, WEBP; tối đa 10MB.</p>
            <div className="registration-document"><FileText size={19} /><span>{data.documents[key]?.name || 'Chưa tải lên tài liệu'}</span>{data.documents[key] && <MotionButton type="button" className="p-icon" aria-label={`Xóa ${label}`} title={`Xóa ${label}`} onClick={() => { update('documents', { ...data.documents, [key]: undefined }); setErrors(previous => ({ ...previous, [key]: undefined })); }}><Trash2 size={16} /></MotionButton>}<label className="registration-file-button" htmlFor={key}>{data.documents[key] ? 'Thay đổi tệp' : 'Tải lên file (PDF/JPG)'}</label><input className="registration-file-input" id={key} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={event => addDocument(key, event)} aria-required={REQUIRED_DOCUMENTS.includes(key)} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${key}-hint ${key}-error` : `${key}-hint`} /></div>
            {errors[key] && <p id={`${key}-error`} className="registration-error" role="alert">{errors[key]}</p>}
          </section>)}
        </>}
        {step === 5 && <>
          <div className="registration-review-summary"><span className="registration-review-summary-icon"><ClipboardList size={24} /></span><div><strong>Hồ sơ sẵn sàng để bạn kiểm tra</strong><p>Đối chiếu thông tin, hình ảnh và giấy tờ trước khi gửi xét duyệt.</p></div><span className="registration-review-count">{data.photos.length} ảnh · {REQUIRED_DOCUMENTS.filter(key => data.documents[key]).length}/{REQUIRED_DOCUMENTS.length} giấy tờ</span></div>
          <div className="registration-review-groups">
            <ReviewSection title="1. Thông tin cơ bản" onEdit={() => editStep(0)}><ReviewFields rows={[["Tên nhà trọ", data.name], ['Loại hình', data.propertyType], ['Người quản lý', `${data.managerName} · ${data.contactPhone}`], ['Zalo', data.zaloPhone], ['Mô tả', data.description]]} /></ReviewSection>
            <ReviewSection title="2. Vị trí & Bản đồ" onEdit={() => editStep(1)}><ReviewFields rows={[["Địa chỉ đầy đủ", `${data.addressDetail}, ${data.commune}`], ['Khu vực', data.commune], ['Địa điểm lân cận', data.nearby || 'Không để lại ghi chú'], ['Tọa độ ghim', data.latitude ? `[${data.latitude}, ${data.longitude}]` : 'Không cung cấp']]} /></ReviewSection>
            <ReviewSection title="3. Tiện ích & Quy định" onEdit={() => editStep(2)}><p>Tiện ích chung đã chọn:</p><div className="registration-review-tags">{AMENITIES.filter(([key]) => data.amenities.includes(key)).map(([key, label]) => <span key={key}><Check size={12} />{label}</span>)}{!data.amenities.length && <p>Chưa chọn tiện ích.</p>}</div><p>Quy định nhà trọ:</p><div className="registration-review-tags rules">{RULES.filter(([key]) => data.selectedRules.includes(key)).map(([key, label]) => <span key={key}><Check size={12} />{label}</span>)}{!data.selectedRules.length && <p>Chưa chọn quy định.</p>}</div>{data.rules && <p className="registration-review-custom">{data.rules}</p>}</ReviewSection>
            <ReviewSection title={`4. Hình ảnh nhà trọ (${data.photos.length} ảnh)`} onEdit={() => editStep(3)}><div className="registration-photos registration-review-photos">{data.photos.map((file, index) => <PhotoPreview key={`${file.name}-${file.lastModified}-${file.size}`} file={file} cover={index === 0} />)}</div></ReviewSection>
            <ReviewSection title="5. Hồ sơ xác minh" onEdit={() => editStep(4)}><ul className="registration-review-documents">{DOCUMENTS.map(([key, label]) => <li key={key}>{data.documents[key] ? <Check size={16} /> : <AlertCircle size={16} />}<span><strong>{label}</strong><br />{data.documents[key]?.name || (REQUIRED_DOCUMENTS.includes(key) ? 'Chưa đính kèm tài liệu bắt buộc.' : 'Chưa đính kèm tài liệu khuyến khích.')}</span></li>)}</ul></ReviewSection>
          </div>
          <label className="registration-consent"><input id="termsAccepted" type="checkbox" checked={data.termsAccepted} onChange={event => update('termsAccepted', event.target.checked)} aria-invalid={Boolean(errors.termsAccepted)} aria-describedby={errors.termsAccepted ? 'termsAccepted-error' : undefined} />Tôi cam kết toàn bộ thông tin kê khai và tài liệu cung cấp là chính xác, đúng sự thật.</label>{errors.termsAccepted && <p id="termsAccepted-error" className="registration-error" role="alert">{errors.termsAccepted}</p>}
          <div className="registration-info"><Info size={20} /><p>Sau khi gửi, hồ sơ sẽ ở trạng thái <strong>Chờ xét duyệt</strong>. Nhà trọ chỉ được hiển thị công khai sau khi được phê duyệt.</p></div>
        </>}
      </section>
      <div className="registration-draft-status" role="status"><Save size={15} /><span>{draftStatus || (draftSaved ? 'Đã lưu bản nháp.' : 'Thông tin được tự động lưu khi hoàn thành mỗi bước.')}<small>Bản nháp lưu trên thiết bị này; ảnh và giấy tờ cần chọn lại sau khi tải lại trang.</small></span></div>
      {notice && <p className="registration-notice" role="status">{notice}</p>}
      {submitError && <p className="registration-submit-error" role="alert">{submitError}</p>}
      <div className="registration-actions"><MotionButton type="button" onClick={() => { setReturnToReview(false); move(step - 1); }} disabled={step === 0}><ArrowLeft size={16} />Quay lại</MotionButton><MotionButton type="button" onClick={saveDraft}><Save size={16} />Lưu bản nháp</MotionButton><MotionButton className="registration-next" type="submit">{submitting ? <><LoaderCircle size={16} className="spin" />Đang gửi hồ sơ...</> : step === 5 ? <><Check size={16} />Gửi xét duyệt</> : <>{returnToReview ? 'Lưu & Kiểm tra lại' : 'Tiếp tục'}<ArrowRight size={16} /></>}</MotionButton></div>
    </fieldset></form>
    <aside className="registration-aside"><section><h3>Hướng dẫn hồ sơ</h3>
      <details><summary>Quy trình xét duyệt</summary><ol className="registration-process">{[['Gửi hồ sơ', 'Điền thông tin và đính kèm giấy tờ xác minh.'], ['Kiểm tra & bổ sung', 'Staff kiểm tra, phản hồi khi cần bổ sung.'], ['Được phê duyệt', 'Nhà trọ được hiển thị và có thể cấu hình loại phòng.']].map(([title,description],index)=><li key={title}><span>{index+1}</span><div><strong>{title}</strong><p>{description}</p></div></li>)}</ol></details>
      <details><summary>Lưu ý khi chuẩn bị hồ sơ</summary><ul><li>Cung cấp thông tin liên hệ chính xác.</li><li>Dùng ảnh thực tế, rõ nét về nhà trọ và lối thoát hiểm.</li><li>Chuẩn bị giấy tờ xác minh và thông tin an toàn PCCC.</li></ul></details>
    </section>
    </aside></div>
  </div>;
}

export default function HostPropertyCreatePage() {
  const { user } = useAuth();
  const [access, setAccess] = useState({ userId: null, loading: true, data: null, error: '' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const recheck = () => { if (document.visibilityState === 'visible') setRevision(value => value + 1); };
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    return () => { window.removeEventListener('focus', recheck); document.removeEventListener('visibilitychange', recheck); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    // Rechecking after a file picker closes must not unmount the in-progress form.
    setAccess(previous => previous.userId === user?.userId ? { ...previous, loading: true } : { userId: user?.userId, loading: true, data: null, error: '' });
    hostApi.registrationEligibility(controller.signal).then(data => { if (!controller.signal.aborted) setAccess({ userId: user?.userId, loading: false, data, error: '' }); })
      .catch(error => { if (!controller.signal.aborted) setAccess(previous => ({ ...previous, loading: false, error: error.message })); });
    return () => controller.abort();
  }, [user?.userId, revision]);
  if (access.userId !== user?.userId || (access.loading && !access.data)) return <StateView kind="loading" />;
  if (access.error && !access.data) return <StateView kind="error" message={access.error}><MotionButton className="p-button" onClick={() => setRevision(value => value + 1)}>Thử lại</MotionButton></StateView>;
  if (!access.data.canRegister) return <StateView kind="error" message="Máy chủ chưa cho phép đăng ký thêm nhà trọ. Vui lòng khởi động lại backend để áp dụng quy định mới." />;
  return <>{access.error && <p className="registration-submit-error" role="alert">Không thể kiểm tra lại quyền đăng ký: {access.error} Thông tin đang nhập được giữ nguyên. <MotionButton type="button" className="p-button" onClick={() => setRevision(value => value + 1)}>Thử lại</MotionButton></p>}<RegistrationForm key={user?.userId} user={user} accessBlocked={Boolean(access.error)} /></>;
}
