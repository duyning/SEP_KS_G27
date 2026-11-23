import {request, ApiError} from './auth.js';
import {AMENITIES, formatRuleLabel} from './property-registration.js';

const AI_WAIT_MS = 5000;
const MAX_DESCRIPTION_LENGTH = 2000;

export function descriptionFacts(form) {
  return {
    name: form.name?.trim() || '',
    propertyType: form.propertyType?.trim() || '',
    commune: form.commune || '',
    nearby: form.nearby || '',
    amenities: AMENITIES.filter(([key]) => (form.amenities || []).includes(key)).map(([, label]) => label),
    rules: (form.selectedRules || []).map(formatRuleLabel),
    existingDescription: form.description || '',
  };
}

export async function generatePropertyDescription(form, signal) {
  const data = await request('/description', {
    basePath: '/api/property-writing', method: 'POST', body: descriptionFacts(form), signal,
  });
  const description = typeof data?.description === 'string' ? data.description : '';
  const trimmed = description.trim();
  if (trimmed.length < 30 || description.length > MAX_DESCRIPTION_LENGTH) {
    throw new ApiError('AI trả mô tả chưa hợp lệ. Nội dung đang viết được giữ nguyên.', 502);
  }
  return trimmed;
}

export function buildPropertyDescriptionDraft(form) {
  const facts = descriptionFacts(form);
  const compact = (value, limit) => value.trim().replace(/\s+/g, ' ').slice(0, limit).trimEnd();
  const name = compact(facts.name, 100);
  const type = compact(facts.propertyType, 100);
  if (name.length < 3 || type.length < 2) return '';

  const commune = compact(facts.commune, 100);
  const nearby = compact(facts.nearby, 255);
  const location = commune ? `, tại khu vực ${commune}` : '';
  const details = [`${name} là cơ sở lưu trú thuộc loại hình ${type}${location}`];
  if (nearby) details.push(`Các địa điểm lân cận gồm ${nearby}`);
  if (facts.amenities.length) details.push(`Tiện ích được chủ trọ khai báo gồm ${facts.amenities.join(', ')}`);
  if (facts.rules.length) details.push(`Quy định lưu trú gồm ${facts.rules.join(', ')}`);

  let draft = '';
  for (const detail of details) {
    const sentence = /[.!?…]$/.test(detail) ? detail : `${detail}.`;
    const next = draft ? `${draft} ${sentence}` : sentence;
    if (next.length <= MAX_DESCRIPTION_LENGTH) draft = next;
  }
  return draft;
}

export async function getPropertyDescriptionSuggestion(form, signal) {
  signal.throwIfAborted();
  const requestController = new AbortController();
  const cancelRequest = () => requestController.abort();
  signal.addEventListener('abort', cancelRequest, {once: true});

  let timer;
  const deadline = new Promise(resolve => {
    timer = setTimeout(() => resolve(null), AI_WAIT_MS);
  });

  try {
    const description = await Promise.race([generatePropertyDescription(form, requestController.signal), deadline]);
    signal.throwIfAborted();
    if (description !== null) return {description, source: 'ai'};
    return {description: buildPropertyDescriptionDraft(form), source: 'form', notice: 'Gemini phản hồi chậm. Bạn có thể dùng bản nháp này ngay.'};
  } catch (error) {
    signal.throwIfAborted();
    if (!(error instanceof ApiError) || [400, 401, 403, 422].includes(error.status)) throw error;
    return {description: buildPropertyDescriptionDraft(form), source: 'form', notice: 'Gemini chưa tạo được mô tả. Bạn có thể dùng bản nháp này ngay.'};
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancelRequest);
    requestController.abort();
  }
}
