import CommunityPostImage from './CommunityPostImage.jsx';
import CommunityPostVideo from './CommunityPostVideo.jsx';

export default function CommunityPostMedia({ post }) {
  const images = post.images || [];
  const videos = post.videos || [];
  const visibleImages = images.slice(0, videos.length ? 3 : 4);
  const count = visibleImages.length + videos.length;
  if (!count) return null;
  return <div className="community-post-media-wrap"><section className={`community-post-media community-post-media--${count}`} aria-label={`Ảnh và video của bài ${post.title}`} tabIndex={count > 1 ? 0 : undefined}>
    {visibleImages.map((image, index) => <div className="community-post-media-cell" key={`image-${image.id}`}>
      <CommunityPostImage postId={post.id} image={image} images={images} defer fit={count === 1 ? 'contain' : 'cover'}
        remainingCount={index === visibleImages.length - 1 ? images.length - visibleImages.length : 0} />
    </div>)}
    {videos.map(video => <div className="community-post-media-cell community-post-media-cell--video" key={`video-${video.id}`}>
      <CommunityPostVideo postId={post.id} video={video} />
    </div>)}
  </section>{count > 1 && <p className="community-mobile-media-hint">Ảnh &amp; video · Vuốt ngang để xem thêm</p>}</div>;
}
