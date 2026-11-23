const textOf = node => (node?.textContent || '').normalize('NFC');

function inlineText(node, bold = false) {
  if (node.nodeType === Node.TEXT_NODE) return [bold ? { text: textOf(node), bold: true } : textOf(node)];
  return [...node.childNodes].flatMap(child => inlineText(child, bold || node.nodeName === 'STRONG'));
}

function signatureBlock(section) {
  return {
    columns: [...section.children].map(side => {
      const drawing = side.querySelector('.rc-sig-image');
      const typed = side.querySelector('.rc-sig-typed');
      const signedAt = side.querySelector('.rc-sig-date');
      return {
        width: '*',
        alignment: 'center',
        stack: [
          { text: textOf(side.querySelector('strong')), bold: true },
          { text: textOf(side.querySelector('span')), italics: true },
          ...(drawing ? [{ svg: drawing.outerHTML, width: 120, margin: [0, 4, 0, 0] }] : []),
          ...(typed ? [{ text: textOf(typed), italics: true, fontSize: 16, margin: [0, 11, 0, 9] }] : []),
          { text: textOf(side.querySelector('.rc-sig-name')), bold: true, margin: [0, signedAt ? 3 : 42, 0, 0] },
          ...(signedAt ? [{ text: textOf(signedAt), fontSize: 9, margin: [0, 4, 0, 0] }] : []),
        ],
      };
    }),
    columnGap: 20,
    margin: [0, 24, 0, 0],
    unbreakable: true,
  };
}

function documentBlocks(element) {
  if (element.classList.contains('rc-paper-signatures')) return [signatureBlock(element)];
  if (element.tagName === 'HEADER') {
    return [{
      stack: [...element.children].filter(child => textOf(child).trim()).map(child => {
        const title = child.tagName === 'H3';
        const date = child.classList.contains('rc-house-date');
        return {
          text: textOf(child).trim(),
          alignment: date ? 'right' : 'center',
          fontSize: title ? 17 : 11,
          bold: !date,
          italics: date,
          margin: [0, title || date ? 8 : 0, 0, 4],
        };
      }),
      margin: [0, 0, 0, 13],
      unbreakable: true,
    }];
  }
  if (element.tagName === 'H4' || element.tagName === 'H5') {
    return [{ text: textOf(element), headlineLevel: 1, bold: true, margin: [0, 10, 0, 4] }];
  }
  if (element.tagName === 'PRE') {
    return [{ text: textOf(element), preserveLeadingSpaces: true, margin: [0, 1, 0, 6] }];
  }
  if (element.tagName === 'P') {
    const rows = element.closest('.rc-official-fields') ? [...element.children] : [element];
    const subheading = element.classList.contains('rc-official-subhead');
    return rows.map(row => ({
      text: inlineText(row),
      ...(subheading && { bold: true, headlineLevel: 1 }),
      italics: element.classList.contains('is-italic'),
      margin: [0, 0, 0, 4],
    }));
  }
  return [...element.children].flatMap(documentBlocks);
}

let pdfEngine;
function loadPdfEngine() {
  pdfEngine ??= Promise.all([
    import('pdfmake/build/pdfmake.js'),
    import('pdfmake/build/vfs_fonts.js'),
  ]).then(([{ default: pdfMake }, { default: fonts }]) => {
    pdfMake.addVirtualFileSystem(fonts);
    return pdfMake;
  }).catch(error => {
    pdfEngine = undefined;
    throw error;
  });
  return pdfEngine;
}

export async function downloadContractPdf(article, roomNumber) {
  if (!article) throw new Error('Chưa có nội dung hợp đồng.');
  const content = documentBlocks(article);
  const title = textOf(article.querySelector('h3')) || 'Hợp đồng thuê phòng';
  const filename = `Hop-dong-phong-${(roomNumber || 'phong').replace(/[^\p{L}\p{N}._-]/gu, '_')}.pdf`;
  const pdfMake = await loadPdfEngine();
  await pdfMake.createPdf({
    content,
    info: { title },
    pageSize: 'A4',
    pageMargins: [50, 48, 50, 48],
    defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.2, color: '#111827' },
    footer: (page, total) => ({
      text: `Trang ${page}/${total}`, alignment: 'center', fontSize: 9, color: '#475569', margin: [0, 12, 0, 0],
    }),
    pageBreakBefore: (node, layout) => node.headlineLevel === 1 && !layout.getFollowingNodesOnPage().length,
  }).download(filename);
}
