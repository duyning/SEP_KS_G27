import { AMENITIES, formatRuleLabel } from './property-registration.js';

export const PHOTO_SUPPLEMENT_KEYS = ['exterior', 'parking', 'common', 'corridor', 'safety'];

export const SUPPLEMENT_FIELD_META = {
  name: {
    label: 'Tên nhà trọ',
    aliases: [],
    placeholder: 'Ví dụ: Điền đúng tên trên biển hiệu nhà trọ...',
    defaultNote: 'Cần kiểm tra và cập nhật lại tên nhà trọ.',
  },
  propertyType: {
    label: 'Loại hình nhà trọ',
    aliases: [],
    placeholder: 'Ví dụ: Chọn lại đúng loại hình lưu trú thực tế...',
    defaultNote: 'Cần kiểm tra và chọn lại đúng loại hình nhà trọ.',
  },
  description: {
    label: 'Mô tả nhà trọ',
    aliases: [],
    placeholder: 'Ví dụ: Mô tả rõ hơn về không gian chung, an ninh, giờ giấc...',
    defaultNote: 'Cần bổ sung và làm rõ mô tả chi tiết về nhà trọ.',
  },
  contact: {
    label: 'Thông tin liên hệ quản lý tiếp khách',
    aliases: [],
    placeholder: 'Ví dụ: Cập nhật đúng họ tên người đón khách và số điện thoại hoạt động...',
    defaultNote: 'Cần kiểm tra và cập nhật thông tin người quản lý, hotline hoặc Zalo liên hệ.',
  },
  address: {
    label: 'Địa chỉ chi tiết (Số nhà, ngõ, xóm, thôn)',
    aliases: [],
    placeholder: 'Ví dụ: Ghi rõ số nhà, ngõ/ngách, thôn/xóm để người thuê dễ tìm...',
    defaultNote: 'Cần bổ sung cụ thể số nhà, ngõ, xóm hoặc thôn tại địa chỉ chi tiết.',
  },
  commune: {
    label: 'Xã / Khu vực tại Hòa Lạc',
    aliases: [],
    placeholder: 'Ví dụ: Chọn lại xã/khu vực khớp với địa chỉ thực tế...',
    defaultNote: 'Cần kiểm tra và chọn lại xã / khu vực tại Hòa Lạc phù hợp với địa chỉ.',
  },
  nearby: {
    label: 'Vị trí gần các địa điểm chính',
    aliases: [],
    placeholder: 'Ví dụ: Bổ sung khoảng cách thực tế tới ĐH FPT, ĐHQG Hòa Lạc...',
    defaultNote: 'Cần kiểm tra và bổ sung thông tin vị trí gần các địa điểm chính.',
  },
  coordinates: {
    label: 'Vị trí ghim trên bản đồ (Tọa độ GPS)',
    aliases: [],
    placeholder: 'Ví dụ: Ghim lại đúng vị trí nhà trọ trên bản đồ Hòa Lạc...',
    defaultNote: 'Cần kiểm tra và ghim lại chính xác vị trí nhà trọ trên bản đồ.',
  },
  amenities: {
    label: 'Tiện ích & Cơ sở vật chất chung',
    aliases: [],
    placeholder: 'Ví dụ: Đối chiếu lại tiện ích thực tế có tại khu vực chung...',
    defaultNote: 'Cần rà soát và cập nhật lại danh sách tiện ích chung đúng thực tế.',
  },
  rules: {
    label: 'Quy định & Nội quy lưu trú',
    aliases: [],
    placeholder: 'Ví dụ: Làm rõ giờ giấc sinh hoạt, quy định khách thăm và an toàn...',
    defaultNote: 'Cần kiểm tra và bổ sung rõ quy định chung, giờ giấc hoặc nội quy lưu trú.',
  },
  exterior: {
    label: 'Ảnh chụp mặt tiền & Biển hiệu nhà trọ',
    aliases: [],
    placeholder: 'Ví dụ: Bổ sung ảnh chụp rõ toàn cảnh mặt tiền và biển hiệu...',
    defaultNote: 'Cần bổ sung ảnh chụp rõ mặt tiền và biển hiệu nhà trọ.',
  },
  parking: {
    label: 'Ảnh cổng ra vào & Ngõ / Lối vào',
    aliases: [],
    placeholder: 'Ví dụ: Chụp rõ lối vào từ ngõ chính và khu vực cổng ra vào...',
    defaultNote: 'Cần bổ sung ảnh chụp rõ cổng ra vào và ngõ / lối vào nhà trọ.',
  },
  common: {
    label: 'Ảnh khu vực để xe máy & Bãi xe chung',
    aliases: [],
    placeholder: 'Ví dụ: Bổ sung ảnh thực tế khu vực để xe máy chung...',
    defaultNote: 'Cần bổ sung ảnh chụp rõ khu vực để xe máy và bãi xe chung.',
  },
  corridor: {
    label: 'Ảnh hành lang & Cầu thang / Thang máy',
    aliases: [],
    placeholder: 'Ví dụ: Chụp rõ lối đi hành lang, cầu thang và lối thoát nạn...',
    defaultNote: 'Cần bổ sung ảnh chụp rõ hành lang, cầu thang hoặc thang máy.',
  },
  safety: {
    label: 'Ảnh thiết bị & Tiêu lệnh PCCC chung',
    aliases: [],
    placeholder: 'Ví dụ: Bổ sung ảnh bình chữa cháy, tiêu lệnh PCCC, đèn sự cố...',
    defaultNote: 'Cần bổ sung ảnh chụp rõ thiết bị chữa cháy và tiêu lệnh PCCC chung.',
  },
  OWNERSHIP: {
    label: 'Giấy phép kinh doanh',
    aliases: ['Giấy tờ quyền sở hữu hoặc hợp đồng quản lý', 'Giấy tờ chứng minh quyền sở hữu hoặc quyền quản lý', 'Giấy tờ quyền sở hữu / Hợp đồng ủy quyền'],
    placeholder: 'Ví dụ: Tải lên bản chụp/scan rõ nét Giấy phép kinh doanh còn hiệu lực...',
    defaultNote: 'Cần kiểm tra và đính kèm lại Giấy phép kinh doanh rõ nét, hợp lệ.',
  },
  ID_CARD: {
    label: 'Căn cước công dân (CCCD / CMND) chủ trọ',
    aliases: ['CCCD đại diện quản lý nhà trọ', 'CCCD người đại diện quản lý'],
    placeholder: 'Ví dụ: Chụp rõ nét cả mặt trước và mặt sau CCCD không bị lóa...',
    defaultNote: 'Cần bổ sung bản chụp rõ hai mặt Căn cước công dân (CCCD / CMND) chủ trọ.',
  },
  FIRE_SAFETY: {
    label: 'Chứng nhận an toàn PCCC',
    aliases: ['Biên bản kiểm tra hoặc Cam kết an toàn PCCC', 'Biên bản / Cam kết an toàn PCCC', 'Biên bản / Bản cam kết an toàn PCCC'],
    placeholder: 'Ví dụ: Đính kèm Chứng nhận an toàn PCCC có xác nhận rõ ràng...',
    defaultNote: 'Cần kiểm tra và bổ sung Chứng nhận an toàn PCCC hợp lệ.',
  },
};

