import ReverificationNotice from '../../components/ReverificationNotice.jsx';
import { MotionButton, AnimatePresence } from '../../components/motion/MotionUI.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, FileText, ImagePlus, LockKeyhole, Save, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { Modal, StateView, useToast } from '../../components/PortalUI.jsx';
import PropertyAddressLookup from '../../components/PropertyAddressLookup.jsx';
import { applyLocationSuggestion } from '../../services/property-location.js';
import PropertyLocationMap from '../../components/PropertyLocationMap.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { hostApi } from '../../services/host.js';
import { AMENITIES, AREAS, DEFAULT_QUIET_HOURS_TIME, DOCUMENTS, PROPERTY_TYPES, RULES, getQuietHoursTime, hasQuietHoursRule, setQuietHoursRule, validateRegistrationFile } from '../../services/property-registration.js';
import { propertyEditForm, restoreEditDraft, validatePropertyEdit } from '../../services/property-edit.js';
import { parseSupplementFeedback } from '../../services/supplement-request.js';
import '../../styles/host-property-edit.css';

function EditInlineNote({ note, items }) {
  if (items?.length) {
    return <div className="hpe-inline-note hpe-inline-note-list" role="note">
      <AlertCircle size={15} />
      <div>
        <strong>Cần bổ sung hình ảnh ({items.length} mục):</strong>
        <ul>{items.map(item => <li key={item.key}><strong>{item.label}:</strong> {item.note}</li>)}</ul>
      </div>
    </div>;
  }
  if (!note) return null;
  return <div className="hpe-inline-note" role="note">
    <AlertCircle size={14} />
    <div><strong>Ghi chú cần sửa:</strong> <span>{note}</span></div>
  </div>;
}

function Photo({ file, id, onRemove, disabled }) {
  const [url, setUrl] = useState('');
  useEffect(() => { const controller = new AbortController(); let objectUrl; if (file) { objectUrl = URL.createObjectURL(file); setUrl(objectUrl); } else hostApi.propertyPhoto(id, controller.signal).then(blob => { if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); } }).catch(() => { }); return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); }; }, [file, id]);
  return <div className="hpe-photo">{url ? <img src={url} alt={file?.name || 'Ảnh nhà trọ đã gửi'} /> : <span>Không tải được ảnh</span>}<MotionButton type="button" disabled={disabled} aria-label={`Bỏ ảnh ${file?.name || id}`} onClick={onRemove}><Trash2 size={15} /></MotionButton></div>;
}

