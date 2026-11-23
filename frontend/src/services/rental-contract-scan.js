export const SCAN_LIMITS={
  maxFiles:5,
  maxFileBytes:5*1024*1024,
  maxTotalBytes:10*1024*1024,
  maxTotalPages:20,
  allowedTypes:['image/jpeg','image/png','application/pdf'],
};

export const SCAN_STEPS=[
  {id:1,key:'select',label:'Chọn tệp'},
  {id:2,key:'verify',label:'Đối chiếu'},
  {id:3,key:'apply',label:'Áp dụng'},
];

export const PAGE_STATUS_META={
  readable:{label:'Đọc rõ',tone:'ok'},
  needs_review:{label:'Cần đối chiếu',tone:'warn'},
  blank:{label:'Trang trống',tone:'muted'},
  unreadable:{label:'Không đọc được',tone:'error'},
};

const UNCERTAIN_MARKER_RE=/⟦KHÔNG ĐỌC RÕ:([^⟧]+)⟧/g;

export function formatFileSize(bytes){
  if(!Number.isFinite(bytes)||bytes<=0)return '0 KB';
  if(bytes>=1024*1024)return `${(bytes/(1024*1024)).toFixed(2).replace('.',',')} MB`;
  return `${Math.max(1,Math.round(bytes/1024))} KB`;
}

export function validateScanQueue(files){
  if(!Array.isArray(files)||files.length===0){
    return 'Chọn từ 1 đến 5 ảnh JPG/PNG hoặc PDF theo đúng thứ tự trang.';
  }
  if(files.length>SCAN_LIMITS.maxFiles){
    return `Chỉ hỗ trợ tối đa ${SCAN_LIMITS.maxFiles} tệp (đang có ${files.length} tệp). Vui lòng gỡ bớt tệp thay vì bỏ bớt tự động.`;
  }
  for(const f of files){
    if(!SCAN_LIMITS.allowedTypes.includes(f.type)){
      return `Tệp "${f.name}" không đúng định dạng. Chỉ hỗ trợ JPG, PNG hoặc PDF.`;
    }
    if(!f.size||f.size>SCAN_LIMITS.maxFileBytes){
      return `Tệp "${f.name}" vượt quá giới hạn 5 MB mỗi tệp (${formatFileSize(f.size)}).`;
    }
  }
  const total=files.reduce((sum,f)=>sum+f.size,0);
  if(total>SCAN_LIMITS.maxTotalBytes){
    return `Tổng dung lượng ${formatFileSize(total)} vượt quá giới hạn 10 MB. Vui lòng gỡ bớt hoặc giảm dung lượng tệp.`;
  }
  return '';
}

/**
 * Adds newly chosen/dropped files to the queue without ever silently dropping files when limits are exceeded.
 */
export function mergeFileQueue(existingFiles,incomingFiles){
  const current=Array.isArray(existingFiles)?existingFiles:[];
  const incoming=Array.isArray(incomingFiles)?incomingFiles:[];
  if(!incoming.length)return {files:current,error:''};
  const combined=[...current,...incoming];
  const error=validateScanQueue(combined);
  if(error){
    return {files:current,error};
  }
  return {files:combined,error:''};
}

export function moveFileInQueue(files,index,delta){
  const target=index+delta;
  if(index<0||target<0||index>=files.length||target>=files.length)return files;
  const next=[...files];
  const [moved]=next.splice(index,1);
  next.splice(target,0,moved);
  return next;
}

export function removeFileFromQueue(files,index){
  if(index<0||index>=files.length)return files;
  return files.filter((_,i)=>i!==index);
}

export function hasUncertainMarker(text,code){
  if(typeof text!=='string'||!code)return false;
  return text.includes(`⟦KHÔNG ĐỌC RÕ:${code}⟧`);
}

export function listPresentUncertainCodes(text){
  if(typeof text!=='string'||!text)return [];
  const found=[];
  let match;
  const re=new RegExp(UNCERTAIN_MARKER_RE.source,'g');
  while((match=re.exec(text))!==null){
    const code=(match[1]||'').trim();
    if(code&&!found.includes(code))found.push(code);
  }
  return found;
}

export function createPageState(apiPage){
  const text=typeof apiPage.text==='string'?apiPage.text:'';
  const spans=Array.isArray(apiPage.uncertainSpans)?apiPage.uncertainSpans:[];
  return {
    pageId:apiPage.pageId,
    fileId:apiPage.fileId||'',
    fileIndex:Number.isInteger(apiPage.fileIndex)?apiPage.fileIndex:0,
    fileName:apiPage.fileName||'',
    sourcePageIndex:Number.isInteger(apiPage.sourcePageIndex)?apiPage.sourcePageIndex:1,
    pageNumber:Number.isInteger(apiPage.pageNumber)?apiPage.pageNumber:1,
    totalPages:Number.isInteger(apiPage.totalPages)?apiPage.totalPages:1,
    extractionMethod:apiPage.extractionMethod||'GEMINI_OCR',
    pageStatus:apiPage.pageStatus||'readable',
    originalText:text,
    editedText:text,
    uncertainSpans:spans.map(span=>({
      code:span.code,
      line:span.line||1,
      reason:span.reason||'Ký tự chưa đọc rõ',
      resolved:false,
    })),
    reviewReminders:Array.isArray(apiPage.reviewReminders)?apiPage.reviewReminders:[],
    previewDataUrl:apiPage.previewDataUrl||'',
    error:apiPage.error||'',
    confirmed:false,
    rescanning:false,
  };
}

