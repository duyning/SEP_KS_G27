import { useState } from 'react';
import { MapPin, Phone } from 'lucide-react';
import { communityCategories } from '../services/community-prototype.js';
import StatusBadge from './common/StatusBadge.jsx';
import CommunityPostMedia from './CommunityPostMedia.jsx';
import CommunityPostDescription from './CommunityPostDescription.jsx';
import CommunityPostContactLinks from './CommunityPostContactLinks.jsx';
import CommunityPhoneDialog from './CommunityPhoneDialog.jsx';
const badges={ROOM_TRANSFER:'badge-transfer',ROOMMATE:'badge-roommate',SECOND_HAND:'badge-secondhand'};
export function CommunityCategoryBadge({post,className}){const category=communityCategories.find(([key])=>key===post.type);return <span data-category={post.type} className={className||`post-cat-badge ${badges[post.type]}`}><span aria-hidden="true">{category?.[1]}</span> <span>{post.typeLabel}</span></span>}

export default function CommunityFeedCard({ post, showStatus = false, children, focused = false }) {
  const [contactPhone, setContactPhone] = useState(null);
    const hasMedia=Boolean(post.images?.length||post.videos?.length);
    return <article className={`community-feed-card community-restored-post${focused ? ' cn-focused-post' : ''}`} tabIndex={focused ? -1 : undefined} id={`post-${post.id}`} data-id={post.id}>
     <div className="community-feed-card-header">
      <div className="community-restored-author"><div className="community-restored-avatar" aria-hidden="true">{post.authorName.slice(0,2).toUpperCase()}</div><div><strong>{post.authorName}</strong><time className="community-feed-time" dateTime={post.createdAt} title={new Date(post.createdAt).toLocaleString('vi-VN')}><span>{new Date(post.createdAt).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</span><span aria-hidden="true">•</span><span>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span></time></div></div>
      <div className="community-feed-badges"><CommunityCategoryBadge post={post} className="community-feed-category"/>{showStatus&&<StatusBadge status={post.status} label={post.statusLabel}/>}</div>
     </div>
     <div className={`community-feed-body${hasMedia?' community-feed-body--media':''}`}>
      <div className="community-feed-copy"><h2 className="community-feed-title">{post.title}</h2><CommunityPostDescription content={post.content} contentFormat={post.contentFormat}/>
       <dl className="community-feed-facts">
        {post.priceDisplay&&<div className="community-feed-price"><dt>{post.type==='SECOND_HAND'?'Giá bán':post.type==='ROOM_TRANSFER'?'Giá thuê':'Chi phí ở ghép'}</dt><dd>{post.priceDisplay}</dd></div>}
        {post.location&&<div><dt>Địa chỉ</dt><dd><MapPin size={16} aria-hidden="true"/> {post.location}</dd></div>}
        {post.authorPhone&&<div><dt>Số điện thoại</dt><dd>
         <button type="button" className="community-phone-trigger" aria-haspopup="dialog"
           aria-label={`Liên hệ qua số ${post.authorPhone}`} onClick={()=>setContactPhone(post.authorPhone)}>
          <Phone size={16} aria-hidden="true" /> {post.authorPhone}
         </button>
        </dd></div>}
        <CommunityPostContactLinks post={post} asFacts/>
       </dl>
      </div>{hasMedia&&<CommunityPostMedia post={post}/>}</div>
     {children}
     {contactPhone && <CommunityPhoneDialog number={contactPhone} onClose={() => setContactPhone(null)} />}
    </article>;
}
