import { HousePlus } from 'lucide-react';
import { Link } from 'react-router-dom';

// Undefined means ownership has not been verified by a backend response.
export default function HostPropertyRegistration({ hasProperty }) {
  if (hasProperty === true) return null;
  return <section className="host-registration-prompt">
    <div><h2>{hasProperty === false ? 'Bạn chưa đăng ký nhà trọ' : 'Đăng ký nhà trọ của bạn'}</h2><p>Gửi thông tin nhà trọ và hồ sơ xác minh để bắt đầu quản lý.</p></div>
    <Link className="p-button primary" to="/host/property/new"><HousePlus size={18} />Đăng ký nhà trọ</Link>
  </section>;
}
