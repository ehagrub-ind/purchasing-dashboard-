'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { rupiah, rupiahFull, kg, fmtDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PageSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  CreditCard, Banknote, Users, TrendingDown, Search,
  ArrowLeft, ArrowDownCircle, ArrowUpCircle, CheckCircle2,
  AlertTriangle, Clock, X, Download,
} from 'lucide-react';

const TH = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

function rpShort(val: number) {
  const abs = Math.abs(val);
  const prefix = val < 0 ? '-' : '';
  if (abs >= 1_000_000) return prefix + 'Rp ' + (abs / 1_000_000).toFixed(1).replace('.', ',') + ' M';
  if (abs >= 1_000) return prefix + 'Rp ' + (abs / 1_000).toFixed(0) + ' jt';
  return prefix + 'Rp ' + abs.toLocaleString('id-ID');
}

/* ═══════════════ Main Page ═══════════════ */

export default function HutangPage() {
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'semua' | 'hutang' | 'lunas'>('semua');

  const [timeline, setTimeline] = useState<any>(null);
  const [showBayar, setShowBayar] = useState<any>(null);

  const { toast } = useToast();

  const loadData = () => {
    setLoading(true);
    Promise.all([api.getHutang(), api.getHutangStats()])
      .then(([res, st]) => { setData(res.data); setStats(st); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    let list = data;
    if (filter === 'hutang') list = list.filter(r => r.sisa_hutang > 0);
    if (filter === 'lunas') list = list.filter(r => r.sisa_hutang <= 0);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(s) || r.wilayah.toLowerCase().includes(s));
    }
    return list;
  }, [data, filter, search]);

  const openTimeline = async (supplierId: number) => {
    try {
      const tl = await api.getHutangTimeline(supplierId);
      setTimeline(tl);
    } catch (e: any) { toast('error', e.message); }
  };

  if (error) return <div className="flex items-center justify-center py-20 text-destructive font-medium">Error: {error}</div>;
  if (loading || !stats) return <PageSkeleton />;

  if (timeline) {
    return (
      <TimelineView
        data={timeline}
        onBack={() => { setTimeline(null); loadData(); }}
        onBayar={() => setShowBayar(timeline.supplier)}
      />
    );
  }

  const pills = [
    { label: 'Semua', value: 'semua' as const },
    { label: `Masih Hutang (${stats.belum_count})`, value: 'hutang' as const },
    { label: `Lunas (${stats.lunas_count})`, value: 'lunas' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hutang Supplier</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kelola hutang ke supplier — otomatis dari data pembelian & pembayaran</p>
        </div>
        <Button size="sm" variant="outline"><Download className="mr-1.5 h-4 w-4" />Export</Button>
      </div>

      {/* Gradient KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GradientKPI gradient="gradient-card-blue" icon={<CreditCard className="h-5 w-5" />}
          label="Total Pembelian" value={rpShort(stats.total_beli)} sub={`${stats.total_supplier} supplier`} />
        <GradientKPI gradient="gradient-card-emerald" icon={<Banknote className="h-5 w-5" />}
          label="Total Terbayar" value={rpShort(stats.total_bayar)} sub={`${stats.lunas_count} lunas`} />
        <GradientKPI gradient={stats.sisa_hutang > 0 ? 'gradient-card-pink' : 'gradient-card-emerald'} icon={<TrendingDown className="h-5 w-5" />}
          label="Sisa Hutang" value={rpShort(stats.sisa_hutang)} sub={stats.sisa_hutang > 0 ? `${stats.belum_count} supplier belum lunas` : 'Semua lunas'} />
        <GradientKPI gradient="gradient-card-purple" icon={<Users className="h-5 w-5" />}
          label="Supplier Aktif" value={String(stats.total_supplier)} sub="Dengan transaksi" />
      </div>

      {/* Warning */}
      {stats.sisa_hutang > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5">
          <div className="rounded-xl bg-amber-100 p-2"><AlertTriangle className="h-4 w-4 text-amber-600" /></div>
          <p className="text-sm text-amber-800">
            Total sisa hutang <strong>{rpShort(stats.sisa_hutang)}</strong> ke <strong>{stats.belum_count} supplier</strong>. Klik supplier untuk lihat detail & bayar.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          {pills.map(p => (
            <button key={p.value} onClick={() => setFilter(p.value)}
              className={cn('rounded-full px-4 py-1.5 text-[13px] font-medium transition-all',
                filter === p.value ? 'bg-primary text-white shadow-md shadow-primary/25' : 'bg-white border text-muted-foreground hover:bg-muted/50'
              )}>{p.label}</button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari supplier..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Supplier Hutang Table */}
      {filtered.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <CreditCard className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-semibold text-muted-foreground">Tidak ada data hutang</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2">
                <TableHead className={TH}>Supplier</TableHead>
                <TableHead className={cn(TH, 'text-right')}>Total Pembelian</TableHead>
                <TableHead className={cn(TH, 'text-right')}>Total Dibayar</TableHead>
                <TableHead className={cn(TH, 'text-right')}>Sisa Hutang</TableHead>
                <TableHead className={TH}>Progress</TableHead>
                <TableHead className={TH}>Status</TableHead>
                <TableHead className={cn(TH, 'text-right')}>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r: any) => {
                const pct = r.total_beli > 0 ? Math.min(100, (r.total_bayar / r.total_beli) * 100) : 0;
                const isLunas = r.sisa_hutang <= 0;
                return (
                  <TableRow key={r.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => openTimeline(r.id)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold text-white bg-gradient-to-br',
                          r.wilayah?.toLowerCase() === 'jateng' ? 'from-emerald-500 to-emerald-600'
                          : r.wilayah?.toLowerCase() === 'jatim' ? 'from-blue-500 to-blue-600'
                          : r.wilayah?.toLowerCase() === 'jabar' ? 'from-amber-500 to-amber-600'
                          : 'from-purple-500 to-purple-600'
                        )}>
                          {r.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{r.name}</p>
                          <p className="text-[11px] text-muted-foreground">{r.wilayah} · {r.jml_po} PO</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">{rupiahFull(r.total_beli)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-emerald-600">{rupiahFull(r.total_bayar)}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn('text-sm font-bold tabular-nums', isLunas ? 'text-emerald-600' : 'text-red-600')}>
                        {isLunas ? 'Rp 0' : rupiahFull(r.sisa_hutang)}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-blue-500' : 'bg-amber-500')}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[11px] tabular-nums text-muted-foreground w-8 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isLunas
                        ? <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" />Lunas</Badge>
                        : <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" />Belum Lunas</Badge>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {!isLunas && (
                        <Button size="sm" variant="ghost" className="h-8 px-3 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={e => { e.stopPropagation(); setShowBayar(r); }}>
                          <Banknote className="h-4 w-4 mr-1" />Bayar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Bayar Modal */}
      {showBayar && (
        <BayarModal
          supplier={showBayar}
          onClose={() => setShowBayar(null)}
          onSaved={() => {
            setShowBayar(null);
            toast('success', `Pembayaran ke ${showBayar.name} berhasil dicatat`);
            if (timeline) openTimeline(timeline.supplier.id);
            else loadData();
          }}
        />
      )}
    </div>
  );
}

/* ═══════════════ Timeline View ═══════════════ */

function TimelineView({ data, onBack, onBayar }: { data: any; onBack: () => void; onBayar: () => void }) {
  const s = data.supplier;
  const pct = data.total_beli > 0 ? Math.min(100, (data.total_bayar / data.total_beli) * 100) : 0;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />Kembali ke Daftar
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{s.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Riwayat hutang — pembelian & pembayaran</p>
        </div>
        {data.sisa_hutang > 0 && (
          <Button size="sm" onClick={onBayar} className="bg-emerald-600 hover:bg-emerald-700">
            <Banknote className="mr-1.5 h-4 w-4" />Bayar Hutang
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GradientKPI gradient="gradient-card-blue" icon={<ArrowDownCircle className="h-5 w-5" />}
          label="Total Pembelian" value={rpShort(data.total_beli)} sub="Barang diterima" />
        <GradientKPI gradient="gradient-card-emerald" icon={<ArrowUpCircle className="h-5 w-5" />}
          label="Total Dibayar" value={rpShort(data.total_bayar)} sub={`${pct.toFixed(0)}% terbayar`} />
        <GradientKPI gradient={data.sisa_hutang > 0 ? 'gradient-card-pink' : 'gradient-card-emerald'} icon={<TrendingDown className="h-5 w-5" />}
          label="Sisa Hutang" value={rpShort(data.sisa_hutang)} sub={data.sisa_hutang > 0 ? 'Belum lunas' : 'Lunas'} />
      </div>

      {/* Progress */}
      <Card className="rounded-2xl">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress Pembayaran</span>
            <span className="text-sm font-bold tabular-nums">{pct.toFixed(1)}%</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-blue-500' : 'bg-amber-500')}
              style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-muted-foreground tabular-nums">
            <span>Dibayar: {rupiahFull(data.total_bayar)}</span>
            <span>Total: {rupiahFull(data.total_beli)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Table */}
      <Card className="rounded-2xl overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Riwayat Transaksi</CardTitle>
          <CardDescription className="text-xs">{data.events.length} transaksi — pembelian & pembayaran</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2">
                <TableHead className={TH}>Tanggal</TableHead>
                <TableHead className={TH}>Tipe</TableHead>
                <TableHead className={TH}>Keterangan</TableHead>
                <TableHead className={cn(TH, 'text-right')}>Nominal</TableHead>
                <TableHead className={cn(TH, 'text-right')}>Saldo Hutang</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.events.map((e: any, i: number) => {
                const isPembelian = e.type === 'pembelian';
                return (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="text-sm tabular-nums">{fmtDate(e.date)}</TableCell>
                    <TableCell>
                      {isPembelian
                        ? <Badge variant="warning" className="gap-1"><ArrowDownCircle className="h-3 w-3" />Barang Masuk</Badge>
                        : <Badge variant="success" className="gap-1"><ArrowUpCircle className="h-3 w-3" />Pembayaran</Badge>
                      }
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">{e.deskripsi}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn('text-sm font-semibold tabular-nums', isPembelian ? 'text-red-600' : 'text-emerald-600')}>
                        {isPembelian ? '+' : '-'}{rupiahFull(e.nominal)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn('text-sm font-bold tabular-nums', e.saldo_berjalan > 0 ? 'text-red-600' : 'text-emerald-600')}>
                        {rupiahFull(Math.abs(e.saldo_berjalan))}
                      </span>
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

/* ═══════════════ Bayar Modal ═══════════════ */

function BayarModal({ supplier, onClose, onSaved }: { supplier: any; onClose: () => void; onSaved: () => void }) {
  const sisa = supplier.sisa_hutang || 0;
  const [nominal, setNominal] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const handleBayar = async () => {
    const val = parseFloat(nominal);
    if (!val || val <= 0) return;
    setSaving(true);
    try {
      await api.bayarHutang(supplier.id, { nominal: val, keterangan: keterangan || undefined, tanggal });
      onSaved();
    } catch { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Bayar Hutang</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {/* Supplier Info */}
        <div className="rounded-xl bg-muted/50 p-4 mb-5 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Supplier</span>
            <span className="text-sm font-semibold">{supplier.name}</span>
          </div>
          {sisa > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Pembelian</span>
                <span className="text-sm tabular-nums">{rupiahFull(supplier.total_beli)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Sudah Dibayar</span>
                <span className="text-sm text-emerald-600 tabular-nums">{rupiahFull(supplier.total_bayar)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm font-semibold">Sisa Hutang</span>
                <span className="text-sm font-bold text-red-600 tabular-nums">{rupiahFull(sisa)}</span>
              </div>
            </>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Nominal Bayar (ribuan)</label>
            <Input type="number" value={nominal} onChange={e => setNominal(e.target.value)}
              placeholder={sisa > 0 ? `Maks ${sisa.toLocaleString('id-ID')}` : '0'} autoFocus />
          </div>

          {/* Quick Amount Buttons */}
          {sisa > 0 && (
            <div className="flex gap-2">
              {[0.25, 0.5, 1].map(frac => (
                <button key={frac} onClick={() => setNominal(String(Math.round(sisa * frac)))}
                  className="flex-1 rounded-xl border px-3 py-2 text-[12px] font-medium hover:bg-muted/50 transition-colors">
                  {frac === 1 ? 'Lunas' : `${frac * 100}%`}
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Tanggal</label>
            <Input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} />
          </div>

          <div>
            <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Keterangan (opsional)</label>
            <Input value={keterangan} onChange={e => setKeterangan(e.target.value)} placeholder="Misal: DP bahan baku Part 3" />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleBayar} disabled={saving || !nominal || parseFloat(nominal) <= 0}
            className="bg-emerald-600 hover:bg-emerald-700">
            <Banknote className="mr-1.5 h-4 w-4" />
            {saving ? 'Menyimpan...' : 'Catat Pembayaran'}
          </Button>
        </div>
      </div>
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
