'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { Chart, registerables } from 'chart.js';
import { api } from '@/lib/api';
import { rupiahFull, fmtDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import Loading from '@/components/Loading';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Select } from '@/components/ui/select';
import {
  ArrowDownCircle, ArrowUpCircle, Wallet, AlertTriangle,
  ClipboardList, TrendingUp, Search, Download, Plus, X,
  Info, CheckCircle2, XCircle, CreditCard, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

Chart.register(...registerables);

type TabId = 'ringkasan' | 'masuk' | 'keluar' | 'aruskas' | 'incomplete';

/* ═══════════════ Helpers ═══════════════ */

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
  if (/pelunasan/.test(d)) return 'Pelunasan';
  if (/bahan baku/.test(d)) return 'Bahan Baku';
  if (/operasional|bensin|makan|rokok|tol/.test(d)) return 'Operasional';
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
  if (tipe === 'masuk' && row.masuk === 0) issues.push('Tipe masuk tapi nominal kosong');
  if (tipe === 'keluar' && row.keluar === 0) issues.push('Tipe keluar tapi nominal kosong');
  if (!row.deskripsi || row.deskripsi.trim() === '') issues.push('Keterangan kosong');
  if (row.balance < 0) issues.push('Saldo minus');
  if (row.masuk === 0 && row.keluar === 0 && !/posisi kas/i.test(row.deskripsi || '')) issues.push('Nominal kosong');
  return issues;
}

function getSuggestion(issue: string) {
  if (/masuk/.test(issue)) return 'Input nominal masuk';
  if (/keluar/.test(issue)) return 'Input nominal keluar';
  if (/keterangan/.test(issue)) return 'Tambah keterangan';
  if (/saldo/.test(issue)) return 'Cek uang masuk';
  return 'Verifikasi data';
}

function rpShort(val: number) {
  const abs = Math.abs(val);
  const prefix = val < 0 ? '-' : '';
  if (abs >= 1_000_000) return prefix + 'Rp ' + (abs / 1_000_000).toFixed(1).replace('.', ',') + ' M';
  if (abs >= 1_000) return prefix + 'Rp ' + (abs / 1_000).toFixed(0) + ' jt';
  return prefix + 'Rp ' + abs.toLocaleString('id-ID');
}

const TYPE_BADGE: Record<string, { variant: 'success' | 'destructive' | 'info' | 'purple' | 'secondary'; label: string }> = {
  masuk: { variant: 'success', label: 'Masuk' },
  keluar: { variant: 'destructive', label: 'Keluar' },
  operasional: { variant: 'info', label: 'Operasional' },
  koreksi: { variant: 'purple', label: 'Koreksi' },
  lainnya: { variant: 'secondary', label: 'Lainnya' },
};

