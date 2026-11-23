import { useEffect, useId, useRef, useState } from 'react';
import { Copy, Download, FileText, Link2, LoaderCircle, PenLine, X } from 'lucide-react';
import { MotionButton, MotionDialog } from './motion/MotionUI.jsx';
import { RentalContractDocument } from './RentalContractPreview.jsx';
import ContractSigningForm, { ContractSigningStatus, formatSigningDate } from './ContractSigningForm.jsx';
import {
  buildContractModel,
  formatContractDate,
  rentalContractsApi,
} from '../services/rental-contracts.js';
import { downloadContractPdf } from '../services/rental-contract-pdf.js';
import '../styles/rental-contracts.css';

const statusLabel = record => record.status === 'ACTIVE' ? 'Đang quản lý' : 'Đã kết thúc';
const leaseLabel = record => [record.startDate, record.endDate].map(formatContractDate).filter(Boolean).join(' – ');

function OwnerSigningControls({ contract, onSigned }) {
  const [showForm, setShowForm] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [creatingLink, setCreatingLink] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [error, setError] = useState('');

  async function createLink() {
    setError('');
    setCreatingLink(true);
    try {
      const { token, expiresAt } = await rentalContractsApi.createSigningLink(contract.id);
      setInvitation({ url: `${window.location.origin}/contracts/sign#${token}`, expiresAt });
      setCopyMessage('');
    } catch (failure) {
      setError(failure.message);
    } finally {
      setCreatingLink(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(invitation.url);
      setCopyMessage('Đã sao chép liên kết.');
    } catch {
      setCopyMessage('Chọn dòng liên kết để sao chép thủ công.');
    }
  }

  return (
    <section className="rc-sign-overview" aria-label="Ký và mời ký hợp đồng">
      <div className="rc-sign-overview-row">
        <ContractSigningStatus record={contract} />
        {contract.status === 'ACTIVE' && (
          <div className="rc-sign-buttons">
            {!contract.tenantSignature && (
              <button type="button" className="p-button" disabled={creatingLink || Boolean(invitation)} onClick={createLink}>
                {creatingLink ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
                {creatingLink ? 'Đang tạo liên kết…' : 'Tạo liên kết mời ký'}
              </button>
            )}
            {!contract.ownerSignature && !showForm && (
              <button type="button" className="p-button primary" onClick={() => setShowForm(true)}>
                <PenLine size={16} aria-hidden="true" /> Ký hợp đồng
              </button>
            )}
          </div>
        )}
      </div>
      {invitation && !contract.tenantSignature && (
        <div className="rc-sign-invite">
          <label>
            <strong>Liên kết mời người thuê ký</strong>
            <span>Hạn ký {formatSigningDate(invitation.expiresAt)}. Tạo lại liên kết sẽ thay thế liên kết cũ.</span>
            <input type="text" value={invitation.url} readOnly onFocus={event => event.target.select()} />
          </label>
          <button type="button" className="p-button" onClick={copyLink}><Copy size={16} aria-hidden="true" /> Sao chép</button>
          {copyMessage && <p role="status">{copyMessage}</p>}
        </div>
      )}
      {error && <p className="rc-error" role="alert">{error}</p>}
      {showForm && !contract.ownerSignature && (
        <ContractSigningForm name={contract.details.landlordName} documentHash={contract.documentHash}
          onSign={async signature => {
            onSigned(await rentalContractsApi.signOwner(contract.id, signature));
            setShowForm(false);
          }} onCancel={() => setShowForm(false)} />
      )}
    </section>
  );
}

function RoomContractReader({ room, contractId, onClose, onCreate }) {
  const titleId = useId();
  const historyId = useId();
  const scrollArea = useRef(null);
  const [records, setRecords] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    const request = new AbortController();
    rentalContractsApi.list(room.roomId, request.signal)
      .then(data => {
        if (request.signal.aborted) return;
        setRecords(data);
        const initialRecord = data.find(record => record.id === contractId) ?? data.find(record => record.status === 'ACTIVE') ?? data[0];
        setSelectedId(initialRecord ? String(initialRecord.id) : '');
      })
      .catch(failure => {
        if (!request.signal.aborted) setError(failure.message);
      });
    return () => request.abort();
  }, [room.roomId, contractId, retry]);

  const selected = records?.find(record => String(record.id) === selectedId);
  const period = selected ? leaseLabel(selected) : '';
  const canCreate = room.status === 'OCCUPIED' && onCreate
    && records && !records.some(record => record.status === 'ACTIVE');

  async function downloadPdf() {
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadContractPdf(scrollArea.current?.querySelector('article'), selected.roomNumber);
    } catch {
      setDownloadError('Chưa tải được bản PDF. Vui lòng thử lại.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <MotionDialog
      className="portal-modal rc-reader"
      aria-labelledby={titleId}
      onCancel={event => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header className="rc-reader-header">
        <div className="rc-reader-heading">
          <span className="rc-reader-icon"><FileText size={20} aria-hidden="true" /></span>
          <div>
            <h2 id={titleId}>Hợp đồng thuê phòng</h2>
            <p>Phòng {room.roomNumber}{selected?.propertyName ? ` · ${selected.propertyName}` : ''}</p>
          </div>
        </div>
        <MotionButton type="button" className="p-icon" aria-label="Đóng hợp đồng" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </MotionButton>
      </header>

      {selected && (
        <div className="rc-reader-toolbar">
          {records.length > 1 && (
            <div className="rc-reader-history">
              <label htmlFor={historyId}>Lịch sử hợp đồng</label>
              <select id={historyId} value={selectedId} onChange={event => {
                setSelectedId(event.target.value);
                setDownloadError('');
                scrollArea.current.scrollTop = 0;
              }}>
                {records.map(record => (
                  <option key={record.id} value={record.id}>
                    {[record.details.tenantName, formatContractDate(record.startDate)].filter(Boolean).join(' · ')}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="rc-reader-actions">
            <div className="rc-reader-period">
              <span className={`rc-reader-status ${selected.status === 'ACTIVE' ? 'is-active' : ''}`}>
                {statusLabel(selected)}
              </span>
              {period && <span>{period}</span>}
            </div>
            <MotionButton type="button" className="p-button" disabled={downloading} aria-busy={downloading} onClick={downloadPdf}>
              {downloading ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
              {downloading ? 'Đang tạo PDF…' : 'Tải bản PDF'}
            </MotionButton>
          </div>
          {downloadError && <p className="rc-error rc-reader-download-error" role="alert">{downloadError}</p>}
        </div>
      )}

      <div className="rc-reader-scroll" ref={scrollArea} role="region" aria-label="Nội dung hợp đồng" tabIndex={0}>
        {selected ? <>
          <OwnerSigningControls key={selected.id} contract={selected} onSigned={updated => {
            setRecords(previous => previous.map(record => record.id === updated.id ? updated : record));
          }} />
          <RentalContractDocument model={buildContractModel(selected)} />
        </> : (
          <div className="rc-reader-state">
            {error ? (
              <>
                <p role="alert">{error}</p>
                <MotionButton type="button" className="p-button" onClick={() => {
                  setError('');
                  setRetry(attempt => attempt + 1);
                }}>Thử lại</MotionButton>
              </>
            ) : records ? <p>Phòng chưa có hợp đồng được lưu trên hệ thống.</p> : (
              <p className="rc-reader-loading" role="status">
                <LoaderCircle size={17} className="spin" aria-hidden="true" /> Đang tải hợp đồng…
              </p>
            )}
          </div>
        )}
      </div>

      {canCreate && (
        <footer className="rc-reader-footer">
          <MotionButton type="button" className="p-button primary" onClick={() => {
            onClose();
            onCreate();
          }}>Tạo hợp đồng cho đợt thuê hiện tại</MotionButton>
        </footer>
      )}
    </MotionDialog>
  );
}

export default function RoomContractsPanel({ room, onCreate, contractId, label = 'Hợp đồng thuê phòng', onReaderClosed }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rc-history">
      <MotionButton type="button" className="hm-btn" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <FileText size={17} aria-hidden="true" /> {label}
      </MotionButton>
      {open && <RoomContractReader key={room.roomId} room={room} contractId={contractId} onClose={() => {
        setOpen(false);
        onReaderClosed?.();
      }} onCreate={onCreate} />}
    </div>
  );
}
