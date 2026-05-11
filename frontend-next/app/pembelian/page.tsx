'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';
import { api } from '@/lib/api';
import { rupiahFull, kg, fmtDate, usd, idr, idrFull, num } from '@/lib/format';
import KPICard from '@/components/KPICard';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import Loading from '@/components/Loading';

Chart.register(...registerables);

type MainTab = 'semua' | 'lokal' | 'impor';
type ImportTab = 'ringkasan' | 'raw_material' | 'pembayaran' | 'semua_txn';

export default function PembelianPage() {
  const [mainTab, setMainTab] = useState<MainTab>('semua');
  const [localData, setLocalData] = useState<any>(null);
  const [importData, setImportData] = useState<any>(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({ page: 1 });

  useEffect(() => {
    Promise.all([api.getPurchases(filters), api.getImport()])
      .then(([local, imp]) => { setLocalData(local); setImportData(imp); })
      .catch((e) => setError(e.message));
  }, []);

  const reloadLocal = useCallback((f: Record<string, any>) => {
    api.getPurchases(f).then(setLocalData);
  }, []);

  if (error) return <div className="loading">Error: {error}</div>;
  if (!localData || !importData) return <Loading />;

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Pembelian Bahan Baku</h2>
        <p className="page-subtitle">Pembelian lokal (Jatim, Jateng, Jabar) dan impor (India via Mr Islam &amp; Pak Ucup)</p>
      </div>

      <div className="fin-tabs">
        {(['semua', 'lokal', 'impor'] as MainTab[]).map((t) => (
          <button key={t} className={`fin-tab ${mainTab === t ? 'active' : ''}`} onClick={() => setMainTab(t)}>
            {t === 'semua' ? 'Semua Pembelian' : t === 'lokal' ? 'Lokal (Jatim/Jateng/Jabar)' : 'Impor (India)'}
          </button>
        ))}
      </div>

      {mainTab === 'semua' && <SemuaTab localData={localData} importData={importData} setMainTab={setMainTab} />}
      {mainTab === 'lokal' && <LokalTab data={localData} filters={filters} setFilters={setFilters} reloadLocal={reloadLocal} />}
      {mainTab === 'impor' && <ImporTab data={importData} />}
    </>
  );
}

function SemuaTab({ localData, importData, setMainTab }: any) {
  const localCount = localData.pagination?.total ?? localData.data.length;
  const rmCount = importData.raw_materials.length;
  const totalKg = importData.raw_materials.reduce((s: number, r: any) => s + r.kg, 0);
  const ucup = importData.payments.filter((p: any) => p.desc.toLowerCase().includes('ucup'));
  const ucupIdr = ucup.reduce((s: number, p: any) => s + p.idr, 0);

  return (
    <>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-label">Pembelian Lokal</div><div className="stat-value">{localCount} transaksi</div></div>
        <div className="stat-card"><div className="stat-label">Pembelian Impor</div><div className="stat-value">{rmCount} pengiriman</div></div>
        <div className="stat-card"><div className="stat-label">Total Impor (Kg)</div><div className="stat-value green">{kg(totalKg)}</div></div>
        <div className="stat-card"><div className="stat-label">Total Bayar Impor (IDR)</div><div className="stat-value" style={{ color: '#EF4444' }}>{idr(ucupIdr)}</div></div>
      </div>

      <div className="table-header" style={{ marginBottom: 8 }}>
        <div className="table-title">Pembelian Lokal Terbaru</div>
        <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => setMainTab('lokal')}>Lihat Semua Lokal</button>
      </div>
      <LocalTable data={localData.data.slice(0, 10)} />

      <div className="table-header" style={{ marginTop: 24, marginBottom: 8 }}>
        <div className="table-title">Raw Material Impor India Terbaru</div>
        <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => setMainTab('impor')}>Lihat Semua Impor</button>
      </div>
      <DataTable
        columns={[{ label: 'Tanggal' }, { label: 'Keterangan' }, { label: 'Kg', align: 'right' }, { label: 'Nilai USD', align: 'right' }, { label: 'Harga/Kg', align: 'right' }]}
        rows={importData.raw_materials.slice(-10).reverse().map((r: any) => [
          fmtDate(r.date), r.desc, <strong key="kg">{kg(r.kg)}</strong>, usd(r.usd), usd(r.kg > 0 ? r.usd / r.kg : 0),
        ])}
      />
    </>
  );
}

