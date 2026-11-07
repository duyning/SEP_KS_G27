// The form uses Vietnamese separators; API payloads keep an unformatted decimal.
export function parseServiceMoney(display) {
  const text = String(display).replace(/[.\s₫]/g, '').replace(/VNĐ/gi, '');
  if (!/^\d{0,10}(,\d{0,2})?$/.test(text)) return null;
  return text.replace(',', '.');
}
export function formatServiceMoney(raw) {
  if (raw === '' || raw == null) return '';
  const [integer, fraction] = String(raw).split('.');
  const grouped = integer.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return grouped + (fraction !== undefined ? ',' + fraction : '');
}
export function serviceFileName(name) {
  const text = String(name || 'Tệp đính kèm');
  return text.length > 42 ? text.slice(0, 28) + '…' + text.slice(-10) : text;
}

