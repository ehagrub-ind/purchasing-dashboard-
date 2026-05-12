'use client';

import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Plus, Package, DollarSign, CheckCircle, Clock, Trash2, X, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { rupiahFull, rupiah, kg, fmtDate } from '@/lib/format';
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

export default function PenjualanPage() {
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [masterBahan, setMasterBahan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBayar, setShowBayar] = useState<any>(null);
  const [filter, setFilter] = useState('semua');

  const load = () => {
    Promise.all([api.getPenjualan(), api.getPenjualanStats(), api.getMasterBahan({ aktif: 'true' })])
      .then(([sales, st, mb]) => {
        setData(sales.data || []);
        setStats(st);
        setMasterBahan(mb.data || []);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Penjualan</h2>
          <p className="text-muted-foreground mt-1">Penjualan bahan baku ke PT Indo Hair Corp — margin 5%</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> Buat Penjualan
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={Package} label="Total Transaksi" value={stats.total_transaksi || 0}
          sub={kg(stats.total_kg)} color="bg-blue-100 text-blue-600" />
        <KPI icon={TrendingUp} label="Total Penjualan" value={rupiah(stats.total_penjualan)}
          color="bg-emerald-100 text-emerald-600" />
        <KPI icon={DollarSign} label="Margin Keuntungan" value={rupiah(totalMargin)}
          sub="5% dari harga beli" color="bg-violet-100 text-violet-600" />
        <KPI icon={Clock} label="Piutang Customer" value={rupiah(stats.sisa_piutang)}
          sub={`Terbayar: ${rupiah(stats.total_terbayar)}`} color="bg-amber-100 text-amber-600" />
      </div>

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

      {showModal && (
        <CreateModal masterBahan={masterBahan} onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); load(); }} />
      )}

      {showBayar && (
        <BayarModal sale={showBayar} onClose={() => setShowBayar(null)} onPaid={() => { setShowBayar(null); load(); }} />
      )}
    </div>
  );
}

function CreateModal({ masterBahan, onClose, onCreated }: { masterBahan: any[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    jenis: '',
    qty: '',
    harga_beli: '',
    margin_pct: '5',
    keterangan: '',
  });
  const [saving, setSaving] = useState(false);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const hargaBeli = parseFloat(form.harga_beli) || 0;
  const marginPct = parseFloat(form.margin_pct) || 5;
  const hargaJual = hargaBeli * (1 + marginPct / 100);
  const qty = parseFloat(form.qty) || 0;
  const total = qty * hargaJual;
  const margin = total - qty * hargaBeli;

  const submit = async () => {
    if (!form.jenis || qty <= 0 || hargaBeli <= 0) return;
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
              <Select value={form.jenis} onChange={e => update('jenis', e.target.value)}>
                <option value="">-- Pilih --</option>
                {masterBahan.map((b: any) => (
                  <option key={b.id} value={b.nama_bahan}>{b.nama_bahan}</option>
                ))}
              </Select>
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
                <span>{rupiahFull(hargaBeli)} × {qty} kg</span>
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
        </div>
        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={submit} disabled={saving || !form.jenis || qty <= 0 || hargaBeli <= 0}>
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