function LokalTab({ data, filters, setFilters, reloadLocal }: any) {
  const handleFilter = (key: string, val: string) => {
    const f = { ...filters, [key]: val || undefined, page: 1 };
    setFilters(f);
    reloadLocal(f);
  };

  return (
    <>
      <div className="filter-bar">
        <select value={filters.wilayah || ''} onChange={(e) => handleFilter('wilayah', e.target.value)}>
          <option value="">Semua Wilayah</option>
          {['Jatim', 'Jateng', 'Jabar'].map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
        <select value={filters.kategori || ''} onChange={(e) => handleFilter('kategori', e.target.value)}>
          <option value="">Semua Kategori</option>
          {['R Salon', 'Uk 6-8 / Retul', 'Remy', 'Lus', 'Brangkas', 'Lainnya'].map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>
      <LocalTable data={data.data} />
      {data.pagination && (
        <Pagination
          page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total}
          onPage={(p) => { const f = { ...filters, page: p }; setFilters(f); reloadLocal(f); }}
        />
      )}
    </>
  );
}

function LocalTable({ data }: { data: any[] }) {
  return (
    <DataTable
      columns={[
        { label: 'Tanggal' }, { label: 'Supplier' }, { label: 'Wilayah' }, { label: 'Jenis' },
        { label: 'Kategori' }, { label: 'Qty', align: 'right' }, { label: 'Harga', align: 'right' }, { label: 'Total', align: 'right' },
      ]}
      rows={data.map((p: any) => [
        fmtDate(p.date),
        p.supplier?.name ?? '-',
        <span key="w" className={`badge supplier-wilayah wilayah-${(p.wilayah || '').toLowerCase()}`}>{p.wilayah}</span>,
        p.jenis, p.kategori, kg(p.qty), rupiahFull(p.price), rupiahFull(p.total),
      ])}
    />
  );
}

function ImporTab({ data }: { data: any }) {
  const [tab, setTab] = useState<ImportTab>('ringkasan');

  return (
    <>
      <ImportKPI data={data} />
      <div className="fin-tabs">
        {([
          { id: 'ringkasan', label: 'Ringkasan' },
          { id: 'raw_material', label: 'Raw Material' },
          { id: 'pembayaran', label: 'Pembayaran Pak Ucup' },
          { id: 'semua_txn', label: 'Semua Transaksi' },
        ] as { id: ImportTab; label: string }[]).map((t) => (
          <button key={t.id} className={`fin-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {tab === 'ringkasan' && <ImportRingkasan data={data} />}
      {tab === 'raw_material' && <ImportRawMaterial data={data} />}
      {tab === 'pembayaran' && <ImportPembayaran data={data} />}
      {tab === 'semua_txn' && <ImportSemuaTxn data={data} />}
    </>
  );
}

function ImportKPI({ data }: { data: any }) {
  const rm = data.raw_materials;
  const totalKg = rm.reduce((s: number, r: any) => s + r.kg, 0);
  const totalUsd = rm.reduce((s: number, r: any) => s + r.usd, 0);
  const ucup = data.payments.filter((p: any) => p.desc.toLowerCase().includes('ucup'));
  const ucupIdr = ucup.reduce((s: number, p: any) => s + p.idr, 0);
  const ucupUsd = ucup.reduce((s: number, p: any) => s + p.usd, 0);
  const lastBal = data.balance_timeline[data.balance_timeline.length - 1]?.bal ?? 0;

  return (
    <div className="kpi-row">
      <KPICard label="Total Bahan Baku India" value={kg(totalKg)} sub={`${rm.length} pengiriman`} />
      <KPICard label="Nilai Raw Material" value={usd(totalUsd)} sub={`Avg ${usd(totalUsd / totalKg)}/Kg`} />
      <KPICard label="Total Bayar Pak Ucup" value={idr(ucupIdr)} sub={`${ucup.length} transaksi`} />
      <KPICard label="Setara USD Dibayar" value={usd(ucupUsd)} sub={`Kurs avg ~Rp ${num(Math.round(ucupIdr / ucupUsd))}`} />
      <KPICard label="Balance Mr Islam" value={usd(lastBal)} sub="Sisa hutang saat ini" />
      <KPICard label="Fee Pak Eka" value={usd(data.account.fee_pak_eka_usd)} sub="2x fee" />
    </div>
  );
}

function ImportRingkasan({ data }: { data: any }) {
  const chartsRef = useRef<Record<string, Chart>>({});

  useEffect(() => {
    Object.values(chartsRef.current).forEach((c) => c.destroy());
    chartsRef.current = {};

    const c1 = document.getElementById('import-chart-balance') as HTMLCanvasElement;
    const c2 = document.getElementById('import-chart-rm') as HTMLCanvasElement;
    const c3 = document.getElementById('import-chart-ucup') as HTMLCanvasElement;
    if (!c1 || !c2 || !c3) return;

    const tl = data.balance_timeline;
    chartsRef.current.balance = new Chart(c1, {
      type: 'line',
      data: { labels: tl.map((b: any) => b.date.slice(2)), datasets: [{ label: 'Balance USD', data: tl.map((b: any) => b.bal), borderColor: '#06B6D4', backgroundColor: 'rgba(6,182,212,.08)', fill: true, tension: 0.3, pointRadius: 3, borderWidth: 2 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { maxRotation: 45, font: { size: 9 } }, grid: { display: false } }, y: { ticks: { callback: (v: any) => '$' + (v / 1000).toFixed(0) + 'k' } } } },
    });

    const rmByMonth: Record<string, number> = {};
    data.raw_materials.forEach((r: any) => { const m = r.date.slice(0, 7); rmByMonth[m] = (rmByMonth[m] || 0) + r.kg; });
    const rmMonths = Object.keys(rmByMonth).sort();
    chartsRef.current.rm = new Chart(c2, {
      type: 'bar',
      data: { labels: rmMonths.map((m) => m.slice(2)), datasets: [{ label: 'Kg', data: rmMonths.map((m) => rmByMonth[m]), backgroundColor: '#10B981', borderRadius: 6, borderSkipped: false }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 9 } }, grid: { display: false } } } },
    });

    const ucupByMonth: Record<string, number> = {};
    data.payments.filter((p: any) => p.desc.toLowerCase().includes('ucup')).forEach((p: any) => { const m = p.date.slice(0, 7); ucupByMonth[m] = (ucupByMonth[m] || 0) + p.idr; });
    const ucupMonths = Object.keys(ucupByMonth).sort();
    chartsRef.current.ucup = new Chart(c3, {
      type: 'bar',
      data: { labels: ucupMonths.map((m) => m.slice(2)), datasets: [{ label: 'IDR', data: ucupMonths.map((m) => ucupByMonth[m]), backgroundColor: '#8B5CF6', borderRadius: 6, borderSkipped: false }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 9 } }, grid: { display: false } }, y: { ticks: { callback: (v: any) => 'Rp ' + (v / 1e9).toFixed(0) + 'M' } } } },
    });

    return () => { Object.values(chartsRef.current).forEach((c) => c.destroy()); };
  }, [data]);

  const recent = [...data.payments].reverse().slice(0, 10);

  return (
    <>
      <div className="chart-card"><div className="chart-title">Balance USD Mr Islam (Timeline)</div><canvas id="import-chart-balance" /></div>
      <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="chart-card"><div className="chart-title">Raw Material Diterima per Bulan (Kg)</div><canvas id="import-chart-rm" /></div>
        <div className="chart-card"><div className="chart-title">Pembayaran Pak Ucup per Bulan (IDR)</div><canvas id="import-chart-ucup" /></div>
      </div>
      <DataTable
        title="10 Transaksi Terakhir"
        columns={[{ label: 'Tanggal' }, { label: 'Keterangan' }, { label: 'IDR', align: 'right' }, { label: 'Kurs', align: 'right' }, { label: 'USD', align: 'right' }, { label: 'Balance', align: 'right' }]}
        rows={recent.map((p: any) => [fmtDate(p.date), p.desc, idrFull(p.idr), p.kurs > 0 ? num(p.kurs) : '-', usd(p.usd), usd(p.bal)])}
      />
    </>
  );
}

function ImportRawMaterial({ data }: { data: any }) {
  const [q, setQ] = useState('');
  const rm = data.raw_materials.filter((r: any) => !q || r.desc.toLowerCase().includes(q) || r.date.includes(q));
  const totalKg = rm.reduce((s: number, r: any) => s + r.kg, 0);
  const totalUsd = rm.reduce((s: number, r: any) => s + r.usd, 0);

  return (
    <>
      <div className="supplier-toolbar"><input className="search-input" type="text" placeholder="Cari pengiriman..." value={q} onChange={(e) => setQ(e.target.value.toLowerCase())} /></div>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        <div className="stat-card"><div className="stat-label">Total Pengiriman</div><div className="stat-value">{rm.length} shipment</div></div>
        <div className="stat-card"><div className="stat-label">Total Kg</div><div className="stat-value green">{kg(totalKg)}</div></div>
        <div className="stat-card"><div className="stat-label">Total Nilai</div><div className="stat-value">{usd(totalUsd)}</div></div>
      </div>
      <DataTable
        title={`Detail Penerimaan Raw Material India (${rm.length})`}
        columns={[{ label: 'Tanggal' }, { label: 'Keterangan' }, { label: 'Kg', align: 'right' }, { label: 'Nilai USD', align: 'right' }, { label: 'Harga/Kg', align: 'right' }]}
        rows={[
          ...rm.map((r: any) => [fmtDate(r.date), r.desc, <strong key="k">{kg(r.kg)}</strong>, usd(r.usd), usd(r.kg > 0 ? r.usd / r.kg : 0)]),
          [<strong key="t">TOTAL</strong>, <strong key="s">{rm.length} pengiriman</strong>, <strong key="k" style={{ color: '#10B981' }}>{kg(totalKg)}</strong>, <strong key="u">{usd(totalUsd)}</strong>, <strong key="a">{usd(totalUsd / totalKg)}</strong>],
        ]}
      />
    </>
  );
}

function ImportPembayaran({ data }: { data: any }) {
  const [q, setQ] = useState('');
  const all = data.payments.filter((p: any) => p.desc.toLowerCase().includes('ucup'));
  const rows = all.filter((p: any) => !q || p.desc.toLowerCase().includes(q) || p.date.includes(q));
  const totalIdr = rows.reduce((s: number, p: any) => s + p.idr, 0);
  const totalUsd = rows.reduce((s: number, p: any) => s + p.usd, 0);

  return (
    <>
      <div className="supplier-toolbar"><input className="search-input" type="text" placeholder="Cari pembayaran..." value={q} onChange={(e) => setQ(e.target.value.toLowerCase())} /></div>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        <div className="stat-card"><div className="stat-label">Total Transaksi</div><div className="stat-value">{rows.length}x</div></div>
        <div className="stat-card"><div className="stat-label">Total IDR</div><div className="stat-value" style={{ color: '#EF4444' }}>{idr(totalIdr)}</div></div>
        <div className="stat-card"><div className="stat-label">Total USD</div><div className="stat-value">{usd(totalUsd)}</div></div>
        <div className="stat-card"><div className="stat-label">Kurs Rata-rata</div><div className="stat-value">Rp {num(Math.round(totalIdr / totalUsd))}</div></div>
      </div>
      <DataTable
        title={`Detail Pembayaran Pak Ucup (${rows.length})`}
        columns={[{ label: 'Tanggal' }, { label: 'Keterangan' }, { label: 'IDR', align: 'right' }, { label: 'Kurs', align: 'right' }, { label: 'USD', align: 'right' }, { label: 'Balance', align: 'right' }, { label: 'Tipe' }]}
        rows={rows.map((p: any) => [
          fmtDate(p.date), p.desc,
          <span key="i" className="fin-amount-out">{idrFull(p.idr)}</span>,
          p.kurs > 0 ? num(p.kurs) : '-', usd(p.usd), usd(p.bal),
          <span key="b" className={`fin-badge ${p.desc.toLowerCase().includes('tax') ? 'fin-badge-warning' : 'fin-badge-masuk'}`}>{p.desc.toLowerCase().includes('tax') ? 'Tax' : 'Payment'}</span>,
        ])}
      />
    </>
  );
}

function ImportSemuaTxn({ data }: { data: any }) {
  const [q, setQ] = useState('');
  const rows = data.payments.filter((p: any) => !q || p.desc.toLowerCase().includes(q) || p.date.includes(q));

  return (
    <>
      <div className="supplier-toolbar"><input className="search-input" type="text" placeholder="Cari transaksi..." value={q} onChange={(e) => setQ(e.target.value.toLowerCase())} /></div>
      <DataTable
        title={`Semua Transaksi Account Mr Islam (${rows.length})`}
        columns={[{ label: 'Tanggal' }, { label: 'Keterangan' }, { label: 'IDR', align: 'right' }, { label: 'Kurs', align: 'right' }, { label: 'USD', align: 'right' }, { label: 'Balance', align: 'right' }, { label: 'Tipe' }]}
        rows={rows.map((p: any) => {
          const dl = p.desc.toLowerCase();
          const isUcup = dl.includes('ucup'), isTax = dl.includes('tax'), isTransfer = dl.includes('transfer') && !isUcup;
          let badge = 'fin-badge-lainnya', label = 'Lainnya';
          if (isTax) { badge = 'fin-badge-warning'; label = 'Tax'; }
          else if (isUcup) { badge = 'fin-badge-masuk'; label = 'Pak Ucup'; }
          else if (isTransfer) { badge = 'fin-badge-keluar'; label = 'Transfer'; }
          return [fmtDate(p.date), p.desc, idrFull(p.idr), p.kurs > 0 ? num(p.kurs) : '-', usd(p.usd), usd(p.bal), <span key="b" className={`fin-badge ${badge}`}>{label}</span>];
        })}
      />
    </>
  );
}
