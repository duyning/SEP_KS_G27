import { HostError, hostRequest } from './host';
import type { UtilityLedger, UtilitySaveRequest } from './room-utilities';

function validateLedger(data: unknown): UtilityLedger {
  const candidate = data as Partial<UtilityLedger> | null;
  if (
    !candidate ||
    typeof candidate.month !== 'string' ||
    typeof candidate.currentMonth !== 'string' ||
    typeof candidate.editable !== 'boolean' ||
    !Array.isArray(candidate.rows)
  ) {
    throw new HostError('Dữ liệu kỳ ghi điện nước từ máy chủ không hợp lệ.');
  }
  return candidate as UtilityLedger;
}

export async function fetchUtilityLedger(
  propertyId: number,
  month: string,
  token: string,
  signal: AbortSignal
): Promise<UtilityLedger> {
  const query = new URLSearchParams({
    propertyId: String(propertyId),
    month,
  }).toString();
  const data = await hostRequest<UtilityLedger>(
    `/host/room-utilities?${query}`,
    token,
    signal,
    undefined,
    'GET'
  );
  return validateLedger(data);
}

export async function saveUtilityReadings(
  request: UtilitySaveRequest,
  token: string,
  signal: AbortSignal
): Promise<UtilityLedger> {
  const data = await hostRequest<UtilityLedger>(
    '/host/room-utilities',
    token,
    signal,
    request,
    'POST'
  );
  return validateLedger(data);
}
