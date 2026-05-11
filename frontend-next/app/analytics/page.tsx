'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { rupiah, kg, fmtDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import Loading from '@/components/Loading';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, TrendingUp, Users, Zap } from 'lucide-react';

/* ─── Types ─── */

interface Anomaly {
  severity: 'tinggi' | 'sedang' | 'rendah';
  type: string;
  description: string;
  date: string | null;
  wilayah: string;
  value: number;
}

/* ─── Detection helpers ─── */

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
          date: item.date,
          wilayah: item.wilayah,
          value: item.pricePerKg,
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
      date: p.date,
      wilayah: p.wilayah,
      value: Number(p.total),
    }));
}

function detectDuplicates(purchases: any[]): Anomaly[] {
  const seen: Record<string, any> = {};
  const dupes: Anomaly[] = [];
  for (const p of purchases) {
    const key = `${p.date}_${p.supplierId}_${p.total}_${p.qty}`;
    if (seen[key]) {
      dupes.push({
        severity: 'sedang',
        type: 'Duplikasi Potensial',
        description: `${p.supplier?.name || '-'}: ${rupiah(p.total)}, ${kg(p.qty)} — tanggal & nilai sama`,
        date: p.date,
        wilayah: p.wilayah,
        value: Number(p.total),
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
        date: null,
        wilayah: sup.wilayah,
        value: Number(pct),
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
      severity: 'rendah' as const,
      type: 'Operasional Besar',
      description: `${o.wilayah}: ${rupiah(o.jumlah)} — ${o.deskripsi}`,
      date: null,
      wilayah: o.wilayah,
      value: Number(o.jumlah),
    }));
}

/* ─── Severity badge mapping ─── */

const SEV_BADGE: Record<string, { variant: 'destructive' | 'warning' | 'info'; label: string }> = {
  tinggi: { variant: 'destructive', label: 'Tinggi' },
  sedang: { variant: 'warning', label: 'Sedang' },
  rendah: { variant: 'info', label: 'Rendah' },
};

/* ─── Page component ─── */

export default function AnalyticsPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('semua');
  const [sevFilter, setSevFilter] = useState('');

  useEffect(() => {
    Promise.all([
      api.getKas(),
      api.getOperasional(),
      api.getPurchases({ limit: 1000 }),
      api.getSuppliers(),
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
    return list;
  }, [anomalies, typeFilter, sevFilter]);

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of filtered) map[a.type] = (map[a.type] || 0) + 1;
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [filtered]);

  if (error) return <div className="flex items-center justify-center p-12 text-red-500">Error: {error}</div>;
  if (loading) return <Loading />;

  const kpis = [
    { label: 'Total Anomali', value: anomalies.length, sub: `${types.length} Jenis`, icon: Shield, color: 'text-violet-600 bg-violet-50' },
    { label: 'Severity Tinggi', value: tinggi, sub: tinggi > 0 ? 'Perlu Aksi' : 'Aman', icon: AlertTriangle, color: tinggi > 0 ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50' },
    { label: 'Severity Sedang', value: sedang, sub: 'Review', icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
    { label: 'Severity Rendah', value: rendah, sub: 'Info', icon: Zap, color: 'text-blue-600 bg-blue-50' },
    { label: 'Supplier Berisiko', value: anomalies.filter(a => a.type === 'Konsentrasi Supplier').length, sub: 'Konsentrasi', icon: Users, color: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Analytics — Deteksi Anomali</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Analisis otomatis untuk mendeteksi transaksi tidak wajar, duplikasi, dan pola mencurigakan.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={cn('flex items-center justify-center h-10 w-10 rounded-lg shrink-0', k.color)}>
                  <k.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{k.label}</p>
                  <p className="text-2xl font-bold tracking-tight">{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn(typeFilter === 'semua' && 'bg-primary text-primary-foreground hover:bg-primary/90')}
            onClick={() => setTypeFilter('semua')}
          >
            Semua
          </Button>
          {types.map(t => (
            <Button
              key={t}
              variant="outline"
              size="sm"
              className={cn(typeFilter === t && 'bg-primary text-primary-foreground hover:bg-primary/90')}
              onClick={() => setTypeFilter(t)}
            >
              {t}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Semua Level', value: '' },
            { label: 'Tinggi', value: 'tinggi' },
            { label: 'Sedang', value: 'sedang' },
            { label: 'Rendah', value: 'rendah' },
          ].map(s => (
            <Button
              key={s.value}
              variant="outline"
              size="sm"
              className={cn(sevFilter === s.value && 'bg-primary text-primary-foreground hover:bg-primary/90')}
              onClick={() => setSevFilter(s.value)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Anomaly Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-semibold">Tidak ada anomali ditemukan</p>
            <p className="text-sm text-muted-foreground mt-1">Semua data terlihat normal untuk filter ini.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Anomali Terdeteksi ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[70vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Wilayah</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Deskripsi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge variant={SEV_BADGE[a.severity].variant}>
                          {SEV_BADGE[a.severity].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{a.type}</Badge>
                      </TableCell>
                      <TableCell>
                        {a.wilayah ? (
                          <Badge variant={
                            a.wilayah.toLowerCase() === 'jatim' ? 'jatim'
                              : a.wilayah.toLowerCase() === 'jateng' ? 'jateng'
                              : a.wilayah.toLowerCase() === 'jabar' ? 'jabar'
                              : 'outline'
                          }>
                            {a.wilayah}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {a.date ? fmtDate(a.date) : '-'}
                      </TableCell>
                      <TableCell className="max-w-md">{a.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Insight Cards */}
      {byType.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {byType.map(([type, count]) => {
            const sevCounts = {
              tinggi: anomalies.filter(a => a.type === type && a.severity === 'tinggi').length,
              sedang: anomalies.filter(a => a.type === type && a.severity === 'sedang').length,
              rendah: anomalies.filter(a => a.type === type && a.severity === 'rendah').length,
            };
            const topColor = sevCounts.tinggi > 0
              ? 'text-red-600 bg-red-50'
              : sevCounts.sedang > 0
              ? 'text-amber-600 bg-amber-50'
              : 'text-emerald-600 bg-emerald-50';

            return (
              <Card key={type}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={cn('flex items-center justify-center h-10 w-10 rounded-lg shrink-0', topColor)}>
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{type}</p>
                      <p className="text-2xl font-bold tracking-tight">{count} <span className="text-sm font-normal text-muted-foreground">anomali</span></p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tinggi: {sevCounts.tinggi} | Sedang: {sevCounts.sedang} | Rendah: {sevCounts.rendah}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
