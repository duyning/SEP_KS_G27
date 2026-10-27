import { ApiError, request } from './auth.js';

export const postTypes = { ROOM_TRANSFER: 'Nhượng phòng', ROOMMATE: 'Tìm người ở ghép', SECOND_HAND: 'Đồ cũ sinh viên' };
export const postStatuses = { PENDING: 'Chờ kiểm duyệt', NEED_CHANGES: 'Cần chỉnh sửa', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };
const clean = value => String(value ?? '').trim();

export function parsePostPrice(value) {
  const text = clean(value);
  if (!text) return null;
  // Accept whole VND, including the 2.200.000 format shown in the form.
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(text)) return NaN;
  const price = Number(text.replaceAll('.', ''));
  return Number.isSafeInteger(price) ? price : NaN;
}

export function formatPostPrice(value) {
  const text = String(value ?? '');
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(text)) return text;
  return text.replaceAll('.', '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Infer the edit from the text itself: mobile keyboards/IME may omit InputEvent.data.
export function editPostPrice(previous, raw, caret = raw.length) {
  let prefix = 0;
  while (prefix < previous.length && prefix < raw.length && previous[prefix] === raw[prefix]) prefix++;
  let suffix = 0;
  while (suffix < previous.length - prefix && suffix < raw.length - prefix
    && previous[previous.length - suffix - 1] === raw[raw.length - suffix - 1]) suffix++;
  const inserted = raw.slice(prefix, raw.length - suffix);
  const editingDigits = !Number.isNaN(parsePostPrice(previous)) && /^[\d.]*$/.test(raw) && /^\d*$/.test(inserted);
  const value = formatPostPrice(editingDigits ? raw.replaceAll('.', '') : raw);
  if (value === raw) return { value, caret };
  let remaining = raw.slice(0, caret).replace(/\D/g, '').length;
  let position = 0;
  while (position < value.length && remaining > 0) {
    if (/\d/.test(value[position])) remaining--;
    position++;
  }
  return { value, caret: position };
}

export function hasPostDraftChanges(values, initial, editing = false) {
  if (!initial) return false;
  if (values.photos?.length) return true;
  if (values.videos?.length) return true;
  if (values.retainedImageIds && JSON.stringify(values.retainedImageIds) !== JSON.stringify(initial.retainedImageIds || [])) return true;
  if (values.retainedVideoIds && JSON.stringify(values.retainedVideoIds) !== JSON.stringify(initial.retainedVideoIds || [])) return true;
  if (values.type !== initial.type) return true;
  return ['title', 'content', 'price', 'location', 'authorName', 'authorPhone'].some(field => {
    const current = String(values[field] ?? '');
    const original = String(initial[field] ?? '');
    if (!editing && current === '') return false;
    if (field === 'price') {
      const currentPrice = parsePostPrice(current);
      const originalPrice = parsePostPrice(original);
      if (!Number.isNaN(currentPrice) && !Number.isNaN(originalPrice)) return currentPrice !== originalPrice;
    }
    return current !== original;
  });
}

export function validatePost(values) {
  const errors = {};
  if (!Object.hasOwn(postTypes, values.type)) errors.type = 'Vui lòng chọn chuyên mục hợp lệ.';
  for (const [field, label, min, max] of [
    ['title', 'Tiêu đề', 10, 200], ['content', 'Nội dung', 30, 5000],
    ['location', 'Khu vực', 5, 255], ['authorName', 'Tên liên hệ', 2, 100],
  ]) {
    const length = clean(values[field]).length;
    if (length < min || length > max) errors[field] = `${label} cần từ ${min} đến ${max} ký tự.`;
  }
  if (!/^(?:0|\+84)[35789]\d{8}$/.test(clean(values.authorPhone).replace(/[\s.-]/g, ''))) {
    errors.authorPhone = 'Nhập số điện thoại Việt Nam hợp lệ, ví dụ 0912345678 hoặc +84912345678.';
  }
  const price = parsePostPrice(values.price);
  if (price !== null && (!Number.isFinite(price) || price < 0 || price > 1_000_000_000)) {
    errors.price = 'Giá phải là số nguyên từ 0 đến 1 tỷ đồng; để trống nếu thỏa thuận.';
  } else if (price === 0 && values.type !== 'SECOND_HAND') {
    errors.price = 'Giá thuê phải lớn hơn 0; để trống nếu thỏa thuận.';
  }
  return errors;
}

export function postPayload(values) {
  return {
    type: values.type, title: clean(values.title), content: clean(values.content),
    price: parsePostPrice(values.price), location: clean(values.location),
    authorName: clean(values.authorName), authorPhone: clean(values.authorPhone).replace(/[\s.-]/g, ''),
    ...(values.retainedImageIds ? { retainedImageIds: values.retainedImageIds } : {}),
    ...(values.retainedVideoIds ? { retainedVideoIds: values.retainedVideoIds } : {}),
  };
}

function post(data) {
  if (!data || !Number.isInteger(data.id) || data.id < 1 || !Object.hasOwn(postTypes, data.type)
      || !Object.hasOwn(postStatuses, data.status) || !['title', 'content', 'authorName'].every(key => typeof data[key] === 'string')
      || !(data.price === null || typeof data.price === 'number' && Number.isFinite(data.price) && data.price >= 0)) {
    throw new ApiError('Phản hồi bài viết không hợp lệ. Vui lòng tải lại.', 502);
  }
  const images = data.images ?? [];
  if (!Array.isArray(images) || images.some(image => !image || !Number.isInteger(image.id) || image.id < 1 || typeof image.fileName !== 'string')) {
    throw new ApiError('Danh sách ảnh bài viết không hợp lệ.', 502);
  }
  const videos = data.videos ?? [];
  if (!Array.isArray(videos) || videos.length > 1 || videos.some(video => !video || !Number.isInteger(video.id) || video.id < 1 || typeof video.fileName !== 'string')) {
    throw new ApiError('Danh sách video bài viết không hợp lệ.', 502);
  }
  const suffix = data.type === 'SECOND_HAND' ? ' đ' : data.type === 'ROOMMATE' ? ' đ/người/tháng' : ' đ/tháng';
  return { ...data, images, videos, typeLabel: postTypes[data.type], statusLabel: postStatuses[data.status],
    priceDisplay: data.price === null ? 'Thỏa thuận' : `${new Intl.NumberFormat('vi-VN').format(data.price)}${suffix}` };
}

function list(data) {
  if (!Array.isArray(data)) throw new ApiError('Danh sách bài viết không hợp lệ.', 502);
  return data.map(post);
}
function id(value) {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > 2147483647) throw new ApiError('Mã bài viết không hợp lệ.', 400);
  return value;
}
function detail(data) {
  if (!data || !Array.isArray(data.history) || typeof data.accountName !== 'string') throw new ApiError('Chi tiết kiểm duyệt không hợp lệ.', 502);
  return { ...data, post: post(data.post) };
}
const basePath = '/api/community/posts';
const staffPath = '/api/staff/community/posts';
export const communityApi = {
  async published(signal) {
    const posts = list(await request('', { basePath, signal }));
    if (posts.some(item => item.status !== 'APPROVED')) throw new ApiError('Danh sách công khai chứa bài chưa được duyệt.', 502);
    return posts;
  },
  async mine(signal) { return list(await request('/mine', { basePath, signal })); },
  async remove(postId, signal) { return request(`/${id(postId)}`, { basePath, method: 'DELETE', signal }); },
  async submit(data, signal, postId = null, photos = [], videos = []) {
    let body = data;
    if (photos.length || videos.length) {
      body = new FormData();
      body.append('details', new Blob([JSON.stringify(data)], { type: 'application/json' }));
      for (const photo of photos) body.append('photos', photo, photo.name);
      for (const video of videos) body.append('videos', video, video.name);
    }
    const saved = post(await request(postId == null ? '' : `/${id(postId)}`, { basePath, method: postId == null ? 'POST' : 'PUT', body, signal }));
    if (saved.status !== 'PENDING') throw new ApiError('Chưa xác nhận được trạng thái chờ duyệt. Vui lòng kiểm tra Bài viết của tôi.', 502);
    return saved;
  },
  async image(postId, imageId, signal) { return request(`/${id(postId)}/images/${id(imageId)}`, { basePath, signal, responseType: 'blob' }); },
  async video(postId, videoId, signal) { return request(`/${id(postId)}/videos/${id(videoId)}`, { basePath, signal, responseType: 'blob' }); },
  async moderation(signal) { return list(await request('', { basePath: staffPath, signal })); },
  async detail(signal, postId) { return detail(await request(`/${id(postId)}`, { basePath: staffPath, signal })); },
  async review(postId, decision, note, signal) {
    return detail(await request(`/${id(postId)}/review`, { basePath: staffPath, method: 'POST', body: { decision, note }, signal }));
  },
};
