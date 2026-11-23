import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, ImagePlus, RefreshCw } from 'lucide-react';
import { Modal } from './PortalUI.jsx';
import { MotionButton } from './motion/MotionUI.jsx';

/**
 * Interactive camera capture dialog for CCCD sides.
 * Requests camera permission ONLY after the user explicitly clicks "Chụp ảnh".
 * Always offers a direct fallback to pick a file from the device when permission is denied or unavailable.
 */
export default function HostCameraModal({ side, label, onCapture, onFallbackPicker, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('starting'); // starting | ready | denied | unsupported | error
  const [errorMessage, setErrorMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const stopStream = () => {
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
        streamRef.current = null;
      }
    };

    async function startCamera() {
      stopStream();
      if (!navigator?.mediaDevices?.getUserMedia) {
        setStatus('unsupported');
        setErrorMessage('Trình duyệt hiện tại không hỗ trợ mở camera trực tiếp. Bạn có thể chọn ảnh có sẵn từ thiết bị.');
        return;
      }

      setStatus('starting');
      setErrorMessage('');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 800 } },
          audio: false
        });
        if (cancelled) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        const name = err?.name || '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
          setStatus('denied');
          setErrorMessage('Bạn đã từ chối quyền truy cập camera hoặc trình duyệt đang chặn quyền này. Hãy chọn ảnh từ thiết bị hoặc cấp lại quyền camera.');
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setStatus('unsupported');
          setErrorMessage('Không tìm thấy camera khả dụng trên thiết bị này. Vui lòng tải ảnh trực tiếp từ thiết bị.');
        } else {
          setStatus('error');
          setErrorMessage('Không thể khởi động camera lúc này. Bạn có thể thử lại hoặc chọn ảnh từ thiết bị.');
        }
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [attempt]);

  function handleSnap() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `cccd-${side}-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        onClose();
      },
      'image/jpeg',
      0.92
    );
  }

  return (
    <Modal
      title={
        <span className="hob-modal-title">
          <Camera size={20} aria-hidden="true" />
          <span>Chụp ảnh {label.toLowerCase()}</span>
        </span>
      }
      className="hob-camera-modal"
      onClose={onClose}
    >
      <div className="hob-camera-body">
        {status === 'starting' || status === 'ready' ? (
          <>
            <div className="hob-camera-stage">
              <video ref={videoRef} playsInline muted autoPlay className="hob-camera-video" />
              <div className="hob-camera-frame" aria-hidden="true">
                <span>Căn đủ 4 góc thẻ CCCD trong khung</span>
              </div>
              {status === 'starting' && (
                <div className="hob-camera-loading" role="status">
                  Đang khởi động camera…
                </div>
              )}
            </div>
            <p className="hob-camera-tip">
              Đặt thẻ CCCD nơi đủ sáng, không lóa bóng đèn và không bị che mất chữ.
            </p>
          </>
        ) : (
          <div className="hob-camera-fallback" role="alert">
            <span className="hob-camera-fallback-icon" aria-hidden="true">
              <AlertCircle size={26} />
            </span>
            <h4>{status === 'denied' ? 'Chưa được cấp quyền camera' : 'Không thể sử dụng camera'}</h4>
            <p>{errorMessage}</p>
          </div>
        )}
      </div>

      <footer className="hob-camera-footer">
        <MotionButton
          type="button"
          className="hob-btn hob-btn-secondary"
          onClick={() => {
            onClose();
            onFallbackPicker();
          }}
        >
          <ImagePlus size={16} aria-hidden="true" />
          <span>Chọn ảnh từ thiết bị</span>
        </MotionButton>

        {status === 'ready' ? (
          <MotionButton type="button" className="hob-btn hob-btn-primary" onClick={handleSnap}>
            <Camera size={16} aria-hidden="true" />
            <span>Chụp ảnh</span>
          </MotionButton>
        ) : (
          <MotionButton
            type="button"
            className="hob-btn hob-btn-primary"
            onClick={() => setAttempt((n) => n + 1)}
          >
            <RefreshCw size={16} aria-hidden="true" />
            <span>Thử mở lại camera</span>
          </MotionButton>
        )}
      </footer>
    </Modal>
  );
}
