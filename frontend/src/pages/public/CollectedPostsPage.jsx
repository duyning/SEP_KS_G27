import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Newspaper, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import DetailPrototypeShell from '../../components/detail/DetailPrototypeShell.jsx';
import { CollectedFeed, useCollectedFeed } from '../../components/CollectedPostsFeed.jsx';
import '../../styles/home-prototype.css';
import '../../styles/home-prototype-integration.css';
import '../../styles/search-prototype.css';
import '../../styles/search-prototype-integration.css';

export default function CollectedPostsPage() {
  const { user } = useAuth();
  const [revision, refresh] = useState(0);
  const feed = useCollectedFeed({ revision });
  return <DetailPrototypeShell className="collected-public"><main className="collected-page collected-discovery">
    <section className="collected-discovery-hero" aria-labelledby="collected-title">
      <div className="collected-discovery-container collected-discovery-intro">
        <div><span className="collected-discovery-badge"><Globe size={15} aria-hidden="true" />NestHub · Thông tin Hòa Lạc</span><h1 id="collected-title">Bài đăng <span>tổng hợp</span></h1><p>Khám phá thông tin quanh Hòa Lạc được đội ngũ NestHub chọn lọc từ các nhóm Facebook.</p></div>
        {['STAFF', 'ADMIN'].includes(user?.role) && <Link className="collected-button primary" to="/staff/collected-posts">Quản lý bài tổng hợp</Link>}
      </div>
    </section>
    <section className="collected-discovery-container collected-discovery-content" aria-labelledby="collected-feed-title">
      <div className="collected-discovery-toolbar"><div><span className="collected-discovery-feed-icon" aria-hidden="true"><Newspaper size={20} /></span><div><h2 id="collected-feed-title">Khám phá bài viết</h2><p>Các bài đã được công khai · Tự động tải thêm khi cuộn</p></div></div><button type="button" className="collected-button" disabled={feed.loading} onClick={() => refresh(v => v + 1)}><RefreshCw size={16} aria-hidden="true" />Làm mới</button></div>
      <div className="collected-public-feed"><CollectedFeed feed={feed} /></div>
    </section>
  </main></DetailPrototypeShell>;
}
