import { AnimatePresence } from '../../components/motion/MotionUI.jsx';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Heart,
  Image as ImageIcon,
  MessageSquare,
  Plus,
  Send,
  Share2,
  Tag,
  User,
  Users,
} from 'lucide-react';
import { MOCK_COMMUNITY_POSTS } from '../../fixtures/mockCommunityData.js';
import DemoNoticeBanner from '../../components/common/DemoNoticeBanner.jsx';
import Modal from '../../components/common/Modal.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useToast } from '../../components/PortalUI.jsx';

export default function CommunityPage() {
  const [params, setParams] = useSearchParams();
  const notify = useToast();
  const selectedCategory = params.get('category') || 'ALL';

  const [posts, setPosts] = useState(MOCK_COMMUNITY_POSTS);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Post Form State
  const [postType, setPostType] = useState('ROOM_TRANSFER');
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postPrice, setPostPrice] = useState('');
  const [postLocation, setPostLocation] = useState('Tân Xã, Thạch Thất');
  const [authorName, setAuthorName] = useState('');
  const [authorPhone, setAuthorPhone] = useState('');

  const filteredPosts = selectedCategory === 'ALL'
    ? posts
    : posts.filter((p) => p.type === selectedCategory);

  const handleCreatePost = (e) => {
    e.preventDefault();
    if (!postTitle || !postContent) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung bài viết.');
      return;
    }
    const newPost = {
      id: `POST-${Date.now()}`,
      type: postType,
      typeLabel: postType === 'ROOM_TRANSFER' ? 'Nhượng phòng' : postType === 'ROOMMATE' ? 'Ở ghép' : 'Đồ cũ',
      title: postTitle,
      content: postContent,
      priceDisplay: postPrice ? `${postPrice} đ` : 'Thỏa thuận',
      location: postLocation,
      authorName: authorName || 'Bạn (Tác giả)',
      authorPhone: authorPhone,
      status: 'PENDING',
      statusLabel: 'Chờ kiểm duyệt',
      createdAt: new Date().toISOString(),
      comments: [],
    };
    setPosts([newPost, ...posts]);
    setIsCreateModalOpen(false);
    notify?.('Bài viết đã được gửi và đang chờ Staff kiểm duyệt trước khi hiển thị công khai! (Demo)', 'success');
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Heading Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            Cộng đồng Cư dân & Sinh viên Hòa Lạc
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Kết nối nhượng phòng, tìm bạn ở ghép và chia sẻ đồ dùng sinh viên quanh ĐH FPT & Khu CNC.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '10px',
            backgroundColor: '#0d9488',
            color: '#ffffff',
            border: 'none',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(13, 148, 136, 0.2)',
          }}
        >
          <Plus size={18} />
          <span>Đăng bài viết mới</span>
        </button>
      </div>

      <DemoNoticeBanner message="Dữ liệu bài viết cộng đồng hiển thị từ prototype fixture do backend chưa cung cấp API GET /api/community/posts." />

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          ['ALL', 'Tất cả bài viết'],
          ['ROOM_TRANSFER', 'Nhượng phòng'],
          ['ROOMMATE', 'Tìm người ở ghép'],
          ['SECOND_HAND', 'Đồ cũ sinh viên'],
        ].map(([key, label]) => {
          const active = selectedCategory === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setParams(key === 'ALL' ? {} : { category: key })}
              style={{
                padding: '8px 18px',
                borderRadius: '9999px',
                border: active ? '1px solid #0d9488' : '1px solid #e2e8f0',
                backgroundColor: active ? '#0d9488' : '#ffffff',
                color: active ? '#ffffff' : '#475569',
                fontWeight: active ? 700 : 600,
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Posts Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {filteredPosts.map((post) => (
          <article
            key={post.id}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.05)',
            }}
          >
            {/* Post Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                }}>
                  {post.authorName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>{post.authorName}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{post.location} • Vừa xong</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: post.type === 'ROOM_TRANSFER' ? '#f0fdfa' : post.type === 'ROOMMATE' ? '#eff6ff' : '#fffbeb',
                  color: post.type === 'ROOM_TRANSFER' ? '#0d9488' : post.type === 'ROOMMATE' ? '#1e40af' : '#b45309',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {post.typeLabel}
                </span>
                <StatusBadge status={post.status} label={post.statusLabel} />
              </div>
            </div>

            {/* Post Content */}
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              {post.title}
            </h3>
            <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, margin: '0 0 14px' }}>
              {post.content}
            </p>

            {/* Price Chip & Images */}
            {post.priceDisplay && (
              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Chi phí: </span>
                <strong style={{ fontSize: '16px', color: '#0d9488' }}>{post.priceDisplay}</strong>
              </div>
            )}

            {post.images?.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', overflowX: 'auto' }}>
                {post.images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt="Post preview"
                    style={{ width: '180px', height: '130px', borderRadius: '10px', objectFit: 'cover' }}
                  />
                ))}
              </div>
            )}

            {/* Post Footer Actions */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '12px',
              borderTop: '1px solid #f1f5f9',
              fontSize: '13px',
              color: '#64748b',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MessageSquare size={16} />
                  <span>{post.comments?.length || 0} bình luận</span>
                </span>
                {post.authorPhone && (
                  <span>Liên hệ: <strong>{post.authorPhone}</strong></span>
                )}
              </div>
              <button
                type="button"
                onClick={() => notify?.('Đã sao chép liên kết chia sẻ bài viết', 'success')}
                style={{ background: 'none', border: 'none', color: '#0d9488', fontWeight: 600, cursor: 'pointer' }}
              >
                Chia sẻ bài viết
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Create Post Modal */}
      <AnimatePresence>{isCreateModalOpen && (
        <Modal title="Đăng bài viết mới vào Cộng đồng" onClose={() => setIsCreateModalOpen(false)}>
          <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label htmlFor="postType" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Chuyên mục bài viết *
              </label>
              <select
                id="postType"
                value={postType}
                onChange={(e) => setPostType(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="ROOM_TRANSFER">Nhượng phòng trọ</option>
                <option value="ROOMMATE">Tìm người ở ghép</option>
                <option value="SECOND_HAND">Đồ cũ sinh viên</option>
              </select>
            </div>

            <div>
              <label htmlFor="postTitle" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Tiêu đề bài viết *
              </label>
              <input
                id="postTitle"
                type="text"
                required
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="VD: Nhượng gấp phòng khép kín Tân Xã gần ĐH FPT..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label htmlFor="postContent" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Nội dung chi tiết *
              </label>
              <textarea
                id="postContent"
                rows={4}
                required
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Mô tả cụ thể về phòng, vị trí, giờ giấc, đồ dùng sang nhượng..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label htmlFor="postPrice" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Mức giá (đ/tháng)
                </label>
                <input
                  id="postPrice"
                  type="text"
                  value={postPrice}
                  onChange={(e) => setPostPrice(e.target.value)}
                  placeholder="VD: 2.200.000"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label htmlFor="postLocation" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Khu vực
                </label>
                <input
                  id="postLocation"
                  type="text"
                  value={postLocation}
                  onChange={(e) => setPostLocation(e.target.value)}
                  placeholder="VD: Thôn 2, Tân Xã"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label htmlFor="authorName" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Tên liên hệ
                </label>
                <input
                  id="authorName"
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label htmlFor="authorPhone" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Số điện thoại
                </label>
                <input
                  id="authorPhone"
                  type="tel"
                  value={authorPhone}
                  onChange={(e) => setAuthorPhone(e.target.value)}
                  placeholder="VD: 0912345678"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                type="submit"
                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#0d9488', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                Gửi bài kiểm duyệt
              </button>
            </div>
          </form>
        </Modal>
      )}</AnimatePresence>
    </div>
  );
}
