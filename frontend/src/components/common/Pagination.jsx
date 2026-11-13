import UIButton from './Button.jsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
}) {
  if (totalItems <= 0 && totalPages <= 1) return null;

  const start = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className="table-pagination"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderTop: '1px solid #f1f5f9',
        fontSize: '13px',
        color: 'var(--ui-muted)',
        flexWrap: 'wrap',
        gap: '8px',
      }}
    >
      <div>
        Hiển thị <strong>{start}</strong> - <strong>{end}</strong> trên <strong>{totalItems}</strong> kết quả
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <UIButton
          type="button"
          onClick={() => onPageChange?.(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Trang trước"
          title="Trang trước"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            color: currentPage <= 1 ? '#cbd5e1' : '#334155',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronLeft size={16} />
        </UIButton>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <UIButton
            key={p}
            type="button"
            onClick={() => onPageChange?.(p)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: p === currentPage ? '1px solid #0f766e' : '1px solid #e2e8f0',
              backgroundColor: p === currentPage ? '#0f766e' : '#ffffff',
              color: p === currentPage ? '#ffffff' : '#334155',
              fontWeight: p === currentPage ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {p}
          </UIButton>
        ))}

        <UIButton
          type="button"
          onClick={() => onPageChange?.(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Trang sau"
          title="Trang sau"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            color: currentPage >= totalPages ? '#cbd5e1' : '#334155',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronRight size={16} />
        </UIButton>
      </div>
    </div>
  );
}
