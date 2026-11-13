import ServicePrice from './ServicePrice.jsx';
import { serviceCategoryStyle } from '../services/service-category.js';
import { areaList, serviceAreaText } from '../services/service-areas.js';
import UIField from './common/Field.jsx';
import UIButton from './common/Button.jsx';
import { useBreadcrumbTitle } from './common/Breadcrumb.jsx';
import ServiceRequests from './ServiceRequests.jsx';
import ServiceRequestModal from './ServiceRequestModal.jsx';
import { useToast } from './PortalUI.jsx';
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
import { publicServicesApi as api } from '../services/public-services.js';
import { serviceRegistrationApi } from '../services/service-registration.js';
import { filterPublicServices, serviceAreaOptions } from '../services/service-catalog.js';
import '../styles/service-applications.css';
import '../styles/service-detail-layout.css';

const categoryAliases = { moving: 'Chuyển phòng trọ', laundry: 'Giặt là sinh viên', cleaning: 'Dọn dẹp & Vệ sinh', repair: 'Sửa chữa điện nước, khóa cổng' };

export default function ServicesCatalog({ detail = false }) {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams(); const id = params.get('id'); const category = params.get('category') || 'all';
  const query = params.get('q') || ''; const area = params.get('area') || 'all';
  const [rows, setRows] = useState([]); const [row, setRow] = useState(null);
  useBreadcrumbTitle(detail ? row?.serviceName : 'Dịch vụ');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [revision, setRevision] = useState(0); const [register, setRegister] = useState(false);
  const [manage, setManage] = useState(false); const [contact, setContact] = useState(null);
  const [ownership, setOwnership] = useState(null);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const notify = useToast();
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
  const areas = serviceAreaOptions(rows);
  const filteredRows = filterPublicServices(rows, { category: selectedCategory, area, query });
  const categoryName = categories.find(option => String(option.categoryId) === selectedCategory)?.name || categoryAliases[category] || 'Danh mục đã chọn';
  const updateFilter = (key, value) => setParams(previous => { const next = new URLSearchParams(previous); if (!value || value === 'all') next.delete(key); else next.set(key, value); return next; }, { replace: key === 'q' });
  const clearFilters = () => setParams(previous => { const next = new URLSearchParams(previous); ['q', 'area', 'category'].forEach(key => next.delete(key)); return next; });
  const hasFilters = !!query || area !== 'all' || selectedCategory !== 'all';
  const content = row => <><span className="svc-badge" style={serviceCategoryStyle(row.categoryName)}><ShieldCheck size={12} aria-hidden="true" /> {row.categoryName}</span><h2 title={row.serviceName}>{row.serviceName}</h2><p className={detail ? 'service-text' : 'svc-description'}>{row.description}</p><div className="svc-meta" title={serviceAreaText(row)}><MapPin size={15} aria-hidden="true" /><span>{serviceAreaText(row)}</span></div>{detail ? <p>Nhà cung cấp: {row.providerName}</p> : <div className="svc-meta" title={row.providerName}><UserRound size={15} aria-hidden="true" /><span>{row.providerName}</span></div>}<div className="svc-price"><ServicePrice service={row} /></div></>;
  const refresh = () => setRevision(value => value + 1);
  const ownState = ownership?.userId === user?.userId ? ownership : null;
  const checkingOwnership = !!user && !ownState;
  const actionLabel = checkingOwnership ? 'Đang kiểm tra...' : ownState?.error ? 'Thử lại' : ownState?.hasRecords ? 'Dịch vụ của tôi' : 'Đăng ký dịch vụ';
  const openServices = () => {
    if (ownState?.error) refresh();
    else if (ownState?.hasRecords) setManage(true);
    else setRegister(true);
  };
  return <main className={`svc-catalog${detail ? ' svc-detail-page' : ' svc-catalog-list'}`}>
    {!detail && <div className="svc-heading">
      <div className="svc-heading-copy"><h1>Dịch vụ</h1><p>Tìm và liên hệ các đối tác đã được xác minh, đang hoạt động tại khu vực của bạn.</p></div>
      <div className="svc-actions svc-heading-actions">
        {user && <UIButton variant="secondary" className="svc-btn" onClick={() => setRequestsOpen(true)}>Yêu cầu dịch vụ</UIButton>}
        <UIButton variant="primary" className="svc-btn svc-btn-primary" disabled={checkingOwnership} onClick={openServices}>{actionLabel}</UIButton>
      </div>
    </div>}
    {requestsOpen && <ServiceRequests key={user?.userId} onClose={() => setRequestsOpen(false)} />}
    {!detail && ownState?.error && <p role="alert" className="service-error">Không tải được hồ sơ dịch vụ: {ownState.error}</p>}
    {!detail && <><div className="svc-discovery-toolbar" role="search" aria-label="Tìm kiếm và lọc dịch vụ">
      <UIField className="svc-search-field" htmlFor="svc-service-search"><span>Tìm kiếm dịch vụ</span><div className="svc-search-control"><Search size={19} aria-hidden="true" /><input id="svc-service-search" type="search" maxLength={120} value={query} onChange={e => updateFilter('q', e.target.value)} placeholder="Tên dịch vụ, nhà cung cấp hoặc khu vực…" autoComplete="off" /></div></UIField>
      <ServiceFormSelect label="Khu vực" name="service-area" value={area} onChange={e => updateFilter('area', e.target.value)} options={[{ value: 'all', label: 'Tất cả khu vực' }, ...areas.map(value => ({ value, label: value }))]} />
      {hasFilters && <UIButton variant="secondary" className="svc-btn svc-clear-filters" type="button" onClick={clearFilters}><SlidersHorizontal size={16} aria-hidden="true" />Xóa lọc</UIButton>}
    </div>
    <div className="svc-quick-categories" role="group" aria-label="Lọc nhanh theo loại dịch vụ">
      {[{ categoryId: 'all', name: 'Tất cả' }, ...categories].map(option => <UIButton
        key={option.categoryId} type="button" variant="ghost" className="svc-category-chip" style={serviceCategoryStyle(option.name)}
        aria-pressed={selectedCategory === String(option.categoryId)}
        onClick={() => updateFilter('category', selectedCategory === String(option.categoryId) ? 'all' : String(option.categoryId))}>{option.name}</UIButton>)}
    </div>
    <div className="svc-results-toolbar"><p role="status" aria-live="polite">{loading ? 'Đang tìm dịch vụ…' : error ? 'Chưa tải được kết quả' : <><strong>{filteredRows.length}</strong> dịch vụ{selectedCategory !== 'all' && ` ${categoryName}`}{area !== 'all' && ` tại ${area}`}</>}</p></div>
      {hasFilters && <div className="svc-active-filters" aria-label="Bộ lọc đang áp dụng">{[['q', query && `Tìm: ${query}`], ['category', selectedCategory !== 'all' && categoryName], ['area', area !== 'all' && area]].filter(([, label]) => label).map(([key, label]) => <UIButton key={key} type="button" onClick={() => updateFilter(key, '')} aria-label={`Bỏ lọc ${label}`}><span>{label}</span><X size={13} aria-hidden="true" /></UIButton>)}</div>}
    </>}
    {error && <div role="alert" className="service-error">{error}<UIButton onClick={() => setRevision(v => v + 1)}>Thử lại</UIButton></div>}
    {loading ? <p role="status">Đang tải dịch vụ...</p> : detail ? row && <section className="svc-detail svc-detail-layout">
      <div className="svc-detail-media"><ServiceGallery key={row.serviceId} presentation="detail" urls={row.imageUrls?.length ? row.imageUrls : row.imageUrl ? [row.imageUrl] : []} alt={row.serviceName} /></div>
      <aside className="svc-detail-info" aria-label="Thông tin nhà cung cấp và liên hệ">
        <span className="svc-badge" style={serviceCategoryStyle(row.categoryName)}>{row.categoryName}</span>
        <h1>{row.serviceName}</h1>
        <div className="svc-detail-provider">
          <span className="svc-provider-avatar" aria-hidden="true">{(row.providerName || '?').trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase()}</span>
          <div><small>Nhà cung cấp</small><strong>{row.providerName}</strong></div>
        </div>
        <ul className="svc-detail-area-chips" aria-label="Khu vực phục vụ">{areaList(serviceAreaText(row)).map(area => <li key={area}><MapPin size={14} aria-hidden="true" /><span>{area}</span></li>)}</ul>
        <hr />
        <div className="svc-detail-price"><ServicePrice service={row} /></div>
        <div className="svc-detail-contact-actions">
          <UIButton className="svc-btn svc-btn-primary" onClick={() => setContact(row)}><Phone size={16} aria-hidden="true" />Liên hệ nhà cung cấp</UIButton>
          <UIButton className="svc-btn" disabled={user?.userId === row.providerId} onClick={() => setRequestFormOpen(true)}>Gửi yêu cầu</UIButton>
          {user?.userId === row.providerId && <p className="svc-detail-owner-note">Đây là dịch vụ của bạn</p>}
        </div>
        {user?.userId !== row.providerId && <p className="svc-detail-payment-note">Bạn chưa phải thanh toán ở bước này.</p>}
      </aside>
      <section className="svc-detail-copy"><h2>Mô tả dịch vụ</h2><p>{row.description}</p></section>
    </section> : !error && <>
      {!filteredRows.length && <div className="svc-empty"><Search size={28} aria-hidden="true" /><h2>{hasFilters ? 'Không tìm thấy dịch vụ phù hợp' : 'Chưa có dịch vụ công khai'}</h2><p>{hasFilters ? 'Thử từ khóa khác hoặc bớt điều kiện lọc để xem thêm dịch vụ.' : 'Các dịch vụ sẽ xuất hiện tại đây sau khi được xét duyệt.'}</p>{hasFilters && <UIButton className="svc-btn" type="button" onClick={clearFilters}>Xem tất cả dịch vụ</UIButton>}</div>}
      <div className="svc-grid">{filteredRows.map(row => <article className="svc-card" key={row.serviceId}><ServicePhoto url={row.imageUrl} alt={row.serviceName} /><div className="svc-card-body">{content(row)}<div className="svc-actions svc-card-footer"><Link className="svc-btn" to={`/services/detail?id=${row.serviceId}`}>Xem chi tiết<ArrowRight size={15} /></Link><UIButton className="svc-btn svc-btn-primary" onClick={() => setContact(row)}><Phone size={15} />Liên hệ</UIButton></div></div></article>)}</div>
    </>}
    {detail && row && !loading && !error && <>
      <div className="svc-detail-mobile-contact"><UIButton className="svc-btn svc-btn-primary" onClick={() => setContact(row)}><Phone size={18} aria-hidden="true" />Liên hệ nhà cung cấp</UIButton></div>
    </>}
    {detail && row && requestFormOpen && <ServiceRequestModal key={row.serviceId + '-' + user?.userId} service={row}
      onClose={() => setRequestFormOpen(false)} onSuccess={() => {
        setRequestFormOpen(false);
        notify('Đã gửi yêu cầu thành công. Nhà cung cấp sẽ phản hồi cho bạn.', 'success', {
          label: 'Xem yêu cầu của tôi', onClick: () => setRequestsOpen(true),
        });
      }} />}
    {register && <ServiceRegistrationModal onClose={() => { setRegister(false); setRevision(value => value + 1); }} />}
    {manage && <ServiceManagement onClose={() => { setManage(false); refresh(); }} />}
    {contact && <Modal title={`Liên hệ ${contact.serviceName}`} onClose={() => setContact(null)}><div className="svc-form"><p>{contact.providerName} · {serviceAreaText(contact)}</p><a className="svc-btn svc-btn-primary" href={`tel:${contact.contactPhone}`}><Phone size={16} />Gọi {contact.contactPhone}</a>{contact.contactEmail && <a className="svc-btn" href={`mailto:${contact.contactEmail}`}>Gửi email · {contact.contactEmail}</a>}</div></Modal>}
  </main>;
}