/**
 * Updates user-edited text for a single page without mutating originalText.
 * Always revokes page confirmation on edit.
 * NEVER auto-resolves uncertain spans simply because the user deleted marker text!
 */
export function updatePageText(page,nextText){
  const safeText=typeof nextText==='string'?nextText:'';
  const nextSpans=page.uncertainSpans.map(span=>({
    ...span,
    // If user re-introduces the marker, force unresolved; if they deleted it, keep current resolved state (do NOT auto-resolve!).
    resolved:hasUncertainMarker(safeText,span.code)?false:span.resolved,
  }));
  return {
    ...page,
    editedText:safeText,
    uncertainSpans:nextSpans,
    confirmed:false,
  };
}

/**
 * Explicit user resolution for a flagged uncertain span.
 * Blocks resolving while the marker placeholder is still present in editedText.
 */
export function resolveUncertainSpan(page,code){
  if(hasUncertainMarker(page.editedText,code)){
    return {
      page,
      error:`Vẫn còn ký hiệu ⟦KHÔNG ĐỌC RÕ:${code}⟧ trong văn bản. Hãy đối chiếu ảnh gốc và thay thế ký hiệu đó trước khi xác nhận đã xử lý.`,
    };
  }
  return {
    page:{
      ...page,
      uncertainSpans:page.uncertainSpans.map(span=>span.code===code?{...span,resolved:true}:span),
      confirmed:false,
    },
    error:'',
  };
}

export function canConfirmPage(page){
  if(!page)return {ok:false,reason:'Không tìm thấy trang.'};
  if(page.rescanning)return {ok:false,reason:'Trang đang được quét lại.'};
  if(page.error||page.pageStatus==='unreadable'){
    return {ok:false,reason:'Trang đang lỗi hoặc không đọc được. Hãy quét lại hoặc thay ảnh rõ hơn cho trang này.'};
  }
  const unresolvedSpans=page.uncertainSpans.filter(span=>!span.resolved);
  if(unresolvedSpans.length>0){
    return {
      ok:false,
      reason:`Còn ${unresolvedSpans.length} vị trí chưa đọc rõ cần xử lý và đánh dấu đã đối chiếu (${unresolvedSpans.map(s=>s.code).join(', ')}).`,
    };
  }
  const remainingMarkers=listPresentUncertainCodes(page.editedText);
  if(remainingMarkers.length>0){
    return {
      ok:false,
      reason:`Văn bản vẫn còn ký hiệu chưa thay thế: ${remainingMarkers.join(', ')}.`,
    };
  }
  return {ok:true,reason:''};
}

export function setPageConfirmed(page,confirmed){
  if(!confirmed)return {page:{...page,confirmed:false},error:''};
  const check=canConfirmPage(page);
  if(!check.ok)return {page,error:check.reason};
  return {page:{...page,confirmed:true},error:''};
}

/**
 * Replaces ONLY the matching page after single-page rescan or image replacement,
 * leaving every other page's editedText, span resolutions, and confirmation intact.
 */
export function replaceSinglePage(pages,pageId,freshApiPage){
  return pages.map(page=>{
    if(page.pageId!==pageId)return page;
    return createPageState({
      ...freshApiPage,
      pageId:page.pageId,
      fileId:page.fileId,
      fileIndex:page.fileIndex,
      pageNumber:page.pageNumber,
      totalPages:page.totalPages,
    });
  });
}

export function buildFullTranscript(pages){
  return [...pages]
    .sort((a,b)=>a.pageNumber-b.pageNumber)
    .filter(p=>p.pageStatus!=='blank'&&p.editedText.length>0)
    .map(p=>p.editedText)
    .join('\n\n');
}

/**
 * Extracts original paragraphs per non-blank page for selective application without altering any character.
 */
export function extractSelectableSegments(pages){
  const segments=[];
  const ordered=[...pages].sort((a,b)=>a.pageNumber-b.pageNumber);
  for(const page of ordered){
    if(page.pageStatus==='blank'||!page.editedText.length)continue;
    const parts=page.editedText.split(/\n{2,}/);
    parts.forEach((part,idx)=>{
      if(!part.length)return;
      segments.push({
        id:`${page.pageId}-S${idx+1}`,
        pageId:page.pageId,
        pageNumber:page.pageNumber,
        fileName:page.fileName,
        text:part,
      });
    });
  }
  return segments;
}

export function assembleSelectedSegments(segments,selectedIds){
  const allowed=selectedIds instanceof Set?selectedIds:new Set(selectedIds);
  return segments
    .filter(seg=>allowed.has(seg.id))
    .map(seg=>seg.text)
    .join('\n\n');
}

export function findLineSelectionRange(text,oneBasedLine,token=''){
  if(typeof text!=='string'||!text.length)return {start:0,end:0};
  if(token){
    const tokenIdx=text.indexOf(token);
    if(tokenIdx>=0)return {start:tokenIdx,end:tokenIdx+token.length};
  }
  const lines=text.split('\n');
  const clamped=Math.max(1,Math.min(lines.length,Number(oneBasedLine)||1));
  let offset=0;
  for(let i=0;i<clamped-1;i++){
    offset+=lines[i].length+1;
  }
  return {start:offset,end:offset+lines[clamped-1].length};
}
