import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import Modal from './common/Modal.jsx';
import { getToken } from '../services/auth.js';
import { passwordErrors, passwordRecoveryApi, recoveryIdentifier, recoveryContacts } from '../services/password-recovery.js';
import '../styles/password-recovery.css';

export default function PasswordRecoveryDialog({ user, initialIdentifier = '', onClose, onComplete }) {
  const profile = Boolean(user);
  const api = useMemo(() => passwordRecoveryApi(profile), [profile]);
  const options = recoveryContacts(user);
  const [identifier, setIdentifier] = useState(profile ? options[0] || '' : initialIdentifier);
  const [step, setStep] = useState('contact'), [code, setCode] = useState('');
  const [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false), [busy, setBusy] = useState('');
  const [error, setError] = useState(''), [fields, setFields] = useState({});
  const [sent, setSent] = useState(null), [proof, setProof] = useState(null), [now, setNow] = useState(Date.now());
  const lock = useRef(false), controller = useRef(null), focus = useRef(null), id = useId();
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => { clearInterval(timer); controller.current?.abort(); }; }, []);
  useEffect(() => { focus.current?.focus(); }, [step]);
  const remaining = Math.max(0, Math.ceil((Date.parse(sent?.resendAt) - now) / 1000)) || 0;
  const expires = Date.parse((step === 'password' ? proof : sent)?.expiresAt);
  const expired = Number.isFinite(expires) && now >= expires;
  const contact = recoveryIdentifier(identifier);
  async function run(action, work) {
    if (lock.current) return;
    lock.current = true; setBusy(action); setError(''); setFields({});
    controller.current = new AbortController();
    try { await work(controller.current.signal); }
    catch (err) {
      if (err.name !== 'AbortError') { setError(err.message); setFields(err.fields || {}); }
    } finally { if (!controller.current?.signal.aborted) { lock.current = false; setBusy(''); } }
  }
  function send() {
    if (!contact) { setFields({ identifier: 'Nhập email hoặc SĐT đã xác minh của bạn.' }); return; }
    run('send', async signal => { const result = await api.send(contact, signal); setSent(result); setCode(''); setProof(null); setNow(Date.now()); setStep('code'); });
  }
  function submit(event) {
    event.preventDefault();
    if (step === 'contact') return send();
    if (step === 'code') {
      if (!/^\d{6}$/.test(code)) { setFields({ code: 'Mã OTP gồm 6 chữ số.' }); return; }
      return run('verify', async signal => { setProof(await api.verify(contact, code, signal)); setCode(''); setNow(Date.now()); setStep('password'); });
    }
    const next = passwordErrors(password, confirm);
    if (Object.keys(next).length) { setFields(next); return; }
    const passwordSession = getToken();
    run('confirm', async signal => { await api.confirm(contact, proof.verificationToken, password, signal); if (profile && getToken() !== passwordSession) return; setPassword(''); setConfirm(''); setProof(null); onComplete(contact); });
  }
  function changeContact() { setStep('contact'); setError(''); setFields({}); setCode(''); setProof(null); setPassword(''); setConfirm(''); }
  const descriptions = { contact: 'Nhận mã qua email hoặc SĐT đăng ký/đã xác minh để đặt lại mật khẩu.', code: 'Nhập mã 6 chữ số vừa được gửi. Mã có hiệu lực 5 phút.', password: 'Tạo mật khẩu mới. Sau khi lưu, các phiên đăng nhập cũ sẽ kết thúc.' };
  return <Modal title={profile ? 'Đổi mật khẩu qua OTP' : 'Quên mật khẩu'} className="password-recovery-dialog"
    maxWidth="520px" initialFocus="[data-recovery-focus]" closeDisabled={Boolean(busy)} onClose={() => { if (!lock.current) onClose(); }}>
    <div className="password-recovery">
      <div className="password-recovery-intro"><span aria-hidden="true">{step === 'password' ? <KeyRound size={24} /> : <ShieldCheck size={24} />}</span><p>{descriptions[step]}</p></div>
      <ol className="password-recovery-steps" aria-label="Các bước đặt lại mật khẩu">{['Thông tin', 'Mã OTP', 'Mật khẩu mới'].map((label, index) => <li key={label} aria-current={index === ['contact', 'code', 'password'].indexOf(step) ? 'step' : undefined}>{index + 1}. {label}</li>)}</ol>
      <form onSubmit={submit} noValidate>
        <fieldset disabled={Boolean(busy)}>
          {step === 'contact' ? <label htmlFor={`${id}-identifier`}>Email hoặc SĐT đăng ký
            {profile ? <select data-recovery-focus ref={focus} id={`${id}-identifier`} value={identifier} onChange={e => setIdentifier(e.target.value)} disabled={!options.length || Boolean(busy)}>{options.map(value => <option key={value} value={value}>{value}</option>)}</select>
              : <input data-recovery-focus ref={focus} id={`${id}-identifier`} autoComplete="username" maxLength={254} value={identifier} onChange={e => setIdentifier(e.target.value)} aria-invalid={Boolean(fields.identifier)} aria-describedby={fields.identifier ? `${id}-field-error` : undefined} placeholder="email@example.com hoặc 0912345678" />}
            {profile && !options.length && <span className="password-recovery-error">Chưa có email hoặc SĐT đã xác minh. Hãy xác minh SĐT tại phần Thông tin cá nhân.</span>}
          </label> : <p className="password-recovery-destination">{contact}<button type="button" onClick={changeContact}>Đổi thông tin</button></p>}
          {step === 'code' && <>
            <p className="password-recovery-hint" role="status">{sent?.message}</p>
            <label htmlFor={`${id}-code`}>Mã OTP<input data-recovery-focus ref={focus} id={`${id}-code`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} aria-invalid={Boolean(fields.code)} aria-describedby={fields.code ? `${id}-field-error` : undefined} /></label>
            <button type="button" className="password-recovery-resend" disabled={Boolean(busy) || remaining > 0} onClick={send}>{remaining ? `Gửi lại sau ${remaining}s` : 'Gửi lại mã'}</button>
          </>}
          {step === 'password' && <>
            <label htmlFor={`${id}-password`}>Mật khẩu mới<div className="password-recovery-input"><input data-recovery-focus ref={focus} id={`${id}-password`} type={show ? 'text' : 'password'} autoComplete="new-password" maxLength={72} value={password} onChange={e => setPassword(e.target.value)} aria-invalid={Boolean(fields.newPassword)} /><button type="button" aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={show} onClick={() => setShow(value => !value)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
            <label htmlFor={`${id}-confirm`}>Xác nhận mật khẩu mới<input id={`${id}-confirm`} type={show ? 'text' : 'password'} autoComplete="new-password" maxLength={72} value={confirm} onChange={e => setConfirm(e.target.value)} aria-invalid={Boolean(fields.confirmPassword)} /></label>
            <p className="password-recovery-hint">Ít nhất 6 ký tự, không quá 72 byte UTF-8.</p>
          </>}
        </fieldset>
        {Object.keys(fields).length > 0 && <p className="password-recovery-error" id={`${id}-field-error`} role="alert">{Object.values(fields).join(' ')}</p>}
        {error && <p className="password-recovery-error" role="alert">{error}</p>}
        {expired && <p className="password-recovery-error" role="status">{step === 'password' ? 'Phiên xác minh đã hết hạn. Chọn Đổi thông tin để yêu cầu mã mới.' : 'Mã đã hết hạn. Vui lòng gửi lại mã.'}</p>}
        <div className="password-recovery-actions"><button type="button" disabled={Boolean(busy)} onClick={onClose}>Hủy</button><button type="submit" className="primary" disabled={Boolean(busy) || (step !== 'contact' && expired) || (profile && !options.length)}>{busy ? 'Đang xử lý…' : step === 'contact' ? 'Gửi mã xác minh' : step === 'code' ? 'Xác minh mã' : 'Lưu mật khẩu mới'}</button></div>
      </form>
    </div>
  </Modal>;
}
