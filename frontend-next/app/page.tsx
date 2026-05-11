'use client';

import { useEffect, useState, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { api } from '@/lib/api';
import { rupiah, kg, num } from '@/lib/format';
import {
  TrendingUp,
  Users,
  Package,
  Wallet,
  Coins,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

Chart.register(...registerables);

function kgShort(val: number) {
  if (val >= 1000) return (val / 1000).toFixed(1).replace('.', ',') + 'k';
  return val.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

const wilayahBadgeVariant: Record<string, 'jatim' | 'jateng' | 'jabar' | 'info'> = {
  jatim: 'jatim',
  jateng: 'jateng',
  jabar: 'jabar',
};

const kpiCards = [
  {
    key: 'total_transaksi',
    label: 'Total Transaksi',
    icon: TrendingUp,
    sub: 'Diperbarui baru saja',
    iconBg: 'bg-blue-100 text-blue-600',
    accentBorder: 'border-l-blue-500',
    format: (s: any) => num(s.total_transaksi),
  },
  {
    key: 'total_supplier',
    label: 'Active Supplier',
    icon: Users,
    sub: 'Diperbarui baru saja',
    iconBg: 'bg-orange-100 text-orange-600',
    accentBorder: 'border-l-orange-500',
    format: (s: any) => String(s.total_supplier),
  },
  {
    key: 'total_kg',
    label: 'Total Pembelian',
    icon: Package,
    sub: '3 Wilayah',
    iconBg: 'bg-emerald-100 text-emerald-600',
    accentBorder: 'border-l-emerald-500',
    format: (s: any) => kgShort(s.total_kg),
  },
  {
    key: 'total_nilai',
    label: 'Total Nilai',
    icon: Wallet,
    sub: 'Diperbarui baru saja',
    iconBg: 'bg-violet-100 text-violet-600',
    accentBorder: 'border-l-violet-500',
    format: (s: any) => rupiah(s.total_nilai).replace('Rp ', ''),
  },
  {
    key: 'total_fee',
    label: 'Total Fee',
    icon: Coins,
    sub: '7 Partai',
    iconBg: 'bg-pink-100 text-pink-600',
    accentBorder: 'border-l-pink-500',
    format: (s: any) => rupiah(s.total_fee).replace('Rp ', ''),
  },
];

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
        datasets: [
          {
            data: data.by_wilayah.map((x: any) => Number(x.total_kg)),
            backgroundColor: colors,
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } } },
      },
    });

    chartsRef.current.kategori = new Chart(k, {
      type: 'bar',
      data: {
        labels: data.by_kategori.map((x: any) => x.kategori),
        datasets: [
          {
            label: 'Kg',
            data: data.by_kategori.map((x: any) => Number(x.total_kg)),
            backgroundColor: colors,
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } } },
      },
    });

    chartsRef.current.trend = new Chart(t, {
      type: 'line',
      data: {
        labels: data.monthly_trend.map((m: any) => m.bulan),
        datasets: [
          {
            label: 'Total Kg',
            data: data.monthly_trend.map((m: any) => Number(m.total_kg)),
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59,130,246,.08)',
            fill: true,
            tension: 0.3,
            yAxisID: 'y',
          },
          {
            label: 'Transaksi',
            data: data.monthly_trend.map((m: any) => m.transaksi),
            borderColor: '#10B981',
            borderDash: [5, 5],
            tension: 0.3,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        scales: {
          x: { grid: { display: false } },
          y: { type: 'linear' as const, position: 'left' as const, ticks: { color: '#3B82F6' } },
          y1: {
            type: 'linear' as const,
            position: 'right' as const,
            ticks: { color: '#10B981' },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });
  }, [data]);

  /* ---- Loading & Error states ---- */
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive text-sm">Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm">Memuat data...</span>
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className="space-y-6">
      {/* Welcome bar */}
      <div className="rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4">
        <p className="text-sm text-muted-foreground">
          Welcome back, <span className="font-semibold text-foreground">Pak Regen</span>.
          Ringkasan purchasing dan aktivitas terbaru.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.key} className={cn('border-l-4', kpi.accentBorder)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {kpi.label}
                    </p>
                    <p className="text-2xl font-bold tracking-tight">{kpi.format(s)}</p>
                  </div>
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', kpi.iconBg)}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{kpi.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Purchasing Management</CardTitle>
              <CardDescription>Kelola pembelian bahan baku di semua wilayah</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Doughnut - Wilayah */}
            <Card className="border shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pembelian per Wilayah (kg)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <canvas id="chart-wilayah" />
                </div>
              </CardContent>
            </Card>

            {/* Bar - Kategori */}
            <Card className="border shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pembelian per Kategori (kg)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <canvas id="chart-kategori" />
                </div>
              </CardContent>
            </Card>

            {/* Line - Trend (full width) */}
            <Card className="border shadow-none lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Trend Pembelian Bulanan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <canvas id="chart-trend" />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Table - Ringkasan per Wilayah */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ringkasan per Wilayah</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wilayah</TableHead>
                <TableHead className="text-right">Transaksi</TableHead>
                <TableHead className="text-right">Total Kg</TableHead>
                <TableHead className="text-right">Total Nilai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.by_wilayah.map((w: any) => {
                const variant =
                  wilayahBadgeVariant[w.wilayah.toLowerCase()] ?? 'info';
                return (
                  <TableRow key={w.wilayah}>
                    <TableCell>
                      <Badge variant={variant}>{w.wilayah}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {num(w.total_transaksi)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {kg(w.total_kg)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {rupiah(w.total_nilai)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
