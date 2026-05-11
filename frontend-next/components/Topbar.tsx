'use client';

export default function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input type="text" placeholder="Search supplier, pembelian, wilayah..." />
      </div>
      <div className="topbar-actions">
        <button className="btn btn-primary">New Purchase</button>
        <button className="btn-text">Export</button>
        <div className="topbar-bell">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <span className="topbar-bell-badge">3</span>
        </div>
        <div className="topbar-user">
          <div className="topbar-avatar">PR</div>
          <div>
            <div className="topbar-user-name">Pak Regen</div>
            <div className="topbar-user-role">Administrator</div>
          </div>
        </div>
      </div>
    </header>
  );
}
