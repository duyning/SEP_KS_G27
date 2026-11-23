import { useEffect, useRef, useState } from 'react';
import Modal from './common/Modal.jsx';
import Button from './common/Button.jsx';
import { ServiceRequestForm } from './ServiceRequests.jsx';

export default function ServiceRequestModal({ service, onClose, onSuccess }) {
  const dirty = useRef(false), sending = useRef(false);
  const content = useRef(null), keepEditing = useRef(null);
  const [busy, setBusy] = useState(false), [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (confirming) keepEditing.current?.focus();
    else content.current?.querySelector('input')?.focus({ preventScroll: true });
  }, [confirming]);
  const close = () => {
    if (sending.current) return;
    if (confirming) { setConfirming(false); return; }
    if (dirty.current) setConfirming(true);
    else onClose();
  };
  return <Modal title={`Gửi yêu cầu — ${service.serviceName}`} className="service-request-entry-modal" maxWidth="720px" initialFocus="input" closeDisabled={busy} onClose={close}>
    {confirming && <div className="service-request-discard" role="alertdialog" aria-labelledby="discard-request-title" aria-describedby="discard-request-description">
      <h3 id="discard-request-title">Bỏ nội dung đang nhập?</h3>
      <p id="discard-request-description">Yêu cầu chưa được gửi. Nội dung bạn vừa nhập sẽ không được lưu.</p>
      <div className="svc-actions">
        <Button ref={keepEditing} type="button" className="svc-btn" onClick={() => setConfirming(false)}>Tiếp tục nhập</Button>
        <Button type="button" variant="destructive" className="svc-btn" onClick={onClose}>Bỏ nội dung và đóng</Button>
      </div>
    </div>}
    <div ref={content} hidden={confirming}>
      <ServiceRequestForm service={service} onCancel={close} onDirtyChange={value => { dirty.current = value; }}
        onBusyChange={value => { sending.current = value; setBusy(value); }} onSuccess={onSuccess} />
    </div>
  </Modal>;
}
