export function availabilityPresentation(value) {
  const raw = value?.availabilityConfirmedAt;
  const date = raw ? new Date(raw) : null;
  const validDate = date && Number.isFinite(date.getTime());
  const state = value?.availabilityConfirmationStatus;
  if (!validDate || !['CURRENT', 'STALE'].includes(state)) {
    return { state: 'UNCONFIRMED', text: 'Chưa xác nhận tình trạng phòng trống' };
  }
  const formatted = new Intl.DateTimeFormat('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
  return { state, text: state === 'STALE'
    ? `Quá 7 ngày chưa xác nhận · Lần cuối: ${formatted}`
    : `Đã xác nhận: ${formatted}` };
}

// Existing Room dates are Vietnam local datetimes; do not parse them in the browser's timezone.
export function roomAvailability(room, now = Date.now()) {
  const raw = room?.confirmedAt;
  const timestamp = raw && !/(?:Z|[+-]\d{2}:\d{2})$/.test(raw) ? `${raw}+07:00` : raw;
  const time = timestamp ? Date.parse(timestamp) : NaN;
  const fallback = !Number.isFinite(time) || time > now ? 'UNCONFIRMED'
    : now - time > 7 * 24 * 60 * 60 * 1000 ? 'STALE' : 'CURRENT';
  return { availabilityConfirmedAt: timestamp,
    availabilityConfirmationStatus: room?.confirmationStatus || fallback };
}
