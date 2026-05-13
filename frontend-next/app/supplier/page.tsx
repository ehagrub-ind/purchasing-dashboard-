'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { rupiah, rupiahFull, kg, num, fmtDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PageSkeleton } from '@/components/Skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Users, Package, Wallet, TrendingUp, ArrowLeft, Search, Download,
  Plus, ChevronRight, ArrowUpRight,
} from 'lucide-react';

interface Supplier {
  id: number; name: string; wilayah: string;
  total_kg: number; total_transaksi: number; total_masuk: number; saldo: number;
}

interface SupplierDetail extends Supplier {
  by_kategori: { kategori: string; count: number; total_kg: number; total_nilai: number }[];
  purchases: { date: string; jenis: string; kategori: string; qty: number; price: number; total: number }[];
  payments: { date: string; deskripsi: string; type: string; amount: number }[];
}

const TH = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

/* ═══════════════ Main Page ═══════════════ */

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [detail, setDetail] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [wilayah, setWilayah] = useState('');
  const [sort, setSort] = useState('kg');

  useEffect(() => {
    api.getSuppliers()
      .then((data: Supplier[]) => { setSuppliers(data); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  const maxKg = useMemo(() => Math.max(...suppliers.map(s => Number(s.total_kg)), 1), [suppliers]);

  const filtered = useMemo(() => {
    let list = suppliers.filter(s => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (wilayah && s.wilayah !== wilayah) return false;
      return true;
    });
    const sortKey: Record<string, keyof Supplier> = {
      kg: 'total_kg', transaksi: 'total_transaksi', masuk: 'total_masuk', saldo: 'saldo',
    };
    const key = sortKey[sort] || 'total_kg';
    list.sort((a, b) => Number(b[key]) - Number(a[key]));
    return list;
  }, [suppliers, search, wilayah, sort]);

  const totals = useMemo(() => suppliers.reduce(
    (a, s) => ({ kg: a.kg + Number(s.total_kg), masuk: a.masuk + Number(s.total_masuk), saldo: a.saldo + Number(s.saldo) }),
    { kg: 0, masuk: 0, saldo: 0 },
  ), [suppliers]);

  async function openDetail(id: number) {
    setLoading(true);
    try { setDetail(await api.getSupplier(id)); }
    catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  if (error) return <div className="flex items-center justify-center py-20 text-destructive font-medium">Error: {error}</div>;
  if (loading) return <PageSkeleton />;
  if (detail) return <DetailView detail={detail} onBack={() => setDetail(null)} />;

  const pills = [
    { label: 'Semua', value: '' },
    { label: 'Jateng', value: 'Jateng' },
    { label: 'Jatim', value: 'Jatim' },
    { label: 'Jabar', value: 'Jabar' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Supplier</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Ringkasan supplier, total pembelian, dana masuk, dan saldo</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm"><Plus className="mr-1.5 h-4 w-4" />Tambah Supplier</Button>
          <Button size="sm" variant="outline"><Download className="mr-1.5 h-4 w-4" />Export</Button>
        </div>
      </div>

      {/* Gradient KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GradientKPI gradient="gradient-card-purple" icon={<Users className="h-5 w-5" />} label="Total Supplier" value={String(suppliers.length)} sub="Lokal & Impor" />
        <GradientKPI gradient="gradient-card-blue" icon={<Package className="h-5 w-5" />} label="Total Volume" value={kg(totals.kg)} sub="Dari semua supplier" />
        <GradientKPI gradient="gradient-card-emerald" icon={<Wallet className="h-5 w-5" />} label="Total Dana Masuk" value={rupiah(totals.masuk)} sub="Pembayaran ke supplier" badge={<><ArrowUpRight className="h-3 w-3" />Masuk</>} />
        <GradientKPI gradient={totals.saldo >= 0 ? 'gradient-card-orange' : 'gradient-card-pink'} icon={<TrendingUp className="h-5 w-5" />} label="Total Saldo" value={rupiah(totals.saldo)} sub={totals.saldo >= 0 ? 'Saldo positif' : 'Saldo negatif'} />
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          {pills.map(p => (
            <button key={p.value} onClick={() => setWilayah(p.value)}
              className={cn('rounded-full px-4 py-1.5 text-[13px] font-medium transition-all',
                wilayah === p.value ? 'bg-primary text-white shadow-md shadow-primary/25' : 'bg-white border text-muted-foreground hover:bg-muted/50'
              )}>{p.label}</button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari supplier..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={sort} onChange={e => setSort(e.target.value)} className="w-40">
          <option value="kg">Total Kg</option>
          <option value="transaksi">Transaksi</option>
          <option value="masuk">Dana Masuk</option>
          <option value="saldo">Saldo</option>
        </Select>
      </div>

      {/* Supplier Grid */}
      {filtered.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-semibold text-muted-foreground">Supplier tidak ditemukan</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Coba ubah kata pencarian atau filter wilayah</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(s => (
            <SupplierCard key={s.id} supplier={s} maxKg={maxKg} onClick={() => openDetail(s.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════ Gradient KPI Card ═══════════════ */

function GradientKPI({ gradient, icon, label, value, sub, badge }: {
  gradient: string; icon: React.ReactNode; label: string; value: string; sub: string; badge?: React.ReactNode;
}) {
  return (
    <div className={cn('rounded-2xl p-5 text-white relative overflow-hidden', gradient)}>
      <div className="flex items-center gap-3 mb-3">
        <div className="rounded-xl bg-white/20 p-2">{icon}</div>
        <span className="text-[13px] font-medium text-white/80">{label}</span>
      </div>
      <p className="text-2xl font-extrabold tracking-tight">{value}</p>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-[12px] text-white/60">{sub}</p>
        {badge && <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">{badge}</span>}
      </div>
    </div>
  );
}

/* ═══════════════ Supplier Card ═══════════════ */

const WILAYAH_GRADIENT: Record<string, string> = {
  jatim: 'from-blue-500 to-blue-600',
  jateng: 'from-emerald-500 to-emerald-600',
  jabar: 'from-amber-500 to-amber-600',
  impor: 'from-purple-500 to-purple-600',
};

const WILAYAH_VARIANT: Record<string, 'jatim' | 'jateng' | 'jabar' | 'secondary'> = {
  jatim: 'jatim', jateng: 'jateng', jabar: 'jabar',
};

function SupplierCard({ supplier: s, maxKg, onClick }: { supplier: Supplier; maxKg: number; onClick: () => void }) {
  const wLower = s.wilayah.toLowerCase();
  const initials = s.name.slice(0, 2).toUpperCase();
  const pct = maxKg > 0 ? Math.max(4, (Number(s.total_kg) / maxKg) * 100) : 4;
  const saldoPositive = Number(s.saldo) >= 0;

  return (
    <Card className="rounded-2xl cursor-pointer transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 hover:ring-1 hover:ring-ring/20" onClick={onClick}>
      <CardContent className="p-5">
        {/* Avatar + Name */}
        <div className="flex items-center gap-3 mb-4">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white bg-gradient-to-br', WILAYAH_GRADIENT[wLower] ?? 'from-gray-400 to-gray-500')}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{s.name}</p>
            <Badge variant={WILAYAH_VARIANT[wLower] ?? 'secondary'} className="mt-0.5">{s.wilayah}</Badge>
          </div>
        </div>

        {/* 2x2 Stats Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Volume</p>
            <p className="text-sm font-bold tabular-nums">{kg(s.total_kg)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Transaksi</p>
            <p className="text-sm font-bold tabular-nums">{num(s.total_transaksi)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Dana Masuk</p>
            <p className="text-sm font-bold tabular-nums text-emerald-600">{rupiah(s.total_masuk)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Saldo</p>
            <p className={cn('text-sm font-bold tabular-nums', saldoPositive ? 'text-emerald-600' : 'text-amber-600')}>{rupiah(s.saldo)}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full rounded-full bg-gradient-to-r transition-all', WILAYAH_GRADIENT[wLower] ?? 'from-gray-400 to-gray-500')} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{num(s.total_transaksi)} transaksi</span>
          <span className="flex items-center gap-0.5 text-[11px] font-semibold text-primary">Detail<ChevronRight className="h-3 w-3" /></span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════ Detail View ═══════════════ */

function DetailView({ detail: s, onBack }: { detail: SupplierDetail; onBack: () => void }) {
  const wLower = s.wilayah.toLowerCase();
  const initials = s.name.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />Kembali ke Daftar
      </Button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white bg-gradient-to-br', WILAYAH_GRADIENT[wLower] ?? 'from-gray-400 to-gray-500')}>
          {initials}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{s.name}</h1>
          <Badge variant={WILAYAH_VARIANT[wLower] ?? 'secondary'} className="mt-1">{s.wilayah}</Badge>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <GradientKPI gradient="gradient-card-blue" icon={<Package className="h-5 w-5" />} label="Total Kg" value={kg(s.total_kg)} sub="Volume pembelian" />
        <GradientKPI gradient="gradient-card-purple" icon={<TrendingUp className="h-5 w-5" />} label="Transaksi" value={num(s.total_transaksi)} sub="Total transaksi" />
        <GradientKPI gradient="gradient-card-emerald" icon={<Wallet className="h-5 w-5" />} label="Dana Masuk" value={rupiah(s.total_masuk)} sub="Total pembayaran" />
        <GradientKPI gradient={Number(s.saldo) >= 0 ? 'gradient-card-orange' : 'gradient-card-pink'} icon={<TrendingUp className="h-5 w-5" />} label="Saldo" value={rupiah(s.saldo)} sub={Number(s.saldo) >= 0 ? 'Positif' : 'Negatif'} />
      </div>

      {/* Breakdown Kategori */}
      {s.by_kategori?.length > 0 && (
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Breakdown Kategori</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="border-b-2">
                <TableHead className={TH}>Kategori</TableHead>
                <TableHead className={cn(TH, 'text-right')}>Transaksi</TableHead>
                <TableHead className={cn(TH, 'text-right')}>Total Kg</TableHead>
                <TableHead className={cn(TH, 'text-right')}>Total Nilai</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {s.by_kategori.map((k, i) => (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-sm">{k.kategori}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{num(k.count)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{kg(k.total_kg)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">{rupiahFull(k.total_nilai)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pembelian */}
      {s.purchases?.length > 0 && (
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Pembelian ({s.purchases.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="border-b-2">
                <TableHead className={TH}>Tanggal</TableHead>
                <TableHead className={TH}>Bahan</TableHead>
                <TableHead className={TH}>Kategori</TableHead>
                <TableHead className={cn(TH, 'text-right')}>Qty (kg)</TableHead>
                <TableHead className={cn(TH, 'text-right')}>Harga</TableHead>
                <TableHead className={cn(TH, 'text-right')}>Total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {s.purchases.map((p, i) => (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="text-sm tabular-nums">{fmtDate(p.date)}</TableCell>
                    <TableCell className="text-sm">{p.jenis}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[11px]">{p.kategori}</Badge></TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{kg(p.qty)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{rupiahFull(p.price)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">{rupiahFull(p.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pembayaran */}
      {s.payments?.length > 0 && (
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Pembayaran ({s.payments.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="border-b-2">
                <TableHead className={TH}>Tanggal</TableHead>
                <TableHead className={TH}>Keterangan</TableHead>
                <TableHead className={TH}>Tipe</TableHead>
                <TableHead className={cn(TH, 'text-right')}>Jumlah</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {s.payments.map((p, i) => (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="text-sm tabular-nums">{fmtDate(p.date)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.deskripsi}</TableCell>
                    <TableCell><PaymentTypeBadge type={p.type} /></TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">{rupiahFull(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════ Helpers ═══════════════ */

function PaymentTypeBadge({ type }: { type: string }) {
  const lower = type.toLowerCase();
  let variant: 'success' | 'warning' | 'info' | 'secondary' = 'secondary';
  if (lower === 'cash' || lower === 'tunai') variant = 'success';
  else if (lower === 'transfer') variant = 'info';
  else if (lower === 'giro' || lower === 'cek') variant = 'warning';
  return <Badge variant={variant}>{type}</Badge>;
}
