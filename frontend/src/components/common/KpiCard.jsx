export default function KpiCard({ title, value, subtext, icon: Icon, tone = 'teal', onClick, active = false }) {
  const tones = {
    teal: { bar: '#0d9488', iconBg: '#f0fdfa', iconColor: '#0d9488' },
    amber: { bar: '#d97706', iconBg: '#fffbeb', iconColor: '#d97706' },
    blue: { bar: '#2563eb', iconBg: '#eff6ff', iconColor: '#2563eb' },
    purple: { bar: '#7c3aed', iconBg: '#f5f3ff', iconColor: '#7c3aed' },
    rose: { bar: '#e11d48', iconBg: '#fff1f2', iconColor: '#e11d48' },
    emerald: { bar: '#10b981', iconBg: '#ecfdf5', iconColor: '#10b981' },
  };

  const currentTone = tones[tone] || tones.teal;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`kpi-card ${tone} ${active ? 'active' : ''}`}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '18px 20px',
        border: active ? `2px solid ${currentTone.bar}` : '1px solid #e2e8f0',
        borderTop: `4px solid ${currentTone.bar}`,
        boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.05)',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>{title}</span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
            {value}
          </div>
        </div>
        {Icon && (
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: currentTone.iconBg,
              color: currentTone.iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={22} />
          </div>
        )}
      </div>
      {subtext && (
        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>
          {subtext}
        </div>
      )}
    </div>
  );
}
