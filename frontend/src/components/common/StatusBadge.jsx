export default function StatusBadge({ status, label, tone }) {
  const normalized = (status || '').toUpperCase();

  let resolvedTone = tone;
  let resolvedLabel = label;

  if (!resolvedTone) {
    if (['ACTIVE', 'VERIFIED', 'APPROVED', 'RESOLVED', 'COMPLETED', 'AVAILABLE'].includes(normalized)) {
      resolvedTone = 'emerald';
      resolvedLabel = resolvedLabel || (normalized === 'AVAILABLE' ? 'Còn trống' : 'Đã duyệt');
    } else if (['PENDING', 'PENDING_REVIEW', 'WAITING_FOR_HOST', 'NEED_CHANGES'].includes(normalized)) {
      resolvedTone = 'amber';
      resolvedLabel = resolvedLabel || 'Chờ xử lý';
    } else if (['IN_PROGRESS', 'ASSIGNED'].includes(normalized)) {
      resolvedTone = 'blue';
      resolvedLabel = resolvedLabel || 'Đang xử lý';
    } else if (['REJECTED', 'CANCELLED', 'OCCUPIED'].includes(normalized)) {
      resolvedTone = 'rose';
      resolvedLabel = resolvedLabel || (normalized === 'OCCUPIED' ? 'Đã thuê' : 'Từ chối');
    } else {
      resolvedTone = 'slate';
      resolvedLabel = resolvedLabel || status || '—';
    }
  }

  const toneStyles = {
    emerald: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
    amber: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
    blue: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    rose: { bg: '#fff1f2', text: '#9f1239', border: '#fecdd3' },
    purple: { bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe' },
    slate: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  }[resolvedTone] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };

  return (
    <span
      className={`status-badge tone-${resolvedTone}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 9px',
        fontSize: '12px',
        fontWeight: 600,
        borderRadius: '9999px',
        backgroundColor: toneStyles.bg,
        color: toneStyles.text,
        border: `1px solid ${toneStyles.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: toneStyles.text,
        }}
      />
      {resolvedLabel}
    </span>
  );
}
