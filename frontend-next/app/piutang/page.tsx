'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { rupiahFull, fmtDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PageSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

import {
  CreditCard, ArrowUpRight, Search, Download, Plus,
  XCircle, Clock, CheckCircle2, AlertTriangle,
  Banknote, Receipt, CalendarClock, Pencil, Trash2, X,
} from 'lucide-react';

const TH = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

type TabId = 'semua' | 'belum_lunas' | 'sebagian' | 'lunas';

const STATUS_MAP: Record<string, { label: string; variant: 'warning' | 'purple' | 'success'; icon: React.ReactNode }> = {
  belum_lunas: { label: 'Belum Lunas', variant: 'warning', icon: <Clock className="h-3 w-3" /> },
  sebagian: { label: 'Sebagian', variant: 'purple', icon: <ArrowUpRight className="h-3 w-3" /> },
  lunas: { label: 'Lunas', variant: 'success', icon: <CheckCircle2 className="h-3 w-3" /> },
};

const KATEGORI_OPTIONS = ['Deposit Subcon', 'Penjualan Kredit', 'Pinjaman', 'Lainnya'];

function rpShort(val: number) {
  const abs = Math.abs(val);
  const prefix = val < 0 ? '-' : '';
  if (abs >= 1_000_000) return prefix + 'Rp ' + (abs / 1_000_000).toFixed(1).replace('.', ',') + ' M';
  if (abs >= 1_000) return prefix + 'Rp ' + (abs / 1_000).toFixed(0) + ' jt';
  return prefix + 'Rp ' + abs.toLocaleString('id-ID');
}

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_MAP[status] || STATUS_MAP.belum_lunas;
  return <Badge variant={m.variant} className="gap-1">{m.icon}{m.label}</Badge>;
}

