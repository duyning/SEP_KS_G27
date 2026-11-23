import {useEffect,useMemo,useState} from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  FileText,
  Pencil,
  ScanLine,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';
import VndMoneyInput from './VndMoneyInput.jsx';
import RentalContractScanPanel from './RentalContractScanPanel.jsx';
import {MotionButton} from './motion/MotionUI.jsx';
import {
  CONTRACT_LABELS,
  CONTRACT_STEP,
  CONTRACT_STEPS,
  HOUSE_RENTAL_TEMPLATE,
  contractBlanks,
  contractToday,
  formatContractDate,
  parseSystemTermsSections,
  serializeSystemTermsSections,
} from '../services/rental-contracts.js';

export default function RentalContractEditor({
  step,
  rooms,
  drafts,
  setDrafts,
  selected,
  dates,
  onDateChange,
  errors={},
  leaseErrors={},
  clearError,
  property={},
  user={},
  catalog,
  catalogError,
  onRetryCatalog,
  onWorkingChange,
  scanSessions={},
  setScanSessions,
  onScanVerifyWideChange,
}){
  const [landlordExpanded,setLandlordExpanded]=useState(false);
  const [tenantExtraOpen,setTenantExtraOpen]=useState(false);
  const [openClauses,setOpenClauses]=useState(()=>new Set(['1']));
  const [pendingTemplate,setPendingTemplate]=useState(null);
  const [confirmCommon,setConfirmCommon]=useState(false);
  const [scanBusy,setScanBusy]=useState(false);
  const [scanAppliedNote,setScanAppliedNote]=useState('');

  const draft=drafts[selected];
  const mode=draft.sourceMode;
  const isHouse=draft.template===HOUSE_RENTAL_TEMPLATE;
  const blanks=useMemo(()=>contractBlanks(draft.terms),[draft.terms]);
  const room=rooms.find(r=>r.roomId===selected)||rooms[0];
  const roomErrors=errors[selected]||{};
  const currentScanSession=scanSessions[selected]||{step:1,files:[],consent:false,pages:[],activePageId:null};

  useEffect(()=>{
    setScanAppliedNote('');
    setPendingTemplate(null);
    setConfirmCommon(false);
    setOpenClauses(new Set(['1']));
  },[selected]);

  useEffect(()=>{
    if(mode!=='scan'||step!==CONTRACT_STEP.SOURCE){
      onScanVerifyWideChange?.(false);
    }
  },[mode,step,onScanVerifyWideChange]);

  const handleScanWorking=working=>{
    setScanBusy(working);
    onWorkingChange?.(working);
  };

  const updateScanSession=updater=>{
    setScanSessions?.(prev=>{
      const base=prev[selected]||{step:1,files:[],consent:false,pages:[],activePageId:null};
      const next=typeof updater==='function'?updater(base):updater;
      return {...prev,[selected]:next};
    });
  };

  const landlordHasError=Boolean(
    roomErrors.landlordName||roomErrors.landlordPhone||roomErrors.landlordBirthDate
    ||roomErrors.landlordAddress||roomErrors.landlordIdentity
    ||roomErrors.landlordIdentityDate||roomErrors.landlordIdentityPlace
  );
  const landlordNeedsInput=!draft.landlordName?.trim()||!draft.landlordPhone?.trim()||landlordHasError;
  const showLandlordFields=landlordExpanded||landlordNeedsInput||isHouse;

  const tenantExtraHasDataOrError=Boolean(
    draft.tenantBirthDate||draft.tenantIdentityDate||draft.tenantIdentityPlace
    ||roomErrors.tenantBirthDate||roomErrors.tenantIdentityDate||roomErrors.tenantIdentityPlace
  );
  const showTenantExtra=tenantExtraOpen||tenantExtraHasDataOrError;

  const systemSections=useMemo(()=>{
    if(draft.template==='OWNER_SCAN')return null;
    return parseSystemTermsSections(draft.terms);
  },[draft.template,draft.terms]);

  const update=(key,value)=>{
    setDrafts(previous=>({
      ...previous,
      [selected]:{
        ...previous[selected],
        [key]:value,
        ...(key==='reviewed'?{}:{reviewed:false}),
      },
    }));
    clearError?.(selected,key);
    if(key!=='reviewed')clearError?.(selected,'reviewed');
  };

  const isTermsCustomized=()=>{
    if(!draft.terms?.trim())return false;
    if(draft.template==='OWNER_SCAN')return true;
    const baseTemplate=catalog?.templates.find(t=>t.id===draft.template);
    if(!baseTemplate)return true;
    return draft.terms.trim()!==baseTemplate.terms.trim();
  };

  const changeMode=next=>{
    setPendingTemplate(null);
    if(next!==mode)update('sourceMode',next);
    clearError?.(selected,'source');
  };

  const applyTemplateChoice=template=>{
    setDrafts(previous=>({
      ...previous,
      [selected]:{
        ...previous[selected],
        template:template.id,
        sourceMode:'template',
        terms:template.terms,
        sourceName:'',
        fullScannedTranscript:'',
        scanFullDocument:false,
        blankValues:{},
        reviewed:false,
      },
    }));
    clearError?.(selected,'terms');
    clearError?.(selected,'source');
    clearError?.(selected,'reviewed');
    setPendingTemplate(null);
    setScanAppliedNote('');
    setOpenClauses(new Set(['1']));
  };

  const requestTemplateChange=id=>{
    if(id===draft.template)return;
    const template=catalog?.templates.find(t=>t.id===id);
    if(!template)return;
    if(isTermsCustomized()){
      setPendingTemplate(template);
      return;
    }
    applyTemplateChoice(template);
  };

  const updateClauseBody=(index,newBody)=>{
    if(!systemSections)return;
    const next=systemSections.map((sec,idx)=>idx===index?{...sec,body:newBody}:sec);
    update('terms',serializeSystemTermsSections(next));
  };

  const toggleClause=clauseIndex=>{
    setOpenClauses(previous=>{
      const next=new Set(previous);
      if(next.has(clauseIndex))next.delete(clauseIndex);
      else next.add(clauseIndex);
      return next;
    });
  };

  const allClausesOpen=Boolean(systemSections&&systemSections.every(sec=>openClauses.has(sec.index)));
  const toggleAllClauses=()=>{
    if(!systemSections)return;
    setOpenClauses(allClausesOpen?new Set():new Set(systemSections.map(sec=>sec.index)));
  };

  const handleApplyScannedTranscript=({terms,fullScannedTranscript,sourceName,scanFullDocument})=>{
    setDrafts(previous=>({
      ...previous,
      [selected]:{
        ...previous[selected],
        template:'OWNER_SCAN',
        sourceMode:'scan',
        terms,
        fullScannedTranscript,
        sourceName,
        scanFullDocument,
        blankValues:previous[selected].terms===terms?previous[selected].blankValues:{},
        reviewed:false,
      },
    }));
    clearError?.(selected,'terms');
    clearError?.(selected,'source');
    clearError?.(selected,'reviewed');
    setPendingTemplate(null);
    setScanAppliedNote(`Đã áp dụng mẫu cho phòng ${room.roomNumber}. Bấm Tiếp tục để điền thông tin.`);
  };

  const otherRoomsHaveCustomTerms=rooms.some(r=>{
    if(r.roomId===selected)return false;
    const other=drafts[r.roomId];
    if(!other?.terms?.trim())return false;
    const base=catalog?.templates.find(t=>t.id===other.template);
    return other.template==='OWNER_SCAN'||!base||other.terms.trim()!==base.terms.trim();
  });

  const executeApplyCommon=()=>{
    setDrafts(previous=>Object.fromEntries(Object.entries(previous).map(([id,d])=>[
      id,
      {
        ...d,
        terms:draft.terms,
        template:draft.template,
        sourceMode:draft.sourceMode,
        sourceName:draft.sourceName,
        fullScannedTranscript:draft.fullScannedTranscript,
        scanFullDocument:draft.scanFullDocument,
        blankValues:d.template===draft.template&&d.terms===draft.terms?d.blankValues:{},
        contractDate:draft.contractDate,
        landlordName:draft.landlordName,
        landlordPhone:draft.landlordPhone,
        landlordBirthDate:draft.landlordBirthDate,
        landlordAddress:draft.landlordAddress,
        landlordIdentity:draft.landlordIdentity,
        landlordIdentityDate:draft.landlordIdentityDate,
        landlordIdentityPlace:draft.landlordIdentityPlace,
        paymentMethod:draft.paymentMethod,
        electricityPrice:draft.electricityPrice,
        waterPrice:draft.waterPrice,
        waterUnit:draft.waterUnit,
        internetPrice:draft.internetPrice,
        servicePrice:draft.servicePrice,
        reviewed:false,
      },
    ])));
    setConfirmCommon(false);
  };

  const renderField=(key,{required=false,maxLength=150,type='text',placeholder='',autoComplete='off',fullWidth=false,labelText,multiline=false,...props}={})=>{
    const id=`contract-${selected}-${key}`;
    const error=roomErrors[key];
    const Control=multiline?'textarea':'input';
    return (
      <div className={`rc-field ${fullWidth?'is-full':''}`} key={key}>
        <label htmlFor={id}>
          {labelText||CONTRACT_LABELS[key]}
          {required&&<span className="rc-req" aria-hidden="true"> *</span>}
        </label>
        <Control
          id={id}
          value={draft[key]||''}
          onChange={e=>update(key,e.target.value)}
          type={multiline?undefined:type}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error?`${id}-error`:undefined}
          {...props}
        />
        {error&&<small id={`${id}-error`} className="rc-error" role="alert">{error}</small>}
      </div>
    );
  };

  return (
    <fieldset disabled={scanBusy} className="rc-lock rc-step-panel" tabIndex={-1}
      aria-label={CONTRACT_STEPS.find(item=>item.id===step)?.label}>
      {step===CONTRACT_STEP.SOURCE&&(
        <div className="rc-step-stack">
          <section className="rc-card" aria-labelledby={`rc-source-heading-${selected}`}>
            <div className="rc-card-head">
              <div className="rc-card-title-row">
                <FileText size={17} aria-hidden="true"/>
                <div>
                  <h3 id={`rc-source-heading-${selected}`}>Chọn mẫu hợp đồng</h3>
                  <p>Chọn mẫu có sẵn hoặc quét mẫu hợp đồng của bạn từ ảnh hay PDF.</p>
                </div>
              </div>
            </div>

            <div className="rc-modes" role="group" aria-label="Cách tạo hợp đồng">
              <MotionButton type="button" aria-pressed={mode==='template'} onClick={()=>changeMode('template')}>
                <FileText size={16}/> Mẫu hệ thống
              </MotionButton>
              <MotionButton type="button" aria-pressed={mode==='scan'} onClick={()=>changeMode('scan')}>
                <ScanLine size={16}/> Quét mẫu của tôi
              </MotionButton>
            </div>

            {mode==='template'?(
              <fieldset className="rc-template-picker">
                <legend className="rm-sr-only">Mẫu hợp đồng có sẵn</legend>
                {catalog ? <div className="rc-template-grid">
                  {catalog.templates.map(template=>{
                    const titleId=`contract-${selected}-template-${template.id}`;
                    const isHouseCard=template.id===HOUSE_RENTAL_TEMPLATE;
                    return <label className="rc-template-option" key={template.id}>
                      <input type="radio" name={`contract-template-${selected}`} value={template.id}
                        aria-labelledby={titleId} checked={draft.template===template.id}
                        onChange={()=>requestTemplateChange(template.id)}/>
                      <span className={'rc-template-thumbnail'+(isHouseCard?' is-house':'')} aria-hidden="true">
                        <span className="rc-template-paper-title"/>
                        {Array.from({length:isHouseCard?4:3},(_,index)=><span key={index}/>)}
                      </span>
                      <span className="rc-template-option-copy">
                        <strong id={titleId}>{template.name}</strong>
                        <small>{template.description}</small>
                      </span>
                    </label>;
                  })}
                </div> : !catalogError&&<p role="status">Đang tải mẫu hợp đồng…</p>}
                {catalogError&&(
                  <div className="rc-inline-alert is-error" role="alert">
                    <span>{catalogError}</span>
                    <MotionButton className="p-button rc-btn-compact" type="button" onClick={onRetryCatalog}>Tải lại mẫu</MotionButton>
                  </div>
                )}
              </fieldset>
            ):(
              <RentalContractScanPanel
                roomId={selected}
                roomNumber={room.roomNumber}
                currentTerms={isTermsCustomized()?draft.terms:''}
                scanAvailable={Boolean(catalog?.scanAvailable)}
                session={currentScanSession}
                onSessionChange={updateScanSession}
                onApply={handleApplyScannedTranscript}
                onWorkingChange={handleScanWorking}
                onVerifyActiveChange={onScanVerifyWideChange}
              />
            )}

            {pendingTemplate&&(
              <div className="rc-inline-alert is-warning" role="alertdialog" aria-label="Xác nhận đổi mẫu hợp đồng">
                <div className="rc-inline-alert-copy">
                  <AlertTriangle size={16} aria-hidden="true"/>
                  <span>Đổi sang mẫu <strong>{pendingTemplate.name}</strong> sẽ ghi đè nội dung điều khoản hiện tại của phòng {room.roomNumber}.</span>
                </div>
                <div className="rc-inline-actions">
                  <MotionButton type="button" className="p-button rc-btn-compact" onClick={()=>setPendingTemplate(null)}>
                    Hủy
                  </MotionButton>
                  <MotionButton type="button" className="p-button primary rc-btn-compact" onClick={()=>applyTemplateChoice(pendingTemplate)}>
                    Xác nhận đổi mẫu
                  </MotionButton>
                </div>
              </div>
            )}

            {mode==='scan'&&scanAppliedNote&&<p className="rc-success-note" role="status">{scanAppliedNote}</p>}
            {roomErrors.source&&<p className="rc-error" role="alert">{roomErrors.source}</p>}
          </section>
        </div>
      )}

      {/* Hai bên và thông tin điền vào mẫu */}
      {step===CONTRACT_STEP.PARTIES&&(
        <div className="rc-step-stack">
          <section className="rc-card" aria-labelledby={`rc-landlord-heading-${selected}`}>
            <div className="rc-card-head">
              <div className="rc-card-title-row">
                <UserCheck size={17} aria-hidden="true"/>
                <div>
                  <h3 id={`rc-landlord-heading-${selected}`}>Bên cho thuê (Bên A)</h3>
                  <p>Điền sẵn từ tài khoản chủ trọ. Bổ sung thông tin định danh nếu cần in lên hợp đồng; không ghi đè hồ sơ tài khoản.</p>
                </div>
              </div>
              {!landlordNeedsInput&&!isHouse&&(
                <MotionButton
                  type="button"
                  className="p-button rc-btn-compact"
                  aria-expanded={showLandlordFields}
                  onClick={()=>setLandlordExpanded(v=>!v)}
                >
                  {showLandlordFields?<><ChevronUp size={14}/> Thu gọn</>:<><Pencil size={14}/> Chỉnh sửa</>}
                </MotionButton>
              )}
            </div>

            {!showLandlordFields?(
              <dl className="rc-summary-dl">
                <div>
                  <dt>Ông / Bà</dt>
                  <dd>{draft.landlordName}</dd>
                </div>
                <div>
                  <dt>Số điện thoại</dt>
                  <dd>{draft.landlordPhone}</dd>
                </div>
                {draft.landlordIdentity&&(
                  <div>
                    <dt>CMND / CCCD</dt>
                    <dd>{draft.landlordIdentity}</dd>
                  </div>
                )}
                {draft.landlordBirthDate&&(
                  <div>
                    <dt>Sinh ngày</dt>
                    <dd>{formatContractDate(draft.landlordBirthDate)}</dd>
                  </div>
                )}
                {draft.landlordAddress&&(
                  <div className="is-full">
                    <dt>Nơi đăng ký HK</dt>
                    <dd>{draft.landlordAddress}</dd>
                  </div>
                )}
                {user?.email&&!draft.landlordAddress&&(
                  <div>
                    <dt>Email tài khoản</dt>
                    <dd>{user.email}</dd>
                  </div>
                )}
              </dl>
            ):(
              <div className="rc-grid">
                {renderField('landlordName',{required:true,labelText:'Ông / Bà (Họ tên Bên A)',placeholder:'Nhập họ tên bên cho thuê'})}
                {renderField('landlordPhone',{required:true,maxLength:20,type:'tel',labelText:'Số điện thoại',placeholder:'Ví dụ: 0901234567'})}
                {!isHouse&&renderField('landlordBirthDate',{type:'date',min:'1900-01-01',max:'2100-12-31',labelText:'Sinh ngày'})}
                {renderField('landlordIdentity',{maxLength:30,labelText:'CMND / CCCD số',placeholder:'Nhập số CMND hoặc CCCD'})}
                {!isHouse&&renderField('landlordIdentityDate',{type:'date',min:'1950-01-01',max:'2100-12-31',labelText:'Ngày cấp'})}
                {!isHouse&&renderField('landlordIdentityPlace',{maxLength:150,labelText:'Nơi cấp',placeholder:'Ví dụ: Cục CSQLHC về TTXH'})}
                {renderField('landlordAddress',{maxLength:300,fullWidth:true,labelText:'Nơi đăng ký HK',placeholder:'Địa chỉ hộ khẩu thường trú của Bên A'})}
              </div>
            )}
          </section>

          <section className="rc-card" aria-labelledby={`rc-tenant-heading-${selected}`}>
            <div className="rc-card-head">
              <div className="rc-card-title-row">
                <Users size={17} aria-hidden="true"/>
                <div>
                  <h3 id={`rc-tenant-heading-${selected}`}>Bên thuê (Bên B) — Phòng {room.roomNumber}</h3>
                  <p>Nhập thông tin người đại diện thuê phòng này.</p>
                </div>
              </div>
            </div>
            <div className="rc-grid">
              {renderField('tenantName',{required:true,labelText:'Ông / Bà (Họ tên Bên B)',placeholder:'Nhập họ và tên người thuê'})}
              {renderField('tenantPhone',{required:true,maxLength:20,type:'tel',labelText:'Số điện thoại',placeholder:'Nhập số điện thoại liên hệ'})}
              {renderField('tenantIdentity',{maxLength:30,labelText:'Số CMND / CCCD',placeholder:'Số CMND hoặc CCCD (không bắt buộc)'})}
              {renderField('tenantAddress',{maxLength:300,labelText:'Nơi đăng ký HK thường trú',placeholder:'Địa chỉ thường trú hoặc liên hệ'})}
              {isHouse&&renderField('tenantCurrentAddress',{maxLength:300})}
              {isHouse&&renderField('occupantCount',{inputMode:'numeric',maxLength:9})}
            </div>

            {!isHouse&&<div className="rc-subtoggle-wrap">
              <button
                type="button"
                className="rc-subtoggle-btn"
                aria-expanded={showTenantExtra}
                onClick={()=>setTenantExtraOpen(v=>!v)}
              >
                {showTenantExtra?<ChevronUp size={14} aria-hidden="true"/>:<ChevronDown size={14} aria-hidden="true"/>}
                <span>Thông tin bổ sung theo mẫu hợp đồng (Ngày sinh, ngày cấp &amp; nơi cấp CMND)</span>
              </button>
              {showTenantExtra&&(
                <div className="rc-grid rc-subtoggle-grid">
                  {renderField('tenantBirthDate',{type:'date',min:'1900-01-01',max:'2100-12-31',labelText:'Sinh ngày'})}
                  {renderField('tenantIdentityDate',{type:'date',min:'1950-01-01',max:'2100-12-31',labelText:'Ngày cấp CMND / CCCD'})}
                  {renderField('tenantIdentityPlace',{maxLength:150,fullWidth:true,labelText:'Nơi cấp CMND / CCCD',placeholder:'Ví dụ: Cục CSQLHC về TTXH'})}
                </div>
              )}
            </div>}
          </section>

          {blanks.length>0&&<section className="rc-card" aria-labelledby={`rc-blanks-${selected}`}>
            <div className="rc-card-head"><div className="rc-card-title-row"><div>
              <h3 id={`rc-blanks-${selected}`}>Điền chỗ trống trong mẫu</h3>
              <p>Thông tin nhập ở đây sẽ xuất hiện đúng vị trí trong hợp đồng. Có thể để trống mục dành để ký tay.</p>
            </div></div></div>
            <div className="rc-grid">
              {blanks.map((blank,index)=>{
                const id=`rc-blank-${selected}-${index}`;
                return <div className="rc-field is-full" key={blank.key}>
                  <label htmlFor={id}>Dòng {blank.line+1}{blank.total>1?` · Chỗ trống ${blank.position}/${blank.total}`:''}</label>
                  <small id={`${id}-context`} className="rc-blank-context">
                    {blank.context.slice(0,blank.start)}<mark>{blank.token||'…'}</mark>{blank.context.slice(blank.start+blank.token.length)}
                  </small>
                  <input id={id} value={draft.blankValues?.[blank.key]||''} maxLength={2000}
                    aria-invalid={Boolean(roomErrors.blankValues)} aria-describedby={`${id}-context${roomErrors.blankValues?` rc-blanks-error-${selected}`:''}`}
                    onChange={e=>update('blankValues',{...draft.blankValues,[blank.key]:e.target.value})}/>
                </div>;
              })}
            </div>
            {roomErrors.blankValues&&<p id={`rc-blanks-error-${selected}`} className="rc-error" role="alert">{roomErrors.blankValues}</p>}
          </section>}
        </div>
      )}

      {/* Kỳ thuê và chi phí */}
      {step===CONTRACT_STEP.LEASE&&(
        <div className="rc-step-stack">
          <section className="rc-ref-strip" aria-label="Thông tin phòng tham chiếu">
            <Building2 size={17} aria-hidden="true"/>
            <div>
              <strong>Phòng {room.roomNumber}</strong>
              {room.floor?` · ${room.floor}`:''}
              {room.roomType?` · ${room.roomType}`:''}
              <p>{property?.name||'Nhà trọ'}{property?.address?` — ${property.address}`:''}</p>
            </div>
          </section>

          <section className="rc-card" aria-labelledby={`rc-lease-heading-${selected}`}>
            <div className="rc-card-head">
              <div className="rc-card-title-row">
                <Calendar size={17} aria-hidden="true"/>
                <div>
                  <h3 id={`rc-lease-heading-${selected}`}>Thời gian thuê</h3>
                  <p>{rooms.length>1?'Khoảng ngày thuê áp dụng chung cho các phòng đã chọn.':'Xác định ngày bắt đầu, ngày kết thúc và ngày lập hợp đồng.'}</p>
                </div>
              </div>
            </div>
            <div className="rc-grid">
              <div className="rc-field">
                <label htmlFor="bulk-leaseStartDate">Ngày bắt đầu thuê <span className="rc-req" aria-hidden="true">*</span></label>
                <input
                  id="bulk-leaseStartDate"
                  type="date"
                  required
                  min="0001-01-01"
                  max="9999-12-31"
                  value={dates.leaseStartDate||''}
                  onChange={e=>onDateChange('leaseStartDate',e.target.value)}
                  aria-required="true"
                  aria-invalid={Boolean(leaseErrors.leaseStartDate)}
                  aria-describedby={leaseErrors.leaseStartDate?'bulk-leaseStartDate-error':undefined}
                />
                {leaseErrors.leaseStartDate&&<small id="bulk-leaseStartDate-error" className="rc-error" role="alert">{leaseErrors.leaseStartDate}</small>}
              </div>

              <div className="rc-field">
                <label htmlFor="bulk-leaseEndDate">Ngày kết thúc thuê <span className="rc-req" aria-hidden="true">*</span></label>
                <input
                  id="bulk-leaseEndDate"
                  type="date"
                  required
                  min={dates.leaseStartDate||'0001-01-01'}
                  max="9999-12-31"
                  value={dates.leaseEndDate||''}
                  onChange={e=>onDateChange('leaseEndDate',e.target.value)}
                  aria-required="true"
                  aria-invalid={Boolean(leaseErrors.leaseEndDate)}
                  aria-describedby={leaseErrors.leaseEndDate?'bulk-leaseEndDate-error':undefined}
                />
                {leaseErrors.leaseEndDate&&<small id="bulk-leaseEndDate-error" className="rc-error" role="alert">{leaseErrors.leaseEndDate}</small>}
              </div>

              {isHouse
                ?renderField('contractDate',{type:'date',value:contractToday(),readOnly:true})
                :renderField('contractDate',{type:'date',min:'2000-01-01',max:'2100-12-31',labelText:'Ngày lập hợp đồng (không bắt buộc)'})}
            </div>
          </section>

          <section className="rc-card" aria-labelledby={`rc-finance-heading-${selected}`}>
            <div className="rc-card-head">
              <div className="rc-card-title-row">
                <Coins size={17} aria-hidden="true"/>
                <div>
                  <h3 id={`rc-finance-heading-${selected}`}>Chi phí &amp; thanh toán</h3>
                  <p>Thỏa thuận tiền thuê của đợt này không tự thay đổi giá niêm yết phòng.</p>
                </div>
              </div>
            </div>
            <div className="rc-grid">
              {['rent','deposit'].map(key=>{
                const id=`contract-${selected}-${key}`;
                const error=roomErrors[key];
                return (
                  <div className="rc-field" key={key}>
                    <label htmlFor={id}>{CONTRACT_LABELS[key]} (đ) <span className="rc-req" aria-hidden="true">*</span></label>
                    <VndMoneyInput
                      id={id}
                      value={draft[key]}
                      onChange={e=>update(key,e.target.value)}
                      maxLength={13}
                      aria-required="true"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error?`${id}-error`:undefined}
                    />
                    {error&&<small id={`${id}-error`} className="rc-error" role="alert">{error}</small>}
                  </div>
                );
              })}
              <div className="rc-field">
                <label htmlFor={`contract-${selected}-paymentDay`}>
                  {CONTRACT_LABELS.paymentDay} <span className="rc-req" aria-hidden="true">*</span>
                </label>
                <input
                  id={`contract-${selected}-paymentDay`}
                  type="number"
                  min={1}
                  max={28}
                  maxLength={2}
                  value={draft.paymentDay||''}
                  onChange={e=>update('paymentDay',e.target.value)}
                  aria-required="true"
                  aria-invalid={Boolean(roomErrors.paymentDay)}
                  aria-describedby={roomErrors.paymentDay?`contract-${selected}-paymentDay-error`:`contract-${selected}-paymentDay-hint`}
                />
                <small id={`contract-${selected}-paymentDay-hint`}>Nhập ngày từ 1 đến 28 hằng tháng.</small>
                {roomErrors.paymentDay&&<small id={`contract-${selected}-paymentDay-error`} className="rc-error" role="alert">{roomErrors.paymentDay}</small>}
              </div>
              {renderField('paymentMethod',{maxLength:200,labelText:'Hình thức thanh toán',placeholder:'Ví dụ: Chuyển khoản hoặc tiền mặt'})}
              {isHouse&&renderField('paymentCycle',{maxLength:100,placeholder:'Ví dụ: 1 tháng/lần'})}
              {isHouse&&renderField('firstPaymentDate',{type:'date'})}
            </div>
          </section>

          <section className="rc-card" aria-labelledby={`rc-utilities-heading-${selected}`}>
            <div className="rc-card-head">
              <div className="rc-card-title-row">
                <Zap size={17} aria-hidden="true"/>
                <div>
                  <h3 id={`rc-utilities-heading-${selected}`}>Điện, nước &amp; dịch vụ</h3>
                  <p>Điền sẵn từ cấu hình loại phòng nếu có. Bỏ trống để hiển thị <strong>Chưa thiết lập</strong> trên hợp đồng.</p>
                </div>
              </div>
            </div>
            <div className="rc-grid">
              <div className="rc-field">
                <label htmlFor={`contract-${selected}-electricityPrice`}>Tiền điện (đ/kWh)</label>
                <VndMoneyInput
                  id={`contract-${selected}-electricityPrice`}
                  value={draft.electricityPrice}
                  onChange={e=>update('electricityPrice',e.target.value)}
                  maxLength={11}
                  placeholder="Chưa thiết lập"
                  aria-invalid={Boolean(roomErrors.electricityPrice)}
                />
                <small>Tính theo chỉ số công tơ, thanh toán vào cuối các tháng.</small>
                {roomErrors.electricityPrice&&<small className="rc-error" role="alert">{roomErrors.electricityPrice}</small>}
              </div>

              <div className="rc-field">
                <label htmlFor={`contract-${selected}-waterPrice`}>Tiền nước</label>
                <div className="rc-input-group">
                  <VndMoneyInput
                    id={`contract-${selected}-waterPrice`}
                    value={draft.waterPrice}
                    onChange={e=>update('waterPrice',e.target.value)}
                    maxLength={11}
                    placeholder="Chưa thiết lập"
                    aria-invalid={Boolean(roomErrors.waterPrice)}
                  />
                  <select
                    aria-label="Đơn vị tính tiền nước"
                    value={draft.waterUnit||'người'}
                    onChange={e=>update('waterUnit',e.target.value)}
                  >
                    <option value="người">đ/người</option>
                    <option value="m³">đ/m³</option>
                  </select>
                </div>
                <small>{(draft.waterUnit||'người')==='m³'?'Tính theo chỉ số đồng hồ, thanh toán vào cuối các tháng.':'Thanh toán vào đầu các tháng.'}</small>
                {roomErrors.waterPrice&&<small className="rc-error" role="alert">{roomErrors.waterPrice}</small>}
              </div>

              <div className="rc-field">
                <label htmlFor={`contract-${selected}-internetPrice`}>Internet / Wifi (đ/phòng/tháng)</label>
                <VndMoneyInput
                  id={`contract-${selected}-internetPrice`}
                  value={draft.internetPrice}
                  onChange={e=>update('internetPrice',e.target.value)}
                  maxLength={11}
                  placeholder="Chưa thiết lập"
                  aria-invalid={Boolean(roomErrors.internetPrice)}
                />
                {roomErrors.internetPrice&&<small className="rc-error" role="alert">{roomErrors.internetPrice}</small>}
              </div>

              <div className="rc-field">
                <label htmlFor={`contract-${selected}-servicePrice`}>Dịch vụ chung (đ/người/tháng)</label>
                <VndMoneyInput
                  id={`contract-${selected}-servicePrice`}
                  value={draft.servicePrice}
                  onChange={e=>update('servicePrice',e.target.value)}
                  maxLength={11}
                  placeholder="Chưa thiết lập"
                  aria-invalid={Boolean(roomErrors.servicePrice)}
                />
                {roomErrors.servicePrice&&<small className="rc-error" role="alert">{roomErrors.servicePrice}</small>}
              </div>
            </div>
          </section>
          {isHouse&&<section className="rc-card" aria-label="Diện tích và trang thiết bị">
            <div className="rc-card-head"><div className="rc-card-title-row"><div>
              <h3>Diện tích và trang thiết bị</h3>
              <p>Lấy từ thông tin phòng {room.roomNumber}.</p>
            </div></div></div>
            <dl className="rc-summary-dl">
              <div><dt>Phần diện tích thuê</dt><dd>{draft.rentalScope||'Chưa có dữ liệu'}</dd></div>
              <div><dt>Trang thiết bị kèm theo</dt><dd>{draft.includedEquipment||'Không có thiết bị ghi nhận'}</dd></div>
            </dl>
          </section>}
        </div>
      )}

      {/* Điều khoản và xác nhận */}
      {step===CONTRACT_STEP.REVIEW&&(
        <div className="rc-step-stack">
          <section className="rc-card" aria-labelledby={`rc-terms-heading-${selected}`}>
            <div className="rc-card-head">
              <div className="rc-card-title-row">
                <div>
                  <h3 id={`rc-terms-heading-${selected}`}>
                    {draft.scanFullDocument?'Nội dung mẫu đã quét':isHouse?'Điều khoản của Mẫu 2':'Trách nhiệm của các bên & trách nhiệm chung'} <span className="rc-req" aria-hidden="true">*</span>
                  </h3>
                  <p>
                    {draft.template==='OWNER_SCAN'
                      ?`Văn bản đã đối chiếu${draft.sourceName?` (${draft.sourceName})`:''}.${blanks.length?' Các ô điền theo mẫu nằm ở bước Hai bên.':''}`
                      :systemSections
                        ?'Mở từng mục để kiểm tra hoặc chỉnh sửa.'
                        :'Chỉnh sửa trực tiếp nội dung điều khoản thỏa thuận.'}
                  </p>
                </div>
              </div>
              {systemSections&&(
                <MotionButton type="button" className="p-button rc-btn-compact" onClick={toggleAllClauses}>
                  {allClausesOpen?'Thu gọn tất cả':'Mở tất cả'}
                </MotionButton>
              )}
            </div>

            {systemSections?(
              <div className="rc-clause-list">
                {systemSections.map((sec,idx)=>{
                  const expanded=openClauses.has(sec.index);
                  const clauseId=`contract-${selected}-clause-${sec.index}`;
                  const snippet=sec.body.trim().replace(/\s+/g,' ');
                  return (
                    <div key={sec.index} className={`rc-clause ${expanded?'is-open':''}`}>
                      <button
                        type="button"
                        className="rc-clause-head"
                        aria-expanded={expanded}
                        aria-controls={clauseId}
                        onClick={()=>toggleClause(sec.index)}
                      >
                        <div className="rc-clause-meta">
                          <strong>{sec.heading}</strong>
                          {!expanded&&snippet&&<span>{snippet}</span>}
                        </div>
                        {expanded?<ChevronUp size={16} aria-hidden="true"/>:<ChevronDown size={16} aria-hidden="true"/>}
                      </button>
                      {expanded&&(
                        <div className="rc-clause-body" id={clauseId}>
                          <label className="rm-sr-only" htmlFor={`${clauseId}-input`}>{sec.heading}</label>
                          <textarea
                            id={`${clauseId}-input`}
                            rows={Math.min(8,Math.max(3,sec.body.split('\n').length+1))}
                            value={sec.body}
                            onChange={e=>updateClauseBody(idx,e.target.value)}
                            aria-invalid={Boolean(roomErrors.terms)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ):(
              <div className="rc-field">
                <label className="rm-sr-only" htmlFor={`contract-${selected}-terms`}>Điều khoản thỏa thuận</label>
                <textarea
                  id={`contract-${selected}-terms`}
                  rows={8}
                  maxLength={30000}
                  spellCheck={draft.template!=='OWNER_SCAN'}
                  value={draft.terms||''}
                  onChange={e=>update('terms',e.target.value)}
                  aria-required="true"
                  aria-invalid={Boolean(roomErrors.terms)}
                  aria-describedby={roomErrors.terms?`contract-${selected}-terms-error`:undefined}
                />
              </div>
            )}

            <div className="rc-terms-foot">
              <small>
                {(draft.terms||'').length.toLocaleString('vi-VN')}/30.000 ký tự
                {draft.fullScannedTranscript&&draft.fullScannedTranscript!==draft.terms
                  ?` · Đang lưu kèm toàn bộ bản chép gốc (${draft.fullScannedTranscript.length.toLocaleString('vi-VN')} ký tự)`:''}
              </small>
              {roomErrors.terms&&<small id={`contract-${selected}-terms-error`} className="rc-error" role="alert">{roomErrors.terms}</small>}
            </div>

            {rooms.length>1&&(
              <div className="rc-common-wrap">
                {!confirmCommon?(
                  <MotionButton
                    type="button"
                    className="p-button"
                    onClick={()=>otherRoomsHaveCustomTerms?setConfirmCommon(true):executeApplyCommon()}
                  >
                    {draft.scanFullDocument?'Dùng mẫu quét và bên cho thuê cho tất cả phòng':'Dùng điều khoản và bên cho thuê cho tất cả phòng'}
                  </MotionButton>
                ):(
                  <div className="rc-inline-alert is-warning" role="alertdialog" aria-label="Xác nhận áp dụng chung điều khoản">
                    <div className="rc-inline-alert-copy">
                      <AlertTriangle size={16} aria-hidden="true"/>
                      <span>Thao tác này sẽ ghi đè điều khoản, chi phí điện nước và thông tin Bên A ở các phòng khác trong nhóm (không thay đổi người thuê, tiền thuê, tiền cọc).</span>
                    </div>
                    <div className="rc-inline-actions">
                      <MotionButton type="button" className="p-button rc-btn-compact" onClick={()=>setConfirmCommon(false)}>Hủy</MotionButton>
                      <MotionButton type="button" className="p-button primary rc-btn-compact" onClick={executeApplyCommon}>Xác nhận áp dụng</MotionButton>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className={`rc-card rc-confirm-card ${draft.reviewed?'is-confirmed':''} ${roomErrors.reviewed?'has-error':''}`}>
            <label className="rc-checkbox rc-confirm-check">
              <input
                id={`contract-${selected}-reviewed`}
                type="checkbox"
                checked={Boolean(draft.reviewed)}
                onChange={e=>update('reviewed',e.target.checked)}
                aria-invalid={Boolean(roomErrors.reviewed)}
                aria-describedby={roomErrors.reviewed?`contract-${selected}-reviewed-error`:undefined}
              />
              <CheckCircle2 size={18} aria-hidden="true"/>
              <span>
                <strong>Tôi đã đối chiếu thông tin và đọc bản xem trước</strong>
                <small>Áp dụng cho hợp đồng phòng {room.roomNumber}. Nếu chỉnh sửa lại nội dung, bạn sẽ cần xác nhận lại.</small>
              </span>
            </label>
            {roomErrors.reviewed&&(
              <p id={`contract-${selected}-reviewed-error`} className="rc-error" role="alert">{roomErrors.reviewed}</p>
            )}
            <p className="rc-hint">
              Lưu hợp đồng không tự động ký kết. Hợp đồng được lưu ở trạng thái <strong>Chưa ký</strong> và có thể tải nội dung sau khi lưu.
            </p>
          </section>
        </div>
      )}
    </fieldset>
  );
}
