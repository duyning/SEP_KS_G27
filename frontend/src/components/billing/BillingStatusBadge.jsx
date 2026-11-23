import { billStatuses } from '../../services/room-billing.js';

export default function BillingStatusBadge({ bill }) {
  if (!bill) return null;
  const tone = {
    DRAFT: 'draft',
    UNPAID: 'unpaid',
    PARTIAL: 'partial',
    PAID: 'paid',
  }[bill.status] || 'draft';

  return (
    <span className="hb-badges">
      <span className={`hb-badge is-${tone}`}>
        <span className="hb-badge-dot" aria-hidden="true" />
        {billStatuses[bill.status] || bill.status}
      </span>
      {bill.overdue && (
        <span className="hb-badge is-overdue">
          <span className="hb-badge-dot" aria-hidden="true" />
          Quá hạn
        </span>
      )}
    </span>
  );
}
