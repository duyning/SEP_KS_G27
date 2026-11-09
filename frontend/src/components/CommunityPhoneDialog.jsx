import { useState } from 'react';
import { Copy, Phone } from 'lucide-react';
import { detailPhone } from '../services/accommodation-detail.js';
import Modal from './common/Modal.jsx';
import '../styles/community-post-contacts.css';

export default function CommunityPhoneDialog({ number, onClose }) {
  const [feedback, setFeedback] = useState(null);
  const callable = detailPhone(number);

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(callable ?? number);
      setFeedback({ message: 'Đã sao chép số điện thoại.' });
    } catch {
      setFeedback({ message: 'Hãy chọn số bên trên để sao chép thủ công.', error: true });
    }
  }

  return (
    <Modal title="Liên hệ qua điện thoại" onClose={onClose} maxWidth="400px">
      <div className="community-phone-dialog">
        <input type="text" aria-label="Số điện thoại liên hệ" value={number} readOnly
          onFocus={event => event.currentTarget.select()} />
        <div className="community-phone-actions">
          {callable && <a className="p-button primary" href={`tel:${callable}`}>
            <Phone size={16} aria-hidden="true" /> Gọi điện
          </a>}
          <button type="button" className="p-button" onClick={copyNumber}>
            <Copy size={16} aria-hidden="true" /> Sao chép số
          </button>
        </div>
        {feedback && <p role={feedback.error ? 'alert' : 'status'}>{feedback.message}</p>}
      </div>
    </Modal>
  );
}
