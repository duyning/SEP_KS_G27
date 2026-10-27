export const POST_IMAGE_ACCEPT = '.jpg,.jpeg,.png,image/jpeg,image/png';
export const MAX_POST_IMAGES = 6;
export const MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_POST_IMAGE_PIXELS = 20_000_000;

async function decodeImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally { URL.revokeObjectURL(url); }
}

export async function validatePostImages(files, retainedCount = 0, decode = decodeImage) {
  if (files.length + retainedCount > MAX_POST_IMAGES) return 'Mỗi bài viết được tối đa 6 ảnh. Vui lòng bỏ bớt ảnh.';
  for (const file of files) {
    const prefix = `Ảnh “${file.name}”: `;
    const extension = file.name.split('.').pop().toLowerCase();
    const jpeg = ['jpg', 'jpeg'].includes(extension) && file.type === 'image/jpeg';
    const png = extension === 'png' && file.type === 'image/png';
    if (!file.size) return `${prefix}Tệp rỗng, vui lòng chọn ảnh khác.`;
    if (file.size > MAX_POST_IMAGE_BYTES) return `${prefix}Vượt quá 5 MB/ảnh.`;
    if (!jpeg && !png) return `${prefix}Chỉ nhận JPG/JPEG (.jpg, .jpeg) hoặc PNG (.png). Không nhận WEBP, GIF, HEIC, SVG, PDF, video hay tệp đổi đuôi giả.`;
    try {
      const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
      const validHeader = jpeg ? header[0] === 255 && header[1] === 216 && header[2] === 255
        : [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => header[index] === byte);
      if (!validHeader) return `${prefix}Nội dung không khớp định dạng JPG/PNG; không chấp nhận tệp đổi đuôi giả.`;
      const { width, height } = await decode(file);
      if (width < 1 || height < 1 || width > 10000 || height > 10000 || width * height > MAX_POST_IMAGE_PIXELS) {
        return `${prefix}Tối đa 20 megapixel, mỗi chiều không quá 10.000 px.`;
      }
    } catch { return `${prefix}Không đọc được ảnh; tệp bị hỏng hoặc không đúng định dạng JPG/PNG.`; }
  }
  return '';
}
