import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, FileText, LoaderCircle } from 'lucide-react';
import ContractSigningForm, { ContractSigningStatus } from '../components/ContractSigningForm.jsx';
import PhoneVerificationModal from '../components/HostPhoneVerificationModal.jsx';
import { RentalContractDocument } from '../components/RentalContractPreview.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { buildContractModel, rentalContractsApi } from '../services/rental-contracts.js';
import { downloadContractPdf } from '../services/rental-contract-pdf.js';
import '../styles/rental-contracts.css';

export default function ContractSigningPage() {
  const { hash } = useLocation();
  const token = hash.slice(1);
  return <ContractSigningView key={token} token={token} />;
}

function ContractSigningView({ token }) {
  const { user, refreshUser } = useAuth();
  const paper = useRef(null);
  const [contract, setContract] = useState(null);
  const [failure, setFailure] = useState(null);
  const [retry, setRetry] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const validToken = /^[A-Za-z0-9_-]{43}$/.test(token);

  useEffect(() => {
    if (!validToken) return;
    const controller = new AbortController();
    rentalContractsApi.openSigningLink(token, controller.signal)
      .then(data => { if (!controller.signal.aborted) setContract(data); })
      .catch(error => { if (!controller.signal.aborted) setFailure(error); });
    return () => controller.abort();
  }, [token, validToken, retry]);

  async function download() {
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadContractPdf(paper.current.querySelector('article'), contract.roomNumber);
    } catch {
      setDownloadError('Chưa tải được bản PDF. Vui lòng thử lại.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="rc-sign-page" aria-labelledby="contract-sign-title">
      <header className="rc-sign-page-header">
        <div className="rc-reader-heading">
          <span className="rc-reader-icon"><FileText size={21} aria-hidden="true" /></span>
          <div>
            <h1 id="contract-sign-title">Hợp đồng thuê phòng</h1>
            {contract && <p>Phòng {contract.roomNumber} · {contract.propertyName}</p>}
          </div>
        </div>
        {contract && (
          <button type="button" className="p-button" onClick={download} disabled={downloading} aria-busy={downloading}>
            {downloading ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
            {downloading ? 'Đang tạo PDF…' : 'Tải bản PDF'}
          </button>
        )}
      </header>

      {!validToken && <p className="rc-sign-message" role="alert">Liên kết ký không hợp lệ. Hãy xin chủ trọ gửi lại liên kết.</p>}
      {failure && <div className="rc-sign-message">
        <p role="alert">{failure.message}</p>
        {failure.status === 403 ? <button type="button" className="p-button primary" onClick={() => setVerifyingPhone(true)}>
          Xác minh số điện thoại
        </button> : (
          <button type="button" className="p-button" onClick={() => {
            setFailure(null);
            setRetry(attempt => attempt + 1);
          }}>Thử lại</button>
        )}
      </div>}
      {validToken && !failure && !contract && <p className="rc-sign-message rc-reader-loading" role="status">
        <LoaderCircle size={18} className="spin" aria-hidden="true" /> Đang mở hợp đồng…
      </p>}
      {contract && <>
        <div className="rc-sign-message">
          <ContractSigningStatus record={contract} />
          {downloadError && <p className="rc-error" role="alert">{downloadError}</p>}
        </div>
        <div ref={paper}>
          <RentalContractDocument model={buildContractModel(contract)} />
        </div>
        {contract.tenantSignature ? <p className="rc-sign-message" role="status">Chữ ký của bạn đã được lưu.</p> : (
          <ContractSigningForm name={contract.details.tenantName} documentHash={contract.documentHash}
            onSign={async signature => setContract(await rentalContractsApi.signTenant(token, signature))} />
        )}
      </>}
      {verifyingPhone && <PhoneVerificationModal user={user} onClose={() => setVerifyingPhone(false)} onVerified={async () => {
        await refreshUser();
        setVerifyingPhone(false);
        setFailure(null);
        setRetry(attempt => attempt + 1);
      }} />}
    </section>
  );
}
