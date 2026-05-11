'use client';

import { useEffect, useState, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { api } from '@/lib/api';
import { rupiah, kg, num } from '@/lib/format';
import {
  TrendingUp, Users, Package, Wallet, Coins,
  Loader2, ArrowUpRight, ArrowDownRight,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

Chart.register(...registerables);

function kgShort(val: number) {
  if (val >= 1000) return (val / 1000).toFixed(1).replace('.', ',') + 'k';
  return val.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

function rpShort(val: number) {
  if (val >= 1_000_000) return 'Rp ' + (val / 1_000_000).toFixed(1).replace('.', ',') + ' M';
  if (val >= 1_000) return 'Rp ' + (val / 1_000).toFixed(0) + ' jt';
  return 'Rp ' + val.toLocaleString('id-ID');
}

const WILAYAH_BADGE: Record<string, 'jatim' | 'jateng' | 'jabar' | 'info'> = {
  jatim: 'jatim', jateng: 'jateng', jabar: 'jabar',
};

const PALETTE = {
  purple: '#7C3AED',
  blue: '#3B82F6',
  emerald: '#10B981',
  orange: '#F59E0B',
  pink: '#EC4899',
  red: '#EF4444',
  indigo: '#6366F1',
  teal: '#14B8A6',
};

export default function OverviewPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const chartsRef = useRef<Record<string, Chart>>({});

  useEffect(() => {
    api.getOverview().then(setData).catch((e) => setError(e.message));
    return () => { Object.values(chartsRef.current).forEach((c) => c.destroy()); };
  }, []);

  useEffect(() => {
    if (!data) return;
    Object.values(chartsRef.current).forEach((c) => c.destroy());
    chartsRef.current = {};
    renderCharts(data, chartsRef);
  }, [data]);

  if (error) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-destructive text-sm">Error: {error}</p>
    </div>
  );

  if (!data) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="text-sm">Memuat data...</span>
    </div>
  );

  const s = data.summary;

  const kpiCards = [
    { label: 'Total Transaksi', value: num(s.total_transaksi), icon: TrendingUp, gradient: 'gradient-card-purple', change: '+12%', up: true },
    { label: 'Supplier Aktif', value: String(s.total_supplier), icon: Users, gradient: 'gradient-card-blue', change: '+2', up: true },
    { label: 'Total Pembelian', value: kgShort(s.total_kg) + ' kg', icon: Package, gradient: 'gradient-card-emerald', change: '+8%', up: true },
    { label: 'Total Nilai', value: rpShort(s.total_nilai), icon: Wallet, gradient: 'gradient-card-orange', change: '+5%', up: true },
    { label: 'Total Fee', value: rpShort(s.total_fee), icon: Coins, gradient: 'gradient-card-pink', change: '-3%', up: false },
  ];

  const topWilayah = [...data.by_wilayah].sort((a: any, b: any) => b.total_nilai - a.total_nilai)[0];
  const minWilayah = [...data.by_wilayah].sort((a: any, b: any) => a.total_kg - b.total_kg)[0];
  const topKategori = [...data.by_kategori].sort((a: any, b: any) => b.total_kg - a.total_kg)[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Overview pembelian bahan baku rambut</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Terakhir update</p>
          <p className="text-sm font-medium">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpiCards.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className={cn('rounded-2xl p-5 text-white shadow-lg relative overflow-hidden group hover:shadow-xl transition-shadow', kpi.gradient)}>
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10 group-hover:scale-110 transition-transform" />
              <div className="absolute bottom-2 right-3 w-10 h-10 rounded-full bg-white/[0.06]" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={cn('flex items-center gap-0.5 text-[11px] font-semibold rounded-full px-2 py-0.5 bg-white/20')}>
                    {kpi.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {kpi.change}
                  </span>
                </div>
                <p className="text-[22px] font-extrabold tracking-tight leading-tight">{kpi.value}</p>
                <p className="text-[11px] text-white/70 mt-1 font-medium">{kpi.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Area Chart - Trend */}
        <Card className="lg:col-span-8 shadow-sm border-0 shadow-black/[0.04]">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[15px] font-semibold">Trend Pembelian</CardTitle>
                <CardDescription className="text-xs">Total kg & transaksi per bulan</CardDescription>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#7C3AED]" />Total Kg</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#10B981]" />Transaksi</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[300px]">
              <canvas id="chart-trend" />
            </div>
          </CardContent>
        </Card>

        {/* Donut - Wilayah */}
        <Card className="lg:col-span-4 shadow-sm border-0 shadow-black/[0.04]">
          <CardHeader className="pb-0">
            <CardTitle className="text-[15px] font-semibold">Distribusi Wilayah</CardTitle>
            <CardDescription className="text-xs">Volume pembelian per provinsi</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[300px] flex items-center justify-center">
              <canvas id="chart-wilayah" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bar - Kategori */}
        <Card className="lg:col-span-7 shadow-sm border-0 shadow-black/[0.04]">
          <CardHeader className="pb-0">
            <CardTitle className="text-[15px] font-semibold">Pembelian per Kategori</CardTitle>
            <CardDescription className="text-xs">Breakdown volume dalam kg</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[280px]">
              <canvas id="chart-kategori" />
            </div>
          </CardContent>
        </Card>

        {/* Insight Cards */}
        <div className="lg:col-span-5 space-y-4">
          <InsightCard
            icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
            iconBg="bg-emerald-50"
            title="Pemasukan Terbesar"
            value={topWilayah?.wilayah}
            detail={`Total: ${rpShort(topWilayah?.total_nilai || 0)}`}
          />
          <InsightCard
            icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
            iconBg="bg-amber-50"
            title="Volume Terendah"
            value={minWilayah?.wilayah}
            detail={`${kgShort(minWilayah?.total_kg || 0)} kg — perlu evaluasi`}
          />
          <InsightCard
            icon={<Package className="h-5 w-5 text-purple-600" />}
            iconBg="bg-purple-50"
            title="Kategori Terlaris"
            value={topKategori?.kategori}
            detail={`${kgShort(topKategori?.total_kg || 0)} kg dari ${topKategori?.total_transaksi} transaksi`}
          />
          <InsightCard
            icon={<Coins className="h-5 w-5 text-pink-600" />}
            iconBg="bg-pink-50"
            title="Total Fee Pak Regen"
            value={rpShort(s.total_fee)}
            detail={`${kgShort(s.total_fee_kg)} kg dari 7 partai`}
          />
        </div>
      </div>

      {/* Table */}
      <Card className="shadow-sm border-0 shadow-black/[0.04]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[15px] font-semibold">Ringkasan per Wilayah</CardTitle>
              <CardDescription className="text-xs">Data agregat semua transaksi per provinsi</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">{data.by_wilayah.length} Wilayah</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b-2">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Wilayah</TableHead>
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Transaksi</TableHead>
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Kg</TableHead>
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Nilai</TableHead>
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.by_wilayah.map((w: any) => {
                const variant = WILAYAH_BADGE[w.wilayah.toLowerCase()] ?? 'info';
                const share = s.total_kg > 0 ? ((w.total_kg / s.total_kg) * 100).toFixed(1) : '0';
                return (
                  <TableRow key={w.wilayah} className="hover:bg-muted/30">
                    <TableCell>
                      <Badge variant={variant}>{w.wilayah}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-sm">{num(w.total_transaksi)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-sm">{kg(w.total_kg)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-sm">{rupiah(w.total_nilai)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
                        </div>
                        <span className="text-xs font-medium tabular-nums text-muted-foreground w-10 text-right">{share}%</span>
                      </div>
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

/* ═══════════════════════════════════════════ */

function InsightCard({ icon, iconBg, title, value, detail }: {
  icon: React.ReactNode; iconBg: string; title: string; value: string; detail: string;
}) {
  return (
    <Card className="shadow-sm border-0 shadow-black/[0.04] hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl shrink-0', iconBg)}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium">{title}</p>
            <p className="text-[15px] font-bold truncate">{value}</p>
            <p className="text-[11px] text-muted-foreground">{detail}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════ */

function renderCharts(data: any, chartsRef: React.MutableRefObject<Record<string, Chart>>) {
  const w = document.getElementById('chart-wilayah') as HTMLCanvasElement;
  const k = document.getElementById('chart-kategori') as HTMLCanvasElement;
  const t = document.getElementById('chart-trend') as HTMLCanvasElement;
  if (!w || !k || !t) return;

  const donutColors = [PALETTE.purple, PALETTE.blue, PALETTE.emerald, PALETTE.orange, PALETTE.pink, PALETTE.red];

  chartsRef.current.wilayah = new Chart(w, {
    type: 'doughnut',
    data: {
      labels: data.by_wilayah.map((x: any) => x.wilayah),
      datasets: [{
        data: data.by_wilayah.map((x: any) => Number(x.total_kg)),
        backgroundColor: donutColors,
        borderWidth: 4,
        borderColor: '#fff',
        hoverBorderWidth: 0,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 16, usePointStyle: true, pointStyleWidth: 8, font: { size: 12, family: 'Inter', weight: 500 as const } },
        },
      },
    },
  });

  const barColors = [PALETTE.purple, PALETTE.blue, PALETTE.emerald, PALETTE.orange, PALETTE.pink, PALETTE.red, PALETTE.indigo, PALETTE.teal];
  chartsRef.current.kategori = new Chart(k, {
    type: 'bar',
    data: {
      labels: data.by_kategori.map((x: any) => x.kategori),
      datasets: [{
        label: 'Kg',
        data: data.by_kategori.map((x: any) => Number(x.total_kg)),
        backgroundColor: data.by_kategori.map((_: any, i: number) => barColors[i % barColors.length] + '18'),
        borderColor: data.by_kategori.map((_: any, i: number) => barColors[i % barColors.length]),
        borderWidth: 2,
        borderRadius: 12,
        borderSkipped: false,
        barThickness: 40,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Inter', weight: 500 as const }, color: '#64748b' } },
        y: { grid: { color: '#f1f5f9', drawTicks: false }, ticks: { font: { size: 11, family: 'Inter' }, color: '#94a3b8', padding: 8 }, border: { display: false } },
      },
    },
  });

  const trendCtx = t.getContext('2d')!;
  const grad1 = trendCtx.createLinearGradient(0, 0, 0, 300);
  grad1.addColorStop(0, 'rgba(124,58,237,0.12)');
  grad1.addColorStop(1, 'rgba(124,58,237,0)');
  const grad2 = trendCtx.createLinearGradient(0, 0, 0, 300);
  grad2.addColorStop(0, 'rgba(16,185,129,0.10)');
  grad2.addColorStop(1, 'rgba(16,185,129,0)');

  chartsRef.current.trend = new Chart(t, {
    type: 'line',
    data: {
      labels: data.monthly_trend.map((m: any) => {
        const [y, mo] = m.bulan.split('-');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        return months[parseInt(mo) - 1] + ' ' + y.slice(2);
      }),
      datasets: [
        {
          label: 'Total Kg',
          data: data.monthly_trend.map((m: any) => Number(m.total_kg)),
          borderColor: PALETTE.purple,
          backgroundColor: grad1,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#fff',
          pointBorderColor: PALETTE.purple,
          pointBorderWidth: 2.5,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: PALETTE.purple,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 3,
          borderWidth: 2.5,
          yAxisID: 'y',
        },
        {
          label: 'Transaksi',
          data: data.monthly_trend.map((m: any) => m.transaksi),
          borderColor: PALETTE.emerald,
          backgroundColor: grad2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#fff',
          pointBorderColor: PALETTE.emerald,
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          borderWidth: 2,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e1b4b',
          titleFont: { family: 'Inter', size: 12, weight: 'bold' },
          bodyFont: { family: 'Inter', size: 12 },
          padding: 12,
          cornerRadius: 10,
          displayColors: true,
          boxPadding: 4,
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Inter', weight: 500 as const }, color: '#64748b' } },
        y: { type: 'linear', position: 'left', grid: { color: '#f1f5f9', drawTicks: false }, ticks: { font: { size: 11, family: 'Inter' }, color: PALETTE.purple, padding: 8 }, border: { display: false } },
        y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: 11, family: 'Inter' }, color: PALETTE.emerald, padding: 8 }, border: { display: false } },
      },
    },
  });
}
