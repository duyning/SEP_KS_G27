import { MotionButton } from '../../components/motion/MotionUI.jsx';
import { Link } from 'react-router-dom';
import {applicantCapacities,rentalExperiences,applicationFieldLabel} from '../../services/host-applications.js';
import { ArrowLeft, Check, FilePenLine, History, Info, MapPin, ShieldCheck, UserRound, Users, X } from 'lucide-react';
export default function StaffHostDetailTemplate(props){
 const a=props.application;
 return <div className="sha-page sha-detail" onClick={props.onClick}>
  <div className="sha-record-toolbar"><Link className="sha-back" to="/staff/host-registrations"><ArrowLeft size={15}/>Danh sách đăng ký</Link><div><span className="sha-id" id="headerDetailId">HREG-{a.id}</span>{props.statusBadge}</div></div>
  <div className="sha-detail-layout"><div className="sha-detail-main">
   <section className="sha-panel sha-detail-panel"><header><h3><UserRound size={18}/>Người đăng ký</h3><span className="sha-role">{a.status==='APPROVED'?'Chủ trọ':'Người dùng'}</span></header>
    <div className="sha-applicant"><span className="sha-avatar">{(a.userName||'U').charAt(0)}</span><div><strong id="detailApplicantName">{a.userName}</strong><span>Mã tài khoản #{a.userId}</span></div></div>
    <dl className="sha-contact"><div><dt>Số điện thoại</dt><dd id="detailApplicantPhone">{a.userPhone||'Chưa cung cấp'}</dd></div><div><dt>Email</dt><dd id="detailApplicantEmail">{a.userEmail||'Chưa cung cấp'}</dd></div></dl>
   </section>
   <section className="sha-panel sha-detail-panel"><header><h3><ShieldCheck size={18}/>Thông tin đăng ký</h3></header>
    <dl className="sha-scope"><div><dt>Tư cách cho thuê</dt><dd>{applicationFieldLabel(applicantCapacities,a.applicantCapacity)}</dd></div><div><dt>Kinh nghiệm quản lý</dt><dd>{applicationFieldLabel(rentalExperiences,a.rentalExperience)}</dd></div><div><dt><MapPin size={14}/>Khu vực dự kiến</dt><dd id="detailTargetCommune">{a.targetCommune||'Chưa cung cấp'}</dd></div><div><dt><Users size={14}/>Quy mô dự kiến</dt><dd id="detailExpectedScale">{a.expectedScale||'Chưa cung cấp'}</dd></div></dl>
    <h4 className="sha-field-title">Giới thiệu & Kế hoạch vận hành</h4><p className="sha-introduction" id="detailIntroduction">{a.introduction||'Chưa có nội dung giới thiệu.'}</p>
    <div className="sha-note"><Info size={16}/><p>Phê duyệt hồ sơ sẽ cấp quyền Chủ trọ cho tài khoản. Nhà trọ cụ thể cần được đăng ký và xác minh riêng trước khi hiển thị công khai.</p></div>
   </section>
   <section className="sha-panel sha-detail-panel"><header><h3><History size={18}/>Lịch sử xét duyệt</h3></header><div className="sha-history" id="detailTimelineContainer">{props.history}</div></section>
  </div><aside className="sha-detail-aside">
   <section className="sha-panel sha-detail-panel sha-decision"><header><h3>Quyết định xét duyệt</h3></header>
    <dl className="sha-summary"><div><dt>Trạng thái</dt><dd>{props.statusBadge}</dd></div><div><dt>Ngày gửi</dt><dd id="overviewSubmittedAt">{props.date(a.submittedAt)}</dd></div><div><dt>Cập nhật</dt><dd id="overviewUpdatedAt">{props.date(a.updatedAt)}</dd></div><div><dt>Người xử lý</dt><dd>{a.reviewedBy||'Chưa xử lý'}</dd></div></dl>
    {a.status==='PENDING_REVIEW'?<div id="decisionActionGroup" className="sha-decisions"><MotionButton type="button" id="btnTriggerApprove" className="sha-button primary"><Check size={16}/>Phê duyệt đăng ký</MotionButton><MotionButton type="button" id="btnTriggerRequestChanges" className="sha-button warning"><FilePenLine size={16}/>Yêu cầu bổ sung thông tin</MotionButton><MotionButton type="button" id="btnTriggerReject" className="sha-button danger"><X size={16}/>Từ chối hồ sơ</MotionButton><p>Quyết định chỉ được lưu sau khi xác nhận trong hộp thoại.</p></div>:<div id="decisionTerminalGroup">{props.terminal}</div>}
   </section>
   <details className="sha-panel sha-guidance"><summary>Lưu ý khi xét duyệt</summary><ul><li>Đối chiếu thông tin liên hệ và khu vực dự kiến hoạt động.</li><li>Đọc kỹ quy mô, kế hoạch và nội dung giới thiệu.</li><li>Khi yêu cầu bổ sung, chọn đúng trường và hướng dẫn cụ thể.</li></ul></details>
  </aside></div>
 </div>;
}
