import { useId, useState } from 'react';
import Modal from './common/Modal.jsx';
import { MotionButton } from './motion/MotionUI.jsx';

const reasonsByDecision = {
  REQUEST_CHANGES: {
    ROOM_TRANSFER: [
      ['Vị trí hoặc thời gian bàn giao chưa rõ', 'Vui lòng bổ sung khu vực, mốc dễ tìm và ngày có thể bàn giao phòng.'],
      ['Thiếu thông tin về phòng', 'Vui lòng mô tả tình trạng, tiện nghi và điều kiện nhượng phòng để người xem dễ cân nhắc.'],
    ],
    ROOMMATE: [
      ['Chưa rõ số người hoặc thời gian ở', 'Vui lòng bổ sung số người cần tìm, thời gian có thể vào ở và thời hạn dự kiến.'],
      ['Thiếu thông tin về chỗ ở', 'Vui lòng cho biết đã có phòng hay đang tìm phòng, khu vực dự kiến và điều kiện sinh hoạt chung.'],
    ],
    SECOND_HAND: [
      ['Chưa rõ tình trạng món đồ', 'Vui lòng mô tả tình trạng sử dụng, lỗi hoặc hư hỏng nếu có và những phụ kiện đi kèm.'],
      ['Chưa rõ cách nhận đồ', 'Vui lòng bổ sung khu vực và cách nhận đồ.'],
      ['Ảnh món đồ chưa rõ', 'Vui lòng thay ảnh mờ hoặc ảnh không liên quan bằng ảnh rõ của món đồ đang bán.'],
    ],
    common: [
      ['Tiêu đề và mô tả chưa khớp', 'Vui lòng sửa tiêu đề và mô tả để người xem hiểu rõ nội dung bài đăng.'],
      ['Ảnh hoặc video không liên quan', 'Vui lòng gỡ hoặc thay ảnh, video không liên quan đến nội dung bài đăng.'],
      ['Thông tin liên hệ chưa chính xác', 'Vui lòng kiểm tra và cập nhật số điện thoại hoặc liên kết liên hệ trong bài.'],
    ],
  },
  REJECT: {
    ROOM_TRANSFER: [
      ['Nội dung không phải nhượng phòng', 'Bài viết không có nội dung nhượng phòng và không phù hợp với chuyên mục đã chọn.'],
      ['Thông tin nhượng phòng sai sự thật', 'Thông tin về phòng, quyền nhượng hoặc điều kiện bàn giao đã được xác định là sai sự thật.'],
    ],
    ROOMMATE: [
      ['Nội dung không phải tìm người ở ghép', 'Bài viết không có nội dung tìm người ở ghép và không phù hợp với chuyên mục đã chọn.'],
      ['Thông tin chỗ ở sai sự thật', 'Thông tin về chỗ ở hoặc điều kiện ở ghép đã được xác định là sai sự thật.'],
    ],
    SECOND_HAND: [
      ['Nội dung không phải trao đổi đồ cũ', 'Bài viết không có nội dung trao đổi đồ cũ và không phù hợp với chuyên mục đã chọn.'],
      ['Thông tin món đồ sai sự thật', 'Thông tin về món đồ hoặc tình trạng sử dụng đã được xác định là sai sự thật.'],
    ],
    common: [
      ['Lừa đảo hoặc thu tiền gian dối', 'Bài viết bị từ chối do có nội dung lừa đảo hoặc yêu cầu chuyển tiền gian dối.'],
      ['Đăng trùng hoặc spam', 'Bài viết trùng lặp hoặc được đăng lặp lại với mục đích spam.'],
      ['Nội dung vi phạm quy định cộng đồng', 'Bài viết chứa nội dung hoặc tệp đính kèm vi phạm quy định cộng đồng.'],
    ],
  },
};

export default function StaffCommunityReasonDialog({ decision, post, note, error, busy, onNoteChange, onClose, onSubmit }) {
  const id = useId();
  const [preset, setPreset] = useState('');
  const reasons = reasonsByDecision[decision];
  const categoryReasons = reasons[post.type];
  const rejecting = decision === 'REJECT';
  const title = rejecting ? 'Từ chối bài viết' : 'Yêu cầu chỉnh sửa bài viết';
  const submitLabel = rejecting ? 'Xác nhận từ chối' : 'Gửi yêu cầu chỉnh sửa';

  function selectReason(event) {
    const value = event.target.value;
    setPreset(value);
    onNoteChange(value === 'custom' ? (preset ? '' : note) : value);
  }

  return (
    <Modal title={title} onClose={onClose} className="staff-community-reason-dialog">
      <form className="staff-community-reason-form" onSubmit={event => { event.preventDefault(); onSubmit(); }}>
        <p>Chọn lý do có sẵn hoặc nhập lý do riêng. Tác giả sẽ thấy nội dung bạn gửi.</p>
        <label htmlFor={`${id}-preset`}>Lý do gợi ý</label>
        <select id={`${id}-preset`} disabled={busy} value={preset} onChange={selectReason}>
          <option value="" disabled>Chọn lý do có sẵn</option>
          {categoryReasons && <optgroup label={post.typeLabel}>
            {categoryReasons.map(([label, message]) => <option key={label} value={message}>{label}</option>)}
          </optgroup>}
          <optgroup label="Lý do chung">
            {reasons.common.map(([label, message]) => <option key={label} value={message}>{label}</option>)}
          </optgroup>
          <option value="custom">Lý do khác (tự nhập)</option>
        </select>
        <label htmlFor={`${id}-note`}>Nội dung gửi tác giả</label>
        <textarea id={`${id}-note`} rows={4} maxLength={2000} disabled={busy} value={note}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
          onChange={event => onNoteChange(event.target.value)} />
        <p id={`${id}-hint`}>Bạn có thể chỉnh lại nội dung trước khi gửi. Yêu cầu 10–2.000 ký tự.</p>
        {error && <p id={`${id}-error`} className="staff-community-reason-error" role="alert">{error}</p>}
        <div className="staff-community-reason-actions">
          <MotionButton type="button" className="p-button" disabled={busy} onClick={onClose}>Hủy</MotionButton>
          <MotionButton type="submit" className="p-button primary" data-decision={decision} disabled={busy}>
            {busy ? 'Đang lưu...' : submitLabel}
          </MotionButton>
        </div>
      </form>
    </Modal>
  );
}
