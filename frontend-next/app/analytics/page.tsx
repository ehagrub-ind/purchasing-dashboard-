'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { rupiah, kg, fmtDate } from '@/lib/format';
import KPICard from '@/components/KPICard';
import Loading from '@/components/Loading';

interface Anomaly {
  severity: 'tinggi' | 'sedang' | 'rendah';
  type: string;
  description: string;
  date: string | null;
  wilayah: string;
  value: number;
}

function iqrOutliers(values: number[]) {
  if (values.length < 4) return { low: -Infinity, high: Infinity, iqr: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  return { low: q1 - 1.5 * iqr, high: q3 + 1.5 * iqr, iqr };
}

function mean(values: number[]) {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function detectPriceAnomalies(purchases: any[]): Anomaly[] {
  const byKategori: Record<string, any[]> = {};
  for (const p of purchases) {
    const price = Number(p.price);
    if (!price || price <= 0) continue;
    const kat = p.kategori || 'Lainnya';
    if (!byKategori[kat]) byKategori[kat] = [];
    byKategori[kat].push({ ...p, pricePerKg: price });
  }
  const anomalies: Anomaly[] = [];
  for (const [kat, items] of Object.entries(byKategori)) {
    if (items.length < 4) continue;
    const prices = items.map(i => i.pricePerKg);
    const bounds = iqrOutliers(prices);
    const avg = mean(prices);
    for (const item of items) {
      if (item.pricePerKg < bounds.low || item.pricePerKg > bounds.high) {
        const pct = ((item.pricePerKg - avg) / avg * 100).toFixed(0);
        anomalies.push({
          severity: Math.abs(Number(pct)) > 100 ? 'tinggi' : 'sedang',
          type: 'Harga Tidak Wajar',
          description: `${item.supplier?.name || '-'} — ${kat}: ${rupiah(item.price)}/kg (avg ${rupiah(avg)}/kg, ${Number(pct) > 0 ? '+' : ''}${pct}%)`,
          date: item.date,
          wilayah: item.wilayah,
          value: item.pricePerKg,
        });
      }
    }
  }
  return anomalies;
}

function detectAmountOutliers(purchases: any[]): Anomaly[] {
  const totals = purchases.map(p => Number(p.total)).filter(v => v > 0);
  if (totals.length < 4) return [];
  const bounds = iqrOutliers(totals);
  const avg = mean(totals);
  return purchases
    .filter(p => Number(p.total) > bounds.high)
    .map(p => ({
      severity: (Number(p.total) > bounds.high + bounds.iqr ? 'tinggi' : 'sedang') as Anomaly['severity'],
      type: 'Nilai Transaksi Besar',
      description: `${p.supplier?.name || '-'}: ${rupiah(p.total)} (avg ${rupiah(avg)})`,
      date: p.date,
      wilayah: p.wilayah,
      value: Number(p.total),
    }));
}

function detectDuplicates(purchases: any[]): Anomaly[] {
  const seen: Record<string, any> = {};
  const dupes: Anomaly[] = [];
  for (const p of purchases) {
    const key = `${p.date}_${p.supplierId}_${p.total}_${p.qty}`;
    if (seen[key]) {
      dupes.push({
        severity: 'sedang',
        type: 'Duplikasi Potensial',
        description: `${p.supplier?.name || '-'}: ${rupiah(p.total)}, ${kg(p.qty)} — tanggal & nilai sama`,
        date: p.date,
        wilayah: p.wilayah,
        value: Number(p.total),
      });
    }
    seen[key] = p;
  }
  return dupes;
}

function detectKasAnomalies(kasData: any[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const masukVals = kasData.filter(r => r.masuk > 0).map(r => Number(r.masuk));
  const keluarVals = kasData.filter(r => r.keluar > 0).map(r => Number(r.keluar));
  const masukBounds = iqrOutliers(masukVals);
  const keluarBounds = iqrOutliers(keluarVals);
  for (const r of kasData) {
    if (r.masuk > 0 && Number(r.masuk) > masukBounds.high) {
      anomalies.push({ severity: 'sedang', type: 'Kas Masuk Besar', description: `${r.wilayah}: ${rupiah(r.masuk)} — ${r.deskripsi || 'tanpa keterangan'}`, date: r.date, wilayah: r.wilayah, value: Number(r.masuk) });
    }
    if (r.keluar > 0 && Number(r.keluar) > keluarBounds.high) {
      anomalies.push({ severity: 'sedang', type: 'Kas Keluar Besar', description: `${r.wilayah}: ${rupiah(r.keluar)} — ${r.deskripsi || 'tanpa keterangan'}`, date: r.date, wilayah: r.wilayah, value: Number(r.keluar) });
    }
    if (Number(r.balance) < 0) {
      anomalies.push({ severity: 'tinggi', type: 'Saldo Minus', description: `${r.wilayah}: saldo ${rupiah(r.balance)} setelah "${r.deskripsi || '-'}"`, date: r.date, wilayah: r.wilayah, value: Number(r.balance) });
    }
    if (!r.deskripsi || r.deskripsi.trim() === '') {
      anomalies.push({ severity: 'rendah', type: 'Keterangan Kosong', description: `${r.wilayah}: transaksi tanpa keterangan (masuk: ${rupiah(r.masuk)}, keluar: ${rupiah(r.keluar)})`, date: r.date, wilayah: r.wilayah, value: 0 });
    }
  }
  return anomalies;
}

function detectSupplierConcentration(suppliers: any[]): Anomaly[] {
  const totalKgVal = suppliers.reduce((s: number, sup: any) => s + Number(sup.total_kg || 0), 0);
  if (totalKgVal === 0) return [];
  return suppliers
    .filter((sup: any) => (Number(sup.total_kg) / totalKgVal) > 0.3)
    .map((sup: any) => {
      const pct = ((Number(sup.total_kg) / totalKgVal) * 100).toFixed(1);
      return {
        severity: (Number(pct) > 50 ? 'tinggi' : 'sedang') as Anomaly['severity'],
        type: 'Konsentrasi Supplier',
        description: `${sup.name} (${sup.wilayah}): ${pct}% dari total volume (${kg(sup.total_kg)})`,
        date: null,
        wilayah: sup.wilayah,
        value: Number(pct),
      };
    });
}

function detectOperasionalAnomalies(opData: any[]): Anomaly[] {
  const vals = opData.map((o: any) => Number(o.jumlah)).filter(v => v > 0);
  if (vals.length < 4) return [];
  const bounds = iqrOutliers(vals);
  return opData
    .filter((o: any) => Number(o.jumlah) > bounds.high)
    .map((o: any) => ({
      severity: 'rendah' as const,
      type: 'Operasional Besar',
      description: `${o.wilayah}: ${rupiah(o.jumlah)} — ${o.deskripsi}`,
      date: null,
      wilayah: o.wilayah,
      value: Number(o.jumlah),
    }));
}

const SEV_COLORS: Record<string, string> = { tinggi: 'anm-sev-tinggi', sedang: 'anm-sev-sedang', rendah: 'anm-sev-rendah' };
const SEV_LABELS: Record<string, string> = { tinggi: 'Tinggi', sedang: 'Sedang', rendah: 'Rendah' };

export default function AnalyticsPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('semua');
  const [sevFilter, setSevFilter] = useState('');

  useEffect(() => {
    Promise.all([
      api.getKas(),
      api.getOperasional(),
      api.getPurchases({ limit: 1000 }),
      api.getSuppliers(),
    ]).then(([kas, op, purchData, suppliers]) => {
      const all = [
        ...detectPriceAnomalies(purchData.data || []),
        ...detectAmountOutliers(purchData.data || []),
        ...detectDuplicates(purchData.data || []),
        ...detectKasAnomalies(kas.data || []),
        ...detectSupplierConcentration(suppliers || []),
        ...detectOperasionalAnomalies(op.data || []),
      ];
      const sevOrder: Record<string, number> = { tinggi: 0, sedang: 1, rendah: 2 };
      all.sort((a, b) => (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2));
      setAnomalies(all);
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const tinggi = anomalies.filter(a => a.severity === 'tinggi').length;
  const sedang = anomalies.filter(a => a.severity === 'sedang').length;
  const rendah = anomalies.filter(a => a.severity === 'rendah').length;
  const types = useMemo(() => [...new Set(anomalies.map(a => a.type))], [anomalies]);

  const filtered = useMemo(() => {
    let list = anomalies;
    if (typeFilter !== 'semua') list = list.filter(a => a.type === typeFilter);
    if (sevFilter) list = list.filter(a => a.severity === sevFilter);
    return list;
  }, [anomalies, typeFilter, sevFilter]);

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of filtered) map[a.type] = (map[a.type] || 0) + 1;
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [filtered]);

  if (error) return <div className="loading">Error: {error}</div>;
  if (loading) return <Loading />;

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Analytics — Deteksi Anomali</h2>
          <p className="page-subtitle">Analisis otomatis untuk mendeteksi transaksi tidak wajar, duplikasi, dan pola mencurigakan.</p>
        </div>
      </div>

      <div className="kpi-row">
        <KPICard label="Total Anomali" value={String(anomalies.length)} sub={`${types.length} Jenis`} color="purple" />
        <KPICard label="Severity Tinggi" value={String(tinggi)} sub={tinggi > 0 ? 'Perlu Aksi' : 'Aman'} color={tinggi > 0 ? 'pink' : 'green'} />
        <KPICard label="Severity Sedang" value={String(sedang)} sub="Review" color="orange" />
        <KPICard label="Severity Rendah" value={String(rendah)} sub="Info" color="blue" />
        <KPICard label="Supplier Berisiko" value={String(anomalies.filter(a => a.type === 'Konsentrasi Supplier').length)} sub="Konsentrasi" color="green" />
      </div>

      {/* Type filter */}
      <div className="anm-filter-bar">
        <div className="fin-quick-filter">
          <button className={`fin-pill ${typeFilter === 'semua' ? 'active' : ''}`} onClick={() => setTypeFilter('semua')}>Semua</button>
          {types.map(t => (
            <button key={t} className={`fin-pill ${typeFilter === t ? 'active' : ''}`} onClick={() => setTypeFilter(t)}>{t}</button>
          ))}
        </div>
        <div className="fin-quick-filter" style={{ marginBottom: 0 }}>
          {[{ label: 'Semua Level', value: '' }, { label: 'Tinggi', value: 'tinggi' }, { label: 'Sedang', value: 'sedang' }, { label: 'Rendah', value: 'rendah' }].map(s => (
            <button key={s.value} className={`fin-pill ${sevFilter === s.value ? 'active' : ''}`} onClick={() => setSevFilter(s.value)}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Anomaly table */}
      {filtered.length === 0 ? (
        <div className="supplier-empty" style={{ padding: '48px 20px' }}>
          <div className="supplier-empty-title">Tidak ada anomali ditemukan</div>
          <div className="supplier-empty-sub">Semua data terlihat normal untuk filter ini.</div>
        </div>
      ) : (
        <div className="table-card">
          <div className="table-header">
            <div className="table-title">Anomali Terdeteksi ({filtered.length})</div>
          </div>
          <div className="table-scroll" style={{ maxHeight: '70vh' }}>
            <table>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Tipe</th>
                  <th>Wilayah</th>
                  <th>Tanggal</th>
                  <th>Deskripsi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr key={i}>
                    <td><span className={`fin-badge ${SEV_COLORS[a.severity]}`}>{SEV_LABELS[a.severity]}</span></td>
                    <td><span className="fin-badge fin-badge-lainnya">{a.type}</span></td>
                    <td>
                      {a.wilayah
                        ? <span className={`badge supplier-wilayah wilayah-${a.wilayah.toLowerCase()}`}>{a.wilayah}</span>
                        : '-'}
                    </td>
                    <td>{a.date ? fmtDate(a.date) : '-'}</td>
                    <td>{a.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary by type */}
      {byType.length > 0 && (
        <div className="fin-insight-grid" style={{ marginTop: 20 }}>
          {byType.map(([type, count]) => {
            const sevCounts = {
              tinggi: anomalies.filter(a => a.type === type && a.severity === 'tinggi').length,
              sedang: anomalies.filter(a => a.type === type && a.severity === 'sedang').length,
              rendah: anomalies.filter(a => a.type === type && a.severity === 'rendah').length,
            };
            const topColor = sevCounts.tinggi > 0 ? 'red' : sevCounts.sedang > 0 ? 'orange' : 'green';
            return (
              <div key={type} className="fin-insight-card">
                <div className={`fin-insight-icon ${topColor}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <div className="fin-insight-label">{type}</div>
                  <div className="fin-insight-value">{count} anomali</div>
                  <div className="fin-insight-sub">Tinggi: {sevCounts.tinggi} | Sedang: {sevCounts.sedang} | Rendah: {sevCounts.rendah}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
