'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp, Plus, Package, DollarSign, CheckCircle, Clock, Trash2, X,
  CreditCard, BarChart3, ArrowUpDown, Scale, Layers
} from 'lucide-react';
import { api } from '@/lib/api';
import { rupiahFull, rupiah, kg, fmtDate, usd } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import Loading from '@/components/Loading';

const KPI = ({ icon: Icon, label, value, sub, color }: any) => (
  <Card className="shadow-sm border-0 shadow-black/[0.04]">
    <CardContent className="p-5">
      <div className="flex items-start gap-4">
        <div className={cn('rounded-xl p-2.5', color)}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tracking-tight mt-0.5">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </div>
    </CardContent>
  </Card>
);

type Tab = 'kontrol-harga' | 'stok' | 'penjualan';

export default function PenjualanPage() {
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [masterBahan, setMasterBahan] = useState<any[]>([]);
  const [stokData, setStokData] = useState<any[]>([]);
  const [hargaData, setHargaData] = useState<any>({ detail: [], summary: [] });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBayar, setShowBayar] = useState<any>(null);
  const [filter, setFilter] = useState('semua');
  const [activeTab, setActiveTab] = useState<Tab>('kontrol-harga');

  const load = () => {
    Promise.all([
      api.getPenjualan(),
      api.getPenjualanStats(),
      api.getMasterBahan({ aktif: 'true' }),
      api.getStok(),
      api.getHargaBahan(),
    ])
      .then(([sales, st, mb, stok, harga]) => {
        setData(sales.data || []);
        setStats(st);
        setMasterBahan(Array.isArray(mb) ? mb : mb.data || []);
        setStokData(stok.data || []);
        setHargaData(harga || { detail: [], summary: [] });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filter === 'semua') return data;
    return data.filter(r => r.status === filter);
  }, [data, filter]);

  const totalMargin = useMemo(() =>
    data.reduce((s, r) => s + (r.total - r.harga_beli * r.qty), 0), [data]);

  if (loading) return <Loading />;

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'kontrol-harga', label: 'Kontrol Harga', icon: BarChart3 },
    { key: 'stok', label: 'Stok & Inventori', icon: Package },
    { key: 'penjualan', label: 'Transaksi Penjualan', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Penjualan & Kontrol Harga</h2>
          <p className="text-muted-foreground mt-1">Kontrol harga bahan baku, stok, dan penjualan ke PT Indo Hair Corp</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> Buat Penjualan
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={Scale} label="Total Transaksi" value={stats.total_transaksi || 0}
          sub={kg(stats.total_kg)} color="bg-blue-100 text-blue-600" />
        <KPI icon={TrendingUp} label="Total Penjualan" value={rupiah(stats.total_penjualan)}
          color="bg-emerald-100 text-emerald-600" />
        <KPI icon={DollarSign} label="Margin Keuntungan" value={rupiah(totalMargin)}
          sub="5% dari harga beli" color="bg-violet-100 text-violet-600" />
        <KPI icon={Clock} label="Piutang Customer" value={rupiah(stats.sisa_piutang)}
          sub={`Terbayar: ${rupiah(stats.total_terbayar)}`} color="bg-amber-100 text-amber-600" />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={cn('flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center',
              activeTab === t.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50')}>
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'kontrol-harga' && (
        <HargaBahanSection hargaData={hargaData} />
      )}

      {activeTab === 'stok' && (
        <StokSection stokData={stokData} />
      )}

      {activeTab === 'penjualan' && (
        <PenjualanSection
          filtered={filtered}
          filter={filter}
          setFilter={setFilter}
          setShowBayar={setShowBayar}
          load={load}
        />
      )}

      {showModal && (
        <CreateModal masterBahan={masterBahan} stokData={stokData} onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); load(); }} />
      )}

      {showBayar && (
        <BayarModal sale={showBayar} onClose={() => setShowBayar(null)} onPaid={() => { setShowBayar(null); load(); }} />
      )}
    </div>
  );
}

