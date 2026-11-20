import { MotionButton, AnimatePresence } from '../components/motion/MotionUI.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { landingFor, roleLabels } from '../routing/screens.js';
import { Modal, useToast } from '../components/PortalUI.jsx';
import { hostApplicationApi } from '../services/host-applications.js';
import { getToken } from '../services/auth.js';
import BecomeHostPrototype from './BecomeHostPrototype.jsx';
import HostPhoneVerificationModal from '../components/HostPhoneVerificationModal.jsx';
import '../styles/home-prototype.css';
import '../styles/home-prototype-integration.css';
import '../styles/become-host-prototype.css';
import '../styles/become-host-integration.css';
import '../styles/become-host-refinement.css';
import '../styles/become-host-mobile.css';
let draft=null;

const emptyForm = {introduction:'',agreementAccepted:false};

const ids = {
  applicantCapacity: 'applicantCapacity',
  rentalExperience: 'rentalExperience',
  targetCommune: 'targetCommune',
  expectedScale: 'expectedScale',
  introduction: 'introduction',
  agreementAccepted: 'agreementCheck'
};

const formatDate = (value) => {
  if (!value) return '—';
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return '—';
  return (
    time.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' · ' +
    time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  );
};

export default function BecomeHostPage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [params]=useSearchParams();
  const preview=import.meta.env.DEV&&params.get('formPreview')==='1';
  const savedDraft=draft?.userId===user.userId&&draft?.session===getToken()?draft:null;
  const notify = useToast();

  const [application, setApplication] = useState(null);
  const [values, setValues] = useState(()=>savedDraft?.values||emptyForm);
  const [identityImage,setIdentityImage]=useState(()=>savedDraft?.identityImage||'');
  const [identityBackImage,setIdentityBackImage]=useState(()=>savedDraft?.identityBackImage||'');
  const [readingImage,setReadingImage]=useState(false);
  const submitLock=useRef(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [alert, setAlert] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(()=>savedDraft?.editing||false);
  const [modal, setModal] = useState(null);
  const [phoneOpen,setPhoneOpen]=useState(false);
  const [revision, setRevision] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);

  const refreshed = useRef(false);
  const formDirty = Object.values(values).some(Boolean)||!!identityImage||!!identityBackImage;
  useEffect(()=>{draft=formDirty?{userId:user.userId,session:getToken(),values,identityImage,identityBackImage,editing}:null;},[values,identityImage,identityBackImage,editing,user.userId,formDirty]);
  const missingContact = !user?.fullName?.trim() || !/^(0|\+84)[35789]\d{8}$/.test(user?.phoneNumber || '');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    hostApplicationApi
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setApplication(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setLoadError(
            error.status === 404
              ? 'Backend chưa có chức năng đăng ký làm chủ trọ. Vui lòng khởi động lại backend sau khi cập nhật code.'
              : error.message
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision, user?.userId]);

  useEffect(() => {
    if (application?.status !== 'PENDING_REVIEW') return;
    let stopped = false;
    const controller = new AbortController();
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      hostApplicationApi
        .current(controller.signal)
        .then((value) => {
          if (!stopped) setApplication(value);
        })
        .catch(() => {});
    }, 30000);
    return () => {
      stopped = true;
      controller.abort();
      clearInterval(timer);
    };
  }, [application?.status]);

  useEffect(() => {
    if (application?.status === 'APPROVED' && user?.role === 'USER' && !refreshed.current) {
      refreshed.current = true;
      refreshUser().catch(() => notify('Vui lòng đăng nhập lại để cập nhật quyền Chủ trọ.', 'error'));
    }
  }, [application?.status, user?.role]);

  useEffect(() => {
    const handler = (event) => {
      if (editing || (!application && formDirty)) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [editing, application, formDirty]);

  const state = loading
    ? 'loading'
    : loadError
      ? 'error'
      : application?.status === 'APPROVED'
        ? 'approved'
        : ['ROOM_HOST', 'ADMIN'].includes(user?.role)
          ? 'already_host'
          : user?.role !== 'USER'
            ? 'error'
            : editing
              ? 'unregistered'
              : { PENDING_REVIEW: 'pending', NEEDS_CHANGES: 'needs_changes', REJECTED: 'rejected' }[
                  application?.status
                ] || 'unregistered';

  useEffect(() => {
    if (!mobileOpen) return;
    const escape = (event) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        document.getElementById('mobileMenuBtn')?.focus();
      }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [mobileOpen]);

  const roleLabel = roleLabels[user?.role] || 'Thành viên';

  function stepClass(number) {
    if (['approved', 'already_host'].includes(state)) return 'completed';
    if (['pending', 'needs_changes', 'rejected'].includes(state)) {
      if (number < 3) return 'completed';
      if (number === 3) {
        if (state === 'pending') return 'active';
        if (state === 'needs_changes') return 'warning';
        return 'rejected';
      }
      return '';
    }
    return number === 1 ? 'active' : '';
  }

  const stepLabel = (number) => ({ completed: '✓', warning: '!', rejected: '✕' })[stepClass(number)] || number;

  function validate() {
    const next = {};
    if(!identityImage&&!application?.hasIdentityImage)next.identityImage='Vui lòng chọn ảnh mặt trước CCCD.';
    if(!identityBackImage&&!application?.hasIdentityBackImage)next.identityBackImage='Vui lòng chọn ảnh mặt sau CCCD.';
    if(values.introduction.length>1000)next.introduction='Ghi chú tối đa 1000 ký tự.';
    if (!values.agreementAccepted) {
      next.agreementAccepted = 'Bạn cần đồng ý với cam kết đối tác để gửi đơn đăng ký.';
    }
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(Object.keys(next)[0]==='identityImage'?'btnChooseIdentity':Object.keys(next)[0]==='identityBackImage'?'btnChooseIdentityBack':ids[Object.keys(next)[0]])?.focus();
      return false;
    }
    if (missingContact) {
      setAlert('Vui lòng cập nhật họ tên và số điện thoại tại Hồ sơ cá nhân.');
      return false;
    }
    return true;
  }

  async function submit() {
    if (submitLock.current || busy || readingImage || !validate()) return;
    if(preview){setModal(null);notify('Bản xem trước: không gửi hồ sơ thật.');return;}
    submitLock.current=true;
    setBusy(true);
    setAlert('');
    try {
      const result = await hostApplicationApi.submit({
        ...values,
        identityImage:identityImage||null,
        identityBackImage:identityBackImage||null,
        introduction: values.introduction.trim(),
        version: application?.version ?? null
      });
      setApplication(result);
      setEditing(false);
      setValues(emptyForm);setIdentityImage('');setIdentityBackImage('');draft=null;
      setModal(null);
      notify('Đã gửi đăng ký làm chủ trọ. Hồ sơ đang chờ xét duyệt.');
      document.getElementById('bhMainContent')?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      setModal(null);
      setAlert(error.message);
      setErrors(Object.keys(error.fields||{}).length?error.fields:(/ảnh|Ảnh/.test(error.message||'')?{identityImage:error.message}:{}));
    } finally {
      setBusy(false);submitLock.current=false;
    }
  }

  async function onIdentityFile(file,side='front'){
    const field=side==='back'?'identityBackImage':'identityImage';
    if(!file||busy||readingImage)return;
    if(!['image/jpeg','image/png'].includes(file.type)||file.size>5*1024*1024){setErrors(previous=>({...previous,[field]:'Chọn ảnh JPG hoặc PNG, tối đa 5 MB.'}));return;}
    setReadingImage(true);setAlert('');
    try{
      const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Không thể đọc ảnh. Vui lòng chọn lại.'));reader.readAsDataURL(file);});
      await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>image.naturalWidth*image.naturalHeight<=20000000?resolve():reject(Error('Ảnh tối đa 20 megapixel.'));image.onerror=()=>reject(Error('Không đọc được nội dung ảnh. Chọn ảnh JPG/PNG hợp lệ.'));image.src=url;});
      (side==='back'?setIdentityBackImage:setIdentityImage)(url);setErrors(previous=>({...previous,[field]:undefined}));
    }catch(error){setErrors(previous=>({...previous,[field]:error.message}));}finally{setReadingImage(false);}
  }

  function onChange(event) {
    const { name, value, checked, type } = event.target;
    if (!Object.hasOwn(emptyForm, name)) return;
    setValues((previous) => ({ ...previous, [name]: type === 'checkbox' ? checked : value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
    setAlert('');
  }

  function onSubmit(event) {
    if (event.target.id === 'becomeHostForm') {
      event.preventDefault();
      if (!busy && !readingImage && validate()) setModal('submit');
    }
  }

  function onClick(event) {
    if (event.target.closest('#mobileMenuBtn')) {
      setMobileOpen((value) => !value);
      setAnnouncementOpen(false);
    }
    if (event.target.closest('#becomeHostInfoToggle')) {
      setAnnouncementOpen((value) => !value);
      setMobileOpen(false);
    }
    if (event.target.closest('.bm-menu-dismiss')) setMobileOpen(false);
    if (event.target.closest('#becomeHostProgressToggle')) setProgressOpen((value) => !value);
    if (event.target.closest('.nav-menu a')) setMobileOpen(false);
    if (event.target.closest('#btnRetryError')) setRevision((value) => value + 1);
    if (event.target.closest('#btnCancelForm')) {
      if (formDirty) setModal('cancel');
      else navigate('/profile');
    }
    if (event.target.closest('#btnStartSupplement,#btnResubmitAfterReject') && application?.allowResubmit) {
      setValues({
        applicantCapacity: application.applicantCapacity || '',
        rentalExperience: application.rentalExperience || '',
        targetCommune: application.targetCommune,
        expectedScale: application.expectedScale,
        introduction: application.introduction,
        agreementAccepted: false
      });
      setEditing(true);
      setAlert('');
      setErrors({});
    }
  }

  async function signOut() {
    if (busy) return;
    try {
      if ((await logout()) === false) return;
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  }

  const account = (
    <>
      <Link to="/favorites" className="btn-wishlist-top" aria-label="Phòng yêu thích">
        <Heart size={18} />
        <span className="wishlist-count">0</span>
      </Link>
      {user.role !== 'USER' && (
        <Link to={user.role==='ROOM_HOST'?'/host/property':landingFor(user)} className="btn-primary-sm">
          {user.role==='ROOM_HOST'?'Nhà trọ của tôi':'Bảng điều khiển'}
        </Link>
      )}
      <div className="user-nav-pill">
        <Link to="/profile" className="user-nav-profile-link">
          <div className="user-nav-avatar">
            {user.avatar ? <img src={user.avatar} alt="Ảnh đại diện" /> : (user.fullName || 'U').charAt(0)}
          </div>
          <div className="user-nav-meta">
            <span className="user-nav-name">{user.fullName}</span>
            <span className="user-nav-role">{roleLabel}</span>
          </div>
        </Link>
        <MotionButton className="user-nav-logout" aria-label="Đăng xuất" onClick={signOut}>
          <LogOut size={15} />
        </MotionButton>
      </div>
    </>
  );

  return (
    <>
      <BecomeHostPrototype
        {...{
          user,
          roleLabel,
          application,
          values,
          errors,
          state,
          busy:busy||readingImage,
          identityImage,identityBackImage,onIdentityFile,onRemoveIdentity:(side='front')=>{(side==='back'?setIdentityBackImage:setIdentityImage)('');setErrors(previous=>({...previous,[side==='back'?'identityBackImage':'identityImage']:undefined}));},preview,onVerifyPhone:()=>setPhoneOpen(true),
          mobileOpen,
          announcementOpen,
          progressOpen,
          setProgressOpen,
          account,
          missingContact,
          formatDate,
          stepClass,
          stepLabel,
          onClick,
          onSubmit,
          onChange,
          notify
        }}
        alert={loadError || alert || (user.role === 'STAFF' ? 'Tài khoản nhân viên không cần đăng ký quyền Chủ trọ.' : '')}
      />
      <AnimatePresence>
        {phoneOpen&&<HostPhoneVerificationModal user={user} preview={preview} onClose={()=>setPhoneOpen(false)} onVerified={async()=>{await refreshUser();setPhoneOpen(false);notify('Đã xác minh số điện thoại. Bạn có thể tiếp tục hoàn thiện đơn chủ trọ.','success');}}/>}
        {modal && (
          <Modal
            className="bh-confirm-modal"
            title={modal === 'submit' ? 'Xác nhận gửi hồ sơ đăng ký làm Chủ trọ?' : 'Hủy bỏ nội dung đang nhập?'}
            onClose={() => {
              if (!busy) setModal(null);
            }}
          >
            {modal === 'submit' ? (
              <>
                <p>
                  Hồ sơ xin cấp quyền sẽ được chuyển sang trạng thái <strong>“Đang chờ xét duyệt”</strong> để đội ngũ
                  Staff HL-RCS thẩm định.
                </p>
                <aside>
                  <strong>Lưu ý:</strong> Đơn đăng ký này là thủ tục xin cấp quyền sử dụng chức năng Chủ trọ. Sau khi
                  được duyệt, bạn sẽ tạo hồ sơ cơ sở nhà trọ và danh sách phòng sau tại Host Portal.
                </aside>
                <footer>
                  <MotionButton className="p-button" disabled={busy} onClick={() => setModal(null)}>
                    Xem lại hồ sơ
                  </MotionButton>
                  <MotionButton className="p-button primary" disabled={busy} onClick={submit}>
                    {busy ? 'Đang gửi...' : 'Đồng ý gửi hồ sơ'}
                  </MotionButton>
                </footer>
              </>
            ) : (
              <>
                <p>
                  Bạn đang có một số thông tin đã điền trong đơn đăng ký. Nếu rời khỏi trang lúc này, các nội dung chưa
                  gửi sẽ bị hủy bỏ.
                </p>
                <footer>
                  <MotionButton className="p-button" onClick={() => setModal(null)}>
                    Ở lại tiếp tục điền
                  </MotionButton>
                  <MotionButton
                    className="p-button danger"
                    onClick={() => {
                      setValues(emptyForm);
                      navigate('/profile');
                    }}
                  >
                    Đồng ý rời đi
                  </MotionButton>
                </footer>
              </>
            )}
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
