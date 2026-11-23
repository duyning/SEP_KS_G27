import {ArrowLeft,Eye,FileText,Maximize2} from 'lucide-react';
import {MotionButton} from './motion/MotionUI.jsx';
import { formatSigningDate, SignatureStrokes } from './ContractSigningForm.jsx';
import {buildContractModel,HOUSE_RENTAL_TEMPLATE,houseRentalSections,parseSystemTermsSections} from '../services/rental-contracts.js';

function DocValue({value,fallback='Chưa điền',required=false}){
  if(value)return <span className="rc-doc-val">{value}</span>;
  return <span className={`rc-doc-empty ${required?'is-required':''}`}>{fallback}</span>;
}

function ContractSignatures({ model, tenantLabel = 'ĐẠI DIỆN BÊN B', ownerLabel = 'ĐẠI DIỆN BÊN A' }) {
  return (
    <section className="rc-paper-signatures" aria-label="Phần chữ ký">
      {[
        [tenantLabel, model.tenant.name, model.tenantSignature],
        [ownerLabel, model.landlord.name, model.ownerSignature],
      ].map(([label, name, signature]) => (
        <div key={label}>
          <strong>{label}</strong>
          <span>{signature ? 'Đã ký trên hệ thống' : '(Ký, ghi rõ họ tên)'}</span>
          {signature?.method === 'DRAWN' ? (
            <svg className="rc-sig-image" xmlns="http://www.w3.org/2000/svg" width="600" height="200" viewBox="0 0 600 200" role="img" aria-label={`Nét ký của ${signature.name}`}>
              <SignatureStrokes strokes={signature.strokes} />
            </svg>
          ) : signature ? (
            <div className="rc-sig-typed">{signature.name}</div>
          ) : <div className="rc-sig-space" />}
          <span className="rc-sig-name">{signature?.name || name}</span>
          {signature && <time className="rc-sig-date" dateTime={signature.signedAt}>{formatSigningDate(signature.signedAt)}</time>}
        </div>
      ))}
    </section>
  );
}

function HouseRentalDocument({model}){
  const renderFields=fields=>fields.map(([label,value])=><p className="rc-house-field" key={label}><strong>{label}</strong>: {value}</p>);
  return <article className="rc-paper rc-paper-full rc-official-doc rc-house-doc">
    <header className="rc-official-head">
      <p className="rc-official-nation">{model.nationalHeader}</p>
      <p className="rc-official-motto">{model.nationalMotto}</p>
      <p className="rc-house-date">Hà Nội, {model.contractDateLong}</p>
      <h3>{model.title}</h3>
      {model.contractCode&&<p className="rc-paper-meta">Mã hợp đồng: {model.contractCode}</p>}
    </header>
    <p className="rc-official-lead">Chúng tôi gồm:</p>
    {houseRentalSections(model).map((section,index)=><section className="rc-official-section rc-official-terms" key={index}>
      {index===2&&<p>Hai bên thống nhất ký kết hợp đồng với các nội dung sau:</p>}
      <h4>{section.title}</h4>
      {renderFields(section.fields)}
      {section.groups.map(group=><div className="rc-house-group" key={group.title}>
        <h5>{group.title}</h5>{renderFields(group.fields)}
        {group.body&&<pre>{group.body}</pre>}
      </div>)}
      {section.body&&<pre>{section.body.trim()}</pre>}
    </section>)}
    <ContractSignatures model={model} tenantLabel="BÊN THUÊ NHÀ" ownerLabel="BÊN CHO THUÊ NHÀ" />
  </article>;
}

function formatPaymentMethod({paymentMethod,paymentDay}){
  if(!paymentDay)return paymentMethod;
  return paymentMethod
    ?`${paymentMethod} (hạn trả: ngày ${paymentDay} hằng tháng)`
    :`Thanh toán vào ngày ${paymentDay} hằng tháng`;
}

