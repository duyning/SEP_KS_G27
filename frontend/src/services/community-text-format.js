export const postFontSizes = { small: '13px', large: '18px' };
export const postContentLimit = 2500;

const childrenByType = {
  doc: ['paragraph', 'bulletList', 'orderedList'],
  paragraph: ['text', 'hardBreak'],
  bulletList: ['listItem'],
  orderedList: ['listItem'],
  listItem: ['paragraph', 'bulletList', 'orderedList'],
};

export function cleanPostDocument(node, depth = 0) {
  if (!node || depth > 24) throw new Error('Nội dung có quá nhiều cấp danh sách.');
  const { type } = node;
  if (type === 'text' && typeof node.text === 'string' && node.text) {
    const marks = (node.marks || []).flatMap(mark => {
      if (['bold', 'italic', 'underline'].includes(mark.type)) return [{ type: mark.type }];
      if (mark.type === 'textStyle' && Object.values(postFontSizes).includes(mark.attrs?.fontSize)) {
        return [{ type: 'textStyle', attrs: { fontSize: mark.attrs.fontSize } }];
      }
      return [];
    });
    return { type, text: node.text, ...(marks.length ? { marks } : {}) };
  }
  if (type === 'hardBreak') return { type };
  const allowed = childrenByType[type];
  if (!Array.isArray(allowed)) throw new Error('Định dạng nội dung không hợp lệ.');
  const content = (node.content || []).map(child => {
    if (!allowed.includes(child.type)) throw new Error('Định dạng nội dung không hợp lệ.');
    return cleanPostDocument(child, depth + 1);
  });
  return { type, ...(content.length ? { content } : {}) };
}

export function plainPostDocument(text, marks = []) {
  return { type: 'doc', content: text.split('\n').map(line => ({
    type: 'paragraph',
    ...(line ? { content: [{ type: 'text', text: line, ...(marks.length ? { marks } : {}) }] } : {}),
  })) };
}

export function postDocumentText(node) {
  if (node.type === 'text') return node.text;
  if (node.type === 'hardBreak') return '\n';
  return (node.content || []).map(postDocumentText).join(node.type === 'paragraph' ? '' : '\n');
}

export function readPostDocument(content, format) {
  if (format?.startsWith('{')) {
    try {
      const doc = cleanPostDocument(JSON.parse(format));
      if (doc.type === 'doc' && postDocumentText(doc).trim() === content.trim()) return doc;
    } catch {
      // Older or malformed records are still readable as plain text.
    }
  }
  const legacy = /^(?:default|serif|mono):(small|normal|large):(b?i?u?)$/.exec(format || '');
  const marks = [];
  if (legacy) {
    const [, size, flags] = legacy;
    if (flags.includes('b')) marks.push({ type: 'bold' });
    if (flags.includes('i')) marks.push({ type: 'italic' });
    if (flags.includes('u')) marks.push({ type: 'underline' });
    if (size !== 'normal') marks.push({ type: 'textStyle', attrs: { fontSize: postFontSizes[size] } });
  }
  return plainPostDocument(content, marks);
}

export function serializePostFormat(doc) {
  const formatted = doc.content?.some(node => node.type !== 'paragraph' || node.content?.some(child => child.marks?.length));
  return formatted ? JSON.stringify(doc) : '';
}
