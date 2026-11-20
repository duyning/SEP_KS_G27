import {useRef} from 'react';
import {Link} from 'react-router-dom';
import {ShieldCheck,UserRound,IdCard,ImagePlus,Camera,LockKeyhole,Check} from 'lucide-react';
import {Fade} from '@animate-ui/react/primitives/effects/fade';
import {MotionButton} from './motion/MotionUI.jsx';
import HostIdentityImage from './HostIdentityImage.jsx';
import '../styles/host-account-application.css';

export default function HostAccountApplicationForm({user,roleLabel,application,values,errors,busy,alert,missingContact,identityImage,onIdentityFile,onRemoveIdentity,preview,onVerifyPhone,identityBackImage,submitLabel='Gửi yêu cầu cấp quyền',title='Đơn xin cấp quyền Chủ trọ'}){
 const picker=useRef({}),camera=useRef({});
 const frontReady=Boolean(identityImage||application?.hasIdentityImage),backReady=Boolean(identityBackImage||application?.hasIdentityBackImage);
 function sample(side){const canvas=document.createElement('canvas');canvas.width=640;canvas.height=400;const ctx=canvas.getContext('2d');ctx.fillStyle='#f0fdfa';ctx.fillRect(0,0,640,400);ctx.fillStyle='#115e59';ctx.font='bold 32px sans-serif';ctx.fillText('ẢNH MẪU — KHÔNG PHẢI GIẤY TỜ THẬT',24,190);onIdentityFile(new File([dataBlob(canvas.toDataURL('image/png'))],`anh-mau-${side}.png`,{type:'image/png'}),side);}
 return <section className="haf-form bh-form-card">
  <header className="haf-heading"><span className="haf-shield"><ShieldCheck size={23}/></span><div><h2>{title}</h2><p>Kiểm tra thông tin tài khoản và bổ sung giấy tờ định danh.</p></div></header>
  {preview&&<p className="haf-preview" role="note"><b>Bản xem trước</b> · Không gửi hồ sơ thật.</p>}
  {application?.status==='NEEDS_CHANGES'&&<aside className="haf-feedback"><b>Yêu cầu bổ sung từ Staff</b><p>{application.reviewerNote}</p></aside>}
  <form id="becomeHostForm" noValidate>
   <section className="haf-section"><h3><UserRound size={17}/>Thông tin tài khoản</h3>
    <dl className="haf-account"><div><dt>Họ và tên</dt><dd id="accFullName">{user.fullName||'Chưa cập nhật'}</dd></div><div><dt>Số điện thoại liên hệ</dt><dd id="accPhone">{user.phoneNumber||'Chưa cập nhật'}<span className={`haf-phone-status${user.phoneVerifiedAt?' verified':''}`}>{user.phoneVerifiedAt&&<Check size={12}/>} {user.phoneVerifiedAt?'Đã xác minh':'Chưa xác minh'}</span></dd></div><div><dt>Email tài khoản</dt><dd id="accEmail">{user.email}</dd></div><div><dt>Vai trò hiện tại</dt><dd id="accRole">{roleLabel}</dd></div></dl>
    {!user.phoneVerifiedAt&&<div className="haf-contact-note"><span>{user.phoneNumber?'Xác minh số điện thoại liên hệ ngay tại đây.':'Bổ sung và xác minh số điện thoại để hoàn thiện thông tin liên hệ.'}</span> <MotionButton type="button" className="haf-button" disabled={busy} onClick={onVerifyPhone}>Xác minh số điện thoại</MotionButton></div>}
    {!user.fullName?.trim()&&<p className="haf-contact-note">Vui lòng <Link to="/profile">cập nhật họ tên</Link> trước khi gửi hồ sơ. Bản nháp được giữ khi bạn quay lại.</p>}
   </section>
   <section className="haf-section"><h3><IdCard size={17}/>Giấy tờ định danh</h3>
    <p className="haf-upload-limit">Ảnh mặt trước và mặt sau CCCD · Tối đa 2 ảnh · JPG/PNG, mỗi ảnh tối đa 5 MB.</p>
    <div className="haf-identity-sides">{[['front','Mặt trước CCCD','identityImage',identityImage,application?.hasIdentityImage],['back','Mặt sau CCCD','identityBackImage',identityBackImage,application?.hasIdentityBackImage]].map(([side,label,key,image,present])=><section className="haf-identity-side" key={side}>
     <div className={`haf-upload${errors[key]?' has-error':''}`}><div className="haf-upload-copy"><label htmlFor={key}>{label} <span aria-label="bắt buộc">*</span></label><p>Chụp rõ toàn bộ mặt thẻ, không lóa và không cắt góc.</p></div>
      <div className="haf-upload-actions"><MotionButton type="button" className="haf-button" disabled={busy} onClick={()=>camera.current[side]?.click()} aria-label={`Chụp ảnh ${label.toLowerCase()}`}><Camera size={15}/>Chụp ảnh</MotionButton><MotionButton type="button" id={side==='front'?'btnChooseIdentity':'btnChooseIdentityBack'} className="haf-button" disabled={busy} onClick={()=>picker.current[side]?.click()} aria-label={`${image||present?'Thay':'Chọn'} ảnh ${label.toLowerCase()}`}>{image||present?'Thay ảnh':'Chọn ảnh'}</MotionButton>{preview&&<MotionButton type="button" className="haf-button" disabled={busy} onClick={()=>sample(side)}>Dùng ảnh mẫu {side==='front'?'mặt trước':'mặt sau'}</MotionButton>}</div>
      <input ref={element=>{picker.current[side]=element;}} id={key} type="file" accept="image/jpeg,image/png" className="haf-file" disabled={busy} aria-invalid={!!errors[key]} onChange={e=>{onIdentityFile(e.target.files?.[0],side);e.target.value='';}}/>
      <input ref={element=>{camera.current[side]=element;}} type="file" accept="image/jpeg,image/png" capture="environment" className="haf-file" disabled={busy} aria-label={`Chụp ${label.toLowerCase()}`} onChange={e=>{onIdentityFile(e.target.files?.[0],side);e.target.value='';}}/>
     </div>
     {image?<Fade key={image.slice(-24)} className="haf-image-preview"><img className="host-identity-image" src={image} alt={`Ảnh ${label.toLowerCase()} vừa chọn`}/><MotionButton type="button" className="haf-button" disabled={busy} onClick={()=>onRemoveIdentity(side)}>Xóa ảnh {side==='front'?'mặt trước':'mặt sau'}</MotionButton></Fade>:present&&<div className="haf-image-preview"><HostIdentityImage id={application.id} present side={side}/></div>}
     {errors[key]&&<p className="haf-error" role="alert">{errors[key]}</p>}
    </section>)}</div>
   </section>
   <div className="haf-section"><label className="haf-note-label" htmlFor="introduction">Ghi chú cho nhân viên xét duyệt <span>Tùy chọn</span></label><textarea id="introduction" name="introduction" rows={2} maxLength={1000} value={values.introduction} disabled={busy} aria-invalid={!!errors.introduction} aria-describedby="haf-note-limit" placeholder="Thông tin cần giải thích thêm, nếu có"/><small id="haf-note-limit">{values.introduction.length}/1000 ký tự</small>{errors.introduction&&<p className="haf-error" role="alert">{errors.introduction}</p>}</div>
   <div className="haf-agreement"><label><input id="agreementCheck" name="agreementAccepted" type="checkbox" checked={values.agreementAccepted} disabled={busy} aria-invalid={!!errors.agreementAccepted} aria-describedby="haf-agreement-error"/><span>Tôi xác nhận thông tin là chính xác và đồng ý với <strong>Quy chế hoạt động đối tác HL_RCS.</strong></span></label>{errors.agreementAccepted&&<p id="haf-agreement-error" className="haf-error" role="alert">{errors.agreementAccepted}</p>}</div>
   {alert&&<p role="alert" className="haf-error">{alert}</p>}
   <footer className="haf-footer"><MotionButton type="submit" id="btnSubmitForm" className="haf-button primary" disabled={busy||missingContact||!frontReady||!backReady||!values.agreementAccepted||values.introduction.length>1000||!!errors.identityImage||!!errors.identityBackImage}>{busy?'Đang xử lý…':submitLabel}</MotionButton></footer>
  </form>
 </section>;
}
function dataBlob(url){const bytes=atob(url.split(',')[1]);return new Uint8Array([...bytes].map(c=>c.charCodeAt(0)));}