export function RentalContractDocument({model,showDraftStatus=false}){
  if(model.scanFullDocument){
    return <article className="rc-paper rc-paper-full rc-official-doc rc-official-terms" aria-label="Nội dung mẫu đã quét">
      <pre>{model.terms}</pre>
      {(model.ownerSignature || model.tenantSignature) && <ContractSignatures model={model} />}
    </article>;
  }
  if(model.template===HOUSE_RENTAL_TEMPLATE)return <HouseRentalDocument model={model}/>;

  const paymentMethodDisplay=formatPaymentMethod(model.finance);
  return <article className="rc-paper rc-paper-full rc-official-doc">
    <header className="rc-official-head">
      <p className="rc-official-nation">{model.nationalHeader}</p>
      <p className="rc-official-motto">{model.nationalMotto}</p>
      <div className="rc-official-rule" aria-hidden="true"/>
      <h3>{model.title}</h3>
      {showDraftStatus&&<div className="rc-paper-meta">
        <span>Mã hợp đồng: {model.contractCode||'Chưa cấp mã (chưa lưu)'}</span>
        <span aria-hidden="true">·</span>
        <span>Trạng thái: <strong>{model.contractStatus}</strong></span>
      </div>}
    </header>

    <p className="rc-official-line">
      Hôm nay{' '}
      {model.contractDateLong
        ?<span className="rc-doc-val">{model.contractDateLong}</span>
        :<span className="rc-doc-empty">ngày …… tháng …… năm ……</span>}
      ; tại địa chỉ:{' '}
      <DocValue value={model.propertyAddress||model.propertyName} fallback="Chưa cập nhật"/>
    </p>
    <p className="rc-official-lead">Chúng tôi gồm:</p>

    <section className="rc-official-section">
      <h4>1. Đại diện bên cho thuê phòng trọ (Bên A):</h4>
      <div className="rc-official-fields">
        <p>
          <span>Ông/bà: <DocValue value={model.landlord.name} required/></span>
          <span>Sinh ngày: <DocValue value={model.landlord.birthDate} fallback="Chưa cung cấp"/></span>
        </p>
        <p>
          <span>Nơi đăng ký HK: <DocValue value={model.landlord.address} fallback="Chưa cung cấp"/></span>
        </p>
        <p>
          <span>CMND/CCCD số: <DocValue value={model.landlord.identity} fallback="Chưa cung cấp"/></span>
          <span>cấp ngày: <DocValue value={model.landlord.identityDate} fallback="Chưa cung cấp"/></span>
          <span>tại: <DocValue value={model.landlord.identityPlace} fallback="Chưa cung cấp"/></span>
        </p>
        <p>
          <span>Số điện thoại: <DocValue value={model.landlord.phone} required/></span>
        </p>
      </div>
    </section>

    <section className="rc-official-section">
      <h4>2. Bên thuê phòng trọ (Bên B):</h4>
      <div className="rc-official-fields">
        <p>
          <span>Ông/bà: <DocValue value={model.tenant.name} required/></span>
          <span>Sinh ngày: <DocValue value={model.tenant.birthDate} fallback="Chưa cung cấp"/></span>
        </p>
        <p>
          <span>Nơi đăng ký HK thường trú: <DocValue value={model.tenant.address} fallback="Chưa cung cấp"/></span>
        </p>
        <p>
          <span>Số CMND/CCCD: <DocValue value={model.tenant.identity} fallback="Chưa cung cấp"/></span>
          <span>cấp ngày: <DocValue value={model.tenant.identityDate} fallback="Chưa cung cấp"/></span>
          <span>tại: <DocValue value={model.tenant.identityPlace} fallback="Chưa cung cấp"/></span>
        </p>
        <p>
          <span>Số điện thoại: <DocValue value={model.tenant.phone} required/></span>
        </p>
      </div>
    </section>

    <p className="rc-official-lead is-italic">
      Sau khi bàn bạc trên tinh thần dân chủ, hai bên cùng có lợi, cùng thống nhất như sau:
    </p>

    <section className="rc-official-section rc-official-agreement">
      <p>
        Bên A đồng ý cho bên B thuê 01 phòng ở tại địa chỉ:{' '}
        <DocValue value={model.rentalLocation} fallback="Chưa cập nhật"/>
      </p>
      <p>
        <strong>Giá thuê:</strong>{' '}
        <DocValue value={model.finance.rent?`${model.finance.rent}/tháng`:null} required/>
      </p>
      <p>
        <strong>Hình thức thanh toán:</strong>{' '}
        <DocValue value={paymentMethodDisplay} required/>
      </p>
      <p>
        <strong>Tiền điện:</strong>{' '}
        {model.electricity?.display?(
          <>
            <span className="rc-doc-val">{model.electricity.display}</span>{' '}
            {model.electricity.basis}.
          </>
        ):(
          <span className="rc-doc-empty">Chưa thiết lập</span>
        )}
      </p>
      <p>
        <strong>Tiền nước:</strong>{' '}
        {model.water?.display?(
          <>
            <span className="rc-doc-val">{model.water.display}</span>{' '}
            {model.water.basis}.
          </>
        ):(
          <span className="rc-doc-empty">Chưa thiết lập</span>
        )}
      </p>
      {model.extraUtilities.filter(item=>item.display).map(item=>(
        <p key={item.key}>
          <strong>{item.label}:</strong>{' '}
          <span className="rc-doc-val">{item.display}</span> ({item.basis}).
        </p>
      ))}
      <p>
        <strong>Tiền đặt cọc:</strong>{' '}
        <DocValue value={model.finance.deposit} required/>
      </p>
      <p>
        Hợp đồng có giá trị kể từ{' '}
        {model.lease.startDateLong
          ?<span className="rc-doc-val">{model.lease.startDateLong}</span>
          :<span className="rc-doc-empty is-required">Chưa điền ngày bắt đầu</span>}
        {' '}đến{' '}
        {model.lease.endDateLong
          ?<span className="rc-doc-val">{model.lease.endDateLong}</span>
          :<span className="rc-doc-empty is-required">Chưa điền ngày kết thúc</span>}.
      </p>
    </section>

    {model.officialSections?(
      <>
        <section className="rc-official-section rc-official-terms">
          <h4 className="rc-official-heading-upper">TRÁCH NHIỆM CỦA CÁC BÊN</h4>
          <p className="rc-official-subhead">* {model.officialSections.partyA.title}:</p>
          <pre>{model.officialSections.partyA.body.trim()}</pre>
          <p className="rc-official-subhead">* {model.officialSections.partyB.title}:</p>
          <pre>{model.officialSections.partyB.body.trim()}</pre>
        </section>
        <section className="rc-official-section rc-official-terms">
          <h4 className="rc-official-heading-upper">TRÁCH NHIỆM CHUNG</h4>
          <pre>{model.officialSections.general.body.trim()}</pre>
        </section>
      </>
    ):(
      <section className="rc-official-section rc-official-terms">
        <h4 className="rc-official-heading-upper">TRÁCH NHIỆM CỦA CÁC BÊN VÀ ĐIỀU KHOẢN THỎA THUẬN</h4>
        {model.terms?<pre>{model.terms}</pre>:<p className="rc-doc-empty is-required">Chưa nhập điều khoản thỏa thuận</p>}
      </section>
    )}

    <ContractSignatures model={model} />

  </article>;
}

