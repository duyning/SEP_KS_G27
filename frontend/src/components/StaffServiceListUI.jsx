import UIButton from './common/Button.jsx';
import { Link } from 'react-router-dom';
import '../styles/staff-service-lists.css';

export function StaffListIcon({ type }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {type === 'arrow' ? <path d="M5 12h14m-5-5 5 5-5 5" /> : type === 'clock' ? <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> : type === 'refresh' ? <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1" /></> : <><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h5" /></>}
  </svg>;
}

export function StaffListStatus({ label, tone = 'neutral' }) {
  return <span className={`staff-report-status tone-${tone}`}><span className="staff-report-dot" aria-hidden="true" />{label}</span>;
}
export function StaffListFilters({ options, value, onChange, label = 'Lọc theo trạng thái' }) {
  return <div className="staff-report-filters" role="group" aria-label={label}>{options.map(option => <UIButton type="button" key={option.value} className={`staff-status-filter filter-${option.tone || "neutral"}`} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}<span className="staff-report-count">{option.count}</span></UIButton>)}</div>;
}
export function StaffListPanel({ title, description, loading, onReload, children }) {
  return <div className="staff-report-list"><div className="staff-report-toolbar"><div><h2>{title}</h2><p>{description}</p></div><UIButton type="button" onClick={onReload} disabled={loading}><span className={loading ? 'staff-list-reloading' : ''}><StaffListIcon type="refresh" /></span>Tải lại</UIButton></div>{children}</div>;
}
export function StaffListOpen({ to, onClick, children }) {
  const content = <>{children}<StaffListIcon type="arrow" /></>;
  return to ? <Link className="ui-button staff-report-open" to={to}>{content}</Link> : <UIButton className="staff-report-open" variant="primary" onClick={onClick}>{content}</UIButton>;
}
export function StaffListTag({ children }) { return children ? <span className="staff-list-tag">{children}</span> : null; }
