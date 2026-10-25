import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Database, LoaderCircle, X } from 'lucide-react';

const ToastContext = createContext(null);
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  const notify = (message, type = 'success') => {
    clearTimeout(timer.current); setToast({ message, type });
    timer.current = setTimeout(() => setToast(null), 6000);
  };
  return <ToastContext.Provider value={notify}>{children}{toast && <div className={`portal-toast ${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>{toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}<span>{toast.message}</span><button className="p-icon" title="Đóng thông báo" aria-label="Đóng thông báo" onClick={() => setToast(null)}><X size={18} /></button></div>}</ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);

export function Modal({ title, children, onClose, className = '' }) {
  const dialog = useRef();
  const titleId = useId();
  useEffect(() => { const element = dialog.current; element.showModal(); return () => element.close(); }, []);
  return <dialog className={`portal-modal ${className}`} ref={dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === dialog.current) onClose(); }}><header><h2 id={titleId}>{title}</h2><button type="button" className="p-icon" title="Đóng" aria-label="Đóng" onClick={onClose}><X size={20} /></button></header>{children}</dialog>;
}
export function StateView({ kind = 'blocked', message, children }) {
  const Icon = kind === 'loading' ? LoaderCircle : kind === 'error' ? AlertCircle : Database;
  const title = { blocked: 'Dữ liệu chưa khả dụng', empty: 'Không có kết quả', error: 'Không thể tải dữ liệu', loading: 'Đang tải dữ liệu' }[kind];
  return <div className={`portal-state ${kind}`} role={kind === 'error' ? 'alert' : 'status'}><Icon size={28} className={kind === 'loading' ? 'spin' : ''} /><h3>{title}</h3><p>{message || (kind === 'blocked' ? 'Máy chủ chưa hỗ trợ chức năng này. Dữ liệu và thao tác hiện chưa khả dụng.' : '')}</p>{children}</div>;
}
export function StatusBadge({ children, tone = 'neutral' }) { return <span className={`p-badge ${tone}`}>{children}</span>; }
export function UnsupportedButton({ children, ...props }) { return <button type="button" className="p-button" {...props} disabled title="Chưa có API hỗ trợ">{children}</button>; }
export function Metrics({ labels }) {
  return <div className="portal-kpis">{labels.map((label, index) => <article className={`portal-kpi accent-${index % 4}`} key={label}><p>{label}</p><strong aria-label="Chưa có dữ liệu">—</strong><span>Chưa có dữ liệu</span></article>)}</div>;
}
export function DataTable({ columns, rows, state = 'blocked' }) {
  return <><div className="portal-table-wrap"><table className="portal-table"><thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows?.length ? rows.map(row => <tr key={row.id}>{columns.map((column, index) => <td key={column} data-label={column}>{row.cells[index]}</td>)}</tr>) : <tr><td colSpan={columns.length}><StateView kind={state} /></td></tr>}</tbody></table></div><div className="portal-pagination"><span>Chưa có dữ liệu phân trang</span><div><button className="p-icon" disabled aria-label="Trang trước" title="Trang trước"><ChevronLeft size={18} /></button><button className="p-icon" disabled aria-label="Trang tiếp" title="Trang tiếp"><ChevronRight size={18} /></button></div></div></>;
}
