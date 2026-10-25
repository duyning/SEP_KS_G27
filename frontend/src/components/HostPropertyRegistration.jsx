import { HousePlus } from 'lucide-react';
import { Link } from 'react-router-dom';

// Undefined means ownership has not been verified by a backend response.
export default function HostPropertyRegistration({ hasProperty }) {
  return <section className="host-registration-prompt">
    <div><h2>{hasProperty === false ? 'Bạn chưa đăng ký nhà trọ' : hasProperty === true ? 'Đăng ký thêm nhà trọ' : 'Đăng ký nhà trọ của bạn'}</h2><p>Gửi thông tin và hồ sơ xác minh riêng cho từng nhà trọ bạn quản lý.</p></div>
    <Link className="p-button primary" to="/host/property/new"><HousePlus size={18} />Đăng ký nhà trọ</Link>
  </section>;
}