function HargaBahanSection({ hargaData }: { hargaData: any }) {
  const [expandedJenis, setExpandedJenis] = useState<string | null>(null);
  const { detail, summary } = hargaData;

  const formatHarga = (val: number, currency?: string) =>
    currency === 'USD' ? usd(val) : rupiahFull(val);

  return (
    <div className="space-y-4">
      {/* Summary Cards - Rate per Jenis */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {summary.map((s: any) => {
          const isExpanded = expandedJenis === s.jenis;
          const suppliers = detail.filter((d: any) => d.jenis === s.jenis);
          return (
            <div key={s.jenis} className="space-y-2">
              <button
                onClick={() => setExpandedJenis(isExpanded ? null : s.jenis)}
                className={cn(
                  'w-full rounded-xl border p-4 text-left transition-all hover:shadow-md',
                  isExpanded ? 'border-indigo-300 bg-indigo-50 shadow-md' : 'border-gray-200 bg-white hover:border-indigo-200'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">{s.jenis}</span>
                  <Badge variant="secondary" className="text-[10px]">{s.jumlah_supplier} supplier</Badge>
                </div>
                <p className="text-xl font-bold text-indigo-600 tabular-nums">
                  {rupiahFull(s.avg_rate)}<span className="text-xs font-normal text-gray-500">/kg</span>
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                  <span>{Number(s.total_kg).toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg</span>
                  <span>{rupiahFull(s.total_nilai)}</span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-[10px]">
                  <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  <span className="text-emerald-600">{rupiahFull(s.harga_min)}</span>
                  <span className="text-gray-400">—</span>
                  <span className="text-red-500">{rupiahFull(s.harga_max)}</span>
                </div>
              </button>

              {isExpanded && suppliers.length > 0 && (
                <div className="rounded-xl border border-indigo-200 bg-white overflow-hidden">
                  <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100">
                    <p className="text-xs font-semibold text-indigo-700">Detail per Supplier — {s.jenis}</p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {suppliers.map((d: any, i: number) => (
                      <div key={i} className="px-3 py-2.5 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{d.supplier}</p>
                          <p className="text-[11px] text-gray-500">
                            {d.jumlah_transaksi}× · {Number(d.total_kg).toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg · terakhir {fmtDate(d.tanggal_terakhir)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold tabular-nums text-indigo-600">
                            {formatHarga(d.rate_per_kg, d.currency)}<span className="text-[10px] font-normal text-gray-500">/kg</span>
                          </p>
                          <div className="text-[10px] text-gray-400 tabular-nums">
                            {formatHarga(d.harga_min, d.currency)} — {formatHarga(d.harga_max, d.currency)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Full Comparison Table */}
      <Card className="shadow-sm border-0 shadow-black/[0.04]">
        <CardHeader>
          <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4" /> Perbandingan Harga Semua Supplier
          </CardTitle>
          <CardDescription className="text-xs">Rate/kg = Total Nilai ÷ Total Kg · diurutkan dari termurah</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b-2">
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Jenis Bahan</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Supplier</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-right">Rate/Kg</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-right">Harga Terakhir</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-right">Min — Max</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-right">Total Kg</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-right">Total Nilai</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-center">Transaksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Belum ada data pembelian</TableCell></TableRow>
                ) : detail.map((d: any, i: number) => {
                  const isCheapest = detail.filter((x: any) => x.jenis === d.jenis)[0]?.supplier === d.supplier;
                  const fmt = (v: number) => formatHargaCell(v, d.currency);
                  return (
                    <TableRow key={i} className={cn('hover:bg-muted/30', isCheapest && 'bg-emerald-50/50')}>
                      <TableCell className="text-sm font-medium">{d.jenis}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{d.supplier}</span>
                          {isCheapest && <Badge variant="success" className="text-[10px] px-1.5">Termurah</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm tabular-nums text-indigo-600">{fmt(d.rate_per_kg)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmt(d.harga_terakhir)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                        {fmt(d.harga_min)} — {fmt(d.harga_max)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{Number(d.total_kg).toLocaleString('id-ID', { maximumFractionDigits: 1 })}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmt(d.total_nilai)}</TableCell>
                      <TableCell className="text-center text-sm tabular-nums">{d.jumlah_transaksi}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatHargaCell(val: number, currency?: string) {
  return currency === 'USD' ? usd(val) : rupiahFull(val);
}

function StokSection({ stokData }: { stokData: any[] }) {
  const totalStok = stokData.reduce((s, r) => s + Number(r.stok_kg), 0);
  const totalNilai = stokData.reduce((s, r) => s + Number(r.stok_kg) * Number(r.avg_harga), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="shadow-sm border-0 shadow-black/[0.04]">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Total Stok</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{totalStok.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg</p>
            <p className="text-xs text-muted-foreground mt-1">{stokData.length} jenis bahan</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-0 shadow-black/[0.04]">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Estimasi Nilai Stok</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{rupiahFull(totalNilai)}</p>
            <p className="text-xs text-muted-foreground mt-1">Berdasarkan avg harga beli</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stokData.map((s: any) => {
          const pct = totalStok > 0 ? (Number(s.stok_kg) / totalStok) * 100 : 0;
          return (
            <Card key={s.jenis} className={cn('shadow-sm border overflow-hidden',
              s.stok_kg > 0 ? 'border-emerald-200' : 'border-red-200')}>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">{s.jenis}</p>
                <p className={cn('text-2xl font-bold mt-1', s.stok_kg > 0 ? 'text-emerald-700' : 'text-red-600')}>
                  {Number(s.stok_kg).toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                  <span className="text-xs font-normal ml-1">kg</span>
                </p>
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Beli: {Number(s.total_beli).toLocaleString('id-ID')} kg</span>
                    <span>Jual: {Number(s.total_jual).toLocaleString('id-ID')} kg</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t space-y-0.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Avg</span>
                    <span className="font-medium tabular-nums">{rupiahFull(s.avg_harga)}/kg</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Last</span>
                    <span className="font-medium tabular-nums">{rupiahFull(s.last_harga)}/kg</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function PenjualanSection({ filtered, filter, setFilter, setShowBayar, load }: any) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          { key: 'semua', label: 'Semua' },
          { key: 'belum_lunas', label: 'Belum Lunas' },
          { key: 'lunas', label: 'Lunas' },
        ].map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted')}>
            {t.label}
          </button>
        ))}
      </div>

      <Card className="shadow-sm border-0 shadow-black/[0.04]">
        <CardHeader>
          <CardTitle className="text-[15px] font-semibold">Daftar Penjualan</CardTitle>
          <CardDescription className="text-xs">{filtered.length} transaksi</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b-2">
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Tanggal</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Jenis Bahan</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Qty</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-right">Harga Beli</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-right">Harga Jual (+5%)</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-right">Total</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-right">Terbayar</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Tidak ada data penjualan</TableCell></TableRow>
                ) : filtered.map((r: any) => {
                  const sisa = r.total - r.terbayar;
                  const marginVal = r.total - r.harga_beli * r.qty;
                  return (
                    <TableRow key={r.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm">{fmtDate(r.date)}</TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{r.jenis}</div>
                        {r.keterangan && <div className="text-xs text-muted-foreground">{r.keterangan}</div>}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{kg(r.qty)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{rupiahFull(r.harga_beli)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {rupiahFull(r.harga_jual)}
                        <div className="text-xs text-emerald-600">+{rupiahFull(marginVal)} margin</div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm tabular-nums">{rupiahFull(r.total)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{rupiahFull(r.terbayar)}</TableCell>
                      <TableCell>
                        {r.status === 'lunas' ? (
                          <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" /> Lunas</Badge>
                        ) : (
                          <Badge variant="warning"><Clock className="h-3 w-3 mr-1" /> Rp {((sisa) * 1000).toLocaleString('id-ID')}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {r.status !== 'lunas' && (
                            <button onClick={() => setShowBayar(r)} className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600" title="Bayar">
                              <CreditCard className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={async () => {
                            if (!confirm('Hapus penjualan ini?')) return;
                            await api.deletePenjualan(r.id);
                            load();
                          }} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500" title="Hapus">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateModal({ masterBahan, stokData, onClose, onCreated }: { masterBahan: any[]; stokData: any[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    jenis: '',
    qty: '',
    harga_beli: '',
    margin_pct: '5',
    keterangan: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const getStokInfo = (jenis: string) => stokData.find((s: any) => s.jenis === jenis);

  const handleJenisChange = (jenis: string) => {
    const info = getStokInfo(jenis);
    setForm(f => ({
      ...f,
      jenis,
      harga_beli: info ? String(info.last_harga) : '',
    }));
    setError('');
  };

  const hargaBeli = parseFloat(form.harga_beli) || 0;
  const marginPct = parseFloat(form.margin_pct) || 5;
  const hargaJual = hargaBeli * (1 + marginPct / 100);
  const qty = parseFloat(form.qty) || 0;
  const total = qty * hargaJual;
  const margin = total - qty * hargaBeli;

  const stokInfo = getStokInfo(form.jenis);
  const stokKg = stokInfo ? Number(stokInfo.stok_kg) : 0;
  const overStok = form.jenis && qty > stokKg;

  const submit = async () => {
    if (!form.jenis || qty <= 0 || hargaBeli <= 0) return;
    if (overStok) { setError(`Stok ${form.jenis} tidak cukup (${stokKg} kg)`); return; }
    setSaving(true);
    try {
      await api.createPenjualan({
        tanggal: form.tanggal,
        jenis: form.jenis,
        qty,
        harga_beli: hargaBeli,
        margin_pct: marginPct,
        keterangan: form.keterangan,
      });
      onCreated();
    } catch { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold">Buat Penjualan ke PT Indo Hair Corp</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Tanggal</label>
              <Input type="date" value={form.tanggal} onChange={e => update('tanggal', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Jenis Bahan</label>
              <Select value={form.jenis} onChange={e => handleJenisChange(e.target.value)}>
                <option value="">-- Pilih --</option>
                {masterBahan.map((b: any) => {
                  const s = getStokInfo(b.nama_bahan);
                  const stk = s ? Number(s.stok_kg) : 0;
                  return (
                    <option key={b.id} value={b.nama_bahan} disabled={stk <= 0}>
                      {b.nama_bahan} {stk > 0 ? `(${stk} kg)` : '(habis)'}
                    </option>
                  );
                })}
              </Select>
              {stokInfo && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Stok: <span className={cn('font-semibold', stokKg > 0 ? 'text-emerald-600' : 'text-red-600')}>{stokKg} kg</span>
                  {' · '}Harga terakhir: {rupiahFull(stokInfo.last_harga)}/kg
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Qty (Kg)</label>
              <Input type="number" placeholder="0" value={form.qty} onChange={e => update('qty', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Harga Beli (Rp/Kg)</label>
              <Input type="number" placeholder="0" value={form.harga_beli} onChange={e => update('harga_beli', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Margin %</label>
              <Input type="number" value={form.margin_pct} onChange={e => update('margin_pct', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Keterangan (opsional)</label>
            <Input placeholder="Catatan tambahan..." value={form.keterangan} onChange={e => update('keterangan', e.target.value)} />
          </div>

          {qty > 0 && hargaBeli > 0 && (
            <div className="rounded-xl bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Harga Beli</span>
                <span>{rupiahFull(hargaBeli)} x {qty} kg</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Harga Jual (+{marginPct}%)</span>
                <span>{rupiahFull(hargaJual)} /kg</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total Penjualan</span>
                <span>{rupiahFull(total)}</span>
              </div>
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Keuntungan Margin</span>
                <span>+{rupiahFull(margin)}</span>
              </div>
            </div>
          )}

          {overStok && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              Stok <strong>{form.jenis}</strong> tidak cukup. Tersedia: <strong>{stokKg} kg</strong>, diminta: <strong>{qty} kg</strong>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={submit} disabled={saving || !form.jenis || qty <= 0 || hargaBeli <= 0 || !!overStok}>
            {saving ? 'Menyimpan...' : 'Simpan Penjualan'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BayarModal({ sale, onClose, onPaid }: { sale: any; onClose: () => void; onPaid: () => void }) {
  const sisa = sale.total - sale.terbayar;
  const [nominal, setNominal] = useState(sisa.toString());
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const n = parseFloat(nominal);
    if (!n || n <= 0) return;
    setSaving(true);
    try {
      await api.bayarPenjualan(sale.id, n);
      onPaid();
    } catch { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold">Terima Pembayaran</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-6">
          <div className="rounded-xl bg-muted/50 p-4 space-y-1">
            <div className="flex justify-between text-sm"><span>Total</span><span className="font-semibold">{rupiahFull(sale.total)}</span></div>
            <div className="flex justify-between text-sm"><span>Sudah Bayar</span><span>{rupiahFull(sale.terbayar)}</span></div>
            <div className="flex justify-between text-sm text-amber-600 font-semibold"><span>Sisa</span><span>{rupiahFull(sisa)}</span></div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Nominal Bayar (ribuan)</label>
            <Input type="number" value={nominal} onChange={e => setNominal(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Memproses...' : 'Konfirmasi Bayar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
