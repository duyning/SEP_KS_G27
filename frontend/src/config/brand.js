export const BRAND = Object.freeze({
  name: 'NestHub',
  tagline: 'Nền tảng kết nối và quản lý nhà trọ',
  shortTagline: 'Kết nối & quản lý nhà trọ',
  campusTagline: 'Kết nối phòng trọ Hòa Lạc',
  primaryColor: '#0D9488',
  primaryDarkColor: '#0F766E',
  wordmarkColor: '#0F5955',
  backgroundColor: '#F8FAFC',
  textColor: '#0F172A',
  supportEmail: 'support@nesthub.vn',
  hotline: '0912 345 678',
  copyrightYear: 2026
});

export function formatDocumentTitle(pageTitle) {
  const clean = typeof pageTitle === 'string' ? pageTitle.trim() : '';
  return clean ? `${clean} | ${BRAND.name}` : `${BRAND.name} - ${BRAND.tagline}`;
}