function Editor({ snapshot, onDone }) {
  const { user } = useAuth(); const notify = useToast();
  const key = `hlrcs:property-edit:${user?.userId}:${snapshot.registrationId}`;
  const [form, setForm] = useState(() => { try { return restoreEditDraft(snapshot, JSON.parse(sessionStorage.getItem(key) || 'null')); } catch { return propertyEditForm(snapshot.details); } });
  const [quietTimeDraft, setQuietTimeDraft] = useState(() => getQuietHoursTime(form.selectedRules));
  const [retained, setRetained] = useState(snapshot.photos.map(file => file.documentId)); const [photos, setPhotos] = useState([]); const [documents, setDocuments] = useState({});
  const [errors, setErrors] = useState({}); const [failure, setFailure] = useState(''); const [busy, setBusy] = useState(false); const [confirm, setConfirm] = useState(false); const request = useRef();
  const allowed = field => !busy && snapshot.editableFields.includes(field);
  const change = (field, value) => { if (allowed(field)) { setForm(previous => ({ ...previous, [field]: value })); setErrors(previous => ({ ...previous, [field]: undefined })); } };
  useEffect(() => () => request.current?.abort(), []);
  const supplement = snapshot.status === 'NEEDS_SUPPLEMENT'
    ? parseSupplementFeedback({ reasonNote: snapshot.reasonNote, requestedFields: snapshot.requestedFields, fieldNotes: snapshot.fieldNotes })
    : { hasInlineNotes: false, requestedKeys: [], notesByKey: {}, photoItems: [], generalNote: '' };
  const { notesByKey, photoItems } = supplement;
  const field = (name, label, { multiline = false, options, max = 255, type = 'text', note } = {}) => <label className={`hpe-field ${note ? 'is-flagged' : ''}`} key={name}><span>{label}{!snapshot.editableFields.includes(name) && <small><LockKeyhole size={11} />Đã khóa</small>}</span>{options ? <select id={name} value={form[name] || ''} disabled={!allowed(name)} onChange={event => change(name, event.target.value)}>{options.map(value => <option key={value}>{value}</option>)}</select> : multiline ? <textarea id={name} rows={4} maxLength={max} value={form[name] || ''} disabled={!allowed(name)} onChange={event => change(name, event.target.value)} /> : <input id={name} type={type} maxLength={max} value={form[name] || ''} disabled={!allowed(name)} onChange={event => change(name, event.target.value)} />}<EditInlineNote note={note} /><span className="hpe-error" role={errors[name] ? 'alert' : undefined}>{errors[name]}</span></label>;
  const addPhotos = event => { const files = [...event.target.files]; event.target.value = ''; const error = files.map(file => validateRegistrationFile(file)).find(Boolean); if (error) return setErrors(previous => ({ ...previous, photos: error })); if (files.length + photos.length + retained.length > 10) return setErrors(previous => ({ ...previous, photos: 'Mỗi nhà trọ tối đa 10 ảnh.' })); setPhotos(previous => [...previous, ...files]); setErrors(previous => ({ ...previous, photos: undefined })); };
  const check = event => { event.preventDefault(); const found = validatePropertyEdit(form, retained, photos, documents, snapshot.documents); setErrors(found); setFailure(''); if (Object.keys(found).length) { document.getElementById(['latitude', 'longitude', 'location'].includes(Object.keys(found)[0]) ? 'property-pasted-address' : Object.keys(found)[0])?.focus(); return; } setConfirm(true); };
  const submit = async () => {
    if (request.current) return; const controller = new AbortController(); request.current = controller; setBusy(true); setFailure(''); try {
      const result = await hostApi.resubmitProperty(snapshot.registrationId, { details: form, versionToken: snapshot.versionToken, retainedPhotoIds: retained }, photos, documents, controller.signal);
      if (controller.signal.aborted) return; try { sessionStorage.removeItem(key); } catch { } notify?.('Đã gửi hồ sơ. Vui lòng chờ staff xét duyệt.', 'success'); onDone(result);
    } catch (error) { if (!controller.signal.aborted) { setConfirm(false); setFailure(error.message); } } finally { request.current = null; if (!controller.signal.aborted) setBusy(false); }
  };
  const save = () => { try { const { termsAccepted, ...fields } = form; sessionStorage.setItem(key, JSON.stringify({ versionToken: snapshot.versionToken, fields })); notify?.('Đã lưu nháp trên trình duyệt. Ảnh và tài liệu mới cần chọn lại khi mở lại trang.', 'success'); } catch { setFailure('Không lưu được bản nháp trên trình duyệt.'); } };
  const revision = snapshot.mode === 'CHANGE_REQUEST';
  const returnTo = snapshot.propertyId ? `/host/property?propertyId=${snapshot.propertyId}` : `/host/property?registrationId=${snapshot.registrationId}`;
  const section = (title, content) => <section className="hpe-panel"><h3>{title}</h3>{content}</section>;
  const quietChecked = hasQuietHoursRule(form.selectedRules);
  const activeQuietTime = quietChecked ? getQuietHoursTime(form.selectedRules) : quietTimeDraft;
  return <form onSubmit={check} className="hpe-editor" noValidate>
    <ReverificationNotice required={snapshot.reverificationRequired} reasons={snapshot.reverificationReasons} status={snapshot.status} note={snapshot.reasonNote}/>
    <header className="hpe-heading"><span><ShieldCheck size={17} />{revision ? 'Đề nghị thay đổi thông tin' : 'Chỉnh sửa & Gửi lại hồ sơ'}</span><h2>{snapshot.details.name}</h2><p>{revision ? 'Đổi địa chỉ, vị trí bản đồ, người quản lý hoặc giấy tờ định danh/quyền quản lý sẽ tạm ẩn nhà trọ để tái xác minh. Sửa nội dung thông thường giữ bản đã duyệt công khai. Phiên bản mới chỉ áp dụng khi staff duyệt.' : 'Sau khi gửi lại, hồ sơ chuyển sang Chờ xét duyệt và tạm khóa chỉnh sửa.'}</p></header>
    {snapshot.reasonNote && !revision && <aside className="hpe-review-note">
      <strong>{supplement.hasInlineNotes ? `Yêu cầu bổ sung của Staff (${supplement.requestedKeys.length} mục)` : 'Yêu cầu / Phản hồi của staff'}</strong>
      {supplement.hasInlineNotes
        ? <>
            <p>Ghi chú chi tiết đã được đặt trực tiếp ngay tại từng mục cần sửa bên dưới.</p>
            {supplement.generalNote && <p className="hpe-general-note"><strong>Ghi chú chung:</strong> {supplement.generalNote}</p>}
          </>
        : <p>{snapshot.reasonNote}</p>}
    </aside>}
    {snapshot.status === 'NEEDS_SUPPLEMENT' && <p className="hpe-notice">{snapshot.legacyScope ? 'Yêu cầu cũ chưa có danh sách trường cụ thể. Bạn có thể chỉnh sửa hồ sơ để gửi staff kiểm tra lại.' : 'Chỉ các mục staff yêu cầu bổ sung được mở để chỉnh sửa. Các thông tin còn lại đã khóa.'}</p>}
    <div className="hpe-columns"><div className="hpe-fields">
      {section('1. Thông tin cơ bản', <div className="hpe-grid">{field('name', 'Tên nhà trọ', { max: 100, note: notesByKey.name })}{field('propertyType', 'Loại hình nhà trọ', { options: PROPERTY_TYPES, note: notesByKey.propertyType })}<div className="hpe-wide">{field('description', 'Mô tả nhà trọ', { multiline: true, max: 2000, note: notesByKey.description })}</div>{notesByKey.contact && <div className="hpe-wide"><EditInlineNote note={notesByKey.contact} /></div>}{field('managerName', 'Người quản lý', { max: 100 })}{field('contactPhone', 'Hotline liên hệ', { max: 20, type: 'tel' })}{field('zaloPhone', 'Zalo liên hệ (tùy chọn)', { max: 20, type: 'tel' })}</div>)}
      {section('2. Vị trí nhà trọ', <>{snapshot.editableFields.includes('latitude') && snapshot.editableFields.includes('longitude') && <PropertyAddressLookup resolveDetails disabled={busy} coordinates={form} locationKey={[form.latitude, form.longitude, form.addressDetail, form.commune, form.nearby].join('|')} onApply={data => { if (!busy) { setForm(previous => applyLocationSuggestion(previous, data, snapshot.editableFields)); setErrors(previous => ({ ...previous, location: undefined, latitude: undefined, longitude: undefined })); } }} />}<div className="hpe-grid">{field('addressDetail', 'Địa chỉ chi tiết', { note: notesByKey.address })}{field('commune', 'Xã / Khu vực', { options: AREAS, note: notesByKey.commune })}<div className="hpe-wide">{field('nearby', 'Địa điểm lân cận (tùy chọn)', { note: notesByKey.nearby })}</div></div><EditInlineNote note={notesByKey.coordinates} />{snapshot.editableFields.includes('latitude') && snapshot.editableFields.includes('longitude') && <PropertyLocationMap hideCoordinates commune={form.commune} latitude={form.latitude} longitude={form.longitude} address={`${form.addressDetail}, ${form.commune}`} onSelect={(latitude, longitude) => { if (!busy) setForm(previous => ({ ...previous, latitude: String(latitude), longitude: String(longitude) })); }} />}{(errors.location || errors.latitude || errors.longitude) && <p className="hpe-error" role="alert">{errors.location || errors.latitude || errors.longitude} Hãy chọn lại vị trí trên bản đồ.</p>}</>)}
      {section('3. Tiện ích & Quy định chung', <><h4>Tiện ích chung của nhà trọ</h4><EditInlineNote note={notesByKey.amenities} /><div className="hpe-options">{AMENITIES.map(([key, label]) => <label key={key}><input type="checkbox" checked={form.amenities.includes(key)} disabled={!allowed('amenities')} onChange={event => change('amenities', event.target.checked ? [...form.amenities, key] : form.amenities.filter(value => value !== key))} />{label}</label>)}</div><h4>Quy định nhà trọ</h4><EditInlineNote note={notesByKey.rules} /><div className="hpe-options">{RULES.map(([key, label]) => key === 'quietHours'
        ? <div key="quietHours" className={`hpe-quiet-hours ${quietChecked ? 'selected' : ''} ${!allowed('selectedRules') ? 'is-disabled' : ''}`}>
            <label>
              <input type="checkbox" checked={quietChecked} disabled={!allowed('selectedRules')} onChange={event => change('selectedRules', setQuietHoursRule(form.selectedRules, event.target.checked, activeQuietTime))} />
              <span>Giữ trật tự sau</span>
            </label>
            <input
              type="time"
              className="hpe-quiet-time"
              aria-label="Giờ giữ trật tự"
              value={activeQuietTime}
              disabled={!allowed('selectedRules')}
              onChange={event => {
                const nextTime = event.target.value || DEFAULT_QUIET_HOURS_TIME;
                setQuietTimeDraft(nextTime);
                change('selectedRules', setQuietHoursRule(form.selectedRules, true, nextTime));
              }}
            />
          </div>
        : <label key={key}><input type="checkbox" checked={form.selectedRules.includes(key)} disabled={!allowed('selectedRules')} onChange={event => change('selectedRules', event.target.checked ? [...form.selectedRules, key] : form.selectedRules.filter(value => value !== key))} />{label}</label>)}</div>{field('rules', 'Nội quy bổ sung (tùy chọn)', { multiline: true, max: 2000 })}</>)}
      {section('4. Hình ảnh nhà trọ', <><EditInlineNote items={photoItems} /><p>Giữ lại ảnh đã gửi hoặc thêm ảnh mới. JPG, PNG, WEBP, tối đa 5 MB/ảnh, tổng cộng 1–10 ảnh.</p><div className="hpe-photos">{snapshot.photos.filter(file => retained.includes(file.documentId)).map(file => <Photo key={file.documentId} id={file.documentId} disabled={!allowed('photos')} onRemove={() => setRetained(previous => previous.filter(id => id !== file.documentId))} />)}{photos.map((file, index) => <Photo key={`${file.name}-${index}`} file={file} disabled={!allowed('photos')} onRemove={() => setPhotos(previous => previous.filter((_, i) => i !== index))} />)}</div><label className="hpe-upload"><ImagePlus size={17} />Chọn thêm ảnh<input id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={!allowed('photos')} onChange={addPhotos} /></label>{errors.photos && <p className="hpe-error" role="alert">{errors.photos}</p>}</>)}
      {section('5. Hồ sơ xác minh', <><p>Tài liệu được lưu riêng tư, chỉ chủ trọ và nhân viên có quyền truy cập. Giữ nguyên tài liệu đã gửi nếu không cần thay thế.</p>{DOCUMENTS.map(([key, label], index) => { const type = ['OWNERSHIP', 'ID_CARD', 'FIRE_SAFETY'][index]; const current = snapshot.documents.find(file => file.type === type); const docNote = notesByKey[type]; return <div className={`hpe-document ${docNote ? 'is-flagged' : ''}`} key={key}><h4><FileText size={17} />{label}</h4><EditInlineNote note={docNote} /><p>{documents[key] ? `Tài liệu mới: ${documents[key].name}` : current?.fileName || 'Chưa đính kèm'}</p><input id={key} type="file" aria-label={`Thay tài liệu ${label}`} accept="application/pdf,image/jpeg,image/png,image/webp" disabled={!allowed(type)} onChange={event => { const file = event.target.files[0]; event.target.value = ''; if (!file) return; const error = validateRegistrationFile(file, true); setErrors(previous => ({ ...previous, [key]: error || undefined })); if (!error) setDocuments(previous => ({ ...previous, [key]: file })); }} />{documents[key] && <MotionButton type="button" disabled={busy} onClick={() => setDocuments(previous => { const next = { ...previous }; delete next[key]; return next; })}>Giữ tài liệu cũ</MotionButton>}{errors[key] && <p className="hpe-error" role="alert">{errors[key]}</p>}</div>; })}</>)}
      <section className="hpe-panel"><label className="hpe-consent"><input id="termsAccepted" type="checkbox" checked={form.termsAccepted} disabled={busy} onChange={event => { setForm(previous => ({ ...previous, termsAccepted: event.target.checked })); setErrors(previous => ({ ...previous, termsAccepted: undefined })); }} /><span>Tôi xác nhận thông tin và tài liệu gửi lại là chính xác và đồng ý gửi staff xét duyệt.</span></label>{errors.termsAccepted && <p className="hpe-error" role="alert">{errors.termsAccepted}</p>}</section>
    </div><aside className="hpe-sidebar"><section className="hpe-panel"><ShieldCheck size={24} /><h3>Quy trình xét duyệt</h3><ol><li>Chỉnh sửa thông tin được phép.</li><li>Kiểm tra và gửi lại hồ sơ.</li><li>Staff thẩm định nội dung thay đổi.</li><li>{snapshot.propertyId ? 'Cập nhật bản công khai khi được phê duyệt.' : 'Nhà trọ được tạo và hiển thị sau khi được phê duyệt.'}</li></ol><p>Giá loại phòng và tình trạng phòng được quản lý riêng, không bị khóa bởi đề nghị thay đổi thông tin nhà trọ.</p></section></aside></div>
    {failure && <p className="hpe-error hpe-server-error" role="alert">{failure}</p>}<footer className="hpe-panel hpe-actions"><Link className="p-button" to={returnTo}>Hủy chỉnh sửa</Link><MotionButton className="p-button" type="button" disabled={busy} onClick={save}><Save size={16} />Lưu bản nháp</MotionButton><MotionButton className="p-button primary" disabled={busy} type="submit"><Send size={16} />{revision ? 'Gửi đề nghị thay đổi' : 'Gửi lại xét duyệt'}</MotionButton></footer>
    <AnimatePresence>{confirm && <Modal title={revision ? 'Xác nhận gửi đề nghị thay đổi' : 'Xác nhận gửi lại hồ sơ'} onClose={() => { if (!busy) setConfirm(false); }}><p>{revision ? 'Thay đổi thông tin quan trọng sẽ tạm ẩn nhà trọ đến khi staff tái xác minh thành công. Thay đổi nội dung thông thường vẫn giữ bản đã duyệt hiển thị.' : 'Hồ sơ sẽ chuyển sang Chờ xét duyệt. Bạn chưa thể chỉnh sửa tiếp trong lúc staff kiểm tra.'}</p><p>Ảnh giữ lại: {retained.length} · Ảnh mới: {photos.length} · Tài liệu thay thế: {Object.keys(documents).length}</p><div className="hpe-actions"><MotionButton type="button" className="p-button" disabled={busy} onClick={() => setConfirm(false)}>Kiểm tra lại</MotionButton><MotionButton type="button" className="p-button primary" disabled={busy} onClick={submit}>{busy ? 'Đang gửi...' : 'Xác nhận gửi'}</MotionButton></div></Modal>}</AnimatePresence>
  </form>;
}
export default function HostPropertyEditForm() {
  const [params] = useSearchParams(); const id = params.get('registrationId'); const navigate = useNavigate(); const [state, setState] = useState({ loading: true, data: null, error: '' }); const [retry, setRetry] = useState(0);
  useEffect(() => { if (!id) { setState({ loading: false, data: null, error: 'Hãy chọn hồ sơ nhà trọ cần chỉnh sửa từ Nhà trọ của tôi.' }); return; } const controller = new AbortController(); setState({ loading: true, data: null, error: '' }); hostApi.propertyEdit(id, controller.signal).then(data => { if (!controller.signal.aborted) setState({ loading: false, data, error: '' }); }).catch(error => { if (!controller.signal.aborted) setState({ loading: false, data: null, error: error.message }); }); return () => controller.abort(); }, [id, retry]);
  return <div className="hpe-page"><Link className="hpe-back" to="/host/property"><ArrowLeft size={16} />Nhà trọ của tôi</Link>{state.loading ? <StateView kind="loading" /> : state.error ? <StateView kind="error" message={state.error}><MotionButton className="p-button" onClick={() => setRetry(n => n + 1)}>Tải lại hồ sơ</MotionButton></StateView> : <Editor key={`${id}-${state.data.versionToken}`} snapshot={state.data} onDone={record => navigate(state.data.propertyId ? `/host/property?propertyId=${state.data.propertyId}` : `/host/property?registrationId=${record.registrationId}`, { replace: true })} />}</div>;
}