export function supplementGroups(detail) {
  const f = detail.submission || {}, s = detail.summary || {}, docs = detail.documents || [], photos = detail.photos || [];
  const labels = (values, options) => (values || []).map(key => options.find(([id]) => id === key)?.[1] || key).join(', ');
  const ruleLabels = (f.selectedRules || []).map(formatRuleLabel).join(', ');
  return [
    { title: 'Thông tin cơ bản', items: [['name', SUPPLEMENT_FIELD_META.name.label, s.name], ['propertyType', SUPPLEMENT_FIELD_META.propertyType.label, f.propertyType], ['description', SUPPLEMENT_FIELD_META.description.label, f.description], ['contact', SUPPLEMENT_FIELD_META.contact.label, [f.managerName, f.contactPhone, f.zaloPhone].filter(Boolean).join(' · ')]] },
    { title: 'Vị trí nhà trọ & Bản đồ', items: [['address', SUPPLEMENT_FIELD_META.address.label, f.addressDetail || s.address], ['commune', SUPPLEMENT_FIELD_META.commune.label, f.commune], ['nearby', SUPPLEMENT_FIELD_META.nearby.label, f.nearby], ['coordinates', SUPPLEMENT_FIELD_META.coordinates.label, f.latitude && f.longitude ? `${f.latitude}, ${f.longitude}` : null]] },
    { title: 'Tiện ích & Quy định chung', items: [['amenities', SUPPLEMENT_FIELD_META.amenities.label, labels(f.amenities, AMENITIES)], ['rules', SUPPLEMENT_FIELD_META.rules.label, [ruleLabels, f.rules].filter(Boolean).join(' · ')]] },
    { title: 'Hình ảnh nhà trọ & Khuôn viên', items: PHOTO_SUPPLEMENT_KEYS.map(key => [key, SUPPLEMENT_FIELD_META[key].label, photos.length ? `${photos.length} ảnh đã gửi · Chưa phân loại theo khu vực` : 'Chưa gửi hình ảnh']) },
    { title: 'Hồ sơ xác minh & Giấy tờ pháp lý', items: ['OWNERSHIP', 'ID_CARD', 'FIRE_SAFETY'].map(key => [key, SUPPLEMENT_FIELD_META[key].label, docs.find(file => file.type === key)?.fileName]) },
  ];
}

