import { HostError } from './host';
import {
  buildContractHtmlDocument,
  fetchRoomContractsFull,
  type RentalContractRecord,
} from './rental-contracts';

export async function cleanupTemporaryContractExports(): Promise<void> {
  // No persistent temporary files are written on web.
}

export async function exportContractDocument(params: {
  roomId: number;
  contractId: number;
  token: string;
  signal: AbortSignal;
}): Promise<{ exportedContract: RentalContractRecord; note: string }> {
  if (!params.token) {
    throw new HostError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);
  }

  const latestList = await fetchRoomContractsFull(params.roomId, params.token, params.signal);
  const authoritative = latestList.find(item => item.id === params.contractId);
  if (!authoritative) {
    throw new HostError('Không tìm thấy phiên bản hợp đồng này trên hệ thống.', 404);
  }

  if (typeof document === 'undefined') {
    throw new HostError('Môi trường hiện tại không hỗ trợ xuất PDF.', 400);
  }

  const html = buildContractHtmlDocument(authoritative, { forPrint: true, fontScalePercent: 100 });
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error('Không thể khởi tạo bản in hợp đồng.'));
      iframe.srcdoc = html;
    });
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    return {
      exportedContract: authoritative,
      note: 'Đã mở hộp thoại in / lưu PDF cho bản hợp đồng chính thức.',
    };
  } finally {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1500);
  }
}
