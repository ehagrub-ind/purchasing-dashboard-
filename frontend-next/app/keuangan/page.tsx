'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { Chart, registerables } from 'chart.js';
import { api } from '@/lib/api';
import { rupiah, rupiahFull, fmtDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import Loading from '@/components/Loading';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  AlertTriangle,
  ClipboardList,
  TrendingDown,
  TrendingUp,
  Search,
  Download,
  Plus,
  Info,
  CheckCircle2,
  XCircle,
  CreditCard,
  BarChart3,
} from 'lucide-react';

Chart.register(...registerables);

type TabId = 'ringkasan' | 'masuk' | 'keluar' | 'aruskas' | 'incomplete';

/* ─── Helper functions ─── */

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

/* ─── Badge components ─── */

const TYPE_BADGE_MAP: Record<string, { variant: 'success' | 'destructive' | 'info' | 'purple' | 'secondary'; label: string }> = {
  masuk: { variant: 'success', label: 'Masuk' },
  keluar: { variant: 'destructive', label: 'Keluar' },
  operasional: { variant: 'info', label: 'Operasional' },
  koreksi: { variant: 'purple', label: 'Koreksi' },
  lainnya: { variant: 'secondary', label: 'Lainnya' },
};

function TypeBadge({ type }: { type: string }) {
  const m = TYPE_BADGE_MAP[type] || TYPE_BADGE_MAP.lainnya;
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

function StatusBadge({ row }: { row: any }) {
  const issues = detectIssues(row);
  if (issues.length === 0) return <Badge variant="success">Lengkap</Badge>;
  return <Badge variant="warning">Perlu Dicek</Badge>;
}

function WilayahBadge({ w }: { w: string }) {
  const variant = (w || '').toLowerCase() as 'jabar' | 'jateng' | 'jatim';
  const knownVariants = ['jabar', 'jateng', 'jatim'];
  return (
    <Badge variant={knownVariants.includes(variant) ? variant : 'secondary'}>
      {w}
    </Badge>
  );
}

/* ─── Main page ─── */

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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (loading) return <Loading />;

  const pills = [
    { label: 'Semua', value: '' },
    { label: 'Jabar', value: 'Jabar' },
    { label: 'Jateng', value: 'Jateng' },
    { label: 'Jatim', value: 'Jatim' },
    { label: 'Saldo Minus', value: '__minus' },
    { label: 'Belum Lengkap', value: '__incomplete' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Keuangan</h2>
          <p className="text-muted-foreground mt-1">
            Pantau arus kas masuk, kas keluar, saldo wilayah, dan transaksi yang belum lengkap.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Input Uang Masuk
          </Button>
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Input Pengeluaran
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Warning Banner */}
      {incompleteCount > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="flex items-start gap-3 py-4">
            <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/50">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-sm">
              <span className="text-amber-800 dark:text-amber-200">
                Jika saldo wilayah minus, cek tab Uang Masuk dan Belum Lengkap terlebih dahulu.{' '}
              </span>
              <strong className="text-amber-900 dark:text-amber-100">
                {incompleteCount} transaksi perlu dicek.
              </strong>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-900/50">
                <ArrowDownCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">Total Uang Masuk</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 truncate">{rupiah(totals.masuk)}</p>
                <p className="text-xs text-muted-foreground">Diperbarui baru saja</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-pink-100 p-2.5 dark:bg-pink-900/50">
                <ArrowUpCircle className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">Total Uang Keluar</p>
                <p className="text-xl font-bold text-pink-600 dark:text-pink-400 truncate">{rupiah(totals.keluar)}</p>
                <p className="text-xs text-muted-foreground">Diperbarui baru saja</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "rounded-lg p-2.5",
                totals.saldo >= 0
                  ? "bg-emerald-100 dark:bg-emerald-900/50"
                  : "bg-pink-100 dark:bg-pink-900/50"
              )}>
                <Wallet className={cn(
                  "h-5 w-5",
                  totals.saldo >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-pink-600 dark:text-pink-400"
                )} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">Saldo Akhir</p>
                <p className={cn(
                  "text-xl font-bold truncate",
                  totals.saldo >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-pink-600 dark:text-pink-400"
                )}>{rupiah(totals.saldo)}</p>
                <p className="text-xs text-muted-foreground">
                  {totals.saldo < 0 ? 'Minus' : 'Positif'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/50">
                <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">Selisih Belum Jelas</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 truncate">{rupiah(Math.abs(totals.saldo))}</p>
                <p className="text-xs text-muted-foreground">Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "rounded-lg p-2.5",
                incompleteCount > 0
                  ? "bg-amber-100 dark:bg-amber-900/50"
                  : "bg-emerald-100 dark:bg-emerald-900/50"
              )}>
                <ClipboardList className={cn(
                  "h-5 w-5",
                  incompleteCount > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                )} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">Transaksi Belum Lengkap</p>
                <p className={cn(
                  "text-xl font-bold truncate",
                  incompleteCount > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                )}>{incompleteCount}</p>
                <p className="text-xs text-muted-foreground">
                  {incompleteCount > 0 ? 'Perlu Cek' : 'Aman'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {pills.map(p => (
          <Button
            key={p.value}
            variant={globalWilayah === p.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGlobalWilayah(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
          <TabsTrigger value="masuk">Uang Masuk</TabsTrigger>
          <TabsTrigger value="keluar">Uang Keluar</TabsTrigger>
          <TabsTrigger value="aruskas">Arus Kas</TabsTrigger>
          <TabsTrigger value="incomplete" className="gap-2">
            Belum Lengkap
            {incompleteCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
                {incompleteCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ringkasan">
          <RingkasanTab kasSummary={kasSummary} kasData={kasData} opData={opData} opSummary={opSummary} rows={filteredKas} />
        </TabsContent>
        <TabsContent value="masuk">
          <MasukTab rows={filteredKas} />
        </TabsContent>
        <TabsContent value="keluar">
          <KeluarTab rows={filteredKas} />
        </TabsContent>
        <TabsContent value="aruskas">
          <ArusKasTab rows={filteredKas} />
        </TabsContent>
        <TabsContent value="incomplete">
          <IncompleteTab kasData={kasData} globalWilayah={globalWilayah} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Tab: Ringkasan ─── */

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
          {
            label: 'Masuk',
            data: kasSummary.map((s: any) => Number(s.total_masuk)),
            backgroundColor: '#10B981',
            borderRadius: 8,
            borderSkipped: false,
          },
          {
            label: 'Keluar',
            data: kasSummary.map((s: any) => Number(s.total_keluar)),
            backgroundColor: '#EF4444',
            borderRadius: 8,
            borderSkipped: false,
          },
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
    <div className="space-y-6">
      {/* Kas per Wilayah Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kasSummary.map((s: any) => {
          const saldo = Number(s.saldo);
          const isPositive = saldo >= 0;
          return (
            <Card key={s.wilayah}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "rounded-lg p-3",
                    isPositive
                      ? "bg-emerald-100 dark:bg-emerald-900/50"
                      : "bg-red-100 dark:bg-red-900/50"
                  )}>
                    <CreditCard className={cn(
                      "h-5 w-5",
                      isPositive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    )} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      Kas <WilayahBadge w={s.wilayah} />
                    </div>
                    <p className={cn(
                      "text-xl font-bold mt-1",
                      isPositive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    )}>
                      {rupiah(saldo)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Masuk: {rupiah(s.total_masuk)} | Keluar: {rupiah(s.total_keluar)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            Arus Kas per Wilayah: Masuk vs Keluar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <canvas id="chart-kas-wilayah" />
        </CardContent>
      </Card>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-red-100 p-3 dark:bg-red-900/50">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wilayah Paling Minus</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  {mostMinus?.wilayah || '-'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {mostMinus ? `Saldo: ${rupiah(mostMinus.saldo)}` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-emerald-100 p-3 dark:bg-emerald-900/50">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pemasukan Terbesar</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {mostMasuk?.wilayah || '-'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {mostMasuk ? `Total: ${rupiah(mostMasuk.total_masuk)}` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/50">
                <ClipboardList className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Belum Lengkap Terbanyak</p>
                <p className="text-lg font-bold">
                  {mostInc ? mostInc[0] : 'Tidak ada'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {mostInc ? `${mostInc[1]} transaksi perlu dicek` : 'Semua lengkap'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
        <CardContent className="flex items-start gap-3 py-4">
          <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/50">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Banyak uang masuk belum diinput. </strong>
            <span>Saldo minus bisa terjadi karena pemasukan belum dicatat. </span>
            <span>Saat ini: {masukCount} transaksi masuk vs {keluarCount} transaksi keluar.</span>
          </div>
        </CardContent>
      </Card>

      {/* Biaya Operasional Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Biaya Operasional</CardTitle>
          <CardDescription>Total: {rupiah(totalOp)} ({opData.length} transaksi)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wilayah</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opData.map((o: any, i: number) => (
                <TableRow key={i}>
                  <TableCell><WilayahBadge w={o.wilayah} /></TableCell>
                  <TableCell>{o.deskripsi}</TableCell>
                  <TableCell className="text-right font-medium">{rupiahFull(o.jumlah)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Tab: Uang Masuk ─── */

function MasukTab({ rows }: { rows: any[] }) {
  const [search, setSearch] = useState('');
  const masukRows = useMemo(() => {
    let list = rows.filter((r: any) => r.masuk > 0);
    if (search) list = list.filter((r: any) => (r.deskripsi || '').toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [rows, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari transaksi masuk..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uang Masuk ({masukRows.length} transaksi)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Wilayah</TableHead>
                  <TableHead>Sumber Dana</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Nominal Masuk</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {masukRows.map((r: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="whitespace-nowrap">{fmtDate(r.date)}</TableCell>
                    <TableCell><WilayahBadge w={r.wilayah} /></TableCell>
                    <TableCell>{detectSource(r)}</TableCell>
                    <TableCell>{r.deskripsi}</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {rupiahFull(r.masuk)}
                    </TableCell>
                    <TableCell><StatusBadge row={r} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Tab: Uang Keluar ─── */

function KeluarTab({ rows }: { rows: any[] }) {
  const [search, setSearch] = useState('');
  const keluarRows = useMemo(() => {
    let list = rows.filter((r: any) => r.keluar > 0);
    if (search) list = list.filter((r: any) => (r.deskripsi || '').toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [rows, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari transaksi keluar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uang Keluar ({keluarRows.length} transaksi)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Wilayah</TableHead>
                  <TableHead>Supplier/Tujuan</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Nominal Keluar</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keluarRows.map((r: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="whitespace-nowrap">{fmtDate(r.date)}</TableCell>
                    <TableCell><WilayahBadge w={r.wilayah} /></TableCell>
                    <TableCell>{detectSupplierTarget(r)}</TableCell>
                    <TableCell>{r.deskripsi}</TableCell>
                    <TableCell className="text-right font-medium text-pink-600 dark:text-pink-400">
                      {rupiahFull(r.keluar)}
                    </TableCell>
                    <TableCell>{detectCategory(r)}</TableCell>
                    <TableCell><StatusBadge row={r} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Tab: Arus Kas ─── */

function ArusKasTab({ rows }: { rows: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Arus Kas ({rows.length} entri)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[70vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Wilayah</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Masuk</TableHead>
                <TableHead className="text-right">Keluar</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Tipe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any, i: number) => {
                const tipe = detectTransactionType(r);
                const saldoVal = Number(r.balance);
                return (
                  <TableRow key={i}>
                    <TableCell className="whitespace-nowrap">{fmtDate(r.date)}</TableCell>
                    <TableCell><WilayahBadge w={r.wilayah} /></TableCell>
                    <TableCell>{r.deskripsi}</TableCell>
                    <TableCell className="text-right">
                      {r.masuk > 0
                        ? <span className="font-medium text-emerald-600 dark:text-emerald-400">{rupiahFull(r.masuk)}</span>
                        : <span className="text-muted-foreground">-</span>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {r.keluar > 0
                        ? <span className="font-medium text-pink-600 dark:text-pink-400">{rupiahFull(r.keluar)}</span>
                        : <span className="text-muted-foreground">-</span>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "font-medium",
                        saldoVal < 0 ? "text-red-600 dark:text-red-400" : ""
                      )}>
                        {rupiahFull(r.balance)}
                      </span>
                    </TableCell>
                    <TableCell><TypeBadge type={tipe} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Tab: Belum Lengkap ─── */

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
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-emerald-100 p-4 dark:bg-emerald-900/50">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Semua transaksi lengkap</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tidak ada transaksi yang perlu dicek saat ini.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Transaksi Belum Lengkap ({issues.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[70vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Wilayah</TableHead>
                <TableHead>Masalah</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead>Saran Perbaikan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="whitespace-nowrap">{fmtDate(item.row.date)}</TableCell>
                  <TableCell><WilayahBadge w={item.row.wilayah} /></TableCell>
                  <TableCell><Badge variant="warning">{item.issue}</Badge></TableCell>
                  <TableCell>{item.row.deskripsi || '-'}</TableCell>
                  <TableCell className="text-right font-medium">
                    {rupiahFull(item.row.masuk > 0 ? item.row.masuk : item.row.keluar)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.suggestion}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
