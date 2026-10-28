import '../../styles/staff-host-prototype.css';
import '../../styles/staff-host-integration.css';
import '../../styles/staff-host-decision-modal.css';
export const applicationLabels={PENDING_REVIEW:'Chờ xét duyệt',NEEDS_CHANGES:'Cần bổ sung',APPROVED:'Đã phê duyệt',REJECTED:'Đã từ chối'};
export const date=value=>{const time=new Date(value);return !value||Number.isNaN(time.getTime())?'—':time.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'})+' · '+time.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});};
export function HostApplicationStatus({status}){return <span className={`shr-status-badge ${{PENDING_REVIEW:'pending',NEEDS_CHANGES:'warning',APPROVED:'approved',REJECTED:'rejected'}[status]||''}`}><span className="dot"/>{applicationLabels[status]||status}</span>;}
// Navigation and topbar come from PortalLayout, shared by every Staff screen.
export default function StaffHostShell({children}) {
 return <div className="hr-staff staff-body hr-staff-content-only">{children}</div>;
}
