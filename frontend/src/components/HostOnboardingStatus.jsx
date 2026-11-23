import {Building2,Check,Clock3,FileCheck2,RefreshCw,AlertCircle} from 'lucide-react';
import {MotionButton} from './motion/MotionUI.jsx';
const statuses={
 PENDING:{label:'Chờ xét duyệt',title:'Hồ sơ đang chờ xét duyệt',description:'Hồ sơ đã được tiếp nhận. Nhân viên sẽ kiểm tra thông tin chủ trọ, CCCD và hồ sơ nhà trọ của bạn.',Icon:Clock3},
 NEEDS_SUPPLEMENT:{label:'Cần bổ sung',title:'Hồ sơ cần bổ sung',description:'Vui lòng kiểm tra phản hồi của nhân viên, bổ sung các mục được yêu cầu và gửi lại hồ sơ.',Icon:AlertCircle},
 REJECTED:{label:'Chưa được chấp thuận',title:'Hồ sơ chưa được chấp thuận',description:'Vui lòng xem lý do xét duyệt bên dưới. Bạn có thể chỉnh sửa và gửi lại hồ sơ.',Icon:AlertCircle},
 APPROVED:{label:'Đã phê duyệt',title:'Hồ sơ đã được phê duyệt',description:'Thông tin chủ trọ và nhà trọ đầu tiên đã được phê duyệt. Cập nhật trạng thái để vào Host Portal.',Icon:FileCheck2},
};
export default function HostOnboardingStatus({registration,refreshing,editing,error,onRefresh,onEdit}){
 const state=statuses[registration.status],Icon=state.Icon,pending=registration.status==='PENDING';
 const date=registration.createdAt?new Date(registration.createdAt):null;
 const submitted=date&&!Number.isNaN(date.getTime())?new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short'}).format(date):null;
 return <section className={`onboarding-review tone-${registration.status.toLowerCase()}`} aria-labelledby="onboarding-review-title" aria-busy={refreshing||editing}>
  <header className="onboarding-review-heading"><span className="onboarding-review-icon"><Icon size={25} aria-hidden="true"/></span><div><span className="onboarding-review-badge" role="status">{state.label}</span><h2 id="onboarding-review-title">{state.title}</h2><p>{state.description}</p></div></header>
  <div className="onboarding-review-property"><Building2 size={21} aria-hidden="true"/><div><span>Nhà trọ đăng ký</span><strong>{registration.name}</strong></div>{submitted&&<div className="onboarding-review-date"><span>Gửi lần đầu</span><time dateTime={registration.createdAt}>{submitted}</time></div>}</div>
  {pending&&<ol className="onboarding-review-progress" aria-label="Tiến trình xét duyệt"><li className="done"><span><Check size={16} aria-hidden="true"/></span><div><strong>Đã gửi hồ sơ</strong><small>Hệ thống đã tiếp nhận</small></div></li><li className="current" aria-current="step"><span><Clock3 size={16} aria-hidden="true"/></span><div><strong>Nhân viên thẩm định</strong><small>Chờ kiểm tra và xét duyệt</small></div></li><li><span><FileCheck2 size={16} aria-hidden="true"/></span><div><strong>Nhận kết quả</strong><small>Cấp quyền khi được duyệt</small></div></li></ol>}
  {registration.reasonNote&&<div className="onboarding-review-note"><strong>Phản hồi hồ sơ</strong><p>{registration.reasonNote}</p></div>}
  <footer className="onboarding-review-footer"><p>{pending?'Quyền Chủ trọ và nhà trọ đầu tiên được xét duyệt cùng nhau. Nhà trọ chưa hiển thị công khai trong thời gian chờ duyệt.':'Quyền Chủ trọ và nhà trọ đầu tiên được xét duyệt trong cùng một hồ sơ.'}</p><div>{['NEEDS_SUPPLEMENT','REJECTED'].includes(registration.status)&&<MotionButton className="p-button primary" disabled={refreshing||editing} onClick={onEdit}>{editing?'Đang mở…':'Bổ sung & gửi lại hồ sơ'}</MotionButton>}<MotionButton className="p-button onboarding-review-refresh" disabled={refreshing||editing} onClick={onRefresh}><RefreshCw size={16} className={refreshing?'spin':''} aria-hidden="true"/>{refreshing?'Đang cập nhật…':'Cập nhật trạng thái'}</MotionButton></div></footer>
  {error&&<p className="onboarding-review-error" role="alert">{error}</p>}
 </section>;
}
