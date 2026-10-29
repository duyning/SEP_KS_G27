import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ServiceRegistrationModal from './ServiceRegistrationModal.jsx';
import { publicServicesApi as api, servicePrice } from '../services/public-services.js';
import '../styles/service-applications.css';

const categoryAliases = { moving: 'Chuyển phòng trọ', laundry: 'Giặt là sinh viên', cleaning: 'Dọn dẹp & Vệ sinh', repair: 'Sửa chữa điện nước, khóa cổng' };

export default function ServicesCatalog({ detail = false }) {
  const [params, setParams] = useSearchParams(); const id = params.get('id'); const category = params.get('category') || 'all';
  const [rows, setRows] = useState([]); const [row, setRow] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [revision, setRevision] = useState(0); const [register, setRegister] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setRow(null); setRows([]);
    async function load() {
      if (detail) return api.detail(id, controller.signal);
      const options = await api.categories(controller.signal);
      if (controller.signal.aborted) return;
      setCategories(options);
      const categoryId = category === 'all' ? null : options.find(option => option.name === categoryAliases[category])?.categoryId || category;
      return api.list(controller.signal, categoryId);
    }
    load().then(data => { if (!controller.signal.aborted) detail ? setRow(data) : setRows(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [detail, id, category, revision]);
  const selectedCategory = String(categories.find(option => option.name === categoryAliases[category])?.categoryId || category);
  const content = row => <><h2>{row.serviceName}</h2><p>Đối tác đã xác thực · {row.categoryName}</p><p className="service-text">{row.description}</p><p>Khu vực: {row.serviceArea}</p><p><strong>{servicePrice(row)}</strong></p><p>Nhà cung cấp: {row.providerName} · #{row.providerId}</p><a aria-label={`Gọi ${row.contactPhone}`} href={`tel:${row.contactPhone}`}>{row.contactPhone}</a>{row.contactEmail && <p><a aria-label={`Gửi email tới ${row.contactEmail}`} href={`mailto:${row.contactEmail}`}>{row.contactEmail}</a></p>}</>;
  return <main className="service-applications">
    <div className="service-applications-heading"><h1>{detail ? 'Chi tiết dịch vụ' : 'Dịch vụ hỗ trợ quanh khu vực Hòa Lạc'}</h1>{!detail && <button onClick={() => setRegister(true)}>Đăng ký cung cấp dịch vụ / Xem hồ sơ</button>}</div>
    {detail ? <Link to="/services">← Danh sách dịch vụ</Link> : <p>Tìm và liên hệ các dịch vụ đã được xét duyệt, đang hoạt động tại Hòa Lạc.</p>}
    {!detail && <label>Lọc danh mục<select value={selectedCategory} onChange={e => setParams(e.target.value === 'all' ? {} : { category: e.target.value })}><option value="all">Tất cả dịch vụ</option>{selectedCategory !== 'all' && !categories.some(option => String(option.categoryId) === selectedCategory) && <option value={selectedCategory}>{categoryAliases[category] || 'Danh mục đã chọn'}</option>}{categories.map(option => <option key={option.categoryId} value={option.categoryId}>{option.name}</option>)}</select></label>}
    {error && <div role="alert" className="service-error">{error}<button onClick={() => setRevision(v => v + 1)}>Thử lại</button></div>}
    {loading ? <p role="status">Đang tải dịch vụ...</p> : detail ? row && <section>{content(row)}</section> : !error && <>
      {!rows.length && <p>Chưa có dịch vụ được công khai trong danh mục này.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 18 }}>{rows.map(row => <section key={row.serviceId}>{content(row)}<p><Link to={`/services/detail?id=${row.serviceId}`}>Bảng giá & Chi tiết →</Link></p></section>)}</div>
    </>}
    {register && <ServiceRegistrationModal onClose={() => { setRegister(false); setRevision(value => value + 1); }} />}
  </main>;
}
