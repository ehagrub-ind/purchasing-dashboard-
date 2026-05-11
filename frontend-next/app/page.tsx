'use client';

import { useEffect, useState, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { api } from '@/lib/api';
import { rupiah, kg, num } from '@/lib/format';
import KPICard from '@/components/KPICard';
import Loading from '@/components/Loading';

Chart.register(...registerables);

function kgShort(val: number) {
  if (val >= 1000) return (val / 1000).toFixed(1).replace('.', ',') + 'k';
  return val.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

export default function OverviewPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const chartsRef = useRef<Record<string, Chart>>({});

  useEffect(() => {
    api.getOverview().then(setData).catch((e) => setError(e.message));
    return () => {
      Object.values(chartsRef.current).forEach((c) => c.destroy());
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    Object.values(chartsRef.current).forEach((c) => c.destroy());
    chartsRef.current = {};

    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

    const w = document.getElementById('chart-wilayah') as HTMLCanvasElement;
    const k = document.getElementById('chart-kategori') as HTMLCanvasElement;
    const t = document.getElementById('chart-trend') as HTMLCanvasElement;
    if (!w || !k || !t) return;

    chartsRef.current.wilayah = new Chart(w, {
      type: 'doughnut',
      data: {
        labels: data.by_wilayah.map((x: any) => x.wilayah),
        datasets: [{ data: data.by_wilayah.map((x: any) => Number(x.total_kg)), backgroundColor: colors, borderWidth: 0 }],
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
    });

    chartsRef.current.kategori = new Chart(k, {
      type: 'bar',
      data: {
        labels: data.by_kategori.map((x: any) => x.kategori),
        datasets: [{ label: 'Kg', data: data.by_kategori.map((x: any) => Number(x.total_kg)), backgroundColor: colors, borderRadius: 8, borderSkipped: false }],
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } } } },
    });

    chartsRef.current.trend = new Chart(t, {
      type: 'line',
      data: {
        labels: data.monthly_trend.map((m: any) => m.bulan),
        datasets: [
          { label: 'Total Kg', data: data.monthly_trend.map((m: any) => Number(m.total_kg)), borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,.08)', fill: true, tension: 0.3, yAxisID: 'y' },
          { label: 'Transaksi', data: data.monthly_trend.map((m: any) => m.transaksi), borderColor: '#10B981', borderDash: [5, 5], tension: 0.3, yAxisID: 'y1' },
        ],
      },
      options: {
        responsive: true,
        interaction: { mode: 'index' as const, intersect: false },
        scales: {
          x: { grid: { display: false } },
          y: { type: 'linear' as const, position: 'left' as const, ticks: { color: '#3B82F6' } },
          y1: { type: 'linear' as const, position: 'right' as const, ticks: { color: '#10B981' }, grid: { drawOnChartArea: false } },
        },
      },
    });
  }, [data]);

  if (error) return <div className="loading">Error: {error}</div>;
  if (!data) return <Loading />;

  const s = data.summary;

  return (
    <>
      <div className="welcome-bar">
        Welcome back, <strong>Pak Regen</strong>. Ringkasan purchasing dan aktivitas terbaru.
      </div>

      <div className="kpi-row">
        <KPICard label="Total Transaksi" value={num(s.total_transaksi)} sub="Diperbarui baru saja" color="blue" />
        <KPICard label="Active Supplier" value={String(s.total_supplier)} sub="Diperbarui baru saja" color="orange" />
        <KPICard label="Total Pembelian" value={kgShort(s.total_kg)} sub="3 Wilayah" color="green" />
        <KPICard label="Total Nilai" value={rupiah(s.total_nilai).replace('Rp ', '')} sub="Diperbarui baru saja" color="purple" />
        <KPICard label="Total Fee" value={rupiah(s.total_fee).replace('Rp ', '')} sub="7 Partai" color="pink" />
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <div>
            <div className="section-card-title">Purchasing Management</div>
            <div className="section-card-sub">Kelola pembelian bahan baku di semua wilayah</div>
          </div>
        </div>
        <div className="chart-grid" style={{ marginBottom: 0 }}>
          <div className="chart-card">
            <div className="chart-title">Pembelian per Wilayah (kg)</div>
            <canvas id="chart-wilayah" />
          </div>
          <div className="chart-card">
            <div className="chart-title">Pembelian per Kategori (kg)</div>
            <canvas id="chart-kategori" />
          </div>
          <div className="chart-card full">
            <div className="chart-title">Trend Pembelian Bulanan</div>
            <canvas id="chart-trend" />
          </div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <div className="table-title">Ringkasan per Wilayah</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Wilayah</th>
              <th className="num-right">Transaksi</th>
              <th className="num-right">Total Kg</th>
              <th className="num-right">Total Nilai</th>
            </tr>
          </thead>
          <tbody>
            {data.by_wilayah.map((w: any) => (
              <tr key={w.wilayah}>
                <td><span className={`badge supplier-wilayah wilayah-${w.wilayah.toLowerCase()}`}>{w.wilayah}</span></td>
                <td className="num-right">{num(w.total_transaksi)}</td>
                <td className="num-right">{kg(w.total_kg)}</td>
                <td className="num-right">{rupiah(w.total_nilai)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
