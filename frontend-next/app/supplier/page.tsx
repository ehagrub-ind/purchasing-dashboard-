'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { rupiah, rupiahFull, kg, num, fmtDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import Loading from '@/components/Loading';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Users, Package, Wallet, TrendingUp, ArrowLeft, Search, Download, RefreshCw, Plus, ChevronRight,
} from 'lucide-react';

interface Supplier {
  id: number;
  name: string;
  wilayah: string;
  total_kg: number;
  total_transaksi: number;
  total_masuk: number;
  saldo: number;
}

interface SupplierDetail extends Supplier {
  by_kategori: { kategori: string; count: number; total_kg: number; total_nilai: number }[];
  purchases: { date: string; jenis: string; kategori: string; qty: number; price: number; total: number }[];
  payments: { date: string; deskripsi: string; type: string; amount: number }[];
}

/* ─────────────────────────── Main Page ─────────────────────────── */

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
    try {
      const s = await api.getSupplier(id);
      setDetail(s);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  if (error) return <div className="flex items-center justify-center py-20 text-destructive">Error: {error}</div>;
  if (loading) return <Loading />;

  if (detail) {
    return <DetailView detail={detail} onBack={() => setDetail(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Supplier</h2>
          <p className="text-sm text-muted-foreground">
            Ringkasan supplier, total pembelian, dana masuk, dan saldo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Tambah Supplier
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Supplier"
          value={String(suppliers.length)}
          iconClassName="bg-blue-100 text-blue-600"
          valueClassName="text-blue-600"
        />
        <StatCard
          icon={Package}
          label="Total Kg"
          value={kg(totals.kg)}
          iconClassName="bg-violet-100 text-violet-600"
          valueClassName="text-violet-600"
        />
        <StatCard
          icon={Wallet}
          label="Total Dana Masuk"
          value={rupiah(totals.masuk)}
          iconClassName="bg-emerald-100 text-emerald-600"
          valueClassName="text-emerald-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Saldo"
          value={rupiah(totals.saldo)}
          iconClassName={totals.saldo >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}
          valueClassName={totals.saldo >= 0 ? 'text-emerald-600' : 'text-amber-600'}
        />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari supplier..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={wilayah} onChange={e => setWilayah(e.target.value)} className="w-full sm:w-44">
          <option value="">Semua Wilayah</option>
          <option value="Jatim">Jatim</option>
          <option value="Jateng">Jateng</option>
          <option value="Jabar">Jabar</option>
        </Select>
        <Select value={sort} onChange={e => setSort(e.target.value)} className="w-full sm:w-40">
          <option value="kg">Total Kg</option>
          <option value="transaksi">Transaksi</option>
          <option value="masuk">Dana Masuk</option>
          <option value="saldo">Saldo</option>
        </Select>
      </div>

      {/* ── Supplier Grid ── */}
      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <CardContent>
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-lg font-medium">Supplier tidak ditemukan</p>
            <p className="text-sm text-muted-foreground">Coba ubah kata pencarian atau filter wilayah.</p>
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

/* ─────────────────────────── Stat Card ─────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  iconClassName,
  valueClassName,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconClassName?: string;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconClassName)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className={cn('truncate text-xl font-bold tracking-tight', valueClassName)}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── Supplier Card ─────────────────────────── */

const WILAYAH_AVATAR: Record<string, string> = {
  jatim: 'bg-blue-100 text-blue-700',
  jateng: 'bg-emerald-100 text-emerald-700',
  jabar: 'bg-amber-100 text-amber-700',
};

const WILAYAH_VARIANT: Record<string, 'jatim' | 'jateng' | 'jabar'> = {
  jatim: 'jatim',
  jateng: 'jateng',
  jabar: 'jabar',
};

function SupplierCard({ supplier: s, maxKg, onClick }: { supplier: Supplier; maxKg: number; onClick: () => void }) {
  const wLower = s.wilayah.toLowerCase();
  const initials = s.name.slice(0, 2).toUpperCase();
  const pct = maxKg > 0 ? Math.max(4, (Number(s.total_kg) / maxKg) * 100) : 4;
  const saldoPositive = Number(s.saldo) >= 0;

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:ring-1 hover:ring-ring/20"
      onClick={onClick}
    >
      {/* Top: avatar + name + wilayah badge */}
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
            WILAYAH_AVATAR[wLower] ?? 'bg-muted text-muted-foreground',
          )}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-sm font-semibold">{s.name}</CardTitle>
          <Badge variant={WILAYAH_VARIANT[wLower] ?? 'secondary'} className="mt-1">
            {s.wilayah}
          </Badge>
        </div>
      </CardHeader>

      {/* Body: 2x2 stats grid */}
      <CardContent className="pb-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Total Kg</p>
            <p className="text-sm font-semibold">{kg(s.total_kg)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Transaksi</p>
            <p className="text-sm font-semibold">{num(s.total_transaksi)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Dana Masuk</p>
            <p className="text-sm font-semibold text-emerald-600">{rupiah(s.total_masuk)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Saldo</p>
            <p className={cn('text-sm font-semibold', saldoPositive ? 'text-emerald-600' : 'text-amber-600')}>
              {rupiah(s.saldo)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardContent>

      {/* Footer: detail link */}
      <CardFooter className="border-t px-6 py-3">
        <span className="flex items-center gap-1 text-xs font-medium text-primary">
          Detail
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </CardFooter>
    </Card>
  );
}

/* ─────────────────────────── Detail View ─────────────────────────── */

function DetailView({ detail: s, onBack }: { detail: SupplierDetail; onBack: () => void }) {
  const wLower = s.wilayah.toLowerCase();
  const initials = s.name.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Kembali ke Daftar Supplier
      </Button>

      {/* Header: avatar + name + badge */}
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold',
            WILAYAH_AVATAR[wLower] ?? 'bg-muted text-muted-foreground',
          )}
        >
          {initials}
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{s.name}</h2>
          <Badge variant={WILAYAH_VARIANT[wLower] ?? 'secondary'} className="mt-1">
            {s.wilayah}
          </Badge>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat label="Total Kg" value={kg(s.total_kg)} />
        <MiniStat label="Transaksi" value={num(s.total_transaksi)} />
        <MiniStat label="Dana Masuk" value={rupiah(s.total_masuk)} valueClassName="text-emerald-600" />
        <MiniStat label="Saldo" value={rupiah(s.saldo)} valueClassName={Number(s.saldo) >= 0 ? 'text-emerald-600' : 'text-amber-600'} />
      </div>

      {/* Breakdown Kategori */}
      {s.by_kategori?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Breakdown Kategori</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Transaksi</TableHead>
                  <TableHead className="text-right">Total Kg</TableHead>
                  <TableHead className="text-right">Total Nilai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.by_kategori.map((k, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{k.kategori}</TableCell>
                    <TableCell className="text-right">{num(k.count)}</TableCell>
                    <TableCell className="text-right">{kg(k.total_kg)}</TableCell>
                    <TableCell className="text-right">{rupiahFull(k.total_nilai)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pembelian */}
      {s.purchases?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pembelian ({s.purchases.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Qty (kg)</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.purchases.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell>{fmtDate(p.date)}</TableCell>
                    <TableCell>{p.jenis}</TableCell>
                    <TableCell>{p.kategori}</TableCell>
                    <TableCell className="text-right">{kg(p.qty)}</TableCell>
                    <TableCell className="text-right">{rupiahFull(p.price)}</TableCell>
                    <TableCell className="text-right font-medium">{rupiahFull(p.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pembayaran */}
      {s.payments?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pembayaran ({s.payments.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.payments.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell>{fmtDate(p.date)}</TableCell>
                    <TableCell>{p.deskripsi}</TableCell>
                    <TableCell>
                      <PaymentTypeBadge type={p.type} />
                    </TableCell>
                    <TableCell className="text-right font-medium">{rupiahFull(p.amount)}</TableCell>
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

/* ─────────────────────────── Small helpers ─────────────────────────── */

function MiniStat({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={cn('mt-0.5 text-lg font-bold tracking-tight', valueClassName)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function PaymentTypeBadge({ type }: { type: string }) {
  const lower = type.toLowerCase();
  let variant: 'success' | 'warning' | 'info' | 'secondary' = 'secondary';
  if (lower === 'cash' || lower === 'tunai') variant = 'success';
  else if (lower === 'transfer') variant = 'info';
  else if (lower === 'giro' || lower === 'cek') variant = 'warning';

  return <Badge variant={variant}>{type}</Badge>;
}
