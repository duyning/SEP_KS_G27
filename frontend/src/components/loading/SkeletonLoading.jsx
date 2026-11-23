/**
 * Reusable skeleton placeholders for partial in-page data loading.
 * Avoid using GlobalLoading for section/table/card API requests — use SkeletonLoading instead.
 */
export default function SkeletonLoading({
  variant = 'lines',
  count = 3,
  columns = 4,
  label = 'Đang tải dữ liệu...',
  className = ''
}) {
  const safeCount = Math.max(1, Number(count) || 1);
  const safeColumns = Math.max(1, Math.min(8, Number(columns) || 4));
  const items = Array.from({ length: safeCount }, (_, index) => index);

  return (
    <div
      className={`sk-group${className ? ` ${className}` : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="skeleton-loading"
      data-variant={variant}
    >
      <span className="sk-sr-only">{label}</span>

      {variant === 'cards' && (
        <div className="sk-grid-cards" aria-hidden="true">
          {items.map((idx) => (
            <div className="sk-card" key={idx}>
              <span className="sk-block sk-h-media sk-w-100" />
              <span className="sk-block sk-h-md sk-w-80" />
              <span className="sk-block sk-h-sm sk-w-65" />
              <span className="sk-block sk-h-sm sk-w-45" />
            </div>
          ))}
        </div>
      )}

      {variant === 'table' && (
        <div className="sk-table" aria-hidden="true">
          {items.map((rowIdx) => (
            <div
              className="sk-table-row"
              key={rowIdx}
              style={{ '--sk-cols': safeColumns }}
            >
              {Array.from({ length: safeColumns }, (_, colIdx) => (
                <span
                  key={colIdx}
                  className={`sk-block ${rowIdx === 0 ? 'sk-h-md' : 'sk-h-sm'} ${
                    colIdx % 2 === 0 ? 'sk-w-80' : 'sk-w-65'
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {variant === 'detail' && (
        <div className="sk-detail" aria-hidden="true">
          <span className="sk-block sk-h-lg sk-w-65" />
          <span className="sk-block sk-h-sm sk-w-45" />
          <span className="sk-block sk-h-media sk-w-100" />
          {items.map((idx) => (
            <span
              key={idx}
              className={`sk-block sk-h-sm ${idx === safeCount - 1 ? 'sk-w-65' : 'sk-w-100'}`}
            />
          ))}
        </div>
      )}

      {variant !== 'cards' && variant !== 'table' && variant !== 'detail' && (
        <div className="sk-card" aria-hidden="true">
          {items.map((idx) => (
            <span
              key={idx}
              className={`sk-block sk-h-sm ${
                idx === 0 ? 'sk-w-80' : idx === safeCount - 1 ? 'sk-w-45' : 'sk-w-100'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
