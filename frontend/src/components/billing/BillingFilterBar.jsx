import { useId } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { billStatuses } from '../../services/room-billing.js';
import { utilityCurrentMonth } from '../../services/room-utilities.js';

export default function BillingFilterBar({
  propertyId,
  properties,
  month,
  roomFilter,
  roomOptions,
  status,
  query,
  showStatus = true,
  onPropertyChange,
  onMonthChange,
  onRoomChange,
  onStatusChange,
  onQueryChange,
  onClearFilters,
}) {
  const id = useId();
  const hasFilters = Boolean(roomFilter || (showStatus && status !== 'ALL') || query.trim());

  return (
    <section className="hb-filter-card" aria-label="Bộ lọc phiếu thu và công nợ">
      <div className={`hb-filters-grid ${showStatus ? 'has-status' : 'no-status'}`}>
        <label className="hb-field">
          <span id={`${id}-property`}>Nhà trọ</span>
          <select
            aria-labelledby={`${id}-property`}
            value={propertyId}
            onChange={event => onPropertyChange(event.target.value)}
          >
            {properties.map(item => (
              <option key={item.propertyId} value={item.propertyId}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="hb-field">
          <span id={`${id}-month`}>Kỳ thu</span>
          <input
            aria-labelledby={`${id}-month`}
            type="month"
            value={month}
            min="1900-01"
            max={utilityCurrentMonth()}
            onChange={event => {
              if (event.target.value && event.target.value !== month) {
                onMonthChange(event.target.value);
              }
            }}
          />
        </label>

        <label className="hb-field">
          <span id={`${id}-room`}>Phòng</span>
          <select
            aria-labelledby={`${id}-room`}
            value={roomFilter}
            onChange={event => onRoomChange(event.target.value)}
          >
            <option value="">Tất cả phòng</option>
            {roomOptions.map(([roomId, number]) => (
              <option key={roomId} value={roomId}>
                Phòng {number}
              </option>
            ))}
          </select>
        </label>

        {showStatus && (
          <label className="hb-field">
            <span id={`${id}-status`}>Trạng thái</span>
            <select
              aria-labelledby={`${id}-status`}
              value={status}
              onChange={event => onStatusChange(event.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              {Object.entries(billStatuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
              <option value="OVERDUE">Quá hạn thanh toán</option>
              <option value="EARLIER">Còn nợ các kỳ trước</option>
            </select>
          </label>
        )}

        <label className="hb-field hb-search-field">
          <span id={`${id}-query`}>Tìm kiếm</span>
          <span className="hb-search-box">
            <Search size={15} className="hb-search-icon" aria-hidden="true" />
            <input
              aria-labelledby={`${id}-query`}
              type="search"
              value={query}
              placeholder="Mã phiếu #001, phòng, người thuê…"
              onChange={event => onQueryChange(event.target.value)}
            />
            {query && (
              <button
                type="button"
                className="hb-search-clear"
                aria-label="Xóa từ khóa tìm kiếm"
                onClick={() => onQueryChange('')}
              >
                <X size={14} />
              </button>
            )}
          </span>
        </label>
      </div>

      {hasFilters && (
        <div className="hb-filter-foot">
          <button type="button" className="hb-clear-link" onClick={onClearFilters}>
            <Filter size={13} aria-hidden="true" />
            <span>Đặt lại bộ lọc</span>
          </button>
        </div>
      )}
    </section>
  );
}
