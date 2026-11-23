import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,Eye,FileText,LoaderCircle,Save,X} from 'lucide-react';
import {Modal} from './PortalUI.jsx';
import {MotionButton,MotionDialog} from './motion/MotionUI.jsx';
import {hostApi} from '../services/host.js';
import {validateLeaseDates} from '../services/rooms.js';
import RoomLeaseFields from './RoomLeaseFields.jsx';
import RentalContractEditor from './RentalContractEditor.jsx';
import RentalContractPreview from './RentalContractPreview.jsx';
import {useAuth} from '../context/AuthContext.jsx';
import {
  CONTRACT_STEPS,
  CONTRACT_STEP,
  STEP_CONTRACT_FIELDS,
  contractPayload,
  extractRoomUtilities,
  firstErrorStep,
  newContract,
  rentalContractsApi,
  validateContract,
  validateContractStep,
} from '../services/rental-contracts.js';
import '../styles/room-modals.css';
import '../styles/rental-contracts.css';

export default function RoomStatusModal({
  rooms,
  propertyId,
  property,
  roomTypes=[],
  initialStatus='OCCUPIED',
  initialCreateContract=false,
  initialTenancy=null,
  onClose,
  onSaved,
}){
  const {user}=useAuth();
  const titleId=useId();
  const roomTypeById=useMemo(
    ()=>Object.fromEntries((roomTypes||[]).map(t=>[t.roomTypeId,t])),
    [roomTypes]
  );
  const [createContract,setCreateContract]=useState(initialCreateContract);
  const [drafts,setDrafts]=useState(()=>{
    const tenant = initialTenancy?.occupants.find(person => person.primaryTenant);
    return Object.fromEntries(rooms.map(room => {
      const draft = newContract(room, user, roomTypeById[room.roomTypeId] || null);
      return [room.roomId, tenant ? {
        ...draft,
        tenantName: tenant.name,
        tenantPhone: tenant.phone || '',
        rent: String(initialTenancy.monthlyRent ?? draft.rent),
        deposit: String(initialTenancy.deposit ?? draft.deposit),
      } : draft];
    }));
  });
  const [selected,setSelected]=useState(rooms[0].roomId);
  const [step,setStep]=useState(CONTRACT_STEP.SOURCE);
  const [fullPreview,setFullPreview]=useState(false);
  const [contractErrors,setContractErrors]=useState({});
  const [scanBusy,setScanBusy]=useState(false);
  const [scanVerifyWide,setScanVerifyWide]=useState(false);
  const [scanSessions,setScanSessions]=useState({});
  const [catalog,setCatalog]=useState(null);
  const [catalogError,setCatalogError]=useState('');
  const [catalogRetry,setCatalogRetry]=useState(0);
  const [data,setData]=useState({
    status:initialStatus,
    leaseStartDate:rooms.length===1?rooms[0].leaseStartDate||'':'',
    leaseEndDate:rooms.length===1?rooms[0].leaseEndDate||'':'',
  });
  const [errors,setErrors]=useState({});
  const [failure,setFailure]=useState('');
  const [busy,setBusy]=useState(false);
  const request=useRef();
  const form=useRef();
  const scrollBody=useRef();

  const creating=data.status==='OCCUPIED'&&createContract;
  const currentRoom=rooms.find(r=>r.roomId===selected)||rooms[0];
  const currentDraft=drafts[selected];
  const contractValidation=useMemo(()=>creating
    ?Object.fromEntries(rooms.map(room=>[room.roomId,validateContract(drafts[room.roomId])]))
    :{},[creating,rooms,drafts]);
  const leaseValidation=validateLeaseDates(data);
  const firstInvalidRoom=creating
    ?rooms.find(room=>firstErrorStep(contractValidation[room.roomId],leaseValidation)!==null)
    :null;
  const firstInvalidStep=firstInvalidRoom
    ?firstErrorStep(contractValidation[firstInvalidRoom.roomId],leaseValidation)
    :null;

  const currentRoomType=roomTypeById[currentRoom?.roomTypeId]||null;
  const currentUtilities=useMemo(()=>extractRoomUtilities(currentRoomType),[currentRoomType]);
  const currentTemplateName=useMemo(
    ()=>catalog?.templates.find(t=>t.id===currentDraft?.template)?.name||'',
    [catalog,currentDraft?.template]
  );

  useEffect(()=>()=>request.current?.abort(),[]);

  useEffect(()=>{
    if(!creating||catalog)return;
    const controller=new AbortController();
    setCatalogError('');
    rentalContractsApi.templates(controller.signal)
      .then(value=>{
        if(controller.signal.aborted)return;
        setCatalog(value);
        setDrafts(previous=>Object.fromEntries(
          Object.entries(previous).map(([id,d])=>[
            id,
            d.terms?d:{...d,terms:value.templates.find(t=>t.id===d.template)?.terms||'',reviewed:false},
          ])
        ));
      })
      .catch(e=>{
        if(!controller.signal.aborted)setCatalogError(e.message);
      });
    return()=>controller.abort();
  },[creating,catalog,catalogRetry]);

  const update=(key,value)=>{
    setData(previous=>({...previous,[key]:value}));
    setErrors(previous=>({...previous,[key]:undefined}));
    setFailure('');
    if(key.startsWith('lease')){
      setDrafts(previous=>Object.fromEntries(
        Object.entries(previous).map(([id,d])=>[id,{...d,reviewed:false}])
      ));
    }
  };

  const clearContractError=(roomId,key)=>{
    setContractErrors(previous=>({
      ...previous,
      [roomId]:{...(previous[roomId]||{}),[key]:undefined},
    }));
    setFailure('');
  };

  const focusInvalid=()=>{
    requestAnimationFrame(()=>{
      const target=form.current?.querySelector('[aria-invalid=true]');
      if(target){
        target.scrollIntoView({block:'center',behavior:'smooth'});
        target.focus();
      }
    });
  };

  const toggleFullPreview=next=>{
    const value=typeof next==='function'?next(fullPreview):next;
    setFullPreview(value);
    requestAnimationFrame(()=>{
      if(scrollBody.current)scrollBody.current.scrollTop=0;
    });
  };

  const goToStep=nextStep=>{
    setFullPreview(false);
    setStep(nextStep);
    setFailure('');
    requestAnimationFrame(()=>{
      if(scrollBody.current)scrollBody.current.scrollTop=0;
      form.current?.querySelector('.rc-step-panel')?.focus({preventScroll:true});
    });
  };

  const checkStep=stepId=>{
    const invalid=validateContractStep(stepId,currentDraft);
    const leaseInvalid=stepId===CONTRACT_STEP.LEASE?leaseValidation:{};
    if(stepId===CONTRACT_STEP.LEASE)setErrors(leaseInvalid);
    setContractErrors(previous=>({
      ...previous,
      [selected]:{...(previous[selected]||{}),...Object.fromEntries(STEP_CONTRACT_FIELDS[stepId].map(k=>[k,invalid[k]]))},
    }));
    return !Object.keys(invalid).length&&!Object.keys(leaseInvalid).length;
  };

  const nextStep=()=>{
    if(busy||scanBusy||step===CONTRACT_STEP.REVIEW)return;
    if(!checkStep(step)){
      focusInvalid();
      return;
    }
    goToStep(step+1);
  };

  const prevStep=()=>{
    if(busy||scanBusy)return;
    if(step>CONTRACT_STEP.SOURCE)goToStep(step-1);
  };

  const submit=async event=>{
    event.preventDefault();
    if(request.current||scanBusy)return;

    if(creating&&step<CONTRACT_STEP.REVIEW){
      nextStep();
      return;
    }

    setErrors(leaseValidation);
    if(!creating&&Object.keys(leaseValidation).length){
      focusInvalid();
      return;
    }

    if(creating){
      setContractErrors(contractValidation);
      if(firstInvalidRoom){
        setFullPreview(false);
        setSelected(firstInvalidRoom.roomId);
        setStep(firstInvalidStep);
        setFailure(
          rooms.length>1
            ?`Hoàn thiện thông tin hợp đồng phòng ${firstInvalidRoom.roomNumber} ở bước ${firstInvalidStep} trước khi lưu.`
            :`Kiểm tra lại thông tin còn thiếu ở bước ${firstInvalidStep} trước khi lưu.`
        );
        focusInvalid();
        return;
      }
    }

    const controller=new AbortController();
    request.current=controller;
    setBusy(true);
    setFailure('');
    try{
      const saved=await hostApi.updateRoomStatuses({
        propertyId,
        roomIds:rooms.map(room=>room.roomId),
        status:data.status,
        leaseStartDate:data.status==='OCCUPIED'?data.leaseStartDate:null,
        leaseEndDate:data.status==='OCCUPIED'?data.leaseEndDate:null,
        ...(creating?{contracts:rooms.map(r=>contractPayload(drafts[r.roomId]))}:{}),
      },controller.signal);
      if(!controller.signal.aborted)onSaved(saved);
    }catch(error){
      if(!controller.signal.aborted)setFailure(error.message);
    }finally{
      if(request.current===controller)request.current=null;
      if(!controller.signal.aborted)setBusy(false);
    }
  };

  // Luồng cập nhật trạng thái phòng KHÔNG kèm hợp đồng: giữ nguyên tuyệt đối.
  if(!creating){
    return (
      <Modal
        className="hr-editor hm-status-modal"
        title={`Cập nhật trạng thái ${rooms.length} phòng`}
        onClose={()=>{if(!busy)onClose();}}
      >
        <form ref={form} onSubmit={submit} noValidate aria-busy={busy}>
          <fieldset disabled={busy} className="rm-form-lock">
            <p className="rm-muted">
              {rooms.slice(0,8).map(room=>room.roomNumber).join(', ')}
              {rooms.length>8?` và ${rooms.length-8} phòng khác`:''}
            </p>
            <div className="hr-field">
              <label htmlFor="bulk-room-status">Trạng thái mới</label>
              <select id="bulk-room-status" value={data.status} onChange={event=>update('status',event.target.value)}>
                <option value="VACANT">Còn trống</option>
                <option value="OCCUPIED">Đang thuê</option>
              </select>
            </div>
            {data.status==='OCCUPIED'?(
              <>
                <RoomLeaseFields data={data} onChange={update} errors={errors} prefix="bulk"/>
                <p className="rm-muted">
                  Khoảng thời gian này áp dụng cho tất cả phòng đã chọn. Nếu ngày thuê khác nhau, hãy chia thành từng nhóm phòng.
                </p>
                <label className="rc-create-toggle">
                  <input
                    type="checkbox"
                    checked={createContract}
                    onChange={e=>{
                      setCreateContract(e.target.checked);
                      setStep(CONTRACT_STEP.SOURCE);
                      setFullPreview(false);
                      setFailure('');
                    }}
                  />
                  <span>
                    <strong>Tạo hợp đồng thuê phòng</strong>
                    <small>Dùng mẫu hệ thống hoặc đọc ảnh/PDF mẫu của bạn để hoàn thiện hợp đồng.</small>
                  </span>
                </label>
              </>
            ):(
              <p className="rm-muted">
                Phòng sẽ sẵn sàng đón khách thuê. Khoảng ngày thuê hiện tại sẽ được xóa; hợp đồng đang quản lý được chuyển vào lịch sử.
              </p>
            )}
          </fieldset>
          {failure&&<p className="hr-error" role="alert">{failure}</p>}
          <footer className="hr-modal-footer">
            <MotionButton type="button" className="p-button" disabled={busy} onClick={onClose}>Hủy</MotionButton>
            <MotionButton type="submit" className="p-button primary" disabled={busy}>
              {busy?<><LoaderCircle size={15} className="spin"/>Đang cập nhật…</>:`Cập nhật ${rooms.length} phòng`}
            </MotionButton>
          </footer>
        </form>
      </Modal>
    );
  }

  const currentRoomErrors=contractErrors[selected]||{};
  const currentValidation=contractValidation[selected];
  const leaseValid=!Object.keys(leaseValidation).length;
  const saveHintId=`${titleId}-save-hint`;
  const missingStepLabel=CONTRACT_STEPS.find(item=>item.id===firstInvalidStep)?.label;
  const missingRoomLabel=rooms.length>1&&firstInvalidRoom?` cho phòng ${firstInvalidRoom.roomNumber}`:'';
  const needsReview=firstInvalidStep===CONTRACT_STEP.REVIEW&&!contractValidation[firstInvalidRoom.roomId].terms;
  const saveHint=needsReview
    ?`Tích xác nhận đã đọc bản xem trước${missingRoomLabel} để lưu.`
    :`Hoàn tất bước ${missingStepLabel}${missingRoomLabel} để lưu.`;
  const stepHasError=stepId=>STEP_CONTRACT_FIELDS[stepId].some(k=>Boolean(currentRoomErrors[k]))
    ||(stepId===CONTRACT_STEP.LEASE&&Boolean(errors.leaseStartDate||errors.leaseEndDate));
  const stepIsComplete=stepId=>!STEP_CONTRACT_FIELDS[stepId].some(key=>currentValidation[key])
    &&(stepId!==CONTRACT_STEP.LEASE||leaseValid);
  const reviewedCount=rooms.filter(r=>drafts[r.roomId].reviewed).length;

  const handleDialogCancel=event=>{
    event.preventDefault();
    if(busy||scanBusy)return;
    if(fullPreview){
      setFullPreview(false);
      return;
    }
    onClose();
  };

  return (
    <MotionDialog
      className="portal-modal hr-editor hm-status-modal rc-status-modal rc-wizard-modal"
      aria-labelledby={titleId}
      onCancel={handleDialogCancel}
      onClick={event=>{
        if(event.target===event.currentTarget&&!busy&&!scanBusy)onClose();
      }}
    >
      <form ref={form} onSubmit={submit} noValidate aria-busy={busy||scanBusy} className="rc-wizard-form">
        {/* STICKY HEADER */}
        <header className="rc-wizard-header">
          <div className="rc-wizard-header-top">
            <div className="rc-wizard-title-wrap">
              <div className="rc-wizard-title-line">
                <FileText size={20} className="rc-title-icon" aria-hidden="true"/>
                <h2 id={titleId}>Lập hợp đồng thuê phòng</h2>
              </div>
              <div className="rc-header-badges" aria-label="Trạng thái phòng và hợp đồng">
                <span className="rc-pill is-room">Phòng {currentRoom.roomNumber}</span>
                <span className={`rc-pill ${currentRoom.status==='OCCUPIED'?'is-occupied':'is-transition'}`}>
                  {currentRoom.status==='OCCUPIED'?'Phòng: Đang thuê':'Phòng: Sẽ chuyển Đang thuê'}
                </span>
                <span className="rc-pill is-unsigned">Hợp đồng: Chưa ký</span>
                {!initialCreateContract&&(
                  <button
                    type="button"
                    className="rc-exit-contract-link"
                    disabled={busy||scanBusy}
                    onClick={()=>{
                      setCreateContract(false);
                      setFullPreview(false);
                      setFailure('');
                    }}
                  >
                    Chỉ đổi trạng thái phòng
                  </button>
                )}
              </div>
            </div>
            <MotionButton
              type="button"
              className="p-icon"
              title="Đóng"
              aria-label="Đóng"
              disabled={busy||scanBusy}
              onClick={onClose}
            >
              <X size={20}/>
            </MotionButton>
          </div>

          {/* CHỌN PHÒNG KHI CẬP NHẬT NHIỀU PHÒNG */}
          {rooms.length>1&&(
            <div className="rc-room-switcher">
              <label htmlFor="contract-room">Hợp đồng của phòng</label>
              <select
                id="contract-room"
                value={selected}
                disabled={busy||scanBusy}
                onChange={e=>{
                  const roomId=Number(e.target.value);
                  setSelected(roomId);
                  setFullPreview(false);
                  if(drafts[roomId].sourceMode==='scan'&&drafts[roomId].template!=='OWNER_SCAN')goToStep(CONTRACT_STEP.SOURCE);
                }}
              >
                {rooms.map(r=>(
                  <option key={r.roomId} value={r.roomId}>
                    Phòng {r.roomNumber} · {drafts[r.roomId].reviewed?'Đã xác nhận':'Chưa hoàn thiện'}
                  </option>
                ))}
              </select>
              <span className="rc-count">{reviewedCount}/{rooms.length} đã xác nhận</span>
            </div>
          )}

          {/* THANH BƯỚC (STEPPER) + NÚT XEM HỢP ĐỒNG TRÊN MOBILE */}
          <div className="rc-stepper-bar">
            <nav className="rc-stepper" aria-label="Các bước lập hợp đồng">
              {CONTRACT_STEPS.map(item=>{
                const active=step===item.id&&!fullPreview;
                const complete=stepIsComplete(item.id);
                const invalidStep=stepHasError(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`rc-step-btn ${active?'is-active':''} ${complete?'is-complete':''} ${invalidStep?'is-invalid':''}`}
                    aria-current={active?'step':undefined}
                    disabled={busy||scanBusy}
                    onClick={()=>{
                      if(item.id>CONTRACT_STEP.SOURCE&&!checkStep(CONTRACT_STEP.SOURCE)){
                        goToStep(CONTRACT_STEP.SOURCE);
                        return;
                      }
                      goToStep(item.id);
                    }}
                  >
                    <span className="rc-step-num" aria-hidden="true">
                      {complete&&!active?<Check size={13} strokeWidth={2.5}/>:item.id}
                    </span>
                    <span className="rc-step-label">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <MotionButton
              type="button"
              className="p-button rc-mobile-preview-btn"
              disabled={busy||scanBusy}
              aria-pressed={fullPreview}
              onClick={()=>toggleFullPreview(v=>!v)}
            >
              <Eye size={15} aria-hidden="true"/>
              <span>{fullPreview?`Quay lại bước ${step}`:'Xem hợp đồng'}</span>
            </MotionButton>
          </div>
        </header>

        {/* VÙNG CUỘN DUY NHẤT (TRÁNH CUỘN LỒNG NHAU) */}
        <div className="rc-workspace-body" ref={scrollBody}>
          {fullPreview&&(
            <RentalContractPreview
              draft={currentDraft}
              room={currentRoom}
              property={property}
              dates={data}
              utilities={currentUtilities}
              templateName={currentTemplateName}
              fullDocument
              step={step}
              onCloseFull={()=>toggleFullPreview(false)}
            />
          )}

          <div className={`rc-workspace-grid ${fullPreview?'is-hidden':''} ${scanVerifyWide&&step===CONTRACT_STEP.SOURCE?'is-scan-verify':''}`}>
            <div className="rc-form-col">
              <RentalContractEditor
                step={step}
                rooms={rooms}
                drafts={drafts}
                setDrafts={setDrafts}
                selected={selected}
                dates={data}
                onDateChange={update}
                onDates={(start,end)=>{
                  if(start)update('leaseStartDate',start);
                  if(end)update('leaseEndDate',end);
                }}
                errors={contractErrors}
                leaseErrors={errors}
                clearError={clearContractError}
                property={property}
                user={user}
                utilities={currentUtilities}
                catalog={catalog}
                catalogError={catalogError}
                onRetryCatalog={()=>{
                  setCatalogError('');
                  setCatalogRetry(v=>v+1);
                }}
                onWorkingChange={setScanBusy}
                scanSessions={scanSessions}
                setScanSessions={setScanSessions}
                onScanVerifyWideChange={setScanVerifyWide}
              />
            </div>

            <div className="rc-preview-col">
              <RentalContractPreview
                draft={currentDraft}
                room={currentRoom}
                property={property}
                dates={data}
                utilities={currentUtilities}
                templateName={currentTemplateName}
                fullDocument={false}
                step={step}
                onOpenFull={()=>toggleFullPreview(true)}
                onCloseFull={()=>toggleFullPreview(false)}
              />
            </div>
          </div>
        </div>

        {/* STICKY FOOTER */}
        <footer className="rc-wizard-footer">
          {failure&&<p className="rc-footer-alert" role="alert">{failure}</p>}
          {step===CONTRACT_STEP.REVIEW&&firstInvalidRoom&&<p id={saveHintId} className="rc-hint" role="status">{saveHint}</p>}
          <div className="rc-footer-row">
            <div className="rc-footer-left">
              {step===CONTRACT_STEP.SOURCE?(
                <MotionButton type="button" className="p-button" disabled={busy||scanBusy} onClick={onClose}>
                  Hủy
                </MotionButton>
              ):(
                <MotionButton type="button" className="p-button" disabled={busy||scanBusy} onClick={prevStep}>
                  <ArrowLeft size={15} aria-hidden="true"/>
                  <span>Quay lại</span>
                </MotionButton>
              )}
            </div>

            <div className="rc-footer-right">
              <MotionButton
                type="button"
                className="p-button rc-draft-btn"
                disabled
                title="Máy chủ chưa hỗ trợ API lưu bản nháp hợp đồng"
                aria-describedby="rc-draft-unavailable-note"
              >
                <Save size={15} aria-hidden="true"/>
                <span>Lưu bản nháp</span>
              </MotionButton>
              <span id="rc-draft-unavailable-note" className="rm-sr-only">
                Chức năng lưu bản nháp chưa khả dụng vì máy chủ chưa có API lưu bản nháp hợp đồng.
              </span>

              {step<CONTRACT_STEP.REVIEW?(
                <MotionButton key="wizard-next" type="button" className="p-button primary" disabled={busy||scanBusy} onClick={nextStep}>
                  <span>Tiếp tục</span>
                  <ArrowRight size={15} aria-hidden="true"/>
                </MotionButton>
              ):(
                <MotionButton key="wizard-submit" type="submit" className="p-button primary rc-save-btn"
                  disabled={busy||scanBusy||Boolean(firstInvalidRoom)}
                  aria-describedby={firstInvalidRoom?saveHintId:undefined}>
                  {busy?(
                    <>
                      <LoaderCircle size={15} className="spin" aria-hidden="true"/>
                      <span>Đang lưu…</span>
                    </>
                  ):(
                    <span>{rooms.length>1?`Lưu & cập nhật ${rooms.length} phòng`:'Lưu & cập nhật phòng'}</span>
                  )}
                </MotionButton>
              )}
            </div>
          </div>
        </footer>
      </form>
    </MotionDialog>
  );
}
