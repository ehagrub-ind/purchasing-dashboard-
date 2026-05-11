'use client';

import { useEffect, useState, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { api } from '@/lib/api';
import { rupiah, rupiahFull, kg } from '@/lib/format';
import { cn } from '@/lib/utils';
import Loading from '@/components/Loading';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Scale, TrendingUp, Banknote, Users } from 'lucide-react';

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
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#64748B' }, grid: { display: false } },
          y: { ticks: { color: '#64748B' }, grid: { color: '#E5E7EB' } },
        },
      },
    });
  }, [data]);

  if (error) return <div className="flex items-center justify-center p-12 text-red-500">Error: {error}</div>;
  if (!data) return <Loading />;

  let totalKg = 0;
  let totalFee = 0;
  for (const f of data.data) {
    totalKg += Number(f.qty);
    totalFee += Number(f.total);
  }

  const stats = [
    { label: 'Total Qty Fee', value: kg(totalKg), icon: Scale, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Nominal Fee', value: rupiah(totalFee), icon: Banknote, color: 'text-violet-600 bg-violet-50' },
    { label: 'Fee Rate', value: 'Rp 50.000/kg', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Partai Aktif', value: `${data.data.length} partai`, icon: Users, color: 'text-blue-600 bg-blue-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Fee Pak Regen</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Fee Rp 50.000/kg untuk bahan Brangkas &amp; Retul 9up
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={cn('flex items-center justify-center h-10 w-10 rounded-lg', s.color)}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold tracking-tight">{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fee per Partai</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <canvas id="chart-fee" />
          </div>
        </CardContent>
      </Card>

      {/* Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detail Fee per Partai</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partai</TableHead>
                <TableHead className="text-right">Qty (kg)</TableHead>
                <TableHead className="text-right">Fee/kg</TableHead>
                <TableHead className="text-right">Total Fee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.by_partai.map((p: any) => (
                <TableRow key={p.partai}>
                  <TableCell className="font-medium">Part {p.partai}</TableCell>
                  <TableCell className="text-right">{kg(p.total_kg)}</TableCell>
                  <TableCell className="text-right">Rp 50.000</TableCell>
                  <TableCell className="text-right">{rupiahFull(p.total_fee)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-bold bg-muted/50">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">{kg(totalKg)}</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">{rupiahFull(totalFee)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
