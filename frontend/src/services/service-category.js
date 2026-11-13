// Shared semantic palette for every service category surface.
export const SERVICE_CATEGORY_COLORS = {
  moving: { background: '#eff6ff', color: '#1e40af', borderColor: '#93c5fd' },
  laundry: { background: '#ecfeff', color: '#155e75', borderColor: '#67e8f9' },
  cleaning: { background: '#faf5ff', color: '#6b21a8', borderColor: '#d8b4fe' },
  repair: { background: '#fff7ed', color: '#9a3412', borderColor: '#fdba74' },
  other: { background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1' },
};
export function serviceCategoryStyle(name = '') {
  const key = /chuyển/i.test(name) ? 'moving' : /giặt/i.test(name) ? 'laundry' : /dọn|vệ sinh/i.test(name) ? 'cleaning' : /sửa/i.test(name) ? 'repair' : 'other';
  return SERVICE_CATEGORY_COLORS[key];
}