export function composeSupplementNote(groups, selected, note = '', fieldNotes = {}) {
  const sections = groups.map(group => {
    const rows = group.items.filter(([key]) => selected.includes(key));
    return rows.length ? `${group.title}:\n${rows.map(([key, label]) => {
      const itemNote = typeof fieldNotes?.[key] === 'string' ? fieldNotes[key].trim().replace(/\s+/g, ' ') : '';
      return itemNote ? `- ${label}: ${itemNote}` : `- ${label}`;
    }).join('\n')}` : null;
  }).filter(Boolean);
  return [sections.length ? 'Yêu cầu bổ sung thông tin / hồ sơ:' : null, ...sections, note.trim() ? `Ghi chú của Staff: ${note.trim()}` : null].filter(Boolean).join('\n\n');
}

function matchSupplementBullet(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('- ')) return null;
  for (const [key, meta] of Object.entries(SUPPLEMENT_FIELD_META)) {
    for (const label of [meta.label, ...(meta.aliases || [])]) {
      const exact = `- ${label}`;
      const withNote = `- ${label}:`;
      if (trimmed === exact) return { key, note: '' };
      if (trimmed.startsWith(withNote)) return { key, note: trimmed.slice(withNote.length).trim() };
    }
  }
  return null;
}

export function parseSupplementFeedback({ reasonNote = '', requestedFields = [], fieldNotes = {} } = {}) {
  const rawReason = typeof reasonNote === 'string' ? reasonNote.trim() : '';
  const keys = [];
  const addKey = key => { if (key && SUPPLEMENT_FIELD_META[key] && !keys.includes(key)) keys.push(key); };
  if (Array.isArray(requestedFields)) requestedFields.forEach(addKey);

  const parsedLineNotes = {};
  for (const line of rawReason.split(/\r?\n/)) {
    const matched = matchSupplementBullet(line);
    if (matched) {
      addKey(matched.key);
      if (matched.note) parsedLineNotes[matched.key] = matched.note;
    }
  }

  const isStructured = rawReason.startsWith('Yêu cầu bổ sung thông tin / hồ sơ:') || Object.keys(parsedLineNotes).length > 0 || rawReason.split(/\r?\n/).some(line => Boolean(matchSupplementBullet(line)));
  const staffMarker = 'Ghi chú của Staff:';
  let generalNote = '';
  if (isStructured) {
    const markerIndex = rawReason.indexOf(staffMarker);
    if (markerIndex >= 0) generalNote = rawReason.slice(markerIndex + staffMarker.length).trim();
  } else if (rawReason) {
    generalNote = keys.length === 1 ? '' : rawReason;
  }

  const notesByKey = {};
  for (const key of keys) {
    const explicit = typeof fieldNotes?.[key] === 'string' ? fieldNotes[key].trim() : '';
    const fromBullet = parsedLineNotes[key] || '';
    const singlePlainFallback = !isStructured && keys.length === 1 && rawReason ? rawReason : '';
    notesByKey[key] = explicit || fromBullet || singlePlainFallback || SUPPLEMENT_FIELD_META[key].defaultNote;
  }

  const photoItems = PHOTO_SUPPLEMENT_KEYS
    .filter(key => keys.includes(key))
    .map(key => ({ key, label: SUPPLEMENT_FIELD_META[key].label, note: notesByKey[key] }));

  return {
    hasInlineNotes: keys.length > 0,
    requestedKeys: keys,
    notesByKey,
    photoItems,
    generalNote,
  };
}
