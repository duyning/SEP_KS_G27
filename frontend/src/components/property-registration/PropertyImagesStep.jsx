import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  ImagePlus,
  RefreshCw,
  Star,
  Trash2,
  Upload
} from 'lucide-react';
import { MotionButton } from '../motion/MotionUI.jsx';
import { Modal } from '../PortalUI.jsx';
import PropertyPhotoGuide from '../PropertyPhotoGuide.jsx';

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function GalleryCard({
  file,
  index,
  total,
  cover,
  disabled,
  onPreview,
  onCover,
  onMoveLeft,
  onMoveRight,
  onReplace,
  onRemove
}) {
  const [url, setUrl] = useState('');
  const replaceInputRef = useRef(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <figure className={`prw-photo-card${cover ? ' is-cover' : ''}`}>
      <div className="prw-photo-thumb">
        <img src={url || undefined} alt={file.name} />
        <span className="prw-photo-index">#{index + 1}</span>
        {cover && (
          <span className="prw-cover-badge">
            <Star size={11} fill="currentColor" aria-hidden="true" />
            <span>Ảnh đại diện</span>
          </span>
        )}
        <button
          type="button"
          className="prw-photo-zoom"
          title={`Xem trước ${file.name}`}
          aria-label={`Xem trước ${file.name}`}
          onClick={() => url && onPreview({ src: url, name: file.name })}
        >
          <Eye size={15} aria-hidden="true" />
        </button>
      </div>

      <figcaption className="prw-photo-meta">
        <div className="prw-photo-info">
          <strong title={file.name}>{file.name}</strong>
          <span>
            <CheckCircle2 size={12} aria-hidden="true" />
            {formatBytes(file.size)} · Sẵn sàng
          </span>
        </div>

        <div className="prw-photo-controls">
          {!cover && (
            <button
              type="button"
              className="prw-photo-btn primary"
              disabled={disabled}
              onClick={onCover}
              title="Đặt làm ảnh đại diện"
            >
              <Star size={12} aria-hidden="true" />
              <span>Đặt đại diện</span>
            </button>
          )}
          {total > 1 && (
            <div className="prw-photo-order">
              <button
                type="button"
                className="prw-photo-icon-btn"
                disabled={disabled || index === 0}
                onClick={onMoveLeft}
                aria-label={`Di chuyển ảnh ${index + 1} sang trái`}
                title="Đưa lên trước"
              >
                <ChevronLeft size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="prw-photo-icon-btn"
                disabled={disabled || index === total - 1}
                onClick={onMoveRight}
                aria-label={`Di chuyển ảnh ${index + 1} sang phải`}
                title="Đưa ra sau"
              >
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          )}
          <button
            type="button"
            className="prw-photo-icon-btn"
            disabled={disabled}
            onClick={() => replaceInputRef.current?.click()}
            aria-label={`Thay ảnh ${file.name}`}
            title="Thay ảnh"
          >
            <RefreshCw size={13} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="prw-photo-icon-btn danger"
            disabled={disabled}
            onClick={onRemove}
            aria-label={`Xóa ảnh ${file.name}`}
            title="Xóa ảnh"
          >
            <Trash2 size={13} aria-hidden="true" />
          </button>
        </div>

        <input
          ref={replaceInputRef}
          type="file"
          className="prw-sr-file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          onChange={(e) => {
            const nextFile = e.target.files?.[0];
            e.target.value = '';
            if (nextFile) onReplace(nextFile);
          }}
        />
      </figcaption>
    </figure>
  );
}

export default function PropertyImagesStep({
  photos,
  error,
  disabled,
  onAddPhotos,
  onReplacePhoto,
  onRemovePhoto,
  onSetCover,
  onReorderPhoto
}) {
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const inputRef = useRef(null);
  const remaining = Math.max(0, 10 - photos.length);

  return (
    <div className="prw-step-body">
      <section className="prw-group-card" aria-labelledby="prw-group-photos">
        <div className="prw-group-head-split">
          <div className="prw-group-head">
            <span className="prw-group-icon" aria-hidden="true">
              <Camera size={17} />
            </span>
            <div>
              <h4 id="prw-group-photos">Thư viện ảnh thực tế nhà trọ</h4>
              <p>Tải từ 1 đến 10 ảnh rõ nét. Ảnh đầu tiên sẽ được dùng làm ảnh đại diện hiển thị.</p>
            </div>
          </div>
          <span className={`prw-count-pill${photos.length > 0 ? ' is-ready' : ''}`}>
            {photos.length} / 10 ảnh
          </span>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div
          className={`prw-dropzone${dragging ? ' is-dragging' : ''}${error ? ' has-error' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (!disabled) onAddPhotos(event.dataTransfer.files);
          }}
        >
          <span className="prw-dropzone-icon" aria-hidden="true">
            <ImagePlus size={26} />
          </span>
          <strong>Kéo thả nhiều hình ảnh vào đây hoặc chọn từ thiết bị</strong>
          <p id="photos-hint">
            Hỗ trợ JPG, PNG, WEBP · Tối đa 5 MB mỗi ảnh · Còn có thể thêm {remaining} ảnh.
          </p>
          <MotionButton
            type="button"
            className="prw-btn prw-btn-soft"
            disabled={disabled || remaining === 0}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={16} aria-hidden="true" />
            <span>{remaining === 0 ? 'Đã đạt tối đa 10 ảnh' : 'Chọn ảnh từ thiết bị'}</span>
          </MotionButton>
          <input
            ref={inputRef}
            id="photos"
            type="file"
            className="prw-sr-file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={disabled}
            aria-label="Chọn ảnh nhà trọ"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'photos-hint photos-error' : 'photos-hint'}
            onChange={(event) => {
              onAddPhotos(event.target.files);
              event.target.value = '';
            }}
          />
        </div>

        {error && (
          <p id="photos-error" className="prw-field-error" role="alert">
            <AlertCircle size={14} aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}

        {/* Photo Gallery Grid */}
        {photos.length > 0 && (
          <div className="prw-photo-grid" aria-label="Ảnh nhà trọ đã chọn">
            {photos.map((file, index) => (
              <GalleryCard
                key={`${file.name}-${file.lastModified}-${file.size}-${index}`}
                file={file}
                index={index}
                total={photos.length}
                cover={index === 0}
                disabled={disabled}
                onPreview={setLightbox}
                onCover={() => onSetCover(index)}
                onMoveLeft={() => onReorderPhoto(index, index - 1)}
                onMoveRight={() => onReorderPhoto(index, index + 1)}
                onReplace={(nextFile) => onReplacePhoto(index, nextFile)}
                onRemove={() => onRemovePhoto(index)}
              />
            ))}
          </div>
        )}

        <details className="prw-collapsible" open={photos.length === 0 || undefined}>
          <summary>
            <Camera size={15} aria-hidden="true" />
            <span>Gợi ý các góc chụp giúp hồ sơ dễ được duyệt và thu hút khách</span>
          </summary>
          <div className="prw-collapsible-body">
            <PropertyPhotoGuide embedded />
          </div>
        </details>
      </section>

      {lightbox && (
        <Modal title={lightbox.name} className="prw-lightbox-modal" onClose={() => setLightbox(null)}>
          <div className="prw-lightbox-body">
            <img src={lightbox.src} alt={lightbox.name} />
          </div>
        </Modal>
      )}
    </div>
  );
}
