import { ShieldCheck } from 'lucide-react';
import { Modal } from './PortalUI.jsx';
import { MotionButton } from './motion/MotionUI.jsx';
import { BRAND } from '../config/brand.js';
import '../styles/host-registration-dialogs.css';

export default function HostTermsModal({ onClose, onAccept }) {
  return (
    <Modal
      title={
        <span className="hob-modal-title">
          <ShieldCheck size={20} aria-hidden="true" />
          <span>Quy chế hoạt động đối tác {BRAND.name}</span>
        </span>
      }
      className="hob-terms-modal"
      onClose={onClose}
    >
      <div className="hob-terms-body" role="region" aria-label="Nội dung quy chế" tabIndex={0}>
        <p className="hob-terms-lead">
          Khi đăng ký trở thành Chủ trọ đối tác trên <strong>{BRAND.name}</strong>, bạn cam kết tuân thủ các nguyên tắc minh bạch và an toàn sau đây:
        </p>

        <section className="hob-terms-section">
          <h4>1. Xác thực thông tin chính chủ</h4>
          <p>
            Thông tin cá nhân, số điện thoại liên hệ và ảnh CCCD hai mặt phải là giấy tờ hợp pháp của chính chủ tài khoản hoặc người được ủy quyền quản lý hợp lệ. Không chỉnh sửa, che khuất hoặc sử dụng giấy tờ của người khác.
          </p>
        </section>

        <section className="hob-terms-section">
          <h4>2. Minh bạch thông tin nhà trọ &amp; giá thuê</h4>
          <p>
            Địa chỉ, diện tích, hình ảnh, giá thuê, tiền cọc và chi phí điện nước đăng tải phải phản ánh đúng thực tế cơ sở lưu trú. Mọi thay đổi quan trọng cần được cập nhật kịp thời.
          </p>
        </section>

        <section className="hob-terms-section">
          <h4>3. Quy trình thẩm định &amp; cấp quyền</h4>
          <p>
            Hồ sơ đăng ký chủ trọ và nhà trọ đầu tiên được đội ngũ nhân viên {BRAND.name} kiểm tra trước khi phê duyệt. Quyền Chủ trọ chỉ có hiệu lực sau khi hồ sơ đạt trạng thái phê duyệt.
          </p>
        </section>

        <section className="hob-terms-section">
          <h4>4. Bảo mật dữ liệu cá nhân</h4>
          <p>
            Hình ảnh CCCD và giấy tờ đính kèm chỉ được dùng để xác minh đối tác, lưu trữ theo cơ chế bảo mật nội bộ và chỉ nhân viên có thẩm quyền mới được phép truy cập để thẩm định.
          </p>
        </section>
      </div>

      <footer className="hob-terms-footer">
        <MotionButton type="button" className="p-button" onClick={onClose}>
          Đóng
        </MotionButton>
        {onAccept && (
          <MotionButton
            type="button"
            className="p-button primary"
            onClick={() => {
              onAccept();
              onClose();
            }}
          >
            Tôi đã đọc và đồng ý
          </MotionButton>
        )}
      </footer>
    </Modal>
  );
}
