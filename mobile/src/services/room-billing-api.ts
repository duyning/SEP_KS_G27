import { HostError, hostRequest } from './host';
import type {
  BillingBill,
  BillingDetail,
  BillingDraftPayload,
  BillingLedger,
  BillingPaymentPayload,
  BillingSchedulePayload,
} from './room-billing';

function validateLedger(data: unknown): BillingLedger {
  const c = data as Partial<BillingLedger> | null;
  if (
    !c ||
    typeof c.month !== 'string' ||
    !Array.isArray(c.candidates) ||
    !Array.isArray(c.bills) ||
    !Array.isArray(c.earlierDebt)
  ) {
    throw new HostError('Dữ liệu phiếu thu và công nợ từ máy chủ không hợp lệ.');
  }
  return c as BillingLedger;
}

export async function fetchBillingLedger(
  propertyId: number,
  month: string,
  token: string,
  signal: AbortSignal
): Promise<BillingLedger> {
  const qs = new URLSearchParams({ propertyId: String(propertyId), month }).toString();
  const data = await hostRequest<BillingLedger>(
    `/host/room-billing?${qs}`,
    token,
    signal,
    undefined,
    'GET'
  );
  return validateLedger(data);
}

export async function fetchBillingDetail(
  billId: number,
  token: string,
  signal: AbortSignal
): Promise<BillingDetail> {
  const data = await hostRequest<BillingDetail>(
    `/host/room-billing/${billId}`,
    token,
    signal,
    undefined,
    'GET'
  );
  if (!data?.bill || !Array.isArray(data.payments)) {
    throw new HostError('Chi tiết phiếu thu từ máy chủ không hợp lệ.');
  }
  return data;
}

export async function saveBillingSchedule(
  body: BillingSchedulePayload,
  token: string,
  signal: AbortSignal
): Promise<BillingLedger> {
  const data = await hostRequest<BillingLedger>(
    '/host/room-billing/schedule',
    token,
    signal,
    body,
    'PUT'
  );
  return validateLedger(data);
}

export async function saveBillingDraft(
  body: BillingDraftPayload,
  token: string,
  signal: AbortSignal
): Promise<BillingBill> {
  const data = await hostRequest<BillingBill>(
    '/host/room-billing/draft',
    token,
    signal,
    body,
    'PUT'
  );
  if (!data || !Number.isSafeInteger(data.id)) {
    throw new HostError('Không nhận được mã phiếu thu sau khi lưu bản nháp.');
  }
  return data;
}

export async function issueBillingBill(
  billId: number,
  revision: number,
  token: string,
  signal: AbortSignal
): Promise<BillingBill> {
  const data = await hostRequest<BillingBill>(
    `/host/room-billing/${billId}/issue`,
    token,
    signal,
    { revision },
    'POST'
  );
  if (!data || !Number.isSafeInteger(data.id)) {
    throw new HostError('Không xác nhận được trạng thái phát hành phiếu thu.');
  }
  return data;
}

export async function recordBillingPayment(
  billId: number,
  body: BillingPaymentPayload,
  token: string,
  signal: AbortSignal
): Promise<BillingDetail> {
  const data = await hostRequest<BillingDetail>(
    `/host/room-billing/${billId}/payments`,
    token,
    signal,
    body,
    'POST'
  );
  if (!data?.bill || !Array.isArray(data.payments)) {
    throw new HostError('Không xác nhận được kết quả ghi nhận thanh toán.');
  }
  return data;
}
