'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';
import { api } from '@/lib/api';
import { rupiah, rupiahFull, fmtDate } from '@/lib/format';
import KPICard from '@/components/KPICard';
import Loading from '@/components/Loading';

Chart.register(...registerables);

type TabId = 'ringkasan' | 'masuk' | 'keluar' | 'aruskas' | 'incomplete';

function detectTransactionType(row: any) {
  const d = (row.deskripsi || '').toLowerCase();
  if (/terima|masuk|setoran|posisi kas/.test(d)) return 'masuk';
  if (/bayar|transfer|dp |pelunasan/.test(d)) return 'keluar';
  if (/operasional|bensin|makan|rokok|tol|parkir/.test(d)) return 'operasional';
  if (/koreksi|penyesuaian/.test(d)) return 'koreksi';
  if (row.masuk > 0 && row.keluar === 0) return 'masuk';
  if (row.keluar > 0 && row.masuk === 0) return 'keluar';
  return 'lainnya';
}

function detectSource(row: any) {
  const d = (row.deskripsi || '').toLowerCase();
  if (/agil/.test(d)) return 'Agil';
  if (/ucup/.test(d)) return 'Pak Ucup';
  if (/pak regen|regen/.test(d)) return 'Pak Regen';
  if (/posisi kas/.test(d)) return 'Kas Awal';
  return 'Lainnya';
}

function detectCategory(row: any) {
  const d = (row.deskripsi || '').toLowerCase();
  if (/dp /.test(d)) return 'DP Supplier';
  if (/pelunasan/.test(d)) return 'Pelunasan Supplier';
  if (/bahan baku/.test(d)) return 'Pembelian Bahan Baku';
  if (/operasional|bensin|makan|rokok|tol/.test(d)) return 'Operasional';
  if (/transfer.*kas/.test(d)) return 'Transfer Antar Kas';
  return 'Lainnya';
}

function detectSupplierTarget(row: any) {
  const d = (row.deskripsi || '');
  const match = d.match(/bahan baku\s+(\w+)/i) || d.match(/ke\s+(\w+)/i);
  return match ? match[1] : '-';
}

function detectIssues(row: any): string[] {
  const issues: string[] = [];
  const tipe = detectTransactionType(row);
  if (tipe === 'masuk' && row.masuk === 0) issues.push('Tipe masuk tapi nominal masuk kosong');
  if (tipe === 'keluar' && row.keluar === 0) issues.push('Tipe keluar tapi nominal keluar kosong');
  if (!row.deskripsi || row.deskripsi.trim() === '') issues.push('Keterangan kosong');
  if (row.balance < 0) issues.push('Saldo minus setelah transaksi');
  if (row.masuk === 0 && row.keluar === 0 && !/posisi kas/i.test(row.deskripsi || '')) issues.push('Nominal masuk dan keluar kosong');
  return issues;
}

function getSuggestion(issue: string) {
  if (/masuk kosong/.test(issue)) return 'Cek dan input nominal uang masuk';
  if (/keluar kosong/.test(issue)) return 'Cek dan input nominal uang keluar';
  if (/keterangan kosong/.test(issue)) return 'Tambahkan keterangan transaksi';
  if (/saldo minus/.test(issue)) return 'Cek uang masuk yang belum diinput';
  if (/nominal.*kosong/.test(issue)) return 'Verifikasi transaksi ini';
  return 'Cek ulang data transaksi';
}

const TYPE_BADGE: Record<string, { cls: string; label: string }> = {
  masuk: { cls: 'fin-badge-masuk', label: 'Masuk' },
  keluar: { cls: 'fin-badge-keluar', label: 'Keluar' },
  operasional: { cls: 'fin-badge-operasional', label: 'Operasional' },
  koreksi: { cls: 'fin-badge-koreksi', label: 'Koreksi' },
  lainnya: { cls: 'fin-badge-lainnya', label: 'Lainnya' },
};

function TypeBadge({ type }: { type: string }) {
  const m = TYPE_BADGE[type] || TYPE_BADGE.lainnya;
  return <span className={`fin-badge ${m.cls}`}>{m.label}</span>;
}

