import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assembleSelectedSegments,
  buildFullTranscript,
  canConfirmPage,
  createPageState,
  extractSelectableSegments,
  findLineSelectionRange,
  mergeFileQueue,
  moveFileInQueue,
  removeFileFromQueue,
  replaceSinglePage,
  resolveUncertainSpan,
  setPageConfirmed,
  updatePageText,
} from '../src/services/rental-contract-scan.js';

const mockFile=(name,type,size)=>({name,type,size});

test('file queue enforces 5 files, 5 MB/file, 10 MB total without ever silently dropping files',()=>{
  const a=mockFile('p1.pdf','application/pdf',2*1024*1024);
  const b=mockFile('p2.png','image/png',3*1024*1024);
  let res=mergeFileQueue([],[a,b]);
  assert.equal(res.error,'');
  assert.equal(res.files.length,2);

  // Reorder & remove work deterministically
  const reordered=moveFileInQueue(res.files,1,-1);
  assert.deepEqual(reordered.map(f=>f.name),['p2.png','p1.pdf']);
  assert.equal(removeFileFromQueue(reordered,0).length,1);

  // Exceeding 5 MB per file rejects without mutating queue
  const tooBig=mockFile('big.png','image/png',5*1024*1024+1);
  const errBig=mergeFileQueue(res.files,[tooBig]);
  assert.ok(errBig.error.includes('5 MB'));
  assert.equal(errBig.files.length,2);

  // Exceeding 10 MB total rejects without dropping earlier files
  const overTotal=[mockFile('c.png','image/png',4*1024*1024),mockFile('d.png','image/png',2*1024*1024)];
  const errTotal=mergeFileQueue(res.files,overTotal);
  assert.ok(errTotal.error.includes('10 MB'));
  assert.equal(errTotal.files.length,2);

  // Exceeding 5 files rejects without silently slicing
  const fourMore=[1,2,3,4].map(i=>mockFile(`f${i}.jpg`,'image/jpeg',100_000));
  const errCount=mergeFileQueue(res.files,fourMore);
  assert.ok(errCount.error.includes('5 tệp'));
  assert.equal(errCount.files.length,2);
});

test('verbatim OCR text preserves exact tokens, separates originalText/editedText, blocks clearing warnings by deleting marker only, and unconfirms on edit',()=>{
  const golden=[
    'HỢP ĐỒNG PHÒNG P.102 — Mã 0008.',
    'Ngày lập: 01/12/2026.',
    'Tiền thuê: 2.200.000 đ | Tiền cọc: 2,200,000 đ.',
    'Bảng: Điện | 3.800 đ/kWh | Nước | ⟦KHÔNG ĐỌC RÕ:U1⟧ đ/người.',
  ].join('\n');

  let page=createPageState({
    pageId:'F1-P1',
    fileId:'F1',
    fileIndex:0,
    fileName:'hop-dong.pdf',
    sourcePageIndex:1,
    pageNumber:1,
    totalPages:2,
    extractionMethod:'GEMINI_OCR',
    pageStatus:'needs_review',
    text:golden,
    uncertainSpans:[{code:'U1',line:4,reason:'Số bị mờ'}],
    reviewReminders:[{id:'R1',category:'money',label:'Số tiền',line:3,value:'2.200.000 đ'}],
  });

  // Cannot confirm while uncertain span is unresolved
  assert.equal(canConfirmPage(page).ok,false);
  assert.equal(resolveUncertainSpan(page,'U1').error.includes('⟦KHÔNG ĐỌC RÕ:U1⟧'),true);

  // Merely deleting the marker in editedText MUST NOT auto-clear the warning!
  const fixedText=golden.replace('⟦KHÔNG ĐỌC RÕ:U1⟧','100.000');
  page=updatePageText(page,fixedText);
  assert.equal(page.originalText,golden); // Original OCR text remains immutable
  assert.equal(page.editedText,fixedText);
  assert.equal(page.uncertainSpans[0].resolved,false);
  assert.equal(canConfirmPage(page).ok,false);

  // Explicit resolution succeeds after marker is replaced
  const resolved=resolveUncertainSpan(page,'U1');
  assert.equal(resolved.error,'');
  page=resolved.page;
  assert.equal(page.uncertainSpans[0].resolved,true);
  assert.equal(canConfirmPage(page).ok,true);

  // Confirming page succeeds
  const confirmed=setPageConfirmed(page,true);
  assert.equal(confirmed.error,'');
  page=confirmed.page;
  assert.equal(page.confirmed,true);

  // Editing text again revokes confirmation immediately while keeping exact tokens
  page=updatePageText(page,page.editedText+'\nGhi chú: 0008.');
  assert.equal(page.confirmed,false);
  assert.ok(page.editedText.includes('2.200.000'));
  assert.ok(page.editedText.includes('2,200,000'));
  assert.ok(page.editedText.includes('0008.'));
  assert.ok(page.editedText.includes('01/12/2026.'));
  assert.ok(page.editedText.includes('P.102'));
});

test('distinguishes genuine blank page from unreadable page and preserves other edited/confirmed pages on single-page rescan',()=>{
  const p1=setPageConfirmed(
    updatePageText(
      createPageState({pageId:'F1-P1',pageNumber:1,totalPages:3,pageStatus:'readable',text:'Trang 1: P.102 giá 2.200.000 đ.'}),
      'Trang 1 (đã sửa): P.102 giá 2.200.000 đ và 2,200,000 đ.'
    ),
    true
  ).page;
  const p2=createPageState({pageId:'F1-P2',pageNumber:2,totalPages:3,pageStatus:'blank',text:''});
  const p3=createPageState({pageId:'F1-P3',pageNumber:3,totalPages:3,pageStatus:'unreadable',text:'',error:'Ảnh mờ không đọc được'});

  // Blank page can be confirmed, unreadable page CANNOT be confirmed
  assert.equal(canConfirmPage(p2).ok,true);
  assert.equal(canConfirmPage(p3).ok,false);

  // Rescanning ONLY page 3 leaves page 1's edits & confirmation untouched!
  const updated=replaceSinglePage([p1,p2,p3],'F1-P3',{
    pageId:'F1-P3',pageNumber:3,totalPages:3,pageStatus:'readable',
    text:'Trang 3 sau quét lại: mã 0008 ngày 01/12/2026.',
    uncertainSpans:[],
  });
  assert.equal(updated[0].confirmed,true);
  assert.equal(updated[0].editedText,'Trang 1 (đã sửa): P.102 giá 2.200.000 đ và 2,200,000 đ.');
  assert.equal(updated[1].pageStatus,'blank');
  assert.equal(updated[2].pageStatus,'readable');
  assert.equal(updated[2].editedText,'Trang 3 sau quét lại: mã 0008 ngày 01/12/2026.');
  assert.equal(updated[2].confirmed,false);

  // Full transcript skips blank page without dropping non-blank pages or altering punctuation
  const full=buildFullTranscript(updated);
  assert.equal(full,'Trang 1 (đã sửa): P.102 giá 2.200.000 đ và 2,200,000 đ.\n\nTrang 3 sau quét lại: mã 0008 ngày 01/12/2026.');

  // Selective segment extraction preserves exact characters
  const segments=extractSelectableSegments(updated);
  assert.equal(segments.length,2);
  assert.equal(assembleSelectedSegments(segments,[segments[1].id]),'Trang 3 sau quét lại: mã 0008 ngày 01/12/2026.');

  // Line/token jump finds exact offsets
  const range=findLineSelectionRange(full,1,'2,200,000');
  assert.equal(full.slice(range.start,range.end),'2,200,000');
});
