import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ServiceRegistrationModal from './ServiceRegistrationModal.jsx';
import ServiceManagement from './ServiceManagement.jsx';
import ServicePhoto from './ServicePhoto.jsx';
import ServiceGallery from './ServiceGallery.jsx';
import ServiceFormSelect from './ServiceFormSelect.jsx';
import Modal from './common/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { MapPin, Phone, ArrowRight, ShieldCheck, Search, SlidersHorizontal, UserRound, X } from 'lucide-react';
import { publicServicesApi as api, servicePrice } from '../services/public-services.js';
import { serviceRegistrationApi } from '../services/service-registration.js';
import { filterPublicServices, serviceAreas } from '../services/service-catalog.js';
import '../styles/service-applications.css';

const categoryAliases = { moving: 'Chuyển phòng trọ', laundry: 'Giặt là sinh viên', cleaning: 'Dọn dẹp & Vệ sinh', repair: 'Sửa chữa điện nước, khóa cổng' };

export default function ServicesCatalog({ detail = false }) {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams(); const id = params.get('id'); const category = params.get('category') || 'all';
  const query = params.get('q') || ''; const area = params.get('area') || 'all';
  const [rows, setRows] = useState([]); const [row, setRow] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [revision, setRevision] = useState(0); const [register, setRegister] = useState(false);
  const [manage, setManage] = useState(false); const [contact, setContact] = useState(null);
  const [ownership, setOwnership] = useState(null);
  useEffect(() => {
    if (!user || detail) { setOwnership(null); return; }
    const controller = new AbortController();
    setOwnership(null);
    serviceRegistrationApi.mine(controller.signal)
      .then(records => { if (!controller.signal.aborted) setOwnership({ userId: user.userId, hasRecords: records.length > 0 }); })
      .catch(error => { if (!controller.signal.aborted) setOwnership({ userId: user.userId, error: error.message }); });
    return () => controller.abort();
  }, [user?.userId, detail, revision]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setRow(null); setRows([]);
    async function load() {
      if (detail) return api.detail(id, controller.signal);
      const [options, services] = await Promise.all([api.categories(controller.signal), api.list(controller.signal)]);
      if (controller.signal.aborted) return;
      setCategories(options);
      return services;
    }
    load().then(data => { if (!controller.signal.aborted) detail ? setRow(data) : setRows(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [detail, id, revision]);
  const selectedCategory = String(categories.find(option => option.name === categoryAliases[category])?.categoryId || category);
  const areas = serviceAreas(rows);
  const filteredRows = filterPublicServices(rows, { category: selectedCategory, area, query });
  const categoryName = categories.find(option => String(option.categoryId) === selectedCategory)?.name || categoryAliases[category] || 'Danh mục đã chọn';
  const updateFilter = (key, value) => setParams(previous => { const next = new URLSearchParams(previous); if (!value || value === 'all') next.delete(key); else next.set(key, value); return next; }, { replace: key === 'q' });
  const clearFilters = () => setParams(previous => { const next = new URLSearchParams(previous); ['q', 'area', 'category'].forEach(key => next.delete(key)); return next; });
  const hasFilters = !!query || area !== 'all' || selectedCategory !== 'all';
  const content = row => <><span className="svc-badge"><ShieldCheck size={12} aria-hidden="true" /> {row.categoryName}</span><h2 title={row.serviceName}>{row.serviceName}</h2><p className={detail ? 'service-text' : 'svc-description'}>{row.description}</p><div className="svc-meta" title={row.serviceArea}><MapPin size={15} aria-hidden="true" /><span>{row.serviceArea}</span></div>{detail ? <p>Nhà cung cấp: {row.providerName}</p> : <div className="svc-meta" title={row.providerName}><UserRound size={15} aria-hidden="true" /><span>{row.providerName}</span></div>}<div className="svc-price">{servicePrice(row)}</div></>;
  const refresh = () => setRevision(value => value + 1);
  const ownState = ownership?.userId === user?.userId ? ownership : null;
  const checkingOwnership = !!user && !ownState;
  const actionLabel = checkingOwnership ? 'Đang kiểm tra...' : ownState?.error ? 'Thử lại' : ownState?.hasRecords ? 'Dịch vụ của tôi' : 'Đăng ký dịch vụ';
  const openServices = () => {
    if (ownState?.error) refresh();
    else if (ownState?.hasRecords) setManage(true);
    else setRegister(true);
  };
  return <main className={`svc-catalog${detail ? '' : ' svc-catalog-list'}`}>
    <div className="svc-heading"><div><h1>{detail ? 'Chi tiết dịch vụ' : 'Dịch vụ quanh Hòa Lạc'}</h1><p>Tìm và liên hệ các đối tác đã được xác minh, đang hoạt động tại khu vực của bạn.</p></div>{!detail && <div className="svc-actions"><button className="svc-btn svc-btn-primary" disabled={checkingOwnership} onClick={openServices}>{actionLabel}</button></div>}</div>
    {!detail && ownState?.error && <p role="alert" className="service-error">Không tải được hồ sơ dịch vụ: {ownState.error}</p>}
    {detail && <Link className="svc-btn" to="/services">← Danh sách dịch vụ</Link>}
    {!detail && <><div className="svc-discovery-toolbar" role="search" aria-label="Tìm kiếm và lọc dịch vụ">
      <label className="svc-search-field" htmlFor="svc-service-search"><span>Tìm kiếm dịch vụ</span><div className="svc-search-control"><Search size={19} aria-hidden="true" /><input id="svc-service-search" type="search" maxLength={120} value={query} onChange={e => updateFilter('q', e.target.value)} placeholder="Tên dịch vụ hoặc nhà cung cấp…" autoComplete="off" /></div></label>
      <ServiceFormSelect label="Loại dịch vụ" name="service-category" value={selectedCategory} onChange={e => updateFilter('category', e.target.value)} options={[
      { value: 'all', label: 'Tất cả dịch vụ' },
      ...(selectedCategory !== 'all' && !categories.some(option => String(option.categoryId) === selectedCategory) ? [{ value: selectedCategory, label: categoryAliases[category] || 'Danh mục đã chọn' }] : []),
      ...categories.map(option => ({ value: option.categoryId, label: option.name })),
    ]} />
      <ServiceFormSelect label="Khu vực" name="service-area" value={area} onChange={e => updateFilter('area', e.target.value)} options={[{ value: 'all', label: 'Tất cả khu vực' }, ...(!areas.includes(area) && area !== 'all' ? [{ value: area, label: area }] : []), ...areas.map(value => ({ value, label: value }))]} />
    </div><div className="svc-results-toolbar"><p role="status" aria-live="polite">{loading ? 'Đang tìm dịch vụ…' : error ? 'Chưa tải được kết quả' : <><strong>{filteredRows.length}</strong> {hasFilters ? 'dịch vụ phù hợp' : 'dịch vụ dành cho bạn'}</>}</p>{hasFilters && <button className="svc-clear-filters" type="button" onClick={clearFilters}><SlidersHorizontal size={14} aria-hidden="true" />Xóa bộ lọc</button>}</div>
      {hasFilters && <div className="svc-active-filters" aria-label="Bộ lọc đang áp dụng">{[['q', query && `Tìm: ${query}`], ['category', selectedCategory !== 'all' && categoryName], ['area', area !== 'all' && area]].filter(([, label]) => label).map(([key, label]) => <button key={key} type="button" onClick={() => updateFilter(key, '')} aria-label={`Bỏ lọc ${label}`}><span>{label}</span><X size={13} aria-hidden="true" /></button>)}</div>}
    </>}
    {error && <div role="alert" className="service-error">{error}<button onClick={() => setRevision(v => v + 1)}>Thử lại</button></div>}
    {loading ? <p role="status">Đang tải dịch vụ...</p> : detail ? row && <section className="svc-detail"><ServiceGallery key={row.serviceId} urls={row.imageUrls?.length ? row.imageUrls : row.imageUrl ? [row.imageUrl] : []} alt={row.serviceName} /><div className="svc-card-body">{content(row)}<button className="svc-btn svc-btn-primary" onClick={() => setContact(row)}><Phone size={16} />Liên hệ nhà cung cấp</button></div></section> : !error && <>
      {!filteredRows.length && <div className="svc-empty"><Search size={28} aria-hidden="true" /><h2>{hasFilters ? 'Không tìm thấy dịch vụ phù hợp' : 'Chưa có dịch vụ công khai'}</h2><p>{hasFilters ? 'Thử từ khóa khác hoặc bớt điều kiện lọc để xem thêm dịch vụ.' : 'Các dịch vụ sẽ xuất hiện tại đây sau khi được xét duyệt.'}</p>{hasFilters && <button className="svc-btn" type="button" onClick={clearFilters}>Xem tất cả dịch vụ</button>}</div>}
      <div className="svc-grid">{filteredRows.map(row => <article className="svc-card" key={row.serviceId}><ServicePhoto url={row.imageUrl} alt={row.serviceName} /><div className="svc-card-body">{content(row)}<div className="svc-actions svc-card-footer"><Link className="svc-btn" to={`/services/detail?id=${row.serviceId}`}>Xem chi tiết<ArrowRight size={15} /></Link><button className="svc-btn svc-btn-primary" onClick={() => setContact(row)}><Phone size={15} />Liên hệ</button></div></div></article>)}</div>
    </>}
    {register && <ServiceRegistrationModal onClose={() => { setRegister(false); setRevision(value => value + 1); }} />}
    {manage && <ServiceManagement onClose={() => { setManage(false); refresh(); }} />}
    {contact && <Modal title={`Liên hệ ${contact.serviceName}`} onClose={() => setContact(null)}><div className="svc-form"><p>{contact.providerName} · {contact.serviceArea}</p><a className="svc-btn svc-btn-primary" href={`tel:${contact.contactPhone}`}><Phone size={16} />Gọi {contact.contactPhone}</a>{contact.contactEmail && <a className="svc-btn" href={`mailto:${contact.contactEmail}`}>Gửi email · {contact.contactEmail}</a>}</div></Modal>}
  </main>;
}
