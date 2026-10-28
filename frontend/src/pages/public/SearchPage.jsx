import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, RotateCcw, Search } from 'lucide-react';
import Pagination from '../../components/common/Pagination.jsx';
import AccommodationResults from '../../components/AccommodationResults.jsx';
import useAccommodations from '../../hooks/useAccommodations.js';
import { accommodationQuery } from '../../services/accommodations.js';
import '../../styles/accommodations.css';

const PAGE_SIZE = 6;
export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const rawPage = Number(params.get('page') || 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const q = params.get('q') || '', location = params.get('location') || 'all', price = params.get('price') || 'all';
  const sort = params.get('sort') || 'newest', type = params.get('type') || 'all';
  const query = accommodationQuery({ page: page - 1, size: PAGE_SIZE, q, location, price, sort, type });
  const state = useAccommodations(query);
  const { data, loading } = state;
  function change(key, value) {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key); else next.set(key, String(value));
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: key === 'q' });
  }
  useEffect(() => {
    if (data && page > Math.max(1, data.totalPages)) {
      const next = new URLSearchParams(params);
      next.set('page', String(Math.max(1, data.totalPages)));
      setParams(next, { replace: true });
    }
  }, [data, page, params, setParams]);
  return <main className="acc-search">
    <header className="acc-header"><h1>Khám phá nhà trọ &amp; Căn hộ tại Hòa Lạc</h1><p>Nhà trọ đã xác minh, giá thuê và số phòng trống cập nhật từ hệ thống.</p></header>
    <div className="acc-search-layout"><aside className="acc-filters">
      <div className="acc-filter-title"><h2><Filter size={18} />Bộ lọc tìm kiếm</h2><button type="button" onClick={() => setParams({})} aria-label="Đặt lại bộ lọc"><RotateCcw size={16} />Đặt lại</button></div>
      <label htmlFor="searchArea">Khu vực</label><select id="searchArea" value={location} onChange={event => change('location', event.target.value)}><option value="all">Tất cả khu vực Hòa Lạc</option><option value="tan-xa">Tân Xã</option><option value="thach-hoa">Thạch Hòa</option><option value="binh-yen">Bình Yên</option><option value="cnc">Khu Công nghệ cao</option></select>
      <label htmlFor="searchPrice">Khoảng giá / tháng</label><select id="searchPrice" value={price} onChange={event => change('price', event.target.value)}><option value="all">Tất cả mức giá</option><option value="under-15">Dưới 1,5 triệu</option><option value="15-25">Từ 1,5 đến 2,5 triệu</option><option value="25-35">Trên 2,5 đến 3,5 triệu</option><option value="above-35">Trên 3,5 triệu</option></select>
      <label htmlFor="searchType">Loại phòng</label><select id="searchType" value={type} onChange={event => change('type', event.target.value)}><option value="all">Tất cả loại phòng</option><option value="khep-kin">Khép kín</option><option value="gac-lung">Gác lửng / xép</option><option value="chung-cu-mini">Chung cư mini</option></select>
    </aside><section aria-label="Danh sách nhà trọ" aria-busy={loading}>
      <div className="acc-toolbar"><div className="acc-search-input"><Search size={18} /><input type="search" aria-label="Tìm kiếm phòng trọ" placeholder="Tên nhà trọ, loại phòng, địa chỉ..." maxLength={200} value={q} onChange={event => change('q', event.target.value)} /></div><label htmlFor="searchSort">Sắp xếp</label><select id="searchSort" value={sort} onChange={event => change('sort', event.target.value)}><option value="newest">Mới nhất</option><option value="price-asc">Giá tăng dần</option><option value="price-desc">Giá giảm dần</option></select></div>
      {!loading && data && <p className="acc-count" aria-live="polite">Tìm thấy <strong>{data.totalElements}</strong> loại phòng phù hợp</p>}
      <AccommodationResults {...state} />
      {!loading && !state.error && data?.totalElements > 0 && <Pagination currentPage={page} totalPages={data.totalPages} totalItems={data.totalElements} pageSize={PAGE_SIZE} onPageChange={value => change('page', value)} />}
    </section></div>
  </main>;
}