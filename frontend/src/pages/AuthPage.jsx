import UIField from '../components/common/Field.jsx';
import { MotionButton } from '../components/motion/MotionUI.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  Eye,
  EyeOff,
  House,
  LoaderCircle,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  Star,
  UserRound,
} from 'lucide-react';
import GoogleSignIn from '../components/GoogleSignIn.jsx';
import PasswordRecoveryDialog from '../components/PasswordRecoveryDialog.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/PortalUI.jsx';
import { sessionDestination } from '../routing/session-destination.js';
import { authApi } from '../services/auth.js';
import { BrandIcon, BRAND } from '../components/brand/index.js';
import '../styles/auth-mobile.css';

const DEMO_ACCOUNTS = [
  ['Người thuê (Sinh viên)', 'user@hlrcs.com', '123456'],
  ['Chủ trọ đối tác', 'host@hlrcs.com', '123456'],
  ['Chủ trọ chưa đăng ký nhà trọ', 'host-new@hlrcs.com', '123456'],
  ['Nhân viên (Staff)', 'staff@hlrcs.com', '123456'],
  ['Quản trị viên (Admin)', 'admin@hlrcs.com', 'admin123'],
];

const registerEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const registerPhone = /^(?:0|\+84)[35789][0-9]{8}$/;
const registerPassword = /^(?=.*\p{Lu})(?=.*\p{Ll})(?=.*\p{Nd}).{8,}$/su;

function identifierError(value) {
  if (!value) return 'Vui lòng nhập email hoặc số điện thoại.';
  if (!registerEmail.test(value) && !registerPhone.test(value)) return 'Email hoặc số điện thoại không đúng định dạng.';
  return undefined;
}