function StatusBadge({ row }: { row: any }) {
  const issues = detectIssues(row);
  if (issues.length === 0) return <span className="fin-badge fin-badge-masuk">Lengkap</span>;
  return <span className="fin-badge fin-badge-warning">Perlu Dicek</span>;
}

function WilayahBadge({ w }: { w: string }) {
  return <span className={`badge supplier-wilayah wilayah-${(w || '').toLowerCase()}`}>{w}</span>;
}

export default function KeuanganPage() {
  const [kasData, setKasData] = useState<any[]>([]);
  const [opData, setOpData] = useState<any[]>([]);
  const [kasSummary, setKasSummary] = useState<any[]>([]);
  const [opSummary, setOpSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('ringkasan');
  const [globalWilayah, setGlobalWilayah] = useState('');

  useEffect(() => {
    Promise.all([api.getKas(), api.getOperasional()])
      .then(([kas, op]) => {
        setKasData(kas.data);
        setOpData(op.data);
        setKasSummary(kas.summary);
        setOpSummary(op.summary);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const filteredKas = useMemo(() => {
    if (!globalWilayah || globalWilayah.startsWith('__')) return kasData;
    return kasData.filter(r => r.wilayah === globalWilayah);
  }, [kasData, globalWilayah]);

  const incompleteCount = useMemo(
    () => kasData.filter(r => detectIssues(r).length > 0).length,
    [kasData]
  );

  const totals = useMemo(() => {
    let masuk = 0, keluar = 0;
    for (const s of kasSummary) { masuk += Number(s.total_masuk); keluar += Number(s.total_keluar); }
    return { masuk, keluar, saldo: masuk - keluar };
  }, [kasSummary]);

  if (error) return <div className="loading">Error: {error}</div>;
  if (loading) return <Loading />;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'ringkasan', label: 'Ringkasan' },
    { id: 'masuk', label: 'Uang Masuk' },
    { id: 'keluar', label: 'Uang Keluar' },
    { id: 'aruskas', label: 'Arus Kas' },
    { id: 'incomplete', label: 'Belum Lengkap' },
  ];

  const pills = [
    { label: 'Semua', value: '' },
    { label: 'Jabar', value: 'Jabar' },
    { label: 'Jateng', value: 'Jateng' },
    { label: 'Jatim', value: 'Jatim' },
    { label: 'Saldo Minus', value: '__minus' },
    { label: 'Belum Lengkap', value: '__incomplete' },
  ];

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Keuangan</h2>
          <p className="page-subtitle">Pantau arus kas masuk, kas keluar, saldo wilayah, dan transaksi yang belum lengkap.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary">+ Input Uang Masuk</button>
          <button className="btn">+ Input Pengeluaran</button>
          <button className="btn">Export</button>
        </div>
      </div>

      {incompleteCount > 0 && (
        <div className="fin-banner fin-banner-warning">
          <span className="fin-banner-icon">!</span>
          <span>Jika saldo wilayah minus, cek tab Uang Masuk dan Belum Lengkap terlebih dahulu. </span>
          <strong>{incompleteCount} transaksi perlu dicek.</strong>
        </div>
      )}

      <div className="kpi-row">
        <KPICard label="Total Uang Masuk" value={rupiah(totals.masuk)} sub="Diperbarui baru saja" color="green" />
        <KPICard label="Total Uang Keluar" value={rupiah(totals.keluar)} sub="Diperbarui baru saja" color="pink" />
        <KPICard label="Saldo Akhir" value={rupiah(totals.saldo)} sub={totals.saldo < 0 ? 'Minus' : 'Positif'} color={totals.saldo >= 0 ? 'green' : 'pink'} />
        <KPICard label="Selisih Belum Jelas" value={rupiah(Math.abs(totals.saldo))} sub="Review" color="orange" />
        <KPICard label="Transaksi Belum Lengkap" value={String(incompleteCount)} sub={incompleteCount > 0 ? 'Perlu Cek' : 'Aman'} color={incompleteCount > 0 ? 'orange' : 'green'} />
      </div>

      <div className="fin-quick-filter">
        {pills.map(p => (
          <button key={p.value} className={`fin-pill ${globalWilayah === p.value ? 'active' : ''}`} onClick={() => setGlobalWilayah(p.value)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="fin-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`fin-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
            {t.id === 'incomplete' && incompleteCount > 0 && (
              <> <span className="fin-tab-count">{incompleteCount}</span></>
            )}
          </button>
        ))}
      </div>

      <div className="fin-tab-content">
        {activeTab === 'ringkasan' && <RingkasanTab kasSummary={kasSummary} kasData={kasData} opData={opData} opSummary={opSummary} rows={filteredKas} />}
        {activeTab === 'masuk' && <MasukTab rows={filteredKas} />}
        {activeTab === 'keluar' && <KeluarTab rows={filteredKas} />}
        {activeTab === 'aruskas' && <ArusKasTab rows={filteredKas} />}
        {activeTab === 'incomplete' && <IncompleteTab kasData={kasData} globalWilayah={globalWilayah} />}
      </div>
    </>
  );
}

function RingkasanTab({ kasSummary, kasData, opData, opSummary, rows }: any) {
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    chartRef.current?.destroy();
    const canvas = document.getElementById('chart-kas-wilayah') as HTMLCanvasElement;
    if (!canvas) return;
    chartRef.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: kasSummary.map((s: any) => s.wilayah),
        datasets: [
          { label: 'Masuk', data: kasSummary.map((s: any) => Number(s.total_masuk)), backgroundColor: '#10B981', borderRadius: 8, borderSkipped: false },
          { label: 'Keluar', data: kasSummary.map((s: any) => Number(s.total_keluar)), backgroundColor: '#EF4444', borderRadius: 8, borderSkipped: false },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#64748B' } } },
        scales: {
          x: { ticks: { color: '#64748B' }, grid: { display: false } },
          y: { ticks: { color: '#64748B' }, grid: { color: '#E5E7EB' } },
        },
      },
    });
    return () => { chartRef.current?.destroy(); };
  }, [kasSummary]);

  const masukCount = rows.filter((r: any) => r.masuk > 0).length;
  const keluarCount = rows.filter((r: any) => r.keluar > 0).length;
  let totalOp = 0;
  for (const s of opSummary) totalOp += Number(s.total);

  const mostMinus = [...kasSummary].sort((a: any, b: any) => Number(a.saldo) - Number(b.saldo))[0];
  const mostMasuk = [...kasSummary].sort((a: any, b: any) => Number(b.total_masuk) - Number(a.total_masuk))[0];
  const incByWilayah: Record<string, number> = {};
  for (const r of kasData) {
    if (detectIssues(r).length > 0) incByWilayah[r.wilayah] = (incByWilayah[r.wilayah] || 0) + 1;
  }
  const mostInc = Object.entries(incByWilayah).sort((a, b) => b[1] - a[1])[0];

  return (
    <>
      <div className="stat-grid fin-wilayah-grid">
        {kasSummary.map((s: any) => {
          const saldo = Number(s.saldo);
          const color = saldo >= 0 ? 'green' : 'red';
          return (
            <div key={s.wilayah} className="stat-card">
              <div className="stat-card-row">
                <div className={`stat-icon ${color}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                </div>
                <div>
                  <div className="stat-label">Kas <WilayahBadge w={s.wilayah} /></div>
                  <div className={`stat-value ${color}`}>{rupiah(saldo)}</div>
                  <div className="stat-sub">Masuk: {rupiah(s.total_masuk)} | Keluar: {rupiah(s.total_keluar)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="chart-card">
        <div className="chart-title">Arus Kas per Wilayah: Masuk vs Keluar</div>
        <canvas id="chart-kas-wilayah" />
      </div>

      <div className="fin-insight-grid">
        <div className="fin-insight-card">
          <div className="fin-insight-icon red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <div className="fin-insight-label">Wilayah Paling Minus</div>
            <div className="fin-insight-value red">{mostMinus?.wilayah || '-'}</div>
            <div className="fin-insight-sub">{mostMinus ? `Saldo: ${rupiah(mostMinus.saldo)}` : '-'}</div>
          </div>
        </div>
        <div className="fin-insight-card">
          <div className="fin-insight-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19,12 12,19 5,12" />
            </svg>
          </div>
          <div>
            <div className="fin-insight-label">Pemasukan Terbesar</div>
            <div className="fin-insight-value green">{mostMasuk?.wilayah || '-'}</div>
            <div className="fin-insight-sub">{mostMasuk ? `Total: ${rupiah(mostMasuk.total_masuk)}` : '-'}</div>
          </div>
        </div>
        <div className="fin-insight-card">
          <div className="fin-insight-icon orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" />
            </svg>
          </div>
          <div>
            <div className="fin-insight-label">Belum Lengkap Terbanyak</div>
            <div className="fin-insight-value">{mostInc ? mostInc[0] : 'Tidak ada'}</div>
            <div className="fin-insight-sub">{mostInc ? `${mostInc[1]} transaksi perlu dicek` : 'Semua lengkap'}</div>
          </div>
        </div>
      </div>

      <div className="fin-banner fin-banner-info">
        <span className="fin-banner-icon">i</span>
        <div>
          <strong>Banyak uang masuk belum diinput. </strong>
          <span>Saldo minus bisa terjadi karena pemasukan belum dicatat. </span>
          <span>Saat ini: {masukCount} transaksi masuk vs {keluarCount} transaksi keluar.</span>
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <div>
            <div className="section-card-title">Biaya Operasional</div>
            <div className="section-card-sub">Total: {rupiah(totalOp)} ({opData.length} transaksi)</div>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Wilayah</th><th>Keterangan</th><th className="num-right">Jumlah</th></tr>
            </thead>
            <tbody>
              {opData.map((o: any, i: number) => (
                <tr key={i}>
                  <td><WilayahBadge w={o.wilayah} /></td>
                  <td>{o.deskripsi}</td>
                  <td className="num-right">{rupiahFull(o.jumlah)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function MasukTab({ rows }: { rows: any[] }) {
  const [search, setSearch] = useState('');
  const masukRows = useMemo(() => {
    let list = rows.filter((r: any) => r.masuk > 0);
    if (search) list = list.filter((r: any) => (r.deskripsi || '').toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [rows, search]);

  return (
    <>
      <div className="supplier-toolbar">
        <input className="search-input" type="text" placeholder="Cari transaksi masuk..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="table-card">
        <div className="table-header">
          <div className="table-title">Uang Masuk ({masukRows.length} transaksi)</div>
        </div>
        <div className="table-scroll" style={{ maxHeight: '70vh' }}>
          <table>
            <thead>
              <tr>
                <th>Tanggal</th><th>Wilayah</th><th>Sumber Dana</th>
                <th>Keterangan</th><th className="num-right">Nominal Masuk</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {masukRows.map((r: any, i: number) => (
                <tr key={i}>
                  <td>{fmtDate(r.date)}</td>
                  <td><WilayahBadge w={r.wilayah} /></td>
                  <td>{detectSource(r)}</td>
                  <td>{r.deskripsi}</td>
                  <td className="num-right"><span className="fin-amount-in">{rupiahFull(r.masuk)}</span></td>
                  <td><StatusBadge row={r} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function KeluarTab({ rows }: { rows: any[] }) {
  const [search, setSearch] = useState('');
  const keluarRows = useMemo(() => {
    let list = rows.filter((r: any) => r.keluar > 0);
    if (search) list = list.filter((r: any) => (r.deskripsi || '').toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [rows, search]);

  return (
    <>
      <div className="supplier-toolbar">
        <input className="search-input" type="text" placeholder="Cari transaksi keluar..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="table-card">
        <div className="table-header">
          <div className="table-title">Uang Keluar ({keluarRows.length} transaksi)</div>
        </div>
        <div className="table-scroll" style={{ maxHeight: '70vh' }}>
          <table>
            <thead>
              <tr>
                <th>Tanggal</th><th>Wilayah</th><th>Supplier/Tujuan</th>
                <th>Keterangan</th><th className="num-right">Nominal Keluar</th><th>Kategori</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {keluarRows.map((r: any, i: number) => (
                <tr key={i}>
                  <td>{fmtDate(r.date)}</td>
                  <td><WilayahBadge w={r.wilayah} /></td>
                  <td>{detectSupplierTarget(r)}</td>
                  <td>{r.deskripsi}</td>
                  <td className="num-right"><span className="fin-amount-out">{rupiahFull(r.keluar)}</span></td>
                  <td>{detectCategory(r)}</td>
                  <td><StatusBadge row={r} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function ArusKasTab({ rows }: { rows: any[] }) {
  return (
    <div className="table-card">
      <div className="table-header">
        <div className="table-title">Arus Kas ({rows.length} entri)</div>
      </div>
      <div className="table-scroll" style={{ maxHeight: '70vh' }}>
        <table>
          <thead>
            <tr>
              <th>Tanggal</th><th>Wilayah</th><th>Keterangan</th>
              <th className="num-right">Masuk</th><th className="num-right">Keluar</th>
              <th className="num-right">Saldo</th><th>Tipe</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any, i: number) => {
              const tipe = detectTransactionType(r);
              const saldoVal = Number(r.balance);
              return (
                <tr key={i}>
                  <td>{fmtDate(r.date)}</td>
                  <td><WilayahBadge w={r.wilayah} /></td>
                  <td>{r.deskripsi}</td>
                  <td className="num-right">
                    {r.masuk > 0 ? <span className="fin-amount-in">{rupiahFull(r.masuk)}</span> : <span className="fin-amount-dim">-</span>}
                  </td>
                  <td className="num-right">
                    {r.keluar > 0 ? <span className="fin-amount-out">{rupiahFull(r.keluar)}</span> : <span className="fin-amount-dim">-</span>}
                  </td>
                  <td className="num-right">
                    <span className={saldoVal < 0 ? 'fin-amount-out' : ''}>{rupiahFull(r.balance)}</span>
                  </td>
                  <td><TypeBadge type={tipe} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IncompleteTab({ kasData, globalWilayah }: { kasData: any[]; globalWilayah: string }) {
  const issues = useMemo(() => {
    const result: { row: any; issue: string; suggestion: string }[] = [];
    for (const r of kasData) {
      if (globalWilayah === '__minus' && r.balance >= 0) continue;
      if (globalWilayah && !globalWilayah.startsWith('__') && r.wilayah !== globalWilayah) continue;
      const problems = detectIssues(r);
      for (const p of problems) {
        result.push({ row: r, issue: p, suggestion: getSuggestion(p) });
      }
    }
    return result;
  }, [kasData, globalWilayah]);

  if (issues.length === 0) {
    return (
      <div className="supplier-empty">
        <div className="supplier-empty-title">Semua transaksi lengkap</div>
        <div className="supplier-empty-sub">Tidak ada transaksi yang perlu dicek saat ini.</div>
      </div>
    );
  }

  return (
    <div className="table-card">
      <div className="table-header">
        <div className="table-title">Transaksi Belum Lengkap ({issues.length})</div>
      </div>
      <div className="table-scroll" style={{ maxHeight: '70vh' }}>
        <table>
          <thead>
            <tr>
              <th>Tanggal</th><th>Wilayah</th><th>Masalah</th>
              <th>Keterangan</th><th className="num-right">Nominal</th><th>Saran Perbaikan</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((item, i) => (
              <tr key={i}>
                <td>{fmtDate(item.row.date)}</td>
                <td><WilayahBadge w={item.row.wilayah} /></td>
                <td><span className="fin-badge fin-badge-warning">{item.issue}</span></td>
                <td>{item.row.deskripsi || '-'}</td>
                <td className="num-right">{rupiahFull(item.row.masuk > 0 ? item.row.masuk : item.row.keluar)}</td>
                <td>{item.suggestion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
