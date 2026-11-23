import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { BRAND } from '../../config/brand.js';

const STEP_GUIDES = [
  {
    Icon: Sparkles,
    title: 'Mẹo viết thông tin hấp dẫn',
    tips: [
      'Đặt tên nhà trọ dễ nhớ, gắn liền với khu vực (VD: Nhà trọ An Khang - Tân Xã).',
      'Mô tả rõ khoảng cách tới ĐH FPT / Khu CNC, không gian phòng và an ninh.',
      'Điền số Hotline và Zalo chính chủ để sinh viên dễ liên hệ xem phòng.'
    ]
  },
  {
    Icon: MapPin,
    title: 'Định vị chính xác trên bản đồ',
    tips: [
      'Nhập nhanh địa chỉ hoặc dán liên kết bản đồ để tự động điền thông tin.',
      'Kéo ghim đến đúng cổng nhà trọ giúp người thuê tìm đường dễ dàng.',
      'Thêm mốc gần chợ, trường học hoặc tuyến xe buýt để tăng lượt xem.'
    ]
  },
  {
    Icon: CheckCircle2,
    title: 'Khai báo tiện ích & nội quy',
    tips: [
      'Chỉ chọn những tiện ích hiện có thực tế tại toàn nhà trọ.',
      'Nội quy rõ ràng ngay từ đầu giúp hạn chế tranh chấp khi vận hành.',
      'Có thể tùy chỉnh giờ giữ trật tự phù hợp với đặc thù khu trọ.'
    ]
  },
  {
    Icon: Camera,
    title: 'Chụp ảnh giúp tăng tỷ lệ thuê',
    tips: [
      'Ưu tiên ảnh mặt tiền rõ sáng làm ảnh đại diện (ảnh đầu tiên).',
      'Bổ sung ảnh sân để xe, hành lang, phòng mẫu và khu bếp/vệ sinh.',
      'Tải từ 1 đến 10 ảnh (JPG, PNG, WEBP, tối đa 5 MB mỗi ảnh).'
    ]
  },
  {
    Icon: ShieldCheck,
    title: 'Chuẩn bị giấy tờ thẩm định',
    tips: [
      'Đính kèm bản chụp/scan rõ nét Giấy phép kinh doanh và Chứng nhận PCCC.',
      'CCCD đã nộp từ bước tài khoản được tự động tái sử dụng, không cần tải lại.',
      'Tài liệu hỗ trợ PDF, JPG, PNG, WEBP tối đa 10 MB mỗi tệp.'
    ]
  },
  {
    Icon: ClipboardCheck,
    title: 'Trước khi gửi xét duyệt',
    tips: [
      'Kiểm tra kỹ địa chỉ, số điện thoại liên hệ và danh sách giấy tờ.',
      'Bấm “Chỉnh sửa” tại bất kỳ mục nào để quay lại sửa mà không mất dữ liệu.',
      'Hồ sơ sẽ chuyển sang trạng thái Chờ thẩm định ngay sau khi gửi thành công.'
    ]
  }
];

export default function RegistrationHelpPanel({ step = 0, completedSteps = 0, totalSteps = 6 }) {
  const guide = STEP_GUIDES[step] || STEP_GUIDES[0];
  const StepIcon = guide.Icon;

  return (
    <aside className="prw-help-panel" aria-label="Hướng dẫn hoàn thiện hồ sơ nhà trọ">
      <section className="prw-help-card prw-help-primary">
        <div className="prw-help-head">
          <span className="prw-help-icon" aria-hidden="true">
            <StepIcon size={18} />
          </span>
          <div>
            <h3>{guide.title}</h3>
            <p>Hướng dẫn bước {step + 1} / {totalSteps}</p>
          </div>
        </div>
        <ul className="prw-help-list">
          {guide.tips.map((tip) => (
            <li key={tip}>
              <CheckCircle2 size={15} aria-hidden="true" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="prw-help-card">
        <div className="prw-help-head">
          <span className="prw-help-icon subtle" aria-hidden="true">
            <FileCheck2 size={18} />
          </span>
          <div>
            <h3>Tiến độ hoàn thiện</h3>
            <p>Đã đi qua {Math.min(completedSteps, totalSteps)} / {totalSteps} mục</p>
          </div>
        </div>

        <ol className="prw-review-timeline">
          <li>
            <span>1</span>
            <div>
              <strong>Gửi hồ sơ nhà trọ</strong>
              <small>Hoàn tất 6 bước thông tin và tài liệu xác minh.</small>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>Nhân viên {BRAND.name} thẩm định</strong>
              <small>Đối chiếu thực tế và phản hồi nếu cần bổ sung.</small>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>Phê duyệt &amp; công khai</strong>
              <small>Kích hoạt nhà trọ và bắt đầu cấu hình loại phòng.</small>
            </div>
          </li>
        </ol>

        <div className="prw-help-security">
          <LockKeyhole size={14} aria-hidden="true" />
          <span>Giấy tờ pháp lý và CCCD được bảo mật nội bộ, không hiển thị công khai.</span>
        </div>
        <div className="prw-help-eta">
          <Clock3 size={14} aria-hidden="true" />
          <span>Thẩm định hồ sơ thường hoàn tất trong 24 giờ làm việc.</span>
        </div>
      </section>
    </aside>
  );
}