export default function AuthPage({ registerMode = false }) {
  const { login, loginWithGoogle, register, user, passwordChanged } = useAuth();
  const notify = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Page Flip State: true = Register (Flipped), false = Login (Front)
  const isFlipped = Boolean(registerMode || location.pathname === '/register');

  // Login Form States
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRemember, setLoginRemember] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginErrors, setLoginErrors] = useState({});
  const [loginAlert, setLoginAlert] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState(location.state?.passwordChanged ? 'Đã đổi mật khẩu thành công. Vui lòng đăng nhập lại.' : '');

  // Register Form States
  const [regFullName, setRegFullName] = useState('');
  const [regIdentifier, setRegIdentifier] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regAgree, setRegAgree] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regErrors, setRegErrors] = useState({});
  const [regAlert, setRegAlert] = useState('');
  const [regBusy, setRegBusy] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpAction, setOtpAction] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [verification, setVerification] = useState(null);
  const otpInput = useRef(null);
  const regPasswordInput = useRef(null);

  useEffect(() => {
    document.title = isFlipped
      ? `${BRAND.name} | Tạo tài khoản mới`
      : `${BRAND.name} | Đăng nhập hệ thống kết nối phòng trọ`;
    window.scrollTo(0, 0);
  }, [isFlipped]);

  useEffect(() => {
    if (!resendAt) return;
    const timeout = setTimeout(() => setResendAt(0), Math.max(0, resendAt - Date.now()));
    return () => clearTimeout(timeout);
  }, [resendAt]);

  useEffect(() => {
    if (!verification) return;
    const timeout = setTimeout(() => {
      setVerification(null);
      setOtpSent(false);
      setRegErrors((previous) => ({ ...previous, identifier: 'Phiên xác minh đã hết hạn. Vui lòng xác minh lại.' }));
    }, Math.max(0, verification.expiresAt - Date.now()));
    return () => clearTimeout(timeout);
  }, [verification]);

  useEffect(() => {
    if (isFlipped && otpSent) otpInput.current?.focus();
  }, [otpSent, isFlipped]);

  // Already logged in redirect
  if (user) {
    const destination = sessionDestination(user, location.state?.from);
    return <Navigate to={destination} replace />;
  }

  // Navigation flip actions
  const goToRegister = () => {
    setLoginAlert('');
    setRegAlert('');
    navigate('/register');
  };

  const goToLogin = () => {
    setLoginAlert('');
    setRegAlert('');
    navigate('/login');
  };

  // Login Handler
  async function handleLoginSubmit(e) {
    e.preventDefault();
    if (loginBusy) return;

    const nextErrors = {};
    const id = loginIdentifier.trim();
    if (!id) {
      nextErrors.identifier = 'Vui lòng nhập email hoặc số điện thoại.';
    }
    if (!loginPassword) {
      nextErrors.password = 'Vui lòng nhập mật khẩu.';
    }

    setLoginErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoginBusy(true);
    setLoginAlert('');
    try {
      await login({ email: id, password: loginPassword }, loginRemember);
    } catch (err) {
      setLoginAlert(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
      setLoginErrors(err.fields || {});
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleGoogleCredential(credential) {
    if (loginBusy || isFlipped) return;
    setLoginErrors({});
    setLoginAlert('');
    if (!credential) {
      setLoginAlert('Google không trả về thông tin xác thực. Vui lòng thử lại.');
      return;
    }

    setLoginBusy(true);
    try {
      await loginWithGoogle(credential, loginRemember);
    } catch (err) {
      setLoginAlert(err.message || 'Đăng nhập Google không thành công. Vui lòng thử lại.');
    } finally {
      setLoginBusy(false);
    }
  }

  async function sendRegistrationOtp() {
    if (otpAction || resendAt || verification || regBusy) return;
    const identifier = regIdentifier.trim();
    const error = identifierError(identifier);
    setRegErrors((previous) => ({ ...previous, identifier: error, code: undefined }));
    if (error) return;

    setRegAlert('');
    setOtpAction('send');
    try {
      const sent = await authApi.sendRegistrationOtp(identifier);
      setOtpCode('');
      setOtpSent(true);
      setResendAt(Date.now() + sent.resendAfterSeconds * 1000);
    } catch (err) {
      setRegErrors((previous) => ({ ...previous, identifier: err.message }));
    } finally {
      setOtpAction('');
    }
  }

  async function verifyRegistrationOtp() {
    if (otpAction || !otpSent || regBusy) return;
    if (!/^[0-9]{6}$/.test(otpCode)) {
      setRegErrors((previous) => ({ ...previous, code: 'Mã OTP gồm 6 chữ số.' }));
      return;
    }

    setOtpAction('verify');
    setRegAlert('');
    setRegErrors((previous) => ({ ...previous, identifier: undefined, code: undefined }));
    try {
      const result = await authApi.verifyRegistrationOtp(regIdentifier.trim(), otpCode);
      setVerification({ token: result.verificationToken, expiresAt: Date.now() + result.expiresInSeconds * 1000 });
      setOtpCode('');
      setOtpSent(false);
      regPasswordInput.current?.focus();
    } catch (err) {
      setRegErrors((previous) => ({ ...previous, code: err.fields?.code || err.message }));
    } finally {
      setOtpAction('');
    }
  }

  // Register Handler
  async function handleRegisterSubmit(e) {
    e.preventDefault();
    if (regBusy || otpAction) return;

    const nextErrors = {};
    const fullName = regFullName.trim();
    const id = regIdentifier.trim();

    if (!fullName) {
      nextErrors.fullName = 'Vui lòng nhập họ và tên.';
    } else if (fullName.length < 2) {
      nextErrors.fullName = 'Họ và tên cần có ít nhất 2 ký tự.';
    }

    const invalidIdentifier = identifierError(id);
    if (invalidIdentifier) nextErrors.identifier = invalidIdentifier;
    else if (!verification || verification.expiresAt <= Date.now()) {
      nextErrors.identifier = 'Vui lòng xác minh email hoặc số điện thoại trước khi đăng ký.';
    }

    if (!regPassword) {
      nextErrors.password = 'Vui lòng nhập mật khẩu.';
    } else if (!registerPassword.test(regPassword)) {
      nextErrors.password = 'Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số.';
    } else if (new TextEncoder().encode(regPassword).length > 72) {
      nextErrors.password = 'Mật khẩu vượt quá 72 byte.';
    }

    if (!regConfirmPassword) {
      nextErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
    } else if (regConfirmPassword !== regPassword) {
      nextErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    }

    if (!regAgree) {
      nextErrors.agree = 'Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.';
    }

    setRegErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setRegBusy(true);
    setRegAlert('');

    try {
      await register({
        fullName,
        ...(registerEmail.test(id) ? { email: id } : { phoneNumber: id }),
        password: regPassword,
        verificationToken: verification.token,
      });
    } catch (err) {
      setRegAlert(err.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.');
      setRegErrors(err.fields || {});
      if (err.fields?.verificationToken) setVerification(null);
    } finally {
      setRegBusy(false);
    }
  }

  return (
    <>
    <div className="flip-viewport">
      <div className={`auth-flip-box ${isFlipped ? 'is-flipped' : ''}`} id="authFlipBox">
        {/* ==========================================================================
            MẶT 1: GIAO DIỆN ĐĂNG NHẬP (HÌNH MINH HỌA TRÁI - FORM BÊN PHẢI)
            ========================================================================== */}
        <div className="flip-face flip-login-face" inert={isFlipped} aria-hidden={isFlipped}>
          <div className="auth-wrapper">
            {/* CỘT TRÁI: SHOWCASE ĐĂNG NHẬP */}
            <aside className="showcase-side login-showcase-bg" aria-label={`Giới thiệu nền tảng ${BRAND.name}`}>
              <div className="page-overlay" />
              <div className="page-content">
                {/* Header Showcase */}
                <header className="showcase-header">
                  <Link to="/" className="brand-badge" aria-label={`Trang chủ ${BRAND.name}`}>
                    <div className="brand-icon">
                      <BrandIcon size={24} variant="white" />
                    </div>
                    <div className="brand-text">
                      <span className="brand-title">{BRAND.name}</span>
                      <span className="brand-tagline">{BRAND.shortTagline}</span>
                    </div>
                  </Link>
                  <span className="tag-pill">
                    <span className="tag-dot" />
                    Hòa Lạc Campus
                  </span>
                </header>

                {/* Hero Block */}
                <div className="hero-block">
                  <div className="inline-badge">
                    <Shield size={14} />
                    <span>Nền tảng kết nối phòng trọ thông minh</span>
                  </div>
                  <h1 className="hero-title">Tìm trọ an tâm, quản lý dễ dàng tại Hòa Lạc</h1>
                  <p className="hero-desc">
                    Kết nối trực tiếp sinh viên và người thuê với hệ thống nhà trọ chính chủ quanh khu vực ĐH FPT &amp; Khu Công nghệ cao Hòa Lạc.
                  </p>
                </div>

                {/* Thẻ kính mờ đăng nhập */}
                <div className="glass-cards-container">
                  <div className="glass-card">
                    <div className="glass-card-header">
                      <div className="glass-card-badge">
                        <span className="pulse-dot" />
                        <span>Phòng trọ xác thực 100%</span>
                      </div>
                      <div className="glass-rating">
                        <span className="star-icon">★</span>
                        <span>4.9 / 5.0</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="glass-room-title">Nhà trọ Tân Xã, Thạch Hòa &amp; Bình Yên</h3>
                      <p className="glass-room-desc">
                        Hình ảnh thực tế • Giá điện nước minh bạch niêm yết • Cập nhật tình trạng phòng trống mỗi ngày
                      </p>
                    </div>
                  </div>

                  <div className="glass-stats-grid">
                    <div className="stat-box">
                      <span className="stat-number">1,200+</span>
                      <span className="stat-label">Phòng đã kiểm duyệt</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-number">5,000+</span>
                      <span className="stat-label">Người thuê tin dùng</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-number">0đ</span>
                      <span className="stat-label">Phí môi giới trung gian</span>
                    </div>
                  </div>
                </div>

                {/* Footer Showcase */}
                <footer className="showcase-footer">
                  <p>© 2026 {BRAND.name} • Kết nối trực tiếp, minh bạch và an toàn.</p>
                </footer>
              </div>
            </aside>

            {/* CỘT PHẢI: FORM ĐĂNG NHẬP */}
            <main className="form-side" aria-label="Khu vực đăng nhập">
              <div className="auth-card">
                {/* Mobile Brand */}
                <div className="mobile-brand">
                  <Link to="/" className="auth-mobile-home" aria-label={`Trang chủ ${BRAND.name}`}><span className="brand-icon"><BrandIcon size={24} variant="white" /></span><span className="auth-mobile-brand-copy"><strong className="mobile-brand-name">{BRAND.name}</strong><small>Kết nối nơi ở, khởi đầu mới</small></span></Link>
                  <span className="auth-mobile-campus"><span />Hòa Lạc</span>
                </div>

                {/* Header Form */}
                <div className="form-header">
                  <h2>Đăng nhập</h2>
                  <p>Chào mừng bạn trở lại! Vui lòng nhập tài khoản để vào hệ thống.</p>
                </div>

                {/* Alert message if any */}
                {(passwordNotice || passwordChanged) && <p className="password-success-notice" role="status">{passwordNotice || 'Đã đổi mật khẩu thành công. Vui lòng đăng nhập lại.'}</p>}
                {(loginAlert || location.state?.message) && (
                  <div className="form-alert" role="alert">
                    <AlertCircle size={18} />
                    <span>{loginAlert || location.state.message}</span>
                  </div>
                )}

                {/* Form đăng nhập */}
                <form id="loginForm" onSubmit={handleLoginSubmit} noValidate aria-busy={loginBusy}>
                  {/* Email hoặc SĐT */}
                  <div className="form-group">
                    <UIField htmlFor="loginIdentifier" className="field-label">
                      Email hoặc Số điện thoại
                    </UIField>
                    <div className="input-container">
                      <div className="input-icon" aria-hidden="true">
                        <Mail size={18} />
                      </div>
                      <input
                        id="loginIdentifier"
                        aria-invalid={Boolean(loginErrors.identifier)}
                        aria-describedby={loginErrors.identifier ? 'loginIdentifier-error' : undefined}
                        name="loginIdentifier"
                        type="text"
                        className={`form-input ${loginErrors.identifier ? 'invalid' : ''}`}
                        autoComplete="username"
                        autoCapitalize="none"
                        placeholder="Nhập email hoặc số điện thoại"
                        spellCheck="false"
                        value={loginIdentifier}
                        onChange={(e) => {
                          setLoginIdentifier(e.target.value);
                          setLoginErrors((prev) => ({ ...prev, identifier: undefined }));
                          setLoginAlert('');
                        }}
                      />
                    </div>
                    {loginErrors.identifier && <p id="loginIdentifier-error" className="error-message" role="alert">{loginErrors.identifier}</p>}
                  </div>

                  {/* Mật khẩu */}
                  <div className="form-group">
                    <UIField htmlFor="loginPassword" className="field-label">
                      Mật khẩu
                    </UIField>
                    <div className="input-container">
                      <div className="input-icon" aria-hidden="true">
                        <Lock size={18} />
                      </div>
                      <input
                        id="loginPassword"
                        aria-invalid={Boolean(loginErrors.password)}
                        aria-describedby={loginErrors.password ? 'loginPassword-error' : undefined}
                        name="loginPassword"
                        type={showLoginPassword ? 'text' : 'password'}
                        className={`form-input has-action ${loginErrors.password ? 'invalid' : ''}`}
                        autoComplete="current-password"
                        placeholder="Nhập mật khẩu"
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          setLoginErrors((prev) => ({ ...prev, password: undefined }));
                          setLoginAlert('');
                        }}
                      />
                      <MotionButton
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        aria-label={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        title={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </MotionButton>
                    </div>
                    {loginErrors.password && <p id="loginPassword-error" className="error-message" role="alert">{loginErrors.password}</p>}
                  </div>

                  {/* Ghi nhớ & Quên mật khẩu */}
                  <div className="form-options">
                    <UIField className="custom-checkbox">
                      <input
                        id="remember"
                        name="remember"
                        type="checkbox"
                        checked={loginRemember}
                        onChange={(e) => setLoginRemember(e.target.checked)}
                      />
                      <span>Ghi nhớ đăng nhập</span>
                    </UIField>
                    <MotionButton
                      type="button"
                      className="forgot-link"
                      onClick={() => setForgotPassword(true)}
                    >
                      Quên mật khẩu?
                    </MotionButton>
                  </div>

                  {/* Nút Đăng nhập */}
                  <MotionButton id="submitBtn" className="primary-button" type="submit" disabled={loginBusy}>
                    {loginBusy ? (
                      <>
                        <LoaderCircle className="spin" size={18} />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <span>Đăng nhập</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </MotionButton>
                </form>

                {!isFlipped && (
                    <div style={{ width: '100%', margin: '1.5rem 0' }}>
                      <GoogleSignIn onCredential={handleGoogleCredential} disabled={loginBusy} />
                    </div>
                )}

                {/* Chuyển sang Đăng ký với hiệu ứng lật trang */}
                <div className="signup-prompt">
                  <span>Bạn chưa có tài khoản?</span>
                  <MotionButton
                    type="button"
                    className="flip-trigger-btn"
                    id="btnGoToRegisterUser"
                    onClick={goToRegister}
                  >
                    Đăng ký người thuê
                  </MotionButton>
                </div>

                {/* Badge bảo mật SSL */}
                <div className="security-badge">
                  <Lock size={14} />
                  <span>Bảo mật SSL • Tự động nhận diện quyền truy cập tài khoản</span>
                </div>

                {/* Tài khoản kiểm thử */}
                <details className="demo-accounts">
                  <summary>Tài khoản kiểm thử nhanh (Demo)</summary>
                  <div className="demo-grid">
                    {DEMO_ACCOUNTS.map(([label, email, password]) => (
                      <MotionButton
                        key={email}
                        type="button"
                        disabled={loginBusy}
                        onClick={() => {
                          setLoginIdentifier(email);
                          setLoginPassword(password);
                          setLoginErrors({});
                          setLoginAlert('');
                        }}
                      >
                        <strong>{label}</strong>
                        <span>{email}</span>
                      </MotionButton>
                    ))}
                  </div>
                </details>
              </div>
            </main>
          </div>
        </div>

        {/* ==========================================================================
            MẶT 2: GIAO DIỆN ĐĂNG KÝ (FORM BÊN TRÁI - HÌNH MINH HỌA PHẢI)
            ========================================================================== */}
        <div className="flip-face flip-register-face" inert={!isFlipped} aria-hidden={!isFlipped}>
          <div className="auth-wrapper register-layout">
            {/* CỘT TRÁI: FORM ĐĂNG KÝ */}
            <main className="form-side" aria-label="Khu vực đăng ký">
              <div className="auth-card">
                {/* Mobile Brand */}
                <div className="mobile-brand">
                  <Link to="/" className="auth-mobile-home" aria-label={`Trang chủ ${BRAND.name}`}><span className="brand-icon"><BrandIcon size={24} variant="white" /></span><span className="auth-mobile-brand-copy"><strong className="mobile-brand-name">{BRAND.name}</strong><small>Kết nối nơi ở, khởi đầu mới</small></span></Link>
                  <span className="auth-mobile-campus"><span />Hòa Lạc</span>
                </div>

                {/* Header Form */}
                <div className="form-header">
                  <h2>Tạo tài khoản mới</h2>
                </div>

                {/* Alert message if any */}
                {regAlert && (
                  <div className="form-alert" role="alert">
                    <AlertCircle size={18} />
                    <span>{regAlert}</span>
                  </div>
                )}

                {/* Form Đăng ký */}
                <form id="registerForm" onSubmit={handleRegisterSubmit} noValidate aria-busy={regBusy}>
                  {/* Họ và tên */}
                  <div className="form-group">
                    <UIField htmlFor="regFullName" className="field-label">
                      Họ và tên
                    </UIField>
                    <div className="input-container">
                      <div className="input-icon" aria-hidden="true">
                        <UserRound size={18} />
                      </div>
                      <input
                        id="regFullName"
                        aria-invalid={Boolean(regErrors.fullName)}
                        aria-describedby={regErrors.fullName ? 'regFullName-error' : undefined}
                        name="regFullName"
                        type="text"
                        className={`form-input ${regErrors.fullName ? 'invalid' : ''}`}
                        autoComplete="name"
                        placeholder="Ví dụ: Nguyễn Văn An"
                        spellCheck="false"
                        value={regFullName}
                        maxLength={100}
                        onChange={(e) => {
                          setRegFullName(e.target.value);
                          setRegErrors((prev) => ({ ...prev, fullName: undefined }));
                          setRegAlert('');
                        }}
                      />
                    </div>
                    {regErrors.fullName && <p id="regFullName-error" className="error-message" role="alert">{regErrors.fullName}</p>}
                  </div>

                  {/* Email hoặc Số điện thoại */}
                  <div className="form-group">
                    <UIField htmlFor="regIdentifier" className="field-label">
                      Email hoặc Số điện thoại
                    </UIField>
                    <div className="register-otp-row">
                      <div className="input-container">
                        <div className="input-icon" aria-hidden="true"><Mail size={18} /></div>
                        <input
                          id="regIdentifier"
                          aria-invalid={Boolean(regErrors.identifier)}
                          aria-describedby={regErrors.identifier ? 'regIdentifier-error' :
                            otpSent ? 'registerOtp-status' : verification ? 'regIdentifier-verified' : 'regIdentifier-help'}
                          name="regIdentifier"
                          type="text"
                          className={`form-input ${regErrors.identifier ? 'invalid' : ''}`}
                          autoComplete="username"
                          autoCapitalize="none"
                          placeholder="Email hoặc số điện thoại"
                          spellCheck="false"
                          maxLength={254}
                          value={regIdentifier}
                          readOnly={Boolean(otpAction || regBusy)}
                          onChange={(e) => {
                            setRegIdentifier(e.target.value);
                            setVerification(null);
                            setOtpSent(false);
                            setOtpCode('');
                            setResendAt(0);
                            setRegErrors((prev) => ({ ...prev, identifier: undefined, code: undefined }));
                            setRegAlert('');
                          }}
                        />
                      </div>
                      {verification ? (
                        <span id="regIdentifier-verified" className="register-verified" role="status"><ShieldCheck size={16} /> Đã xác minh</span>
                      ) : (
                        <MotionButton type="button" className="register-otp-button" onClick={sendRegistrationOtp}
                          disabled={Boolean(otpAction || resendAt || regBusy)}>
                          {otpAction === 'send' ? 'Đang gửi…' : otpSent ? 'Gửi lại mã' : 'Xác minh'}
                        </MotionButton>
                      )}
                    </div>
                    {!otpSent && !verification && !regErrors.identifier && (
                      <p id="regIdentifier-help" className="register-field-help">
                        Nhận mã qua email hoặc SMS theo số điện thoại.
                      </p>
                    )}
                    {regErrors.identifier && <p id="regIdentifier-error" className="error-message" role="alert">{regErrors.identifier}</p>}
                  </div>

                  {otpSent && (
                    <div className="form-group">
                      <label htmlFor="registerOtpCode" className="field-label">Mã OTP</label>
                      <div className="register-otp-row">
                        <input
                          ref={otpInput}
                          id="registerOtpCode"
                          className={`form-input register-otp-input ${regErrors.code ? 'invalid' : ''}`}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={otpCode}
                          readOnly={Boolean(otpAction || regBusy)}
                          aria-invalid={Boolean(regErrors.code)}
                          aria-describedby={regErrors.code ? 'registerOtp-error' : 'registerOtp-status'}
                          onChange={(event) => {
                            setOtpCode(event.target.value.replace(/[^0-9]/g, ''));
                            setRegErrors((previous) => ({ ...previous, code: undefined }));
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              verifyRegistrationOtp();
                            }
                          }}
                        />
                        <MotionButton type="button" className="register-otp-button" onClick={verifyRegistrationOtp}
                          disabled={Boolean(otpAction || regBusy)}>
                          {otpAction === 'verify' ? 'Đang kiểm tra…' : 'Xác nhận mã'}
                        </MotionButton>
                      </div>
                      <p id="registerOtp-status" className="register-field-help" role="status">
                        Yêu cầu gửi mã qua {registerPhone.test(regIdentifier.trim()) ? 'SMS' : 'email'} đã được tiếp nhận. Mã có hiệu lực 5 phút.
                        {resendAt > 0 && ' Có thể gửi lại sau 60 giây.'}
                      </p>
                      {regErrors.code && <p id="registerOtp-error" className="error-message" role="alert">{regErrors.code}</p>}
                    </div>
                  )}

                  {/* Mật khẩu */}
                  <div className="form-group">
                    <UIField htmlFor="regPassword" className="field-label">
                      Mật khẩu
                    </UIField>
                    <div className="input-container">
                      <div className="input-icon" aria-hidden="true">
                        <Lock size={18} />
                      </div>
                      <input
                        ref={regPasswordInput}
                        id="regPassword"
                        aria-invalid={Boolean(regErrors.password)}
                        aria-describedby={regErrors.password ? 'regPassword-error' : 'regPassword-help'}
                        name="regPassword"
                        type={showRegPassword ? 'text' : 'password'}
                        className={`form-input has-action ${regErrors.password ? 'invalid' : ''}`}
                        autoComplete="new-password"
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          setRegErrors((prev) => ({ ...prev, password: undefined }));
                          setRegAlert('');
                        }}
                      />
                      <MotionButton
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        aria-label={showRegPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        title={showRegPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </MotionButton>
                    </div>
                    {regErrors.password ? (
                      <p id="regPassword-error" className="error-message" role="alert">{regErrors.password}</p>
                    ) : (
                      <p id="regPassword-help" className="register-field-help">Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và chữ số.</p>
                    )}
                  </div>

                  {/* Xác nhận mật khẩu */}
                  <div className="form-group">
                    <UIField htmlFor="regConfirmPassword" className="field-label">
                      Xác nhận mật khẩu
                    </UIField>
                    <div className="input-container">
                      <div className="input-icon" aria-hidden="true">
                        <ShieldCheck size={18} />
                      </div>
                      <input
                        id="regConfirmPassword"
                        aria-invalid={Boolean(regErrors.confirmPassword)}
                        aria-describedby={regErrors.confirmPassword ? 'regConfirmPassword-error' : undefined}
                        name="regConfirmPassword"
                        type={showRegConfirmPassword ? 'text' : 'password'}
                        className={`form-input has-action ${regErrors.confirmPassword ? 'invalid' : ''}`}
                        autoComplete="new-password"
                        placeholder="Nhập lại mật khẩu phía trên"
                        value={regConfirmPassword}
                        onChange={(e) => {
                          setRegConfirmPassword(e.target.value);
                          setRegErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                          setRegAlert('');
                        }}
                      />
                      <MotionButton
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        aria-label={showRegConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        title={showRegConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showRegConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </MotionButton>
                    </div>
                    {regErrors.confirmPassword && <p id="regConfirmPassword-error" className="error-message" role="alert">{regErrors.confirmPassword}</p>}
                  </div>

                  {/* Điều khoản & Chính sách */}
                  <div className="register-consent">
                      <input
                        id="regAgree"
                        name="regAgree"
                        type="checkbox"
                        checked={regAgree}
                        required
                        disabled={regBusy}
                        aria-invalid={Boolean(regErrors.agree)}
                        aria-describedby={regErrors.agree ? 'regAgree-error' : undefined}
                        onChange={(e) => {
                          setRegAgree(e.target.checked);
                          setRegErrors((prev) => ({ ...prev, agree: undefined }));
                        }}
                      />
                      <UIField htmlFor="regAgree" className="terms-text">
                        Tôi đồng ý với{' '}
                        <MotionButton type="button" onClick={() => notify(`Điều khoản dịch vụ ${BRAND.name}`, 'info')}>
                          Điều khoản dịch vụ
                        </MotionButton>{' '}
                        và{' '}
                        <MotionButton type="button" onClick={() => notify(`Chính sách bảo mật ${BRAND.name}`, 'info')}>
                          Chính sách bảo mật
                        </MotionButton>{' '}
                        của {BRAND.name}.
                      </UIField>
                  </div>
                  {regErrors.agree && <p id="regAgree-error" className="error-message" style={{ marginTop: '-8px', marginBottom: '12px' }} role="alert">{regErrors.agree}</p>}

                  {/* Nút Đăng ký */}
                  <MotionButton id="submitRegisterBtn" className="primary-button" type="submit" disabled={Boolean(regBusy || otpAction)}>
                    {regBusy ? (
                      <>
                        <LoaderCircle className="spin" size={18} />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <span>Đăng ký tài khoản</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </MotionButton>
                </form>

                {/* Chuyển sang Đăng nhập với hiệu ứng lật trang */}
                <div className="signup-prompt">
                  <span>Đã có tài khoản?</span>
                  <MotionButton
                    type="button"
                    className="flip-trigger-btn"
                    id="toLoginBtn"
                    onClick={goToLogin}
                  >
                    <ChevronLeft size={14} />
                    <span>Đăng nhập ngay</span>
                  </MotionButton>
                </div>

                {/* Badge bảo mật SSL */}
                <div className="security-badge">
                  <Lock size={14} />
                  <span>Bảo mật SSL 256-bit • Dữ liệu người dùng được bảo vệ tuyệt đối</span>
                </div>
              </div>
            </main>

            {/* CỘT PHẢI: SHOWCASE ĐĂNG KÝ */}
            <aside className="showcase-side register-showcase-bg" aria-label={`Giới thiệu nền tảng ${BRAND.name}`}>
              <div className="page-overlay" />
              <div className="page-content">
                {/* Header Showcase */}
                <header className="showcase-header">
                  <Link to="/" className="brand-badge" aria-label={`Trang chủ ${BRAND.name}`}>
                    <div className="brand-icon">
                      <BrandIcon size={24} variant="white" />
                    </div>
                    <div className="brand-text">
                      <span className="brand-title">{BRAND.name}</span>
                      <span className="brand-tagline">{BRAND.shortTagline}</span>
                    </div>
                  </Link>
                  <span className="tag-pill">
                    <span className="tag-dot" />
                    Hòa Lạc Campus
                  </span>
                </header>

                {/* Hero Block */}
                <div className="hero-block">
                  <div className="inline-badge">
                    <Star size={14} />
                    <span>Gia nhập cộng đồng {BRAND.name}</span>
                  </div>
                  <h1 className="hero-title">Tìm trọ chuẩn xác , an tâm gắn bó lâu dài</h1>
                  <p className="hero-desc">
                    Tạo tài khoản để mở khóa đầy đủ tính năng: lưu danh sách phòng yêu thích, nhận gợi ý phòng phù hợp và trao đổi trực tiếp với các chủ trọ uy tín.
                  </p>
                </div>

                {/* Thẻ kính mờ đăng ký */}
                <div className="glass-cards-container">
                  <div className="glass-card">
                    <div className="glass-card-header">
                      <div className="glass-card-badge">
                        <span className="pulse-dot" />
                        <span>Đặc quyền thành viên</span>
                      </div>
                      <div className="glass-badge-pill">
                        Miễn phí 100%
                      </div>
                    </div>
                    <div>
                      <h3 className="glass-room-title">Lưu Wishlist &amp; Nhận tin phòng trống mới</h3>
                      <p className="glass-room-desc">
                        Theo dõi biến động giá điện nước, phòng trống thực tế và kết nối Zalo/Hotline trực tiếp với chủ trọ trong 1 chạm.
                      </p>
                    </div>
                  </div>

                  <div className="glass-stats-grid">
                    <div className="stat-box">
                      <span className="stat-number">10,000+</span>
                      <span className="stat-label">Lượt tìm kiếm / tháng</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-number">100%</span>
                      <span className="stat-label">Chính chủ không môi giới</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-number">24/7</span>
                      <span className="stat-label">Hỗ trợ kiểm duyệt tin</span>
                    </div>
                  </div>
                </div>

                {/* Footer Showcase */}
                <footer className="showcase-footer">
                  <p>© 2026 {BRAND.name} • {BRAND.tagline}. Đồng hành cùng sinh viên &amp; người thuê Hòa Lạc.</p>
                </footer>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
    {forgotPassword && <PasswordRecoveryDialog initialIdentifier={loginIdentifier} onClose={() => setForgotPassword(false)} onComplete={identifier => { setForgotPassword(false); setLoginIdentifier(identifier); setLoginPassword(''); setPasswordNotice('Đã đặt lại mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.'); setLoginAlert(''); }} />}
    </>
  );
}
