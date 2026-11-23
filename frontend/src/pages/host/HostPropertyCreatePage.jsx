import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { MotionButton } from '../../components/motion/MotionUI.jsx';
import { StateView } from '../../components/PortalUI.jsx';
import { hostApi } from '../../services/host.js';
import { BRAND } from '../../config/brand.js';
import RegistrationWizard from '../../components/property-registration/RegistrationWizard.jsx';
import '../../styles/host-empty-state.css';

export function RegistrationForm(props) {
  return <RegistrationWizard {...props} />;
}

export default function HostPropertyCreatePage() {
  const { user } = useAuth();
  const [access, setAccess] = useState({ userId: null, loading: true, data: null, error: '' });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const recheck = () => {
      if (document.visibilityState === 'visible') setRevision((value) => value + 1);
    };
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', recheck);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // Rechecking after a file picker closes must not unmount the in-progress form.
    setAccess((previous) =>
      previous.userId === user?.userId
        ? { ...previous, loading: true }
        : { userId: user?.userId, loading: true, data: null, error: '' }
    );
    hostApi
      .registrationEligibility(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setAccess({ userId: user?.userId, loading: false, data, error: '' });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setAccess((previous) => ({ ...previous, loading: false, error: error.message }));
        }
      });
    return () => controller.abort();
  }, [user?.userId, revision]);

  if (access.userId !== user?.userId || (access.loading && !access.data)) {
    return <StateView kind="loading" />;
  }
  if (access.error && !access.data) {
    return (
      <StateView kind="error" message={access.error}>
        <MotionButton className="p-button" onClick={() => setRevision((value) => value + 1)}>
          Thử lại
        </MotionButton>
      </StateView>
    );
  }
  if (!access.data.canRegister) {
    return (
      <StateView
        kind="error"
        message="Máy chủ chưa cho phép đăng ký thêm nhà trọ. Vui lòng khởi động lại backend để áp dụng quy định mới."
      />
    );
  }

  return (
    <div style={{ padding: '4px 0 28px' }}>
      <header style={{ maxWidth: 1240, margin: '0 auto 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            width: 'fit-content',
            padding: '4px 11px',
            borderRadius: 999,
            background: '#f0fdfa',
            border: '1px solid #99f6e4',
            color: '#0f766e',
            fontSize: '0.76rem',
            fontWeight: 700
          }}
        >
          <ShieldCheck size={14} aria-hidden="true" />
          Đối tác {BRAND.name}
        </span>
        <h2 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Đăng ký cơ sở nhà trọ mới
        </h2>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>
          Hoàn tất 6 bước thông tin nhà trọ, hình ảnh và giấy tờ pháp lý để nhân viên {BRAND.name} thẩm định và mở hiển thị.
        </p>
      </header>

      {access.error && (
        <p className="registration-submit-error" role="alert" style={{ maxWidth: 1240, margin: '0 auto 16px' }}>
          Không thể kiểm tra lại quyền đăng ký: {access.error} Thông tin đang nhập được giữ nguyên.{' '}
          <MotionButton type="button" className="p-button" onClick={() => setRevision((value) => value + 1)}>
            Thử lại
          </MotionButton>
        </p>
      )}

      <RegistrationWizard
        key={user?.userId}
        user={user}
        accessBlocked={Boolean(access.error)}
        identityApplicationId={access.data.identityApplicationId}
        hasIdentityBackImage={access.data.hasIdentityBackImage}
      />
    </div>
  );
}
