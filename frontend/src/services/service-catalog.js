import { ALL_SERVICE_AREAS, areaList, serviceAreaText } from './service-areas.js';

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();

export function serviceAreas(rows = []) {
  const areas = new Map();
  for (const row of rows) for (const part of areaList(serviceAreaText(row))) {
    const area = part.trim();
    if (area && normalize(area) !== normalize(ALL_SERVICE_AREAS) && !areas.has(normalize(area))) areas.set(normalize(area), area);
  }
  return [...areas.values()].sort((a, b) => a.localeCompare(b, 'vi'));
}

export function filterPublicServices(rows, { category = 'all', area = 'all', query = '' } = {}) {
  const terms = normalize(query).split(' ').filter(Boolean);
  return rows.filter(row => {
    const searchable = normalize(`${row.serviceName || ''} ${row.providerName || ''} ${serviceAreaText(row)}`);
    return (category === 'all' || String(row.categoryId) === String(category))
      && (area === 'all' || normalize(row.serviceArea) === normalize(ALL_SERVICE_AREAS) || areaList(serviceAreaText(row)).some(value => normalize(value) === normalize(area)))
      && terms.every(term => searchable.includes(term));
  });
}


// Derive options from approved public data, including custom areas.
export const serviceAreaOptions = (rows = []) => serviceAreas(rows);
