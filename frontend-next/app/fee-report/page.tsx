'use client';

import { useEffect, useState, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { api } from '@/lib/api';
import { rupiah, rupiahFull, kg } from '@/lib/format';
import Loading from '@/components/Loading';
import DataTable from '@/components/DataTable';

Chart.register(...registerables);

export default function FeeReportPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    api.getFees().then(setData).catch((e) => setError(e.message));
    return () => { chartRef.current?.destroy(); };
  }, []);

  useEffect(() => {
    if (!data) return;
    chartRef.current?.destroy();

    const canvas = document.getElementById('chart-fee') as HTMLCanvasElement;
    if (!canvas) return;

    chartRef.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.by_partai.map((p: any) => `Part ${p.partai}`),
        datasets: [{
          label: 'Fee (Rp)',
          data: data.by_partai.map((p: any) => Number(p.total_fee)),
          backgroundColor: '#8B5CF6',
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#64748B' }, grid: { display: false } },
          y: { ticks: { color: '#64748B' }, grid: { color: '#E5E7EB' } },
        },
      },
    });
  }, [data]);

  if (error) return <div className="loading">Error: {error}</div>;
  if (!data) return <Loading />;

  let totalKg = 0;
  let totalFee = 0;
  for (const f of data.data) {
    totalKg += Number(f.qty);
    totalFee += Number(f.total);
  }

  return (
    <>
      <h2 className="page-title">Fee Pak Regen</h2>
      <div className="stat-sub" style={{ marginBottom: 20 }}>
        Fee Rp 50.000/kg untuk bahan Brangkas &amp; Retul 9up
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Qty Fee</div>
          <div className="stat-value blue">{kg(totalKg)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Nominal Fee</div>
          <div className="stat-value purple">{rupiah(totalFee)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Fee Rate</div>
          <div className="stat-value green">Rp 50.000/kg</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Partai Aktif</div>
          <div className="stat-value blue">{data.data.length} partai</div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-title">Fee per Partai</div>
        <canvas id="chart-fee" />
      </div>

      <DataTable
        title="Detail Fee per Partai"
        columns={[
          { label: 'Partai' },
          { label: 'Qty (kg)', align: 'right' },
          { label: 'Fee/kg', align: 'right' },
          { label: 'Total Fee', align: 'right' },
        ]}
        rows={[
          ...data.by_partai.map((p: any) => [
            `Part ${p.partai}`,
            kg(p.total_kg),
            'Rp 50.000',
            rupiahFull(p.total_fee),
          ]),
          ['TOTAL', kg(totalKg), '-', rupiahFull(totalFee)],
        ]}
      />
    </>
  );
}
