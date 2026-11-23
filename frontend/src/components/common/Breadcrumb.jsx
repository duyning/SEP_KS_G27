import { createContext, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
export const PageTitleContext = createContext(null);
export function useBreadcrumbTitle(title) {
  const setTitle = useContext(PageTitleContext);
  useEffect(() => { setTitle?.(title || ''); return () => setTitle?.(''); }, [setTitle, title]);
}
const parents = {
  '/services/detail': ['/services', 'Dịch vụ'], '/properties/detail': ['/search', 'Tìm phòng'],
  '/host/property/new': ['/host/property', 'Nhà trọ của tôi'], '/host/property/edit': ['/host/property', 'Nhà trọ của tôi'],
  '/staff/verifications/detail': ['/staff/verifications', 'Hồ sơ xác minh nhà trọ'],
  '/staff/community/detail': ['/staff/community', 'Kiểm duyệt cộng đồng'], '/staff/assistance/detail': ['/staff/assistance', 'Yêu cầu hỗ trợ'],
};
export function breadcrumbItems(screen, portal, title, search = '') {
  if (screen.path === '/') return [{ label: 'HL_RCS' }];
  const items = [{ label: 'HL_RCS', to: '/' }];
  if (portal !== 'public' && screen.path !== '/' + portal) items.push({ label: { host: 'Chủ trọ', staff: 'Nhân viên', admin: 'Quản trị hệ thống' }[portal], to: '/' + portal });
  const parent = parents[screen.path]; if (parent) items.push({ to: parent[0], label: parent[1] });
  const applicationId = new URLSearchParams(search).get('id');
  if (screen.path === '/staff/service-applications' && applicationId) items.push({ to: screen.path, label: screen.title });
  items.push({ label: title || (screen.path === '/staff/service-applications' && applicationId ? 'Hồ sơ #' + applicationId : screen.title) });
  return items;
}
export default function Breadcrumb({ items, mobileBackTo }) {
  return <nav className="portal-breadcrumbs" aria-label="Đường dẫn">
    {mobileBackTo && <Link className="breadcrumb-mobile-back" to={mobileBackTo} aria-label="Quay lại danh sách dịch vụ"><ArrowLeft size={18} aria-hidden="true" /></Link>}
    <ol>{items.map((item, index) => <li key={index}>{index > 0 && <ChevronRight size={14} aria-hidden="true" />}{item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>)}</ol>
  </nav>;
}