export default function RentalContractPreview({
  draft,
  room,
  property={},
  dates={},
  utilities=[],
  templateName='',
  contractCode=null,
  fullDocument=false,
  step=1,
  onOpenFull,
  onCloseFull,
}){
  const model=buildContractModel({
    details:draft,
    propertyName:property?.name||'',
    propertyAddress:property?.address||'',
    roomNumber:room?.roomNumber||'',
    startDate:dates?.leaseStartDate||'',
    endDate:dates?.leaseEndDate||'',
    contractCode,
    utilities,
  });

  const sections=model.template!=='OWNER_SCAN'?parseSystemTermsSections(model.terms||''):null;
  const houseTemplate=model.template===HOUSE_RENTAL_TEMPLATE;
  const sourceLabel=model.template==='OWNER_SCAN'
    ?(model.sourceName?`Bản scan (${model.sourceName})`:'Mẫu riêng từ bản scan')
    :(templateName||'Mẫu hệ thống');

  if(fullDocument){
    return (
      <section className="rc-full-preview" aria-label={`Bản xem trước đầy đủ hợp đồng phòng ${room?.roomNumber||''}`}>
        <div className="rc-full-preview-bar">
          <div className="rc-full-preview-title">
            <FileText size={17} aria-hidden="true"/>
            <strong>Bản xem trước đầy đủ</strong>
            {model.roomNumber&&<span className="rc-pill is-room">Phòng {model.roomNumber}</span>}
            <span className="rc-pill is-unsigned">{model.contractStatus}</span>
          </div>
          <MotionButton type="button" className="p-button rc-preview-back-btn" onClick={onCloseFull}>
            <ArrowLeft size={15} aria-hidden="true"/>
            <span>Quay lại bước {step}</span>
          </MotionButton>
        </div>

        <div className="rc-full-preview-sheet-wrap">
          <RentalContractDocument model={model} showDraftStatus/>
        </div>
      </section>
    );
  }

  const paymentMethodDisplay=formatPaymentMethod(model.finance);
  return (
    <aside className="rc-preview-rail" aria-label="Bản xem trước hợp đồng">
      <div className="rc-preview-rail-head">
        <div>
          <span className="rc-preview-eyebrow"><Eye size={14} aria-hidden="true"/> Bản xem trước</span>
          <span className="rc-pill is-unsigned">{model.contractStatus}</span>
        </div>
        <MotionButton type="button" className="p-button rc-btn-compact" onClick={onOpenFull}>
          <Maximize2 size={14} aria-hidden="true"/>
          <span>Xem bản đầy đủ</span>
        </MotionButton>
      </div>

      {model.scanFullDocument?<article className="rc-paper rc-paper-summary">
        <div className="rc-paper-block rc-official-terms">
          <h4>Mẫu hợp đồng đã quét</h4>
          <p className="rc-paper-source">{model.sourceName}</p>
          <pre>{model.terms.length>800?`${model.terms.slice(0,800)}…`:model.terms}</pre>
        </div>
      </article>:<article className="rc-paper rc-paper-summary">
        <header className="rc-paper-summary-head">
          <p className="rc-summary-nation">{model.nationalHeader}</p>
          <p className="rc-summary-motto">{model.nationalMotto}</p>
          <h4>{model.title}</h4>
          <p>
            <strong>Phòng {model.roomNumber||'—'}</strong>
            {model.propertyName?` · ${model.propertyName}`:''}
          </p>
          {model.propertyAddress&&<small>{model.propertyAddress}</small>}
        </header>

        <div className="rc-paper-block">
          <h5>1. Bên A &amp; 2. Bên B</h5>
          <dl className="rc-paper-dl compact">
            <div><dt>Bên A (Cho thuê)</dt><dd><DocValue value={model.landlord.name} required/></dd></div>
            <div><dt>SĐT Bên A</dt><dd><DocValue value={model.landlord.phone} required/></dd></div>
            {model.landlord.identity&&<div><dt>CMND/CCCD Bên A</dt><dd>{model.landlord.identity}</dd></div>}
            <div><dt>Bên B (Người thuê)</dt><dd><DocValue value={model.tenant.name} required/></dd></div>
            <div><dt>SĐT Bên B</dt><dd><DocValue value={model.tenant.phone} required/></dd></div>
            <div><dt>CMND/CCCD Bên B</dt><dd><DocValue value={model.tenant.identity} fallback="Chưa cung cấp"/></dd></div>
          </dl>
        </div>

        <div className="rc-paper-block">
          <h5>Thỏa thuận thuê &amp; chi phí</h5>
          <dl className="rc-paper-dl compact">
            <div>
              <dt>Giá trị hợp đồng</dt>
              <dd>
                {model.lease.startDate&&model.lease.endDate
                  ?`${model.lease.startDate} → ${model.lease.endDate}`
                  :<><DocValue value={model.lease.startDate} required/> → <DocValue value={model.lease.endDate} required/></>}
              </dd>
            </div>
            <div><dt>Giá thuê</dt><dd className="rc-paper-num is-accent"><DocValue value={model.finance.rent?`${model.finance.rent}/tháng`:null} required/></dd></div>
            <div><dt>Tiền đặt cọc</dt><dd className="rc-paper-num"><DocValue value={model.finance.deposit} required/></dd></div>
            <div><dt>Thanh toán</dt><dd><DocValue value={paymentMethodDisplay} required/></dd></div>
          </dl>
        </div>

        <div className="rc-paper-block">
          <h5>Điện, nước &amp; dịch vụ</h5>
          <dl className="rc-paper-dl compact">
            {model.utilities.map(item=>(
              <div key={item.key}>
                <dt>{item.label}</dt>
                <dd className="rc-paper-num"><DocValue value={item.display} fallback="Chưa thiết lập"/></dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rc-paper-block">
          <h5>{houseTemplate?'Các điều khoản':'Trách nhiệm các bên'}</h5>
          <p className="rc-paper-source">Nguồn: {sourceLabel}</p>
          {model.terms?(
            sections?(
              <ul className="rc-paper-clause-list">
                {sections.map(sec=><li key={sec.index}>{sec.heading}</li>)}
              </ul>
            ):(
              <p className="rc-paper-excerpt">
                {model.terms.length>180?`${model.terms.slice(0,180)}…`:model.terms}
              </p>
            )
          ):(
            <p className="rc-doc-empty is-required">Chưa có nội dung điều khoản</p>
          )}
        </div>

        <footer className="rc-paper-summary-foot">
          <span className={`rc-review-tag ${draft.reviewed?'is-done':''}`}>
            {draft.reviewed?'Đã đối chiếu nội dung':'Chưa xác nhận đối chiếu'}
          </span>
          <button type="button" className="rc-text-link" onClick={onOpenFull}>
            Đọc toàn văn &amp; chữ ký
          </button>
        </footer>
      </article>}
    </aside>
  );
}
