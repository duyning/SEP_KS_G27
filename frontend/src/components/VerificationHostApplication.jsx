import {UserRound,Eye} from 'lucide-react';
import {MotionButton} from './motion/MotionUI.jsx';
import {SectionHeading,VerificationFields} from './VerificationDetailSections.jsx';
import {staffDate} from './StaffUI.jsx';
import {roleLabels} from '../routing/screens.js';
import {newestVerificationAttachments} from '../services/verification-detail.js';
import '../styles/verification-host-application.css';
export default function VerificationHostApplication({application,summary,submission,documents,onOpen,loading}){
 const ordered=newestVerificationAttachments(documents),front=ordered.find(file=>file.type==='ID_CARD'),back=ordered.find(file=>file.type==='ID_CARD_BACK');
 return <section id="svd-section-owner" className="sw-panel svd-section svd-host-application">
  <SectionHeading number={2} title="Đơn đăng ký làm Chủ trọ" icon={UserRound}><span className="svd-host-application-badge">Xét duyệt cùng nhà trọ</span></SectionHeading>
  {!application&&<p className="sw-error" role="alert">Chưa tải được đầy đủ thông tin đơn cấp quyền. Vui lòng tải lại hồ sơ.</p>}
  <VerificationFields rows={[
   ['Người đăng ký',application?.userName||summary.ownerName||null],['Email tài khoản',application?.email||summary.ownerEmail||null],
   ['Số điện thoại tài khoản',application?.phone||summary.ownerPhone||null],['Xác minh điện thoại',application?(application.phoneVerified?'Đã xác minh':'Chưa xác minh'):null],
   ['Vai trò hiện tại',roleLabels[application?.currentRole]||null],['Gửi đơn chủ trọ',application?.submittedAt?staffDate(application.submittedAt):null],
   ['Cam kết quy chế đối tác',application?(application.agreementAccepted?'Đã đồng ý':'Chưa ghi nhận cam kết'):null],
  ]}/>
  <div className="svd-host-identity"><h4>CCCD đã nộp trong đơn chủ trọ</h4><p>Hai mặt được đính kèm chung với hồ sơ nhà trọ, không cần gửi đơn cấp quyền riêng.</p><div>{[[front,'mặt trước'],[back,'mặt sau']].map(([file,side])=><MotionButton key={side} type="button" className="sw-outline small" disabled={!file||loading} onClick={()=>onOpen(file)}><Eye size={15} aria-hidden="true"/>{file?`Xem CCCD ${side}`:`Chưa có CCCD ${side}`}</MotionButton>)}</div></div>
  {application?.introduction&&<div className="svd-host-app-note"><strong>Ghi chú của người đăng ký</strong><p>{application.introduction}</p></div>}
  <h4 className="svd-host-contact-title">Liên hệ quản lý nhà trọ</h4><VerificationFields rows={[
   ['Người quản lý / Đại diện',submission?.managerName||null],['Hotline tiếp khách',submission?.contactPhone||null],['Zalo liên hệ',submission?.zaloPhone||null],
  ]}/>
 </section>;
}
