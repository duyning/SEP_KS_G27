export const PRICE_UNITS = ['lần', 'giờ', 'kg', 'chuyến', 'm²'];
export function normalizePriceUnit(value = '') {
 const text = value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN');
 return PRICE_UNITS.includes(text) ? text : text.charAt(0).toLocaleUpperCase('vi-VN') + text.slice(1);
}
export const suggestedPriceUnit = name => /giặt/i.test(name) ? 'kg' : /chuyển/i.test(name) ? 'chuyến' : /dọn|vệ sinh/i.test(name) ? 'giờ' : /sửa/i.test(name) ? 'lần' : '';
export function servicePriceText(row) {
 if (row.pricingType === 'NEGOTIABLE') return 'Thỏa thuận';
 if (row.price == null) return 'Liên hệ báo giá';
 return (row.pricingType === 'FROM' ? 'Từ ' : '') + Number(row.price).toLocaleString('vi-VN') + ' VNĐ';
}
