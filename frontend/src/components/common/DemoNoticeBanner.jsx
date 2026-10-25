import { Info } from 'lucide-react';

export default function DemoNoticeBanner({ message = 'Giao diện hiển thị với dữ liệu mẫu (Prototype Fixture) do backend chưa cung cấp API.' }) {
  return (
    <div className="demo-notice-banner" role="note" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 14px',
      marginBottom: '16px',
      backgroundColor: '#fef3c7',
      color: '#92400e',
      border: '1px solid #fde68a',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: 500,
    }}>
      <Info size={16} style={{ flexShrink: 0 }} />
      <span>{message}</span>
    </div>
  );
}
