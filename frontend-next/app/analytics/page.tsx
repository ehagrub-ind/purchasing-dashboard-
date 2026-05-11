'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { rupiah, kg, fmtDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PageSkeleton } from '@/components/Skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Shield, AlertTriangle, TrendingUp, Users, Zap, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const TH = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

interface Anomaly {
  severity: 'tinggi' | 'sedang' | 'rendah';
  type: string;
  description: string;
  date: string | null;
  wilayah: string;
  value: number;
}

/* ═══════════════ Detection Helpers ═══════════════ */

function iqrOutliers(values: number[]) {
  if (values.length < 4) return { low: -Infinity, high: Infinity, iqr: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  return { low: q1 - 1.5 * iqr, high: q3 + 1.5 * iqr, iqr };
}

function mean(values: number[]) {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function detectPriceAnomalies(purchases: any[]): Anomaly[] {
  const byKategori: Record<string, any[]> = {};
  for (const p of purchases) {
    const price = Number(p.price);
    if (!price || price <= 0) continue;
    const kat = p.kategori || 'Lainnya';
    if (!byKategori[kat]) byKategori[kat] = [];
    byKategori[kat].push({ ...p, pricePerKg: price });
  }
  const anomalies: Anomaly[] = [];
  for (const [kat, items] of Object.entries(byKategori)) {
    if (items.length < 4) continue;
    const prices = items.map(i => i.pricePerKg);
    const bounds = iqrOutliers(prices);
    const avg = mean(prices);
    for (const item of items) {
      if (item.pricePerKg < bounds.low || item.pricePerKg > bounds.high) {
        const pct = ((item.pricePerKg - avg) / avg * 100).toFixed(0);
        anomalies.push({
          severity: Math.abs(Number(pct)) > 100 ? 'tinggi' : 'sedang',
          type: 'Harga Tidak Wajar',
          description: `${item.supplier?.name || '-'} — ${kat}: ${rupiah(item.price)}/kg (avg ${rupiah(avg)}/kg, ${Number(pct) > 0 ? '+' : ''}${pct}%)`,
          date: item.date, wilayah: item.wilayah, value: item.pricePerKg,
        });
      }
    }
  }
  return anomalies;
}

function detectAmountOutliers(purchases: any[]): Anomaly[] {
  const totals = purchases.map(p => Number(p.total)).filter(v => v > 0);
  if (totals.length < 4) return [];
  const bounds = iqrOutliers(totals);
  const avg = mean(totals);
  return purchases
    .filter(p => Number(p.total) > bounds.high)
    .map(p => ({
      severity: (Number(p.total) > bounds.high + bounds.iqr ? 'tinggi' : 'sedang') as Anomaly['severity'],
      type: 'Nilai Transaksi Besar',
      description: `${p.supplier?.name || '-'}: ${rupiah(p.total)} (avg ${rupiah(avg)})`,
      date: p.date, wilayah: p.wilayah, value: Number(p.total),
    }));
}

function detectDuplicates(purchases: any[]): Anomaly[] {
  const seen: Record<string, any> = {};
  const dupes: Anomaly[] = [];
  for (const p of purchases) {
    const key = `${p.date}_${p.supplierId}_${p.total}_${p.qty}`;
    if (seen[key]) {
      dupes.push({
        severity: 'sedang', type: 'Duplikasi Potensial',
        description: `${p.supplier?.name || '-'}: ${rupiah(p.total)}, ${kg(p.qty)} — tanggal & nilai sama`,
        date: p.date, wilayah: p.wilayah, value: Number(p.total),
      });
    }
    seen[key] = p;
  }
  return dupes;
}

function detectKasAnomalies(kasData: any[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const masukVals = kasData.filter(r => r.masuk > 0).map(r => Number(r.masuk));
  const keluarVals = kasData.filter(r => r.keluar > 0).map(r => Number(r.keluar));
  const masukBounds = iqrOutliers(masukVals);
  const keluarBounds = iqrOutliers(keluarVals);
  for (const r of kasData) {
    if (r.masuk > 0 && Number(r.masuk) > masukBounds.high) {
      anomalies.push({ severity: 'sedang', type: 'Kas Masuk Besar', description: `${r.wilayah}: ${rupiah(r.masuk)} — ${r.deskripsi || 'tanpa keterangan'}`, date: r.date, wilayah: r.wilayah, value: Number(r.masuk) });
    }
    if (r.keluar > 0 && Number(r.keluar) > keluarBounds.high) {
      anomalies.push({ severity: 'sedang', type: 'Kas Keluar Besar', description: `${r.wilayah}: ${rupiah(r.keluar)} — ${r.deskripsi || 'tanpa keterangan'}`, date: r.date, wilayah: r.wilayah, value: Number(r.keluar) });
    }
    if (Number(r.balance) < 0) {
      anomalies.push({ severity: 'tinggi', type: 'Saldo Minus', description: `${r.wilayah}: saldo ${rupiah(r.balance)} setelah "${r.deskripsi || '-'}"`, date: r.date, wilayah: r.wilayah, value: Number(r.balance) });
    }
    if (!r.deskripsi || r.deskripsi.trim() === '') {
      anomalies.push({ severity: 'rendah', type: 'Keterangan Kosong', description: `${r.wilayah}: transaksi tanpa keterangan (masuk: ${rupiah(r.masuk)}, keluar: ${rupiah(r.keluar)})`, date: r.date, wilayah: r.wilayah, value: 0 });
    }
  }
  return anomalies;
}

function detectSupplierConcentration(suppliers: any[]): Anomaly[] {
  const totalKgVal = suppliers.reduce((s: number, sup: any) => s + Number(sup.total_kg || 0), 0);
  if (totalKgVal === 0) return [];
  return suppliers
    .filter((sup: any) => (Number(sup.total_kg) / totalKgVal) > 0.3)
    .map((sup: any) => {
      const pct = ((Number(sup.total_kg) / totalKgVal) * 100).toFixed(1);
      return {
        severity: (Number(pct) > 50 ? 'tinggi' : 'sedang') as Anomaly['severity'],
        type: 'Konsentrasi Supplier',
        description: `${sup.name} (${sup.wilayah}): ${pct}% dari total volume (${kg(sup.total_kg)})`,
        date: null, wilayah: sup.wilayah, value: Number(pct),
      };
    });
}

function detectOperasionalAnomalies(opData: any[]): Anomaly[] {
  const vals = opData.map((o: any) => Number(o.jumlah)).filter(v => v > 0);
  if (vals.length < 4) return [];
  const bounds = iqrOutliers(vals);
  return opData
    .filter((o: any) => Number(o.jumlah) > bounds.high)
    .map((o: any) => ({
      severity: 'rendah' as const, type: 'Operasional Besar',
      description: `${o.wilayah}: ${rupiah(o.jumlah)} — ${o.deskripsi}`,
      date: null, wilayah: o.wilayah, value: Number(o.jumlah),
    }));
}

/* ═══════════════ Severity Config ═══════════════ */

const SEV_CONFIG: Record<string, { variant: 'destructive' | 'warning' | 'info'; label: string; gradient: string; icon: React.ReactNode }> = {
  tinggi: { variant: 'destructive', label: 'Tinggi', gradient: 'gradient-card-pink', icon: <AlertTriangle className="h-5 w-5" /> },
  sedang: { variant: 'warning', label: 'Sedang', gradient: 'gradient-card-orange', icon: <TrendingUp className="h-5 w-5" /> },
  rendah: { variant: 'info', label: 'Rendah', gradient: 'gradient-card-blue', icon: <Zap className="h-5 w-5" /> },
};

/* ═══════════════ Page Component ═══════════════ */

export default function AnalyticsPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('semua');
  const [sevFilter, setSevFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      api.getKas(), api.getOperasional(),
      api.getPurchases({ limit: 1000 }), api.getSuppliers(),
    ]).then(([kas, op, purchData, suppliers]) => {
      const all = [
        ...detectPriceAnomalies(purchData.data || []),
        ...detectAmountOutliers(purchData.data || []),
        ...detectDuplicates(purchData.data || []),
        ...detectKasAnomalies(kas.data || []),
        ...detectSupplierConcentration(suppliers || []),
        ...detectOperasionalAnomalies(op.data || []),
      ];
      const sevOrder: Record<string, number> = { tinggi: 0, sedang: 1, rendah: 2 };
      all.sort((a, b) => (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2));
      setAnomalies(all);
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const tinggi = anomalies.filter(a => a.severity === 'tinggi').length;
  const sedang = anomalies.filter(a => a.severity === 'sedang').length;
  const rendah = anomalies.filter(a => a.severity === 'rendah').length;
  const types = useMemo(() => [...new Set(anomalies.map(a => a.type))], [anomalies]);

  const filtered = useMemo(() => {
    let list = anomalies;
    if (typeFilter !== 'semua') list = list.filter(a => a.type === typeFilter);
    if (sevFilter) list = list.filter(a => a.severity === sevFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(a => a.description.toLowerCase().includes(s) || a.wilayah.toLowerCase().includes(s));
    }
    return list;
  }, [anomalies, typeFilter, sevFilter, search]);

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of anomalies) map[a.type] = (map[a.type] || 0) + 1;
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [anomalies]);

  if (error) return <div className="flex items-center justify-center p-12 text-destructive font-medium">Error: {error}</div>;
  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics — Deteksi Anomali</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Analisis otomatis untuk mendeteksi transaksi tidak wajar, duplikasi, dan pola mencurigakan</p>
      </div>

      {/* Gradient KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <GradientKPI gradient="gradient-card-purple" icon={<Shield className="h-5 w-5" />} label="Total Anomali" value={String(anomalies.length)} sub={`${types.length} jenis`} />
        <GradientKPI gradient={tinggi > 0 ? 'gradient-card-pink' : 'gradient-card-emerald'} icon={<AlertTriangle className="h-5 w-5" />} label="Severity Tinggi" value={String(tinggi)} sub={tinggi > 0 ? 'Perlu aksi' : 'Aman'} />
        <GradientKPI gradient="gradient-card-orange" icon={<TrendingUp className="h-5 w-5" />} label="Severity Sedang" value={String(sedang)} sub="Review" />
        <GradientKPI gradient="gradient-card-blue" icon={<Zap className="h-5 w-5" />} label="Severity Rendah" value={String(rendah)} sub="Info" />
        <GradientKPI gradient="gradient-card-emerald" icon={<Users className="h-5 w-5" />} label="Supplier Berisiko" value={String(anomalies.filter(a => a.type === 'Konsentrasi Supplier').length)} sub="Konsentrasi" />
      </div>

      {/* Tinggi Warning Banner */}
      {tinggi > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5">
          <div className="rounded-xl bg-red-100 p-2"><AlertTriangle className="h-4 w-4 text-red-600" /></div>
          <p className="text-sm text-red-800">
            <strong>{tinggi} anomali severity tinggi</strong> terdeteksi — perlu dicek segera: saldo minus, harga ekstrem, atau konsentrasi supplier.
          </p>
        </div>
      )}

      {/* Insight Cards — by Type */}
      {byType.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {byType.map(([type, count]) => {
            const sevCounts = {
              tinggi: anomalies.filter(a => a.type === type && a.severity === 'tinggi').length,
              sedang: anomalies.filter(a => a.type === type && a.severity === 'sedang').length,
              rendah: anomalies.filter(a => a.type === type && a.severity === 'rendah').length,
            };
            const topSev = sevCounts.tinggi > 0 ? 'tinggi' : sevCounts.sedang > 0 ? 'sedang' : 'rendah';
            const isActive = typeFilter === type;
            return (
              <button key={type} onClick={() => setTypeFilter(isActive ? 'semua' : type)}
                className={cn(
                  'rounded-2xl border p-4 text-left transition-all hover:shadow-md',
                  isActive ? 'ring-2 ring-primary border-primary bg-primary/5' : 'hover:border-primary/30'
                )}
              >
                <div className={cn('inline-flex items-center justify-center h-8 w-8 rounded-lg mb-2',
                  topSev === 'tinggi' ? 'bg-red-100 text-red-600' : topSev === 'sedang' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                )}>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <p className="text-[11px] font-medium text-muted-foreground truncate">{type}</p>
                <p className="text-xl font-bold tracking-tight mt-0.5">{count}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          {[
            { label: 'Semua Level', value: '' },
            { label: 'Tinggi', value: 'tinggi' },
            { label: 'Sedang', value: 'sedang' },
            { label: 'Rendah', value: 'rendah' },
          ].map(s => (
            <button key={s.value} onClick={() => setSevFilter(s.value)}
              className={cn('rounded-full px-4 py-1.5 text-[13px] font-medium transition-all',
                sevFilter === s.value ? 'bg-primary text-white shadow-md shadow-primary/25' : 'bg-white border text-muted-foreground hover:bg-muted/50'
              )}>{s.label}</button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari anomali..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Anomaly Table */}
      {filtered.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <Shield className="h-7 w-7 text-emerald-500" />
            </div>
            <p className="font-semibold text-muted-foreground">Tidak ada anomali ditemukan</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Semua data terlihat normal untuk filter ini</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Anomali Terdeteksi</CardTitle>
                <CardDescription className="text-xs">{filtered.length} dari {anomalies.length} anomali</CardDescription>
              </div>
              {typeFilter !== 'semua' && (
                <button onClick={() => setTypeFilter('semua')} className="text-[12px] font-medium text-primary hover:underline">
                  Reset filter tipe
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[65vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2">
                    <TableHead className={TH}>Severity</TableHead>
                    <TableHead className={TH}>Tipe</TableHead>
                    <TableHead className={TH}>Wilayah</TableHead>
                    <TableHead className={TH}>Tanggal</TableHead>
                    <TableHead className={TH}>Deskripsi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a, i) => (
                    <TableRow key={i} className="hover:bg-muted/30">
                      <TableCell>
                        <Badge variant={SEV_CONFIG[a.severity].variant}>{SEV_CONFIG[a.severity].label}</Badge>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-[11px]">{a.type}</Badge></TableCell>
                      <TableCell>
                        {a.wilayah ? (
                          <Badge variant={
                            a.wilayah.toLowerCase() === 'jatim' ? 'jatim'
                              : a.wilayah.toLowerCase() === 'jateng' ? 'jateng'
                              : a.wilayah.toLowerCase() === 'jabar' ? 'jabar'
                              : 'secondary'
                          }>{a.wilayah}</Badge>
                        ) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                        {a.date ? fmtDate(a.date) : '-'}
                      </TableCell>
                      <TableCell className="text-sm max-w-md">{a.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
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
