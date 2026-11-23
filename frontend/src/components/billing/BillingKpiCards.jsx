import { CheckCircle2, Receipt, Wallet } from 'lucide-react';
import { money } from '../../services/room-types.js';

export default function BillingKpiCards({ totals, draftCount = 0 }) {
  const rate =
    totals.total > 0n ? Number((totals.paid * 100n) / totals.total) : 0;

  return (
    <section className="hb-kpi-grid" aria-label="Thống kê tài chính kỳ đang lọc">
      <article className="hb-kpi-card is-total">
        <div className="hb-kpi-head">
          <span className="hb-kpi-label">Tổng phải thu</span>
          <span className="hb-kpi-icon is-teal" aria-hidden="true">
            <Receipt size={18} />
          </span>
        </div>
        <strong className="hb-kpi-value">{money(totals.total)}</strong>
        <span className="hb-kpi-meta">
          {totals.issuedCount} phiếu đã phát hành
          {draftCount > 0 ? ` · Không tính ${draftCount} bản nháp` : ''}
        </span>
      </article>

      <article className="hb-kpi-card is-paid">
        <div className="hb-kpi-head">
          <span className="hb-kpi-label">Đã thu</span>
          <span className="hb-kpi-icon is-success" aria-hidden="true">
            <CheckCircle2 size={18} />
          </span>
        </div>
        <strong className="hb-kpi-value is-success">{money(totals.paid)}</strong>
        <span className="hb-kpi-meta">
          {totals.total > 0n
            ? `Đạt ${rate}% tổng phải thu trong phạm vi lọc`
            : 'Chưa có giao dịch thanh toán'}
        </span>
      </article>

      <article className="hb-kpi-card is-debt">
        <div className="hb-kpi-head">
          <span className="hb-kpi-label">Còn phải thu</span>
          <span
            className={`hb-kpi-icon ${totals.overdueCount > 0 ? 'is-danger' : 'is-warning'}`}
            aria-hidden="true"
          >
            <Wallet size={18} />
          </span>
        </div>
        <strong className={`hb-kpi-value ${totals.outstanding > 0n ? (totals.overdueCount > 0 ? 'is-danger' : 'is-warning') : ''}`}>
          {money(totals.outstanding)}
        </strong>
        <span className="hb-kpi-meta">
          {totals.unpaidCount > 0
            ? `${totals.unpaidCount} phiếu còn công nợ${totals.overdueCount > 0 ? ` · ${totals.overdueCount} quá hạn` : ''}`
            : 'Không còn công nợ chưa thu'}
        </span>
      </article>
    </section>
  );
}
