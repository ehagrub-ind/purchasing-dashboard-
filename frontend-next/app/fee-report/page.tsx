'use client';

import { useEffect, useState, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { api } from '@/lib/api';
import { rupiah, rupiahFull, kg } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PageSkeleton } from '@/components/Skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Scale, TrendingUp, Banknote, Users, Download, Info } from 'lucide-react';

Chart.register(...registerables);

const TH = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

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
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 0, 280);
    grad.addColorStop(0, 'rgba(139,92,246,0.85)');
    grad.addColorStop(1, 'rgba(139,92,246,0.15)');

    chartRef.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.by_partai.map((p: any) => `Part ${p.partai}`),
        datasets: [{
          label: 'Fee (Rp)',
          data: data.by_partai.map((p: any) => Number(p.total_fee)),
          backgroundColor: grad,
          borderRadius: 10,
          borderSkipped: false,
          barThickness: 32,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.9)',
            padding: 12,
            cornerRadius: 10,
            titleFont: { size: 13, weight: 'bold' as const },
            bodyFont: { size: 12 },
            callbacks: {
              label: (ctx) => `Fee: ${rupiahFull(ctx.raw as number)}`,
            },
          },
        },
        scales: {
          x: { ticks: { color: '#94A3B8', font: { size: 12 } }, grid: { display: false } },
          y: { ticks: { color: '#94A3B8', font: { size: 11 }, callback: (v) => rupiah(v as number) }, grid: { color: '#F1F5F9' } },
        },
      },
    });
  }, [data]);

  if (error) return <div className="flex items-center justify-center p-12 text-destructive font-medium">Error: {error}</div>;
  if (!data) return <PageSkeleton />;

  let totalKg = 0;
  let totalFee = 0;
  for (const f of data.data) { totalKg += Number(f.qty); totalFee += Number(f.total); }

  const maxFee = Math.max(...data.by_partai.map((p: any) => Number(p.total_fee)), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fee Pak Regen</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Fee Rp 50.000/kg untuk bahan Brangkas &amp; Retul 9up</p>
        </div>
        <Button size="sm" variant="outline"><Download className="mr-1.5 h-4 w-4" />Export</Button>
      </div>

      {/* Gradient KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GradientKPI gradient="gradient-card-blue" icon={<Scale className="h-5 w-5" />} label="Total Qty Fee" value={kg(totalKg)} sub="Volume bahan fee" />
        <GradientKPI gradient="gradient-card-purple" icon={<Banknote className="h-5 w-5" />} label="Total Nominal Fee" value={rupiah(totalFee)} sub="Akumulasi semua partai" />
        <GradientKPI gradient="gradient-card-emerald" icon={<TrendingUp className="h-5 w-5" />} label="Fee Rate" value="Rp 50.000/kg" sub="Tarif tetap" />
        <GradientKPI gradient="gradient-card-orange" icon={<Users className="h-5 w-5" />} label="Partai Aktif" value={`${data.by_partai.length}`} sub={`${data.data.length} record`} />
      </div>

      {/* Info Banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3.5">
        <div className="rounded-xl bg-blue-100 p-2"><Info className="h-4 w-4 text-blue-600" /></div>
        <p className="text-sm text-blue-800">
          Fee dihitung per partai (Part 1–{data.by_partai.length}) untuk bahan <strong>Brangkas</strong> dan <strong>Retul 9up</strong> dengan tarif Rp 50.000/kg.
        </p>
      </div>

      {/* Chart + Table Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Bar Chart */}
        <Card className="rounded-2xl lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Fee per Partai</CardTitle>
            <CardDescription className="text-xs">Distribusi fee dari semua partai</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72"><canvas id="chart-fee" /></div>
          </CardContent>
        </Card>

        {/* Side Summary */}
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Ranking Partai</CardTitle>
            <CardDescription className="text-xs">Berdasarkan total fee</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...data.by_partai]
              .sort((a: any, b: any) => Number(b.total_fee) - Number(a.total_fee))
              .slice(0, 6)
              .map((p: any, i: number) => {
                const pct = Math.max(4, (Number(p.total_fee) / maxFee) * 100);
                return (
                  <div key={p.partai}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold text-white',
                          i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-muted-foreground/30'
                        )}>{i + 1}</span>
                        <span className="text-sm font-medium">Part {p.partai}</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums">{rupiah(p.total_fee)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </div>

      {/* Detail Table */}
      <Card className="rounded-2xl overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Detail Fee per Partai</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2">
                <TableHead className={TH}>Partai</TableHead>
                <TableHead className={cn(TH, 'text-right')}>Qty (kg)</TableHead>
                <TableHead className={cn(TH, 'text-right')}>Fee/kg</TableHead>
                <TableHead className={cn(TH, 'text-right')}>Total Fee</TableHead>
                <TableHead className={TH}>Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.by_partai.map((p: any) => {
                const share = totalFee > 0 ? (Number(p.total_fee) / totalFee) * 100 : 0;
                return (
                  <TableRow key={p.partai} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-sm">
                      <Badge variant="secondary" className="text-[11px]">Part {p.partai}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{kg(p.total_kg)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">Rp 50.000</TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">{rupiahFull(p.total_fee)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-purple-500" style={{ width: `${share}%` }} />
                        </div>
                        <span className="text-[11px] tabular-nums text-muted-foreground w-8 text-right">{share.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="border-t-2 bg-muted/30">
                <TableCell className="font-bold text-sm">TOTAL</TableCell>
                <TableCell className="text-right font-bold text-sm tabular-nums">{kg(totalKg)}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">-</TableCell>
                <TableCell className="text-right font-bold text-sm tabular-nums">{rupiahFull(totalFee)}</TableCell>
                <TableCell><span className="text-[11px] font-semibold text-muted-foreground">100%</span></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════ Gradient KPI Card ═══════════════ */

function GradientKPI({ gradient, icon, label, value, sub }: {
  gradient: string; icon: React.ReactNode; label: string; value: string; sub: string;
}) {
  return (
    <div className={cn('rounded-2xl p-5 text-white relative overflow-hidden', gradient)}>
      <div className="flex items-center gap-3 mb-3">
        <div className="rounded-xl bg-white/20 p-2">{icon}</div>
        <span className="text-[13px] font-medium text-white/80">{label}</span>
      </div>
      <p className="text-2xl font-extrabold tracking-tight">{value}</p>
      <p className="text-[12px] text-white/60 mt-1">{sub}</p>
    </div>
  );
}
