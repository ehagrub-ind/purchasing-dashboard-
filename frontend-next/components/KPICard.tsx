interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

export default function KPICard({ label, value, sub, color = 'green' }: KPICardProps) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-top">
        <div className={`kpi-icon ${color}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <div className="kpi-numbers">
          <span className="kpi-number">{value}</span>
        </div>
      </div>
      <div className="kpi-title">{label}</div>
      {sub && <div className="kpi-updated">{sub}</div>}
    </div>
  );
}
