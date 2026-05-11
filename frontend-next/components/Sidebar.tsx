'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z|M9,22 9,12 15,12 15,22' },
  { href: '/', label: 'Overview', icon: 'R3,3,7,7,1|R14,3,7,7,1|R3,14,7,7,1|R14,14,7,7,1', badge: '5' },
  { href: '/supplier', label: 'Supplier', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2|C9,7,4|M23 21v-2a4 4 0 00-3-3.87|M16 3.13a4 4 0 010 7.75' },
  { href: '/pembelian', label: 'Pembelian', icon: 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z|L3,6,21,6|M16 10a4 4 0 01-8 0' },
  { href: '/keuangan', label: 'Keuangan', icon: 'L12,1,12,23|M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
  { href: '/fee-report', label: 'Fee Report', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z|P14,2,14,8,20,8|L16,13,8,13|L16,17,8,17' },
];

const ANALYTICS_ITEMS = [
  { href: '/analytics', label: 'Analytics', icon: 'L18,20,18,10|L12,20,12,4|L6,20,6,14' },
];

function NavIcon({ d }: { d: string }) {
  const parts = d.split('|');
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {parts.map((p, i) => {
        if (p.startsWith('R')) {
          const [x, y, w, h, rx] = p.slice(1).split(',');
          return <rect key={i} x={x} y={y} width={w} height={h} rx={rx} />;
        }
        if (p.startsWith('C')) {
          const [cx, cy, r] = p.slice(1).split(',');
          return <circle key={i} cx={cx} cy={cy} r={r} />;
        }
        if (p.startsWith('L')) {
          const [x1, y1, x2, y2] = p.slice(1).split(',');
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        }
        if (p.startsWith('P')) {
          return <polyline key={i} points={p.slice(1).replace(/,/g, ' ').replace(/ /g, ',')} />;
        }
        return <path key={i} d={p} />;
      })}
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">Purchasing</div>
      </div>

      <div className="sidebar-nav">
        <div className="sidebar-section">MAIN NAVIGATION</div>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            <NavIcon d={item.icon} />
            <span className="nav-label">{item.label}</span>
            {item.badge && <span className="nav-badge">{item.badge}</span>}
          </Link>
        ))}

        <div className="sidebar-section" style={{ marginTop: 24 }}>
          ANALYTICS &amp; REPORTS
        </div>
        {ANALYTICS_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            <NavIcon d={item.icon} />
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-footer-name">Pak Regen</div>
        <div className="sidebar-footer-role">Administrator</div>
      </div>
    </aside>
  );
}
