'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { rupiahFull, fmtDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PageSkeleton } from '@/components/Skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  ArrowDownCircle, ArrowUpCircle, ArrowUpRight, ArrowDownRight,
  Scale, Hash, Landmark, Wallet, Info, ChevronLeft, ChevronRight,
} from 'lucide-react';

const TH = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

function rpShort(val: number) {
  const abs = Math.abs(val);
  const prefix = val < 0 ? '-' : '';
  if (abs >= 1_000_000) return prefix + 'Rp ' + (abs / 1_000_000).toFixed(1).replace('.', ',') + ' M';
  if (abs >= 1_000) return prefix + 'Rp ' + (abs / 1_000).toFixed(0) + ' jt';
  return prefix + 'Rp ' + abs.toLocaleString('id-ID');
}

function SumberBadge({ sumber }: { sumber: string }) {
  const map: Record<string, { variant: 'info' | 'purple' | 'secondary'; label: string }> = {
    kas: { variant: 'info', label: 'Kas' },
    pembayaran: { variant: 'purple', label: 'Pembayaran' },
  };
  const m = map[sumber] || { variant: 'secondary' as const, label: sumber };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

function WilayahBadge({ w }: { w: string }) {
  const v = (w || '').toLowerCase();
  const known = ['jabar', 'jateng', 'jatim'];
  return <Badge variant={known.includes(v) ? (v as any) : 'secondary'}>{w || '-'}</Badge>;
}

function GradientKPI({ gradient, icon, label, value, sub, badge }: {
  gradient: string; icon: React.ReactNode; label: string; value: string; sub: string; badge?: React.ReactNode;
}) {
  return (
    <div className={cn('rounded-2xl p-5 text-white shadow-lg relative overflow-hidden group hover:shadow-xl transition-shadow', gradient)}>
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10 group-hover:scale-110 transition-transform" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">{icon}</div>
          {badge && <span className="flex items-center gap-0.5 text-[11px] font-semibold rounded-full px-2 py-0.5 bg-white/20">{badge}</span>}
        </div>
        <p className="text-[22px] font-extrabold tracking-tight leading-tight">{value}</p>
        <p className="text-[11px] text-white/70 mt-1 font-medium">{label}</p>
        <p className="text-[10px] text-white/50 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

const SUMBER_PILLS = [
  { value: '', label: 'Semua' },
  { value: 'kas', label: 'Kas' },
  { value: 'pembayaran', label: 'Pembayaran' },
];

const WILAYAH_PILLS = [
  { value: '', label: 'Semua' },
  { value: 'Jabar', label: 'Jabar' },
  { value: 'Jateng', label: 'Jateng' },
  { value: 'Jatim', label: 'Jatim' },
];

export default function ArusKasPage() {
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterSumber, setFilterSumber] = useState('');
  const [filterWilayah, setFilterWilayah] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    api.getArusKasStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: '50' };
    if (filterSumber) params.sumber = filterSumber;
    if (filterWilayah) params.wilayah = filterWilayah;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    api.getArusKas(params)
      .then((res: any) => {
        setData(res.data || []);
        setPagination(res.pagination || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, filterSumber, filterWilayah, dateFrom, dateTo]);

  useEffect(() => { setPage(1); }, [filterSumber, filterWilayah, dateFrom, dateTo]);

  if (!stats && loading) return <PageSkeleton />;

  const saldo = stats?.saldo_bersih ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Arus Kas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Alur uang masuk &amp; keluar dari semua sumber secara kronologis
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GradientKPI
          gradient="gradient-card-emerald"
          icon={<ArrowDownCircle className="h-5 w-5" />}
          label="Total Uang Masuk"
          value={rpShort(stats?.total_masuk ?? 0)}
          sub="Kas + Pembayaran masuk"
          badge={<><ArrowUpRight className="h-3 w-3" />Masuk</>}
        />
        <GradientKPI
          gradient="gradient-card-pink"
          icon={<ArrowUpCircle className="h-5 w-5" />}
          label="Total Uang Keluar"
          value={rpShort(stats?.total_keluar ?? 0)}
          sub="Kas + Pembayaran keluar"
          badge={<><ArrowDownRight className="h-3 w-3" />Keluar</>}
        />
        <GradientKPI
          gradient={saldo >= 0 ? 'gradient-card-blue' : 'gradient-card-orange'}
          icon={<Scale className="h-5 w-5" />}
          label="Saldo Bersih"
          value={rpShort(saldo)}
          sub={saldo >= 0 ? 'Surplus kas' : 'Defisit kas'}
          badge={saldo >= 0 ? <><ArrowUpRight className="h-3 w-3" />Surplus</> : <><ArrowDownRight className="h-3 w-3" />Defisit</>}
        />
        <GradientKPI
          gradient="gradient-card-purple"
          icon={<Hash className="h-5 w-5" />}
          label="Jumlah Transaksi"
          value={String(stats?.jumlah_transaksi ?? 0)}
          sub="Total entri kas + pembayaran"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground mr-1">Sumber:</span>
          {SUMBER_PILLS.map((p) => (
            <button
              key={p.value}
              onClick={() => setFilterSumber(p.value)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all',
                filterSumber === p.value
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'bg-white border text-muted-foreground hover:bg-muted/50'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground mr-1">Wilayah:</span>
          {WILAYAH_PILLS.map((p) => (
            <button
              key={p.value}
              onClick={() => setFilterWilayah(p.value)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all',
                filterWilayah === p.value
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'bg-white border text-muted-foreground hover:bg-muted/50'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Tanggal:</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[140px] h-8 text-xs"
          />
          <span className="text-xs text-muted-foreground">—</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[140px] h-8 text-xs"
          />
        </div>
      </div>

      {/* Main Timeline Table */}
      <Card className="shadow-sm border-0 shadow-black/[0.04]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Kronologis Transaksi</CardTitle>
          <CardDescription>
            {pagination ? `${pagination.total} transaksi` : 'Memuat...'}
            {filterSumber && ` · Sumber: ${filterSumber}`}
            {filterWilayah && ` · Wilayah: ${filterWilayah}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[65vh] overflow-auto rounded-xl border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow className="hover:bg-transparent border-b-2">
                  <TableHead className={TH}>Tanggal</TableHead>
                  <TableHead className={TH}>Sumber</TableHead>
                  <TableHead className={TH}>Wilayah</TableHead>
                  <TableHead className={TH}>Keterangan</TableHead>
                  <TableHead className={cn(TH, 'text-right')}>Masuk</TableHead>
                  <TableHead className={cn(TH, 'text-right')}>Keluar</TableHead>
                  <TableHead className={TH}>Referensi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 w-20 animate-pulse rounded bg-muted" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      Tidak ada data untuk filter ini
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row: any, i: number) => (
                    <TableRow key={`${row.sumber}-${row.id}-${i}`} className="hover:bg-muted/30">
                      <TableCell className="whitespace-nowrap text-sm">{fmtDate(row.date)}</TableCell>
                      <TableCell><SumberBadge sumber={row.sumber} /></TableCell>
                      <TableCell><WilayahBadge w={row.wilayah} /></TableCell>
                      <TableCell className="text-sm max-w-[220px] truncate">{row.deskripsi || '-'}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {row.masuk > 0
                          ? <span className="font-semibold text-emerald-600">{rupiahFull(row.masuk)}</span>
                          : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {row.keluar > 0
                          ? <span className="font-semibold text-red-500">{rupiahFull(row.keluar)}</span>
                          : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                        {row.referensi || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-muted-foreground">
                Hal {pagination.page} dari {pagination.pages} ({pagination.total} data)
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted/50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  let p: number;
                  if (pagination.pages <= 5) {
                    p = i + 1;
                  } else if (page <= 3) {
                    p = i + 1;
                  } else if (page >= pagination.pages - 2) {
                    p = pagination.pages - 4 + i;
                  } else {
                    p = page - 2 + i;
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all',
                        p === page
                          ? 'bg-primary text-white shadow-md'
                          : 'border text-muted-foreground hover:bg-muted/50'
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                  disabled={page >= pagination.pages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted/50 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Cards: Operasional + Piutang */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-sm border-0 shadow-black/[0.04]">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                <Landmark className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-sm">Biaya Operasional</CardTitle>
                <CardDescription className="text-xs">Pengeluaran tanpa tanggal transaksi</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-amber-600 tabular-nums">
              {rupiahFull(stats?.operasional_total ?? 0)}
            </p>
            <div className="flex items-start gap-2 mt-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
              <Info className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Data operasional tidak memiliki tanggal, sehingga tidak masuk timeline kronologis. Total ini merupakan akumulasi seluruh biaya operasional.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 shadow-black/[0.04]">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <Wallet className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-sm">Piutang Terbayar</CardTitle>
                <CardDescription className="text-xs">Uang masuk dari pelanggan</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-blue-600 tabular-nums">
              {rupiahFull(stats?.piutang_terbayar ?? 0)}
            </p>
            <div className="flex items-start gap-2 mt-3 rounded-xl bg-blue-50 border border-blue-200 px-3 py-2.5">
              <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-blue-700 leading-relaxed">
                Piutang hanya mencatat total terbayar, bukan event pembayaran individual. Lihat halaman Piutang untuk detail per pelanggan.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Sumber Breakdown */}
      {stats?.by_sumber && (
        <Card className="shadow-sm border-0 shadow-black/[0.04]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Breakdown per Sumber</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(stats.by_sumber).map(([key, val]: [string, any]) => (
                <div key={key} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <SumberBadge sumber={key} />
                    <span className="text-xs text-muted-foreground">{val.count} transaksi</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Masuk</p>
                      <p className="text-sm font-bold text-emerald-600 tabular-nums">{rupiahFull(val.masuk)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Keluar</p>
                      <p className="text-sm font-bold text-red-500 tabular-nums">{rupiahFull(val.keluar)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
