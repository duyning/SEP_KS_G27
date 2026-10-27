export const POST_VIDEO_ACCEPT = '.mp4,video/mp4';
export const MAX_POST_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_POST_VIDEO_SECONDS = 180;

async function decodeVideo(file) {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  let timeout;
  try {
    return await new Promise((resolve, reject) => {
      timeout = setTimeout(() => reject(new Error('Video loading timeout')), 15000);
      video.onloadeddata = () => resolve({ duration: video.duration, width: video.videoWidth, height: video.videoHeight });
      video.onerror = () => reject(new Error('Cannot decode video'));
      video.src = url;
    });
  } finally {
    clearTimeout(timeout);
    video.onloadeddata = video.onerror = null;
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

export async function validatePostVideos(files, retainedCount = 0, decode = decodeVideo) {
  if (files.length + retainedCount > 1) return 'Mỗi bài viết được tối đa 1 video. Vui lòng bỏ video hiện tại trước khi thay video mới.';
  for (const file of files) {
    const prefix = `Video “${file.name}”: `;
    if (!file.size) return `${prefix}Tệp rỗng, vui lòng chọn video khác.`;
    if (file.size > MAX_POST_VIDEO_BYTES) return `${prefix}Vượt quá 50 MB/video.`;
    if (!file.name.toLowerCase().endsWith('.mp4') || file.type !== 'video/mp4') {
      return `${prefix}Chỉ nhận MP4 (.mp4), video H.264/AVC và âm thanh AAC (nếu có). Không nhận MOV, AVI, MKV, WEBM hoặc tệp đổi đuôi giả.`;
    }
    try {
      const header = new Uint8Array(await file.slice(0, 32).arrayBuffer());
      const ascii = (start, end) => String.fromCharCode(...header.slice(start, end));
      if (header.length < 16 || ascii(4, 8) !== 'ftyp' || !['isom', 'iso2', 'mp41', 'mp42', 'avc1'].includes(ascii(8, 12))) {
        return `${prefix}Nội dung không phải MP4 hợp lệ; không chấp nhận tệp đổi đuôi giả.`;
      }
      const { duration, width, height } = await decode(file);
      if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_POST_VIDEO_SECONDS) return `${prefix}Video phải dài hơn 0 giây và không quá 3 phút.`;
      if (width < 1 || height < 1 || Math.max(width, height) > 1920 || width * height > 1920 * 1080) return `${prefix}Độ phân giải tối đa Full HD (1920×1080 hoặc 1080×1920).`;
    } catch { return `${prefix}Không đọc được video; tệp bị hỏng hoặc trình duyệt không hỗ trợ. Hãy xuất MP4 H.264/AVC, âm thanh AAC.`; }
  }
  return '';
}