function ProgressBar({ terbayar, jumlah }: { terbayar: number; jumlah: number }) {
  const pct = jumlah > 0 ? Math.min(100, (terbayar / jumlah) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-purple-500' : 'bg-muted-foreground/20')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] tabular-nums text-muted-foreground w-8 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

function isOverdue(row: any) {
  return row.status !== 'lunas' && new Date(row.jatuh_tempo) < new Date();
}

/* ═══════════════ Main Page ═══════════════ */

export default function PiutangPage() {
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('semua');
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [showBayarModal, setShowBayarModal] = useState(false);
  const [bayarRow, setBayarRow] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();

  const loadData = () => {
    setLoading(true);
    Promise.all([api.getPiutang(), api.getPiutangStats()])
      .then(([res, st]) => { setData(res.data); setStats(st); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    let list = data;
    if (activeTab !== 'semua') list = list.filter(r => r.status === activeTab);
    if (filterKategori) list = list.filter(r => r.kategori === filterKategori);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(r =>
        r.pelanggan.toLowerCase().includes(s) ||
        r.keterangan.toLowerCase().includes(s) ||
        r.wilayah.toLowerCase().includes(s)
      );
    }
    return list;
  }, [data, activeTab, filterKategori, search]);

  const overdueCount = useMemo(() => data.filter(isOverdue).length, [data]);

  if (error) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card><CardContent className="pt-6"><div className="flex items-center gap-3 text-destructive"><XCircle className="h-5 w-5" /><span className="font-medium">Error: {error}</span></div></CardContent></Card>
    </div>
  );
  if (loading || !stats) return <PageSkeleton />;

  const statusCounts = {
    belum_lunas: stats.by_status?.belum_lunas?.count || 0,
    sebagian: stats.by_status?.sebagian?.count || 0,
    lunas: stats.by_status?.lunas?.count || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Piutang</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kelola piutang, tagihan, dan pembayaran pelanggan</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => { setEditRow(null); setShowModal(true); }}>
            <Plus className="mr-1.5 h-4 w-4" />Tambah Piutang
          </Button>
          <Button size="sm" variant="outline"><Download className="mr-1.5 h-4 w-4" />Export</Button>
        </div>
      </div>

      {/* KPI Gradient Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GradientKPI
          gradient="gradient-card-blue"
          icon={<CreditCard className="h-5 w-5" />}
          label="Total Piutang"
          value={rpShort(stats.total_piutang)}
          sub={`${stats.count} transaksi`}
        />
        <GradientKPI
          gradient="gradient-card-emerald"
          icon={<Banknote className="h-5 w-5" />}
          label="Sudah Dibayar"
          value={rpShort(stats.total_terbayar)}
          sub={`${statusCounts.lunas} lunas`}
        />
        <GradientKPI
          gradient="gradient-card-orange"
          icon={<Receipt className="h-5 w-5" />}
          label="Belum Terbayar"
          value={rpShort(stats.total_sisa)}
          sub={`${statusCounts.belum_lunas + statusCounts.sebagian} outstanding`}
        />
        <GradientKPI
          gradient={overdueCount > 0 ? 'gradient-card-pink' : 'gradient-card-purple'}
          icon={<CalendarClock className="h-5 w-5" />}
          label="Jatuh Tempo"
          value={String(stats.jatuh_tempo_count)}
          sub={overdueCount > 0 ? 'Perlu segera ditagih' : 'Tidak ada yang terlambat'}
        />
      </div>

      {/* Overdue Warning */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5">
          <div className="rounded-xl bg-red-100 p-2"><AlertTriangle className="h-4 w-4 text-red-600" /></div>
          <p className="text-sm text-red-800">
            <strong>{overdueCount} piutang</strong> sudah melewati jatuh tempo. Segera lakukan penagihan.
          </p>
        </div>
      )}

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari pelanggan, keterangan..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterKategori} onChange={e => setFilterKategori(e.target.value)} className="w-48">
          <option value="">Semua Kategori</option>
          {KATEGORI_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <TabsList className="w-full justify-start bg-white border">
          <TabsTrigger value="semua">Semua ({data.length})</TabsTrigger>
          <TabsTrigger value="belum_lunas" className="gap-1.5">
            Belum Lunas
            {statusCounts.belum_lunas > 0 && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">{statusCounts.belum_lunas}</span>}
          </TabsTrigger>
          <TabsTrigger value="sebagian" className="gap-1.5">
            Sebagian
            {statusCounts.sebagian > 0 && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-500 px-1.5 text-[10px] font-bold text-white">{statusCounts.sebagian}</span>}
          </TabsTrigger>
          <TabsTrigger value="lunas">Lunas ({statusCounts.lunas})</TabsTrigger>
        </TabsList>

        {(['semua', 'belum_lunas', 'sebagian', 'lunas'] as TabId[]).map(tab => (
          <TabsContent key={tab} value={tab}>
            <PiutangTable
              rows={filtered}
              onEdit={r => { setEditRow(r); setShowModal(true); }}
              onBayar={r => { setBayarRow(r); setShowBayarModal(true); }}
              onDelete={id => setDeleteId(id)}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Kategori Summary */}
      {stats.by_kategori && Object.keys(stats.by_kategori).length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Ringkasan per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(stats.by_kategori).map(([kat, val]: [string, any]) => (
                <div key={kat} className="rounded-xl border p-4 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{kat}</p>
                  <p className="text-lg font-bold">{rpShort(val.jumlah)}</p>
                  <p className="text-xs text-muted-foreground">{val.count} piutang</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {showModal && (
        <PiutangModal
          row={editRow}
          onClose={() => { setShowModal(false); setEditRow(null); }}
          onSaved={() => { setShowModal(false); setEditRow(null); loadData(); toast('success', editRow ? 'Piutang berhasil diupdate' : 'Piutang berhasil ditambahkan'); }}
        />
      )}
      {showBayarModal && bayarRow && (
        <BayarModal
          row={bayarRow}
          onClose={() => { setShowBayarModal(false); setBayarRow(null); }}
          onSaved={() => { setShowBayarModal(false); setBayarRow(null); loadData(); toast('success', 'Pembayaran berhasil dicatat'); }}
        />
      )}
      <ConfirmDialog
        open={deleteId !== null}
        title="Hapus Piutang"
        message="Data piutang yang dihapus tidak bisa dikembalikan. Lanjutkan?"
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) { await api.deletePiutang(deleteId); loadData(); toast('success', 'Piutang berhasil dihapus'); }
          setDeleteId(null);
        }}
      />
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

/* ═══════════════ Table ═══════════════ */

function PiutangTable({ rows, onEdit, onBayar, onDelete }: {
  rows: any[]; onEdit: (r: any) => void; onBayar: (r: any) => void; onDelete: (id: number) => void;
}) {
  if (rows.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <CreditCard className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-semibold text-muted-foreground">Tidak ada data piutang</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Piutang akan muncul setelah ditambahkan</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b-2">
            <TableHead className={TH}>Tanggal</TableHead>
            <TableHead className={TH}>Pelanggan</TableHead>
            <TableHead className={TH}>Keterangan</TableHead>
            <TableHead className={TH}>Kategori</TableHead>
            <TableHead className={cn(TH, 'text-right')}>Jumlah</TableHead>
            <TableHead className={TH}>Progress</TableHead>
            <TableHead className={TH}>Jatuh Tempo</TableHead>
            <TableHead className={TH}>Status</TableHead>
            <TableHead className={cn(TH, 'text-right')}>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(r => (
            <TableRow key={r.id} className="hover:bg-muted/30">
              <TableCell className="text-sm tabular-nums">{fmtDate(r.tanggal)}</TableCell>
              <TableCell>
                <div>
                  <p className="text-sm font-semibold">{r.pelanggan}</p>
                  {r.wilayah && <p className="text-[11px] text-muted-foreground">{r.wilayah}</p>}
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.keterangan}</TableCell>
              <TableCell><Badge variant="secondary" className="text-[11px]">{r.kategori}</Badge></TableCell>
              <TableCell className="text-right">
                <p className="text-sm font-semibold tabular-nums">{rupiahFull(r.jumlah)}</p>
                {r.terbayar > 0 && <p className="text-[11px] text-emerald-600 tabular-nums">Dibayar: {rupiahFull(r.terbayar)}</p>}
              </TableCell>
              <TableCell className="min-w-[120px]"><ProgressBar terbayar={r.terbayar} jumlah={r.jumlah} /></TableCell>
              <TableCell>
                <div className={cn('text-sm tabular-nums', isOverdue(r) && 'text-red-600 font-semibold')}>
                  {fmtDate(r.jatuh_tempo)}
                  {isOverdue(r) && <p className="text-[10px] text-red-500 font-medium">Terlambat</p>}
                </div>
              </TableCell>
              <TableCell><StatusBadge status={r.status} /></TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {r.status !== 'lunas' && (
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => onBayar(r)}>
                      <Banknote className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => onEdit(r)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

/* ═══════════════ Modal: Tambah / Edit Piutang ═══════════════ */

function PiutangModal({ row, onClose, onSaved }: { row: any | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!row;
  const [form, setForm] = useState({
    pelanggan: row?.pelanggan || '',
    keterangan: row?.keterangan || '',
    jumlah: row?.jumlah?.toString() || '',
    terbayar: row?.terbayar?.toString() || '0',
    wilayah: row?.wilayah || '',
    kategori: row?.kategori || 'Lainnya',
    tanggal: row?.tanggal?.split('T')[0] || new Date().toISOString().split('T')[0],
    jatuh_tempo: row?.jatuh_tempo?.split('T')[0] || '',
    status: row?.status || 'belum_lunas',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.pelanggan || !form.jumlah || !form.jatuh_tempo) return;
    setSaving(true);
    try {
      const payload = { ...form, jumlah: parseFloat(form.jumlah), terbayar: parseFloat(form.terbayar || '0') };
      if (isEdit) await api.updatePiutang(row.id, payload);
      else await api.createPiutang(payload);
      onSaved();
    } catch { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{isEdit ? 'Edit Piutang' : 'Tambah Piutang'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Pelanggan *</label>
              <Input value={form.pelanggan} onChange={e => set('pelanggan', e.target.value)} placeholder="Nama pelanggan" />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Wilayah</label>
              <Input value={form.wilayah} onChange={e => set('wilayah', e.target.value)} placeholder="Wilayah" />
            </div>
          </div>

          <div>
            <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Keterangan</label>
            <Input value={form.keterangan} onChange={e => set('keterangan', e.target.value)} placeholder="Deskripsi piutang" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Jumlah (ribuan) *</label>
              <Input type="number" value={form.jumlah} onChange={e => set('jumlah', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Kategori</label>
              <Select value={form.kategori} onChange={e => set('kategori', e.target.value)}>
                {KATEGORI_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Tanggal</label>
              <Input type="date" value={form.tanggal} onChange={e => set('tanggal', e.target.value)} />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Jatuh Tempo *</label>
              <Input type="date" value={form.jatuh_tempo} onChange={e => set('jatuh_tempo', e.target.value)} />
            </div>
          </div>

          {isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Sudah Dibayar (ribuan)</label>
                <Input type="number" value={form.terbayar} onChange={e => set('terbayar', e.target.value)} />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Status</label>
                <Select value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="belum_lunas">Belum Lunas</option>
                  <option value="sebagian">Sebagian</option>
                  <option value="lunas">Lunas</option>
                </Select>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={saving || !form.pelanggan || !form.jumlah || !form.jatuh_tempo}>
            {saving ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Tambah'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ Modal: Bayar Piutang ═══════════════ */

function BayarModal({ row, onClose, onSaved }: { row: any; onClose: () => void; onSaved: () => void }) {
  const sisa = row.jumlah - row.terbayar;
  const [nominal, setNominal] = useState('');
  const [saving, setSaving] = useState(false);

  const handleBayar = async () => {
    const val = parseFloat(nominal);
    if (!val || val <= 0) return;
    setSaving(true);
    try {
      await api.bayarPiutang(row.id, val);
      onSaved();
    } catch { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Catat Pembayaran</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="rounded-xl bg-muted/50 p-4 mb-5 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Pelanggan</span>
            <span className="text-sm font-semibold">{row.pelanggan}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total Piutang</span>
            <span className="text-sm font-semibold tabular-nums">{rupiahFull(row.jumlah)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Sudah Dibayar</span>
            <span className="text-sm font-semibold text-emerald-600 tabular-nums">{rupiahFull(row.terbayar)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-sm font-semibold">Sisa</span>
            <span className="text-sm font-bold text-orange-600 tabular-nums">{rupiahFull(sisa)}</span>
          </div>
          <ProgressBar terbayar={row.terbayar} jumlah={row.jumlah} />
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Nominal Bayar (ribuan)</label>
            <Input
              type="number"
              value={nominal}
              onChange={e => setNominal(e.target.value)}
              placeholder={`Maks ${sisa.toLocaleString('id-ID')}`}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            {[0.25, 0.5, 1].map(frac => (
              <button
                key={frac}
                onClick={() => setNominal(String(Math.round(sisa * frac)))}
                className="flex-1 rounded-xl border px-3 py-2 text-[12px] font-medium hover:bg-muted/50 transition-colors"
              >
                {frac === 1 ? 'Lunas' : `${frac * 100}%`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleBayar} disabled={saving || !nominal || parseFloat(nominal) <= 0} className="bg-emerald-600 hover:bg-emerald-700">
            <Banknote className="mr-1.5 h-4 w-4" />
            {saving ? 'Menyimpan...' : 'Catat Pembayaran'}
          </Button>
        </div>
      </div>
    </div>
  );
}