function TypeBadge({ type }: { type: string }) {
  const m = TYPE_BADGE[type] || TYPE_BADGE.lainnya;
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

function StatusBadge({ row }: { row: any }) {
  return detectIssues(row).length === 0
    ? <Badge variant="success">Lengkap</Badge>
    : <Badge variant="warning">Cek</Badge>;
}

function WilayahBadge({ w }: { w: string }) {
  const known = ['jabar', 'jateng', 'jatim'];
  const v = (w || '').toLowerCase() as any;
  return <Badge variant={known.includes(v) ? v : 'secondary'}>{w}</Badge>;
}

/* Table header style */
const TH = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

/* ═══════════════ Main Page ═══════════════ */

export default function KeuanganPage() {
  const [kasData, setKasData] = useState<any[]>([]);
  const [opData, setOpData] = useState<any[]>([]);
  const [kasSummary, setKasSummary] = useState<any[]>([]);
  const [opSummary, setOpSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('ringkasan');
  const [globalWilayah, setGlobalWilayah] = useState('');
  const [showKasModal, setShowKasModal] = useState<'masuk' | 'keluar' | null>(null);
  const [showOpModal, setShowOpModal] = useState(false);
  const [masterWilayah, setMasterWilayah] = useState<any[]>([]);

  const loadData = () => {
    Promise.all([api.getKas(), api.getOperasional(), api.getWilayah({ aktif: 'true' })])
      .then(([kas, op, wil]) => {
        setKasData(kas.data); setOpData(op.data);
        setKasSummary(kas.summary); setOpSummary(op.summary);
        setMasterWilayah(wil.data || []);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { loadData(); }, []);

  const filteredKas = useMemo(() => {
    if (!globalWilayah || globalWilayah.startsWith('__')) return kasData;
    return kasData.filter(r => r.wilayah === globalWilayah);
  }, [kasData, globalWilayah]);

  const incompleteCount = useMemo(() => kasData.filter(r => detectIssues(r).length > 0).length, [kasData]);

  const totals = useMemo(() => {
    let masuk = 0, keluar = 0;
    for (const s of kasSummary) { masuk += Number(s.total_masuk); keluar += Number(s.total_keluar); }
    return { masuk, keluar, saldo: masuk - keluar };
  }, [kasSummary]);

  if (error) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card><CardContent className="pt-6"><div className="flex items-center gap-3 text-destructive"><XCircle className="h-5 w-5" /><span className="font-medium">Error: {error}</span></div></CardContent></Card>
    </div>
  );
  if (loading) return <Loading />;

  const wilayahNames = masterWilayah.map((w: any) => w.nama_wilayah);
  const pills = [
    { label: 'Semua', value: '' },
    ...wilayahNames.map((w: string) => ({ label: w, value: w })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Keuangan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Arus kas, pembayaran, dan saldo wilayah</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowKasModal('masuk')}><Plus className="mr-1.5 h-4 w-4" />Input Masuk</Button>
          <Button size="sm" variant="outline" onClick={() => setShowKasModal('keluar')}><Plus className="mr-1.5 h-4 w-4" />Input Keluar</Button>
          <Button size="sm" variant="outline"><Download className="mr-1.5 h-4 w-4" />Export</Button>
        </div>
      </div>

      {/* KPI Gradient Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GradientKPI
          gradient="gradient-card-emerald"
          icon={<ArrowDownCircle className="h-5 w-5" />}
          label="Total Uang Masuk"
          value={rpShort(totals.masuk)}
          sub="Dari semua wilayah"
          badge={<><ArrowUpRight className="h-3 w-3" />Masuk</>}
        />
        <GradientKPI
          gradient="gradient-card-pink"
          icon={<ArrowUpCircle className="h-5 w-5" />}
          label="Total Uang Keluar"
          value={rpShort(totals.keluar)}
          sub="Pembayaran & operasional"
          badge={<><ArrowDownRight className="h-3 w-3" />Keluar</>}
        />
        <GradientKPI
          gradient={totals.saldo >= 0 ? 'gradient-card-blue' : 'gradient-card-pink'}
          icon={<Wallet className="h-5 w-5" />}
          label="Saldo Akhir"
          value={rpShort(totals.saldo)}
          sub={totals.saldo >= 0 ? 'Positif' : 'Defisit — perlu review'}
          badge={null}
        />
        <GradientKPI
          gradient={incompleteCount > 0 ? 'gradient-card-orange' : 'gradient-card-emerald'}
          icon={<ClipboardList className="h-5 w-5" />}
          label="Belum Lengkap"
          value={String(incompleteCount)}
          sub={incompleteCount > 0 ? 'Transaksi perlu dicek' : 'Semua data lengkap'}
          badge={null}
        />
      </div>

      {/* Warning Banner */}
      {incompleteCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5">
          <div className="rounded-xl bg-amber-100 p-2"><AlertTriangle className="h-4 w-4 text-amber-600" /></div>
          <p className="text-sm text-amber-800">
            <strong>{incompleteCount} transaksi</strong> perlu dicek. Saldo minus bisa terjadi karena pemasukan belum diinput.
          </p>
        </div>
      )}

      {/* Filter Pills */}
      <div className="flex items-center gap-2">
        {pills.map(p => (
          <button
            key={p.value}
            onClick={() => setGlobalWilayah(p.value)}
            className={cn(
              'rounded-full px-4 py-1.5 text-[13px] font-medium transition-all',
              globalWilayah === p.value
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'bg-white border text-muted-foreground hover:bg-muted/50'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <TabsList className="w-full justify-start bg-white border">
          <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
          <TabsTrigger value="masuk">Uang Masuk</TabsTrigger>
          <TabsTrigger value="keluar">Uang Keluar</TabsTrigger>
          <TabsTrigger value="aruskas">Arus Kas</TabsTrigger>
          <TabsTrigger value="incomplete" className="gap-1.5">
            Belum Lengkap
            {incompleteCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                {incompleteCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ringkasan">
          <RingkasanTab kasSummary={kasSummary} kasData={kasData} opData={opData} opSummary={opSummary} masterWilayah={masterWilayah} onReload={loadData} />
        </TabsContent>
        <TabsContent value="masuk"><TransaksiTab rows={filteredKas} type="masuk" /></TabsContent>
        <TabsContent value="keluar"><TransaksiTab rows={filteredKas} type="keluar" /></TabsContent>
        <TabsContent value="aruskas"><ArusKasTab rows={filteredKas} /></TabsContent>
        <TabsContent value="incomplete"><IncompleteTab kasData={kasData} globalWilayah={globalWilayah} /></TabsContent>
      </Tabs>

      {showKasModal && (
        <KasInputModal tipe={showKasModal} masterWilayah={masterWilayah} onClose={() => setShowKasModal(null)} onCreated={() => { setShowKasModal(null); loadData(); }} />
      )}
    </div>
  );
}

/* ═══════════════ Kas Input Modal ═══════════════ */

function KasInputModal({ tipe, masterWilayah, onClose, onCreated }: { tipe: 'masuk' | 'keluar'; masterWilayah: any[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ tanggal: new Date().toISOString().slice(0, 10), wilayah: '', deskripsi: '', nominal: '' });
  const [saving, setSaving] = useState(false);
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    const nominal = parseFloat(form.nominal);
    if (!form.wilayah || !nominal || nominal <= 0) return;
    setSaving(true);
    try {
      await api.createKas({ tipe, tanggal: form.tanggal, wilayah: form.wilayah, deskripsi: form.deskripsi, nominal });
      onCreated();
    } catch { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold">{tipe === 'masuk' ? 'Input Uang Masuk' : 'Input Uang Keluar'}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Tanggal</label>
              <Input type="date" value={form.tanggal} onChange={e => update('tanggal', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Wilayah</label>
              <Select value={form.wilayah} onChange={e => update('wilayah', e.target.value)}>
                <option value="">-- Pilih --</option>
                {masterWilayah.map((w: any) => <option key={w.id} value={w.nama_wilayah}>{w.nama_wilayah}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Deskripsi</label>
            <Input placeholder="Keterangan transaksi..." value={form.deskripsi} onChange={e => update('deskripsi', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Nominal (ribuan Rp)</label>
            <Input type="number" placeholder="Contoh: 1000 = Rp 1.000.000" value={form.nominal} onChange={e => update('nominal', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ Operasional Input Modal ═══════════════ */

function OpInputModal({ masterWilayah, onClose, onCreated }: { masterWilayah: any[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ tanggal: new Date().toISOString().slice(0, 10), wilayah: '', deskripsi: '', jumlah: '' });
  const [saving, setSaving] = useState(false);
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    const jumlah = parseFloat(form.jumlah);
    if (!form.wilayah || !jumlah || jumlah <= 0) return;
    setSaving(true);
    try {
      await api.createOperasional({ tanggal: form.tanggal, wilayah: form.wilayah, deskripsi: form.deskripsi, jumlah });
      onCreated();
    } catch { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold">Input Biaya Operasional</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Tanggal</label>
              <Input type="date" value={form.tanggal} onChange={e => update('tanggal', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Wilayah</label>
              <Select value={form.wilayah} onChange={e => update('wilayah', e.target.value)}>
                <option value="">-- Pilih --</option>
                {masterWilayah.map((w: any) => <option key={w.id} value={w.nama_wilayah}>{w.nama_wilayah}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Deskripsi</label>
            <Input placeholder="Transport, makan, dll..." value={form.deskripsi} onChange={e => update('deskripsi', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Jumlah (ribuan Rp)</label>
            <Input type="number" placeholder="Contoh: 500 = Rp 500.000" value={form.jumlah} onChange={e => update('jumlah', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ Gradient KPI Card ═══════════════ */

function GradientKPI({ gradient, icon, label, value, sub, badge }: {
  gradient: string; icon: React.ReactNode; label: string; value: string; sub: string; badge: React.ReactNode;
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

/* ═══════════════ Tab: Ringkasan ═══════════════ */

function RingkasanTab({ kasSummary, kasData, opData, opSummary, masterWilayah, onReload }: any) {
  const chartRef = useRef<Chart | null>(null);
  const [opLimit, setOpLimit] = useState(10);
  const [opSearch, setOpSearch] = useState('');
  const [showOpModal, setShowOpModal] = useState(false);

  useEffect(() => {
    chartRef.current?.destroy();
    const canvas = document.getElementById('chart-kas-wilayah') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const gradMasuk = ctx.createLinearGradient(0, 0, 0, 280);
    gradMasuk.addColorStop(0, 'rgba(16,185,129,0.8)');
    gradMasuk.addColorStop(1, 'rgba(16,185,129,0.3)');
    const gradKeluar = ctx.createLinearGradient(0, 0, 0, 280);
    gradKeluar.addColorStop(0, 'rgba(239,68,68,0.7)');
    gradKeluar.addColorStop(1, 'rgba(239,68,68,0.2)');

    chartRef.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: kasSummary.map((s: any) => s.wilayah),
        datasets: [
          {
            label: 'Masuk',
            data: kasSummary.map((s: any) => Number(s.total_masuk)),
            backgroundColor: gradMasuk,
            borderColor: '#10B981',
            borderWidth: 2,
            borderRadius: 12,
            borderSkipped: false,
          },
          {
            label: 'Keluar',
            data: kasSummary.map((s: any) => Number(s.total_keluar)),
            backgroundColor: gradKeluar,
            borderColor: '#EF4444',
            borderWidth: 2,
            borderRadius: 12,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { usePointStyle: true, pointStyleWidth: 8, font: { size: 12, family: 'Inter' }, padding: 20 } },
          tooltip: { backgroundColor: '#1e1b4b', cornerRadius: 10, padding: 12, titleFont: { family: 'Inter' }, bodyFont: { family: 'Inter' } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 12, family: 'Inter' }, color: '#64748b' } },
          y: { grid: { color: '#f1f5f9', drawTicks: false }, ticks: { font: { size: 11, family: 'Inter' }, color: '#94a3b8', padding: 8 }, border: { display: false } },
        },
      },
    });
    return () => { chartRef.current?.destroy(); };
  }, [kasSummary]);

  let totalOp = 0;
  for (const s of opSummary) totalOp += Number(s.total);

  const mostMinus = [...kasSummary].sort((a: any, b: any) => Number(a.saldo) - Number(b.saldo))[0];
  const mostMasuk = [...kasSummary].sort((a: any, b: any) => Number(b.total_masuk) - Number(a.total_masuk))[0];
  const incByWilayah: Record<string, number> = {};
  for (const r of kasData) { if (detectIssues(r).length > 0) incByWilayah[r.wilayah] = (incByWilayah[r.wilayah] || 0) + 1; }
  const mostInc = Object.entries(incByWilayah).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-6">
      {/* Saldo per Wilayah */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kasSummary.map((s: any) => {
          const saldo = Number(s.saldo);
          const pos = saldo >= 0;
          const pct = Math.min(100, Math.abs(saldo) / Math.max(Number(s.total_masuk), 1) * 100);
          return (
            <Card key={s.wilayah} className="shadow-sm border-0 shadow-black/[0.04] hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn('rounded-xl p-2.5', pos ? 'bg-emerald-50' : 'bg-red-50')}>
                      <CreditCard className={cn('h-4 w-4', pos ? 'text-emerald-600' : 'text-red-500')} />
                    </div>
                    <WilayahBadge w={s.wilayah} />
                  </div>
                  <Badge variant={pos ? 'success' : 'destructive'} className="text-[10px]">{pos ? 'Positif' : 'Minus'}</Badge>
                </div>
                <p className={cn('text-2xl font-extrabold tracking-tight', pos ? 'text-emerald-600' : 'text-red-500')}>
                  {rpShort(saldo)}
                </p>
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Masuk</span>
                    <span className="font-medium text-emerald-600">{rpShort(Number(s.total_masuk))}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Keluar</span>
                    <span className="font-medium text-red-500">{rpShort(Number(s.total_keluar))}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted mt-1">
                    <div className={cn('h-full rounded-full transition-all', pos ? 'bg-emerald-400' : 'bg-red-400')} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart */}
      <Card className="shadow-sm border-0 shadow-black/[0.04]">
        <CardHeader className="pb-0">
          <CardTitle className="text-[15px] font-semibold">Arus Kas per Wilayah</CardTitle>
          <CardDescription className="text-xs">Perbandingan uang masuk vs keluar per provinsi</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-[320px]"><canvas id="chart-kas-wilayah" /></div>
        </CardContent>
      </Card>

      {/* Insight Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InsightCard
          icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
          iconBg="bg-red-50"
          title="Wilayah Paling Minus"
          value={mostMinus?.wilayah || '-'}
          detail={mostMinus ? `Saldo: ${rpShort(Number(mostMinus.saldo))}` : '-'}
        />
        <InsightCard
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
          title="Pemasukan Terbesar"
          value={mostMasuk?.wilayah || '-'}
          detail={mostMasuk ? `Total: ${rpShort(Number(mostMasuk.total_masuk))}` : '-'}
        />
        <InsightCard
          icon={<ClipboardList className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-50"
          title="Belum Lengkap Terbanyak"
          value={mostInc ? mostInc[0] : 'Tidak ada'}
          detail={mostInc ? `${mostInc[1]} transaksi perlu dicek` : 'Semua lengkap'}
        />
      </div>

      {/* Info */}
      <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3.5">
        <div className="rounded-xl bg-blue-100 p-2"><Info className="h-4 w-4 text-blue-600" /></div>
        <p className="text-sm text-blue-800">
          <strong>Tip: </strong>Saldo minus biasanya karena uang masuk belum diinput. Cek tab "Uang Masuk" dan "Belum Lengkap" terlebih dahulu.
        </p>
      </div>

      {/* Operasional Table */}
      <Card className="shadow-sm border-0 shadow-black/[0.04]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[15px] font-semibold">Biaya Operasional</CardTitle>
              <CardDescription className="text-xs">{opData.length} transaksi — Total: {rpShort(totalOp)}</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowOpModal(true)}><Plus className="mr-1.5 h-4 w-4" />Input</Button>
          </div>
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input placeholder="Cari keterangan..." value={opSearch} onChange={e => setOpSearch(e.target.value)}
                className="pl-9 bg-muted/50 border-0 h-9 text-sm" />
            </div>
            <div className="flex items-center gap-1">
              {[10, 25, 50, 0].map(n => (
                <button key={n} onClick={() => setOpLimit(n)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    opLimit === n ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted')}>
                  {n === 0 ? 'Semua' : n}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            let filtered = opData;
            if (opSearch) filtered = filtered.filter((o: any) => (o.deskripsi || '').toLowerCase().includes(opSearch.toLowerCase()));
            const shown = opLimit > 0 ? filtered.slice(0, opLimit) : filtered;
            return (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b-2">
                      <TableHead className={TH}>Wilayah</TableHead>
                      <TableHead className={TH}>Keterangan</TableHead>
                      <TableHead className={cn(TH, 'text-right')}>Jumlah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shown.map((o: any, i: number) => (
                      <TableRow key={i} className="hover:bg-muted/30">
                        <TableCell><WilayahBadge w={o.wilayah} /></TableCell>
                        <TableCell className="text-sm">{o.deskripsi}</TableCell>
                        <TableCell className="text-right font-semibold text-sm tabular-nums">{rupiahFull(o.jumlah)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {opLimit > 0 && filtered.length > opLimit && (
                  <p className="text-center text-xs text-muted-foreground pt-3">
                    Menampilkan {opLimit} dari {filtered.length} transaksi
                  </p>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>

      {showOpModal && (
        <OpInputModal masterWilayah={masterWilayah || []} onClose={() => setShowOpModal(false)} onCreated={() => { setShowOpModal(false); onReload(); }} />
      )}
    </div>
  );
}

/* ═══════════════ Tab: Transaksi (Masuk/Keluar) ═══════════════ */

function TransaksiTab({ rows, type }: { rows: any[]; type: 'masuk' | 'keluar' }) {
  const [search, setSearch] = useState('');
  const isMasuk = type === 'masuk';

  const filtered = useMemo(() => {
    let list = rows.filter((r: any) => isMasuk ? r.masuk > 0 : r.keluar > 0);
    if (search) list = list.filter((r: any) => (r.deskripsi || '').toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [rows, search, isMasuk]);

  const total = filtered.reduce((s: number, r: any) => s + (isMasuk ? r.masuk : r.keluar), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input placeholder={`Cari transaksi ${type}...`} value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-muted/50 border-0" />
        </div>
        <Badge variant="secondary" className="text-xs">{filtered.length} transaksi — {rpShort(total)}</Badge>
      </div>

      <Card className="shadow-sm border-0 shadow-black/[0.04]">
        <CardContent className="p-0">
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b-2">
                  <TableHead className={TH}>Tanggal</TableHead>
                  <TableHead className={TH}>Wilayah</TableHead>
                  <TableHead className={TH}>{isMasuk ? 'Sumber' : 'Tujuan'}</TableHead>
                  <TableHead className={TH}>Keterangan</TableHead>
                  <TableHead className={cn(TH, 'text-right')}>Nominal</TableHead>
                  {!isMasuk && <TableHead className={TH}>Kategori</TableHead>}
                  <TableHead className={TH}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r: any, i: number) => (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="whitespace-nowrap text-sm">{fmtDate(r.date)}</TableCell>
                    <TableCell><WilayahBadge w={r.wilayah} /></TableCell>
                    <TableCell className="text-sm">{isMasuk ? detectSource(r) : detectSupplierTarget(r)}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{r.deskripsi}</TableCell>
                    <TableCell className={cn('text-right font-semibold tabular-nums text-sm', isMasuk ? 'text-emerald-600' : 'text-red-500')}>
                      {rupiahFull(isMasuk ? r.masuk : r.keluar)}
                    </TableCell>
                    {!isMasuk && <TableCell><Badge variant="secondary" className="text-[10px]">{detectCategory(r)}</Badge></TableCell>}
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

/* ═══════════════ Tab: Arus Kas ═══════════════ */

function ArusKasTab({ rows }: { rows: any[] }) {
  return (
    <Card className="shadow-sm border-0 shadow-black/[0.04]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[15px] font-semibold">Arus Kas</CardTitle>
            <CardDescription className="text-xs">{rows.length} entri dari semua wilayah</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[70vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b-2">
                <TableHead className={TH}>Tanggal</TableHead>
                <TableHead className={TH}>Wilayah</TableHead>
                <TableHead className={TH}>Keterangan</TableHead>
                <TableHead className={cn(TH, 'text-right')}>Masuk</TableHead>
                <TableHead className={cn(TH, 'text-right')}>Keluar</TableHead>
                <TableHead className={cn(TH, 'text-right')}>Saldo</TableHead>
                <TableHead className={TH}>Tipe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any, i: number) => (
                <TableRow key={i} className="hover:bg-muted/30">
                  <TableCell className="whitespace-nowrap text-sm">{fmtDate(r.date)}</TableCell>
                  <TableCell><WilayahBadge w={r.wilayah} /></TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{r.deskripsi}</TableCell>
                  <TableCell className="text-right text-sm">
                    {r.masuk > 0 ? <span className="font-semibold text-emerald-600 tabular-nums">{rupiahFull(r.masuk)}</span> : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {r.keluar > 0 ? <span className="font-semibold text-red-500 tabular-nums">{rupiahFull(r.keluar)}</span> : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    <span className={cn('font-semibold tabular-nums', Number(r.balance) < 0 ? 'text-red-500' : '')}>{rupiahFull(r.balance)}</span>
                  </TableCell>
                  <TableCell><TypeBadge type={detectTransactionType(r)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════ Tab: Belum Lengkap ═══════════════ */

function IncompleteTab({ kasData, globalWilayah }: { kasData: any[]; globalWilayah: string }) {
  const issues = useMemo(() => {
    const result: { row: any; issue: string; suggestion: string }[] = [];
    for (const r of kasData) {
      if (globalWilayah === '__minus' && r.balance >= 0) continue;
      if (globalWilayah && !globalWilayah.startsWith('__') && r.wilayah !== globalWilayah) continue;
      for (const p of detectIssues(r)) result.push({ row: r, issue: p, suggestion: getSuggestion(p) });
    }
    return result;
  }, [kasData, globalWilayah]);

  if (issues.length === 0) return (
    <Card className="shadow-sm border-0 shadow-black/[0.04]">
      <CardContent className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-2xl bg-emerald-50 p-5"><CheckCircle2 className="h-10 w-10 text-emerald-500" /></div>
        <h3 className="mt-5 text-lg font-bold">Semua transaksi lengkap</h3>
        <p className="mt-1 text-sm text-muted-foreground">Tidak ada data yang perlu diperbaiki.</p>
      </CardContent>
    </Card>
  );

  return (
    <Card className="shadow-sm border-0 shadow-black/[0.04]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[15px] font-semibold">Transaksi Belum Lengkap</CardTitle>
            <CardDescription className="text-xs">{issues.length} masalah ditemukan</CardDescription>
          </div>
          <Badge variant="destructive" className="text-xs">{issues.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[70vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b-2">
                <TableHead className={TH}>Tanggal</TableHead>
                <TableHead className={TH}>Wilayah</TableHead>
                <TableHead className={TH}>Masalah</TableHead>
                <TableHead className={TH}>Keterangan</TableHead>
                <TableHead className={cn(TH, 'text-right')}>Nominal</TableHead>
                <TableHead className={TH}>Saran</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.map((item, i) => (
                <TableRow key={i} className="hover:bg-muted/30">
                  <TableCell className="whitespace-nowrap text-sm">{fmtDate(item.row.date)}</TableCell>
                  <TableCell><WilayahBadge w={item.row.wilayah} /></TableCell>
                  <TableCell><Badge variant="warning" className="text-[10px]">{item.issue}</Badge></TableCell>
                  <TableCell className="text-sm max-w-[180px] truncate">{item.row.deskripsi || '-'}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-sm">
                    {rupiahFull(item.row.masuk > 0 ? item.row.masuk : item.row.keluar)}
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">{item.suggestion}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════ Insight Card ═══════════════ */

function InsightCard({ icon, iconBg, title, value, detail }: {
  icon: React.ReactNode; iconBg: string; title: string; value: string; detail: string;
}) {
  return (
    <Card className="shadow-sm border-0 shadow-black/[0.04] hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl shrink-0', iconBg)}>{icon}</div>
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
