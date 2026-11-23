import {useEffect,useMemo,useRef,useState} from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Eye,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {MotionButton} from './motion/MotionUI.jsx';
import {rentalContractsApi} from '../services/rental-contracts.js';
import {
  PAGE_STATUS_META,
  SCAN_LIMITS,
  SCAN_STEPS,
  assembleSelectedSegments,
  buildFullTranscript,
  canConfirmPage,
  createPageState,
  extractSelectableSegments,
  findLineSelectionRange,
  formatFileSize,
  hasUncertainMarker,
  mergeFileQueue,
  moveFileInQueue,
  removeFileFromQueue,
  replaceSinglePage,
  resolveUncertainSpan,
  setPageConfirmed,
  updatePageText,
  validateScanQueue,
} from '../services/rental-contract-scan.js';

export default function RentalContractScanPanel({
  roomId,
  roomNumber,
  currentTerms='',
  scanAvailable=false,
  session,
  onSessionChange,
  onApply,
  onWorkingChange,
  onVerifyActiveChange,
}){
  const [dragging,setDragging]=useState(false);
  const [queueError,setQueueError]=useState('');
  const [scanError,setScanError]=useState('');
  const [progress,setProgress]=useState(null); // { phase, current, total, label }
  const [zoom,setZoom]=useState(100);
  const [mobilePane,setMobilePane]=useState('image'); // 'image' | 'text'
  const [showOriginalOcr,setShowOriginalOcr]=useState(false);
  const [spanError,setSpanError]=useState('');
  const [confirmError,setConfirmError]=useState('');
  const [pendingRescanId,setPendingRescanId]=useState(null);
  const [applyMode,setApplyMode]=useState('all'); // 'all' | 'segments'
  const [selectedSegIds,setSelectedSegIds]=useState(null);
  const [confirmOverwrite,setConfirmOverwrite]=useState(false);

  const fileInputRef=useRef(null);
  const replaceInputRef=useRef(null);
  const textareaRef=useRef(null);
  const abortRef=useRef(null);

  const scanStep=session?.step||1;
  const files=session?.files||[];
  const consent=Boolean(session?.consent);
  const pages=session?.pages||[];
  const activePageId=session?.activePageId||(pages[0]?.pageId||null);

  const activePage=useMemo(
    ()=>pages.find(p=>p.pageId===activePageId)||pages[0]||null,
    [pages,activePageId]
  );

  const busy=Boolean(progress)||pages.some(p=>p.rescanning);
  const totalBytes=useMemo(()=>files.reduce((sum,f)=>sum+f.size,0),[files]);
  const confirmedCount=useMemo(()=>pages.filter(p=>p.confirmed).length,[pages]);
  const allPagesConfirmed=pages.length>0&&confirmedCount===pages.length;

  const fullTranscript=useMemo(()=>buildFullTranscript(pages),[pages]);
  const segments=useMemo(()=>extractSelectableSegments(pages),[pages]);

  useEffect(()=>{
    onVerifyActiveChange?.(scanStep===2&&pages.length>0);
    return()=>onVerifyActiveChange?.(false);
  },[scanStep,pages.length,onVerifyActiveChange]);

  useEffect(()=>()=>{
    abortRef.current?.abort();
  },[]);

  useEffect(()=>{
    setSpanError('');
    setConfirmError('');
    setShowOriginalOcr(false);
    setPendingRescanId(null);
  },[activePageId]);

  useEffect(()=>{
    if(scanStep===3&&segments.length>0){
      setSelectedSegIds(prev=>{
        if(prev&&prev.size>0){
          const valid=new Set([...prev].filter(id=>segments.some(s=>s.id===id)));
          if(valid.size>0)return valid;
        }
        return new Set(segments.map(s=>s.id));
      });
    }
  },[scanStep,segments]);

  const patchSession=patch=>{
    onSessionChange?.(prev=>({...prev,...patch}));
  };

  const handleIncomingFiles=incoming=>{
    const list=Array.from(incoming||[]);
    if(!list.length)return;
    const {files:nextFiles,error}=mergeFileQueue(files,list);
    setQueueError(error);
    if(!error){
      setScanError('');
      patchSession({files:nextFiles});
    }
  };

  const handleMoveFile=(index,delta)=>{
    setQueueError('');
    patchSession({files:moveFileInQueue(files,index,delta)});
  };

  const handleRemoveFile=index=>{
    setQueueError('');
    patchSession({files:removeFileFromQueue(files,index)});
  };

  const startScan=async()=>{
    const invalid=validateScanQueue(files);
    if(invalid){setQueueError(invalid);return;}
    if(!consent){
      setScanError('Vui lòng đánh dấu đồng ý gửi tài liệu tới Gemini trước khi bắt đầu quét.');
      return;
    }
    const controller=new AbortController();
    abortRef.current=controller;
    setQueueError('');
    setScanError('');
    setConfirmOverwrite(false);
    onWorkingChange?.(true);
    setProgress({phase:'inspect',current:0,total:0,label:'Đang kiểm tra tệp và xác định số trang trên máy chủ…'});

    try{
      const manifest=await rentalContractsApi.inspectScan(roomId,files,controller.signal);
      if(controller.signal.aborted)return;

      const scannedPages=[];
      let fatalError='';

      for(let i=0;i<manifest.pages.length;i++){
        if(controller.signal.aborted)return;
        const meta=manifest.pages[i];
        setProgress({
          phase:'ocr',
          current:i+1,
          total:manifest.totalPages,
          label:`Đang xử lý trang ${i+1} / ${manifest.totalPages} — ${meta.fileName} (Trang ${meta.sourcePageIndex})`,
        });

        const sourceFile=files[meta.fileIndex];
        try{
          const pageRes=await rentalContractsApi.scanPage(roomId,meta,sourceFile,controller.signal);
          if(controller.signal.aborted)return;
          scannedPages.push(createPageState(pageRes));
        }catch(err){
          if(controller.signal.aborted)return;
          if(err.status===401||err.status===403||err.status===429||err.status===503){
            fatalError=err.message;
            break;
          }
          scannedPages.push(createPageState({
            ...meta,
            extractionMethod:'GEMINI_OCR',
            pageStatus:'unreadable',
            text:'',
            uncertainSpans:[],
            reviewReminders:[],
            error:err.message||'Chưa đọc được trang này. Vui lòng quét lại hoặc thay ảnh rõ hơn.',
          }));
        }
      }

      if(fatalError&&scannedPages.length===0){
        setScanError(fatalError);
        return;
      }

      // Preserve any remaining unreached pages as unreadable if aborted midway by a fatal rate limit
      for(let j=scannedPages.length;j<manifest.pages.length;j++){
        const meta=manifest.pages[j];
        scannedPages.push(createPageState({
          ...meta,
          extractionMethod:'GEMINI_OCR',
          pageStatus:'unreadable',
          text:'',
          uncertainSpans:[],
          reviewReminders:[],
          error:fatalError||'Trang chưa được quét do gián đoạn. Bấm Quét lại trang này.',
        }));
      }

      if(fatalError)setScanError(fatalError);
      patchSession({
        step:2,
        pages:scannedPages,
        activePageId:scannedPages[0]?.pageId||null,
      });
      setZoom(100);
      setMobilePane('image');
    }catch(err){
      if(!controller.signal.aborted){
        setScanError(err.message||'Không thể quét tài liệu lúc này. Nội dung đang nhập được giữ nguyên.');
      }
    }finally{
      if(abortRef.current===controller)abortRef.current=null;
      if(!controller.signal.aborted){
        setProgress(null);
        onWorkingChange?.(false);
      }
    }
  };

  const executeSinglePageScan=async(targetPage,replacementFile=null)=>{
    if(!targetPage)return;
    const fileToSend=replacementFile||files[targetPage.fileIndex];
    if(!fileToSend){
      setConfirmError('Không tìm thấy tệp gốc của trang này. Vui lòng chọn tệp thay thế.');
      return;
    }
    const sourcePageIndex=replacementFile?1:targetPage.sourcePageIndex;
    const controller=new AbortController();
    abortRef.current=controller;
    setConfirmError('');
    setSpanError('');
    setPendingRescanId(null);
    onWorkingChange?.(true);

    patchSession({
      pages:pages.map(p=>p.pageId===targetPage.pageId?{...p,rescanning:true}:p),
    });

    try{
      const fresh=await rentalContractsApi.scanPage(
        roomId,
        {
          pageId:targetPage.pageId,
          pageNumber:targetPage.pageNumber,
          totalPages:targetPage.totalPages,
          fileIndex:targetPage.fileIndex,
          sourcePageIndex,
        },
        fileToSend,
        controller.signal
      );
      if(controller.signal.aborted)return;
      onSessionChange?.(prev=>({
        ...prev,
        pages:replaceSinglePage(prev.pages||[],targetPage.pageId,fresh),
      }));
    }catch(err){
      if(controller.signal.aborted)return;
      onSessionChange?.(prev=>({
        ...prev,
        pages:(prev.pages||[]).map(p=>p.pageId===targetPage.pageId?{
          ...p,
          rescanning:false,
          error:err.message||'Chưa quét lại được trang này. Thử lại hoặc chọn ảnh rõ hơn.',
        }:p),
      }));
    }finally{
      if(abortRef.current===controller)abortRef.current=null;
      if(!controller.signal.aborted)onWorkingChange?.(false);
    }
  };

  const requestRescanActivePage=()=>{
    if(!activePage||busy)return;
    const wasModified=activePage.editedText!==activePage.originalText||activePage.confirmed;
    if(wasModified){
      setPendingRescanId(activePage.pageId);
      return;
    }
    executeSinglePageScan(activePage,null);
  };

  const handleReplacePageFile=event=>{
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file||!activePage)return;
    if(!SCAN_LIMITS.allowedTypes.includes(file.type)||!file.size||file.size>SCAN_LIMITS.maxFileBytes){
      setConfirmError('Tệp thay thế phải là ảnh JPG, PNG hoặc PDF và tối đa 5 MB.');
      return;
    }
    executeSinglePageScan(activePage,file);
  };

  const handleTextEdit=nextText=>{
    if(!activePage)return;
    setSpanError('');
    setConfirmError('');
    onSessionChange?.(prev=>({
      ...prev,
      pages:(prev.pages||[]).map(p=>p.pageId===activePage.pageId?updatePageText(p,nextText):p),
    }));
  };

  const handleRestoreOriginal=()=>{
    if(!activePage)return;
    handleTextEdit(activePage.originalText);
  };

  const handleResolveSpan=code=>{
    if(!activePage)return;
    const {page:updated,error}=resolveUncertainSpan(activePage,code);
    if(error){
      setSpanError(error);
      jumpToToken(activePage.uncertainSpans.find(s=>s.code===code)?.line||1,`⟦KHÔNG ĐỌC RÕ:${code}⟧`);
      return;
    }
    setSpanError('');
    setConfirmError('');
    onSessionChange?.(prev=>({
      ...prev,
      pages:(prev.pages||[]).map(p=>p.pageId===activePage.pageId?updated:p),
    }));
  };

  const handleToggleConfirmPage=checked=>{
    if(!activePage)return;
    const {page:updated,error}=setPageConfirmed(activePage,checked);
    if(error){
      setConfirmError(error);
      return;
    }
    setConfirmError('');
    onSessionChange?.(prev=>({
      ...prev,
      pages:(prev.pages||[]).map(p=>p.pageId===activePage.pageId?updated:p),
    }));
  };

  const jumpToToken=(line,token='')=>{
    if(!activePage)return;
    setMobilePane('text');
    requestAnimationFrame(()=>{
      const el=textareaRef.current;
      if(!el)return;
      const {start,end}=findLineSelectionRange(activePage.editedText,line,token);
      el.focus();
      el.setSelectionRange(start,end);
      const lineRatio=Math.max(0,(line-1)/Math.max(1,activePage.editedText.split('\n').length));
      el.scrollTop=Math.max(0,lineRatio*el.scrollHeight-el.clientHeight/3);
    });
  };

  const textToApply=useMemo(()=>{
    if(applyMode==='all')return fullTranscript;
    return assembleSelectedSegments(segments,selectedSegIds||new Set());
  },[applyMode,fullTranscript,segments,selectedSegIds]);

  const toggleSegment=id=>{
    setSelectedSegIds(prev=>{
      const next=new Set(prev||[]);
      if(next.has(id))next.delete(id);
      else next.add(id);
      return next;
    });
    setConfirmOverwrite(false);
  };

  const handleApplyClick=()=>{
    if(!textToApply.trim())return;
    if(currentTerms?.trim()&&!confirmOverwrite){
      setConfirmOverwrite(true);
      return;
    }
    const sourceName=files.map(f=>f.name).join(', ').slice(0,255);
    onApply?.({
      terms:textToApply,
      fullScannedTranscript:fullTranscript,
      sourceName,
      scanFullDocument:applyMode==='all',
    });
    setConfirmOverwrite(false);
  };

  const activeIndex=activePage?pages.findIndex(p=>p.pageId===activePage.pageId):-1;
  const activeConfirmCheck=activePage?canConfirmPage(activePage):{ok:false,reason:''};
  const activeStatusMeta=activePage?(PAGE_STATUS_META[activePage.pageStatus]||PAGE_STATUS_META.readable):null;

  return (
    <div className="rc-scan-flow">
      {/* SUB-STEPPER: Chọn tệp → Đối chiếu → Áp dụng */}
      <nav className="rc-scan-stepper" aria-label="Các bước quét mẫu hợp đồng">
        {SCAN_STEPS.map(item=>{
          const isActive=scanStep===item.id;
          const isComplete=(item.id===1&&pages.length>0)||(item.id===2&&allPagesConfirmed);
          const disabled=busy||(item.id===2&&pages.length===0)||(item.id===3&&!allPagesConfirmed);
          return (
            <button
              key={item.id}
              type="button"
              className={`rc-scan-step-btn ${isActive?'is-active':''} ${isComplete?'is-complete':''}`}
              aria-current={isActive?'step':undefined}
              disabled={disabled}
              onClick={()=>{
                setConfirmOverwrite(false);
                patchSession({step:item.id});
              }}
            >
              <span className="rc-scan-step-num" aria-hidden="true">
                {isComplete&&!isActive?<Check size={12} strokeWidth={2.5}/>:item.id}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* BƯỚC 1: CHỌN TỆP */}
      {scanStep===1&&(
        <div className="rc-scan-stage">
          <div
            className={`rc-dropzone ${dragging?'is-dragging':''}`}
            onDragOver={e=>{e.preventDefault();if(!busy)setDragging(true);}}
            onDragLeave={()=>setDragging(false)}
            onDrop={e=>{
              e.preventDefault();
              setDragging(false);
              if(!busy)handleIncomingFiles(e.dataTransfer?.files);
            }}
          >
            <Upload size={22} className="rc-dropzone-icon" aria-hidden="true"/>
            <div className="rc-dropzone-copy">
              <strong>Kéo thả ảnh hoặc PDF hợp đồng vào đây</strong>
              <p>Hỗ trợ JPG, PNG, PDF. Tối đa 5 tệp, mỗi tệp 5 MB, tổng 10 MB (tối đa 20 trang). Không bỏ bớt tệp tự động khi vượt giới hạn.</p>
            </div>
            <input
              ref={fileInputRef}
              id={`contract-files-${roomId}`}
              className="rm-sr-only"
              type="file"
              multiple
              disabled={busy}
              accept="image/jpeg,image/png,application/pdf"
              onChange={e=>{
                handleIncomingFiles(e.target.files);
                e.target.value='';
              }}
            />
            <MotionButton
              type="button"
              className="p-button"
              disabled={busy}
              onClick={()=>fileInputRef.current?.click()}
            >
              <Upload size={15} aria-hidden="true"/>
              <span>Chọn ảnh hoặc PDF</span>
            </MotionButton>
          </div>

          <div className="rc-queue-meta">
            <span>Số tệp: <strong>{files.length} / {SCAN_LIMITS.maxFiles}</strong></span>
            <span>Tổng dung lượng: <strong>{formatFileSize(totalBytes)} / 10 MB</strong></span>
          </div>

          {queueError&&<p className="rc-error" role="alert">{queueError}</p>}

          {files.length>0&&(
            <ul className="rc-queue-list" aria-label="Danh sách tệp theo thứ tự xử lý">
              {files.map((file,idx)=>(
                <li key={`${file.name}-${file.size}-${idx}`} className="rc-queue-item">
                  <span className="rc-queue-order" aria-label={`Thứ tự ${idx+1}`}>{idx+1}</span>
                  <div className="rc-queue-info">
                    <strong>{file.name}</strong>
                    <small>{file.type==='application/pdf'?'PDF':'Ảnh'} · {formatFileSize(file.size)}</small>
                  </div>
                  <div className="rc-queue-actions">
                    <button
                      type="button"
                      className="rc-icon-btn"
                      title="Đưa lên trước"
                      aria-label={`Đưa tệp ${file.name} lên trước`}
                      disabled={busy||idx===0}
                      onClick={()=>handleMoveFile(idx,-1)}
                    >
                      <ArrowUp size={14}/>
                    </button>
                    <button
                      type="button"
                      className="rc-icon-btn"
                      title="Đưa xuống sau"
                      aria-label={`Đưa tệp ${file.name} xuống sau`}
                      disabled={busy||idx===files.length-1}
                      onClick={()=>handleMoveFile(idx,1)}
                    >
                      <ArrowDown size={14}/>
                    </button>
                    <button
                      type="button"
                      className="rc-icon-btn is-danger"
                      title="Gỡ tệp"
                      aria-label={`Gỡ tệp ${file.name}`}
                      disabled={busy}
                      onClick={()=>handleRemoveFile(idx)}
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <label className="rc-checkbox rc-consent-box">
            <input
              id={`contract-scan-consent-${roomId}`}
              type="checkbox"
              checked={consent}
              disabled={busy}
              onChange={e=>{
                setScanError('');
                patchSession({consent:e.target.checked});
              }}
            />
            <span>
              Tôi đồng ý gửi các tệp đã chọn tới Gemini để chép nguyên văn nội dung hợp đồng.
              <small className="rc-consent-sub">Tài liệu chỉ gửi sau khi bạn bấm quét. Hệ thống không tự gửi khi vừa chọn tệp và không lưu nội dung vào log.</small>
            </span>
          </label>

          {!scanAvailable&&(
            <p className="rc-hint" role="status">
              Lưu ý: Máy chủ chưa cấu hình khóa OCR Gemini (các trang PDF có lớp chữ chuẩn vẫn trích trực tiếp được; ảnh chụp/PDF scan cần cấu hình Gemini).
            </p>
          )}

          {progress&&(
            <div className="rc-scan-progress" role="status" aria-live="polite">
              <div className="rc-scan-progress-top">
                <LoaderCircle size={15} className="spin" aria-hidden="true"/>
                <span>{progress.label}</span>
              </div>
              {progress.total>0&&(
                <div className="rc-progress-track" aria-hidden="true">
                  <div
                    className="rc-progress-fill"
                    style={{width:`${Math.round((progress.current/progress.total)*100)}%`}}
                  />
                </div>
              )}
            </div>
          )}

          {scanError&&<p className="rc-error" role="alert">{scanError}</p>}

          <div className="rc-scan-stage-actions">
            <MotionButton
              type="button"
              className="p-button primary"
              disabled={busy||!files.length||!consent}
              onClick={startScan}
            >
              {busy?<LoaderCircle size={15} className="spin"/>:<ScanLine size={15}/>}
              <span>{busy?'Đang quét từng trang…':'Quét và chép nguyên văn'}</span>
            </MotionButton>
            {pages.length>0&&!busy&&(
              <MotionButton
                type="button"
                className="p-button"
                onClick={()=>patchSession({step:2})}
              >
                Quay lại đối chiếu ({confirmedCount}/{pages.length} trang)
              </MotionButton>
            )}
          </div>
        </div>
      )}

      {/* BƯỚC 2: ĐỐI CHIẾU TỪNG TRANG */}
      {scanStep===2&&activePage&&(
        <div className="rc-scan-stage">
          <div className="rc-verify-topbar">
            <div className="rc-verify-progress-summary">
              <strong>Đối chiếu theo từng trang</strong>
              <span className="rc-pill is-room">Đã xác nhận {confirmedCount} / {pages.length} trang</span>
            </div>
            <div className="rc-page-tabs" role="tablist" aria-label="Danh sách trang đã quét">
              {pages.map(p=>{
                const active=p.pageId===activePage.pageId;
                const unresolvedCount=p.uncertainSpans.filter(s=>!s.resolved).length;
                const tone=p.confirmed?'is-done':(p.error||p.pageStatus==='unreadable')?'is-err':unresolvedCount>0?'is-warn':p.pageStatus==='blank'?'is-blank':'';
                return (
                  <button
                    key={p.pageId}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`rc-page-tab ${active?'is-active':''} ${tone}`}
                    onClick={()=>patchSession({activePageId:p.pageId})}
                  >
                    <span>Trang {p.pageNumber}</span>
                    {p.confirmed&&<Check size={12} aria-hidden="true"/>}
                    {!p.confirmed&&(p.error||p.pageStatus==='unreadable')&&<AlertTriangle size={12} aria-hidden="true"/>}
                    {!p.confirmed&&unresolvedCount>0&&<span className="rc-mini-badge">{unresolvedCount}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile pane switcher: keeps activePageId unchanged */}
          <div className="rc-mobile-pane-switch" role="group" aria-label="Chế độ xem trên di động">
            <button
              type="button"
              aria-pressed={mobilePane==='image'}
              onClick={()=>setMobilePane('image')}
            >
              <ImageIcon size={14} aria-hidden="true"/> Ảnh gốc (Trang {activePage.pageNumber}/{pages.length})
            </button>
            <button
              type="button"
              aria-pressed={mobilePane==='text'}
              onClick={()=>setMobilePane('text')}
            >
              <FileText size={14} aria-hidden="true"/> Văn bản (Trang {activePage.pageNumber}/{pages.length})
            </button>
          </div>

          <div className={`rc-verify-split is-mobile-${mobilePane}`}>
            {/* LEFT: TRANG GỐC */}
            <section className="rc-verify-pane rc-origin-pane" aria-label={`Trang gốc ${activePage.pageNumber} trên ${pages.length}`}>
              <header className="rc-verify-pane-head">
                <div>
                  <strong>Trang gốc · Trang {activePage.pageNumber} / {pages.length}</strong>
                  <small>{activePage.fileName} (Trang nguồn {activePage.sourcePageIndex})</small>
                </div>
                <div className="rc-zoom-controls" aria-label="Phóng to thu nhỏ trang gốc">
                  <button type="button" className="rc-icon-btn" title="Thu nhỏ" aria-label="Thu nhỏ" disabled={zoom<=75} onClick={()=>setZoom(z=>Math.max(75,z-25))}>
                    <ZoomOut size={14}/>
                  </button>
                  <span className="rc-zoom-val">{zoom}%</span>
                  <button type="button" className="rc-icon-btn" title="Phóng to" aria-label="Phóng to" disabled={zoom>=225} onClick={()=>setZoom(z=>Math.min(225,z+25))}>
                    <ZoomIn size={14}/>
                  </button>
                  {zoom!==100&&(
                    <button type="button" className="rc-icon-btn" title="Đặt lại 100%" aria-label="Đặt lại tỷ lệ 100%" onClick={()=>setZoom(100)}>
                      <RotateCcw size={13}/>
                    </button>
                  )}
                </div>
              </header>

              <div className="rc-origin-canvas">
                {activePage.previewDataUrl?(
                  <img
                    src={activePage.previewDataUrl}
                    alt={`Ảnh trang gốc ${activePage.pageNumber} của ${activePage.fileName}`}
                    style={{width:`${zoom}%`}}
                  />
                ):(
                  <p className="rc-hint">Chưa có ảnh xem trước cho trang này.</p>
                )}
              </div>

              <footer className="rc-origin-actions">
                <input
                  ref={replaceInputRef}
                  type="file"
                  className="rm-sr-only"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={handleReplacePageFile}
                />
                <MotionButton
                  type="button"
                  className="p-button rc-btn-compact"
                  disabled={busy}
                  onClick={requestRescanActivePage}
                >
                  {activePage.rescanning?<LoaderCircle size={14} className="spin"/>:<RefreshCw size={14}/>}
                  <span>Quét lại trang này</span>
                </MotionButton>
                <MotionButton
                  type="button"
                  className="p-button rc-btn-compact"
                  disabled={busy}
                  onClick={()=>replaceInputRef.current?.click()}
                >
                  <Upload size={14}/>
                  <span>Thay ảnh trang này</span>
                </MotionButton>
              </footer>

              {pendingRescanId===activePage.pageId&&(
                <div className="rc-inline-alert is-warning" role="alertdialog" aria-label="Xác nhận quét lại trang">
                  <div className="rc-inline-alert-copy">
                    <AlertTriangle size={15} aria-hidden="true"/>
                    <span>Trang {activePage.pageNumber} đã được chỉnh sửa hoặc xác nhận. Quét lại chỉ ghi đè trang này, các trang khác giữ nguyên.</span>
                  </div>
                  <div className="rc-inline-actions">
                    <MotionButton type="button" className="p-button rc-btn-compact" onClick={()=>setPendingRescanId(null)}>Hủy</MotionButton>
                    <MotionButton type="button" className="p-button primary rc-btn-compact" onClick={()=>executeSinglePageScan(activePage,null)}>Xác nhận quét lại</MotionButton>
                  </div>
                </div>
              )}
            </section>

            {/* RIGHT: BẢN CHÉP OCR */}
            <section className="rc-verify-pane rc-ocr-pane" aria-label={`Bản chép OCR Trang ${activePage.pageNumber} trên ${pages.length}`}>
              <header className="rc-verify-pane-head">
                <div>
                  <strong>Bản chép OCR · Trang {activePage.pageNumber} / {pages.length}</strong>
                  <div className="rc-ocr-badges">
                    <span className="rc-pill is-room">
                      {activePage.extractionMethod==='PDF_TEXT'?'Trích trực tiếp PDF':'OCR Gemini'}
                    </span>
                    {activeStatusMeta&&(
                      <span className={`rc-pill is-status-${activeStatusMeta.tone}`}>{activeStatusMeta.label}</span>
                    )}
                    <span className="rc-pill">{activePage.pageId}</span>
                  </div>
                </div>
                {activePage.editedText!==activePage.originalText&&(
                  <MotionButton
                    type="button"
                    className="p-button rc-btn-compact"
                    onClick={()=>setShowOriginalOcr(v=>!v)}
                  >
                    <Eye size={13}/>
                    <span>{showOriginalOcr?'Ẩn bản OCR gốc':'Xem bản OCR gốc'}</span>
                  </MotionButton>
                )}
              </header>

              {(activePage.error||activePage.pageStatus==='unreadable')&&(
                <div className="rc-inline-alert is-error" role="alert">
                  <div className="rc-inline-alert-copy">
                    <AlertTriangle size={16} aria-hidden="true"/>
                    <span>
                      <strong>Trang không đọc được / Lỗi OCR:</strong>{' '}
                      {activePage.error||'Ảnh bị cắt, lóa hoặc mờ đến mức không đọc được (không phải trang trống). Hãy quét lại hoặc thay ảnh rõ hơn cho riêng trang này.'}
                    </span>
                  </div>
                </div>
              )}

              {activePage.pageStatus==='blank'&&!activePage.error&&(
                <div className="rc-inline-alert" role="status">
                  <span><strong>Trang trống thật:</strong> Không phát hiện nội dung trên trang này. Nếu trang gốc thực ra có chữ, hãy dùng nút <strong>Thay ảnh trang này</strong>.</span>
                </div>
              )}

              {/* UNCERTAIN SPANS CHECKLIST */}
              {activePage.uncertainSpans.length>0&&(
                <div className="rc-span-box" aria-label="Danh sách vị trí cần đối chiếu">
                  <div className="rc-span-box-head">
                    <strong>Vị trí chưa đọc rõ ({activePage.uncertainSpans.filter(s=>!s.resolved).length} chưa xử lý)</strong>
                    <small>Sửa ký hiệu <code>⟦KHÔNG ĐỌC RÕ:...⟧</code> theo ảnh gốc rồi bấm xác nhận từng mục.</small>
                  </div>
                  <ul className="rc-span-list">
                    {activePage.uncertainSpans.map(span=>{
                      const markerStillPresent=hasUncertainMarker(activePage.editedText,span.code);
                      return (
                        <li key={span.code} className={`rc-span-item ${span.resolved?'is-resolved':''}`}>
                          <div className="rc-span-item-info">
                            <span className="rc-span-code">{span.code}</span>
                            <span>Dòng {span.line}: {span.reason}</span>
                          </div>
                          <div className="rc-span-item-actions">
                            <button
                              type="button"
                              className="rc-text-link"
                              onClick={()=>jumpToToken(span.line,`⟦KHÔNG ĐỌC RÕ:${span.code}⟧`)}
                            >
                              Nhảy tới dòng {span.line}
                            </button>
                            {span.resolved?(
                              <span className="rc-span-done"><Check size={13}/> Đã xử lý</span>
                            ):(
                              <MotionButton
                                type="button"
                                className="p-button rc-btn-compact"
                                onClick={()=>handleResolveSpan(span.code)}
                                title={markerStillPresent?'Thay ký hiệu trong ô văn bản trước khi đánh dấu đã xử lý':'Đánh dấu đã đối chiếu vị trí này'}
                              >
                                Đánh dấu đã xử lý
                              </MotionButton>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {spanError&&<p className="rc-error" role="alert">{spanError}</p>}
                </div>
              )}

              {/* SENSITIVE VALUE REMINDERS */}
              {activePage.reviewReminders.length>0&&(
                <div className="rc-reminder-box">
                  <small className="rc-reminder-head">
                    Nhắc đối chiếu số tiền, ngày tháng, mã phòng và số giấy tờ (ngay cả khi OCR không báo lỗi):
                  </small>
                  <div className="rc-reminder-chips">
                    {activePage.reviewReminders.slice(0,14).map(rem=>(
                      <button
                        key={rem.id}
                        type="button"
                        className="rc-reminder-chip"
                        title={`${rem.label} — Dòng ${rem.line}`}
                        onClick={()=>jumpToToken(rem.line,rem.value)}
                      >
                        <span className="rc-chip-line">D{rem.line}</span>
                        <code>{rem.value}</code>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showOriginalOcr&&(
                <div className="rc-original-ocr-box">
                  <div className="rc-original-ocr-head">
                    <strong>Bản chép OCR ban đầu (chỉ đọc)</strong>
                    <button type="button" className="rc-text-link" onClick={handleRestoreOriginal}>
                      Khôi phục bản OCR ban đầu
                    </button>
                  </div>
                  <pre>{activePage.originalText||'(Trống)'}</pre>
                </div>
              )}

              <div className="rc-field rc-ocr-editor-field">
                <label htmlFor={`ocr-page-text-${activePage.pageId}`}>
                  Nội dung nguyên văn Trang {activePage.pageNumber} (chỉnh sửa trực tiếp — không tự định dạng số hay chính tả)
                </label>
                <textarea
                  ref={textareaRef}
                  id={`ocr-page-text-${activePage.pageId}`}
                  className="rc-verbatim-textarea"
                  rows={12}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  disabled={busy}
                  value={activePage.editedText}
                  onChange={e=>handleTextEdit(e.target.value)}
                />
                <small>
                  {activePage.editedText.length.toLocaleString('vi-VN')} ký tự ·{' '}
                  {activePage.editedText===activePage.originalText?'Chưa chỉnh sửa từ bản OCR gốc':'Đã chỉnh sửa (giữ riêng với bản OCR gốc)'}
                </small>
              </div>

              <div className={`rc-page-confirm-box ${activePage.confirmed?'is-confirmed':''}`}>
                <label className="rc-checkbox">
                  <input
                    id={`ocr-confirm-${activePage.pageId}`}
                    type="checkbox"
                    checked={activePage.confirmed}
                    disabled={busy||(!activePage.confirmed&&!activeConfirmCheck.ok)}
                    onChange={e=>handleToggleConfirmPage(e.target.checked)}
                  />
                  <span>
                    <strong>Tôi đã đối chiếu nguyên văn Trang {activePage.pageNumber} với trang gốc</strong>
                    <small>Nếu bạn sửa lại văn bản của trang này sau khi xác nhận, dấu xác nhận sẽ tự động bỏ chọn.</small>
                  </span>
                </label>
                {!activePage.confirmed&&!activeConfirmCheck.ok&&(
                  <p className="rc-hint">{activeConfirmCheck.reason}</p>
                )}
                {confirmError&&<p className="rc-error" role="alert">{confirmError}</p>}
              </div>
            </section>
          </div>

          <div className="rc-verify-nav">
            <div className="rc-inline-actions">
              <MotionButton
                type="button"
                className="p-button"
                disabled={busy||activeIndex<=0}
                onClick={()=>patchSession({activePageId:pages[activeIndex-1].pageId})}
              >
                Trang trước
              </MotionButton>
              <MotionButton
                type="button"
                className="p-button"
                disabled={busy||activeIndex<0||activeIndex>=pages.length-1}
                onClick={()=>patchSession({activePageId:pages[activeIndex+1].pageId})}
              >
                Trang sau
              </MotionButton>
            </div>
            <MotionButton
              type="button"
              className="p-button primary"
              disabled={busy||!allPagesConfirmed}
              title={!allPagesConfirmed?'Xác nhận đối chiếu đầy đủ các trang trước khi sang bước Áp dụng':undefined}
              onClick={()=>{
                setConfirmOverwrite(false);
                patchSession({step:3});
              }}
            >
              <span>Tiếp tục sang Áp dụng ({confirmedCount}/{pages.length})</span>
            </MotionButton>
          </div>
        </div>
      )}

      {/* BƯỚC 3: ÁP DỤNG */}
      {scanStep===3&&(
        <div className="rc-scan-stage">
          <div className="rc-apply-summary">
            <CheckCircle2 size={18} className="rc-apply-ok-icon" aria-hidden="true"/>
            <div>
              <strong>Đã đối chiếu xong {pages.length} / {pages.length} trang</strong>
              <p>Toàn bộ bản chép nguyên văn ({fullTranscript.length.toLocaleString('vi-VN')} ký tự) được giữ nguyên; hệ thống không tự bỏ trang hay nhờ AI viết lại.</p>
            </div>
          </div>

          <div className="rc-apply-mode-group" role="radiogroup" aria-label="Phạm vi đưa vào ô điều khoản">
            <label className={`rc-apply-mode-card ${applyMode==='all'?'is-active':''}`}>
              <input
                type="radio"
                name={`apply-mode-${roomId}`}
                checked={applyMode==='all'}
                onChange={()=>{setApplyMode('all');setConfirmOverwrite(false);}}
              />
              <div>
                <strong>Áp dụng toàn bộ bản chép đã đối chiếu</strong>
                <small>Đưa nguyên văn tất cả các trang có nội dung theo đúng thứ tự vào ô điều khoản.</small>
              </div>
            </label>
            <label className={`rc-apply-mode-card ${applyMode==='segments'?'is-active':''}`}>
              <input
                type="radio"
                name={`apply-mode-${roomId}`}
                checked={applyMode==='segments'}
                onChange={()=>{setApplyMode('segments');setConfirmOverwrite(false);}}
              />
              <div>
                <strong>Chọn các đoạn cần đưa vào ô điều khoản</strong>
                <small>Chỉ đưa các đoạn đã chọn vào ô điều khoản; bản chép đầy đủ vẫn được giữ lại nguyên vẹn.</small>
              </div>
            </label>
          </div>

          {applyMode==='segments'&&(
            <div className="rc-segment-picker" aria-label="Chọn đoạn văn bản nguyên văn">
              {segments.map(seg=>{
                const checked=Boolean(selectedSegIds?.has(seg.id));
                return (
                  <label key={seg.id} className={`rc-segment-item ${checked?'is-checked':''}`}>
                    <input type="checkbox" checked={checked} onChange={()=>toggleSegment(seg.id)}/>
                    <div>
                      <span className="rc-pill is-room">Trang {seg.pageNumber}</span>
                      <pre>{seg.text}</pre>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <div className="rc-apply-preview">
            <strong>Xem lại văn bản nguyên văn sẽ áp dụng ({textToApply.length.toLocaleString('vi-VN')} ký tự)</strong>
            <pre>{textToApply||'(Chưa chọn đoạn nào)'}</pre>
          </div>

          {confirmOverwrite&&(
            <div className="rc-inline-alert is-warning" role="alertdialog" aria-label="Xác nhận thay thế điều khoản hiện tại">
              <div className="rc-inline-alert-copy">
                <AlertTriangle size={16} aria-hidden="true"/>
                <div>
                  <strong>Xác nhận ghi đè điều khoản của phòng {roomNumber}</strong>
                  <p>Ô điều khoản hiện tại đang có {currentTerms.length.toLocaleString('vi-VN')} ký tự sẽ được thay bằng bản chép nguyên văn ({textToApply.length.toLocaleString('vi-VN')} ký tự). Toàn bộ bản chép vẫn được giữ nguyên.</p>
                </div>
              </div>
              <div className="rc-diff-grid">
                <div>
                  <small>Nội dung hiện tại sẽ bị thay thế:</small>
                  <pre>{currentTerms.length>280?`${currentTerms.slice(0,280)}…`:currentTerms}</pre>
                </div>
                <div>
                  <small>Nội dung nguyên văn sẽ áp dụng:</small>
                  <pre>{textToApply.length>280?`${textToApply.slice(0,280)}…`:textToApply}</pre>
                </div>
              </div>
              <div className="rc-inline-actions">
                <MotionButton type="button" className="p-button rc-btn-compact" onClick={()=>setConfirmOverwrite(false)}>
                  Hủy
                </MotionButton>
                <MotionButton type="button" className="p-button primary rc-btn-compact" onClick={handleApplyClick}>
                  Xác nhận áp dụng văn bản
                </MotionButton>
              </div>
            </div>
          )}

          <div className="rc-scan-stage-actions">
            <MotionButton type="button" className="p-button" onClick={()=>patchSession({step:2})}>
              Quay lại đối chiếu
            </MotionButton>
            {!confirmOverwrite&&(
              <MotionButton
                type="button"
                className="p-button primary"
                disabled={!textToApply.trim()}
                onClick={handleApplyClick}
              >
                <CheckCircle2 size={15}/>
                <span>Áp dụng văn bản cho phòng {roomNumber}</span>
              </MotionButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
