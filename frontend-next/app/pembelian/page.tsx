'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';
import { api } from '@/lib/api';
import { rupiahFull, kg, fmtDate, usd, idr, idrFull, num } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import Pagination from '@/components/Pagination';
import {
  Package, Ship, Weight, DollarSign, Loader2,
  Search, ArrowRight, TrendingUp, Banknote, Scale,
  Receipt, Globe, Wallet, CreditCard,
} from 'lucide-react';

Chart.register(...registerables);

type MainTab = 'semua' | 'lokal' | 'impor';
type ImportTab = 'ringkasan' | 'raw_material' | 'pembayaran' | 'semua_txn';

/* ============================================================
   Main Page
   ============================================================ */

export default function PembelianPage() {
  const [mainTab, setMainTab] = useState<MainTab>('semua');
  const [localData, setLocalData] = useState<any>(null);
  const [importData, setImportData] = useState<any>(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({ page: 1 });

  useEffect(() => {
    Promise.all([api.getPurchases(filters), api.getImport()])
      .then(([local, imp]) => { setLocalData(local); setImportData(imp); })
      .catch((e) => setError(e.message));
  }, []);

  const reloadLocal = useCallback((f: Record<string, any>) => {
    api.getPurchases(f).then(setLocalData);
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full border-destructive/50">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!localData || !importData) {
    return (
      <div className="flex items-center justify-center min-h-[400px] gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Memuat data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pembelian Bahan Baku</h2>
        <p className="text-muted-foreground mt-1">
          Pembelian lokal (Jatim, Jateng, Jabar) dan impor (India via Mr Islam &amp; Pak Ucup)
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="semua">Semua Pembelian</TabsTrigger>
          <TabsTrigger value="lokal">Lokal (Jatim/Jateng/Jabar)</TabsTrigger>
          <TabsTrigger value="impor">Impor (India)</TabsTrigger>
        </TabsList>

        <TabsContent value="semua">
          <SemuaTab localData={localData} importData={importData} setMainTab={setMainTab} />
        </TabsContent>
        <TabsContent value="lokal">
          <LokalTab data={localData} filters={filters} setFilters={setFilters} reloadLocal={reloadLocal} />
        </TabsContent>
        <TabsContent value="impor">
          <ImporTab data={importData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================================================
   Semua Tab — Overview of both local + import
   ============================================================ */

function SemuaTab({ localData, importData, setMainTab }: any) {
  const localCount = localData.pagination?.total ?? localData.data.length;
  const rmCount = importData.raw_materials.length;
  const totalKg = importData.raw_materials.reduce((s: number, r: any) => s + r.kg, 0);
  const ucup = importData.payments.filter((p: any) => p.desc.toLowerCase().includes('ucup'));
  const ucupIdr = ucup.reduce((s: number, p: any) => s + p.idr, 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStatCard
          icon={<Package className="h-4 w-4" />}
          iconColor="text-blue-600 bg-blue-50"
          label="Pembelian Lokal"
          value={`${localCount} transaksi`}
        />
        <KPIStatCard
          icon={<Ship className="h-4 w-4" />}
          iconColor="text-violet-600 bg-violet-50"
          label="Pembelian Impor"
          value={`${rmCount} pengiriman`}
        />
        <KPIStatCard
          icon={<Weight className="h-4 w-4" />}
          iconColor="text-emerald-600 bg-emerald-50"
          label="Total Impor (Kg)"
          value={kg(totalKg)}
          valueColor="text-emerald-600"
        />
        <KPIStatCard
          icon={<DollarSign className="h-4 w-4" />}
          iconColor="text-red-600 bg-red-50"
          label="Total Bayar Impor (IDR)"
          value={idr(ucupIdr)}
          valueColor="text-red-600"
        />
      </div>

      {/* Local Recent Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base font-semibold">Pembelian Lokal Terbaru</CardTitle>
            <CardDescription>10 transaksi terakhir</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setMainTab('lokal')}>
            Lihat Semua Lokal <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          <LocalTable data={localData.data.slice(0, 10)} />
        </CardContent>
      </Card>

      {/* Import Recent Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base font-semibold">Raw Material Impor India Terbaru</CardTitle>
            <CardDescription>10 pengiriman terakhir</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setMainTab('impor')}>
            Lihat Semua Impor <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Kg</TableHead>
                <TableHead className="text-right">Nilai USD</TableHead>
                <TableHead className="text-right">Harga/Kg</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importData.raw_materials.slice(-10).reverse().map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="whitespace-nowrap">{fmtDate(r.date)}</TableCell>
                  <TableCell>{r.desc}</TableCell>
                  <TableCell className="text-right font-semibold">{kg(r.kg)}</TableCell>
                  <TableCell className="text-right">{usd(r.usd)}</TableCell>
                  <TableCell className="text-right">{usd(r.kg > 0 ? r.usd / r.kg : 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
   Lokal Tab — Filtered local purchases
   ============================================================ */

function LokalTab({ data, filters, setFilters, reloadLocal }: any) {
  const handleFilter = (key: string, val: string) => {
    const f = { ...filters, [key]: val || undefined, page: 1 };
    setFilters(f);
    reloadLocal(f);
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              className="sm:w-48"
              value={filters.wilayah || ''}
              onChange={(e) => handleFilter('wilayah', e.target.value)}
            >
              <option value="">Semua Wilayah</option>
              {['Jatim', 'Jateng', 'Jabar'].map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </Select>
            <Select
              className="sm:w-56"
              value={filters.kategori || ''}
              onChange={(e) => handleFilter('kategori', e.target.value)}
            >
              <option value="">Semua Kategori</option>
              {['R Salon', 'Uk 6-8 / Retul', 'Remy', 'Lus', 'Brangkas', 'Lainnya'].map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="pt-6">
          <LocalTable data={data.data} />
        </CardContent>
      </Card>

      {/* Pagination */}
      {data.pagination && (
        <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
          <span className="text-sm text-muted-foreground">
            Hal {data.pagination.page} dari {data.pagination.pages} ({data.pagination.total} data)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.pagination.page <= 1}
              onClick={() => {
                const f = { ...filters, page: data.pagination.page - 1 };
                setFilters(f);
                reloadLocal(f);
              }}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.pagination.page >= data.pagination.pages}
              onClick={() => {
                const f = { ...filters, page: data.pagination.page + 1 };
                setFilters(f);
                reloadLocal(f);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Local Table — shared between Semua & Lokal tabs
   ============================================================ */

function LocalTable({ data }: { data: any[] }) {
  const wilayahVariant = (w: string) => {
    const lower = (w || '').toLowerCase();
    if (lower === 'jatim') return 'jatim' as const;
    if (lower === 'jateng') return 'jateng' as const;
    if (lower === 'jabar') return 'jabar' as const;
    return 'secondary' as const;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tanggal</TableHead>
          <TableHead>Supplier</TableHead>
          <TableHead>Wilayah</TableHead>
          <TableHead>Jenis</TableHead>
          <TableHead>Kategori</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Harga</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((p: any, i: number) => (
          <TableRow key={i}>
            <TableCell className="whitespace-nowrap">{fmtDate(p.date)}</TableCell>
            <TableCell className="font-medium">{p.supplier?.name ?? '-'}</TableCell>
            <TableCell>
              <Badge variant={wilayahVariant(p.wilayah)}>{p.wilayah}</Badge>
            </TableCell>
            <TableCell>{p.jenis}</TableCell>
            <TableCell>{p.kategori}</TableCell>
            <TableCell className="text-right">{kg(p.qty)}</TableCell>
            <TableCell className="text-right">{rupiahFull(p.price)}</TableCell>
            <TableCell className="text-right font-semibold">{rupiahFull(p.total)}</TableCell>
          </TableRow>
        ))}
        {data.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
              Tidak ada data pembelian
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

/* ============================================================
   Impor Tab — import section with sub-tabs
   ============================================================ */

function ImporTab({ data }: { data: any }) {
  const [tab, setTab] = useState<ImportTab>('ringkasan');

  return (
    <div className="space-y-6">
      <ImportKPI data={data} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as ImportTab)}>
        <TabsList>
          <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
          <TabsTrigger value="raw_material">Raw Material</TabsTrigger>
          <TabsTrigger value="pembayaran">Pembayaran Pak Ucup</TabsTrigger>
          <TabsTrigger value="semua_txn">Semua Transaksi</TabsTrigger>
        </TabsList>

        <TabsContent value="ringkasan">
          <ImportRingkasan data={data} />
        </TabsContent>
        <TabsContent value="raw_material">
          <ImportRawMaterial data={data} />
        </TabsContent>
        <TabsContent value="pembayaran">
          <ImportPembayaran data={data} />
        </TabsContent>
        <TabsContent value="semua_txn">
          <ImportSemuaTxn data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================================================
   Import KPI Cards
   ============================================================ */

function ImportKPI({ data }: { data: any }) {
  const rm = data.raw_materials;
  const totalKg = rm.reduce((s: number, r: any) => s + r.kg, 0);
  const totalUsd = rm.reduce((s: number, r: any) => s + r.usd, 0);
  const ucup = data.payments.filter((p: any) => p.desc.toLowerCase().includes('ucup'));
  const ucupIdr = ucup.reduce((s: number, p: any) => s + p.idr, 0);
  const ucupUsd = ucup.reduce((s: number, p: any) => s + p.usd, 0);
  const lastBal = data.balance_timeline[data.balance_timeline.length - 1]?.bal ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <KPIStatCard
        icon={<Weight className="h-4 w-4" />}
        iconColor="text-emerald-600 bg-emerald-50"
        label="Total Bahan Baku India"
        value={kg(totalKg)}
        sub={`${rm.length} pengiriman`}
      />
      <KPIStatCard
        icon={<DollarSign className="h-4 w-4" />}
        iconColor="text-blue-600 bg-blue-50"
        label="Nilai Raw Material"
        value={usd(totalUsd)}
        sub={`Avg ${usd(totalUsd / totalKg)}/Kg`}
      />
      <KPIStatCard
        icon={<Banknote className="h-4 w-4" />}
        iconColor="text-red-600 bg-red-50"
        label="Total Bayar Pak Ucup"
        value={idr(ucupIdr)}
        valueColor="text-red-600"
        sub={`${ucup.length} transaksi`}
      />
      <KPIStatCard
        icon={<CreditCard className="h-4 w-4" />}
        iconColor="text-violet-600 bg-violet-50"
        label="Setara USD Dibayar"
        value={usd(ucupUsd)}
        sub={`Kurs avg ~Rp ${num(Math.round(ucupIdr / ucupUsd))}`}
      />
      <KPIStatCard
        icon={<Scale className="h-4 w-4" />}
        iconColor="text-amber-600 bg-amber-50"
        label="Balance Mr Islam"
        value={usd(lastBal)}
        sub="Sisa hutang saat ini"
      />
      <KPIStatCard
        icon={<Wallet className="h-4 w-4" />}
        iconColor="text-pink-600 bg-pink-50"
        label="Fee Pak Eka"
        value={usd(data.account.fee_pak_eka_usd)}
        sub="2x fee"
      />
    </div>
  );
}

/* ============================================================
   Import Ringkasan — charts + recent transactions
   ============================================================ */

function ImportRingkasan({ data }: { data: any }) {
  const chartsRef = useRef<Record<string, Chart>>({});

  useEffect(() => {
    Object.values(chartsRef.current).forEach((c) => c.destroy());
    chartsRef.current = {};

    const c1 = document.getElementById('import-chart-balance') as HTMLCanvasElement;
    const c2 = document.getElementById('import-chart-rm') as HTMLCanvasElement;
    const c3 = document.getElementById('import-chart-ucup') as HTMLCanvasElement;
    if (!c1 || !c2 || !c3) return;

    const tl = data.balance_timeline;
    chartsRef.current.balance = new Chart(c1, {
      type: 'line',
      data: {
        labels: tl.map((b: any) => b.date.slice(2)),
        datasets: [{
          label: 'Balance USD',
          data: tl.map((b: any) => b.bal),
          borderColor: '#06B6D4',
          backgroundColor: 'rgba(6,182,212,.08)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { maxRotation: 45, font: { size: 9 } }, grid: { display: false } },
          y: { ticks: { callback: (v: any) => '$' + (v / 1000).toFixed(0) + 'k' } },
        },
      },
    });

    const rmByMonth: Record<string, number> = {};
    data.raw_materials.forEach((r: any) => {
      const m = r.date.slice(0, 7);
      rmByMonth[m] = (rmByMonth[m] || 0) + r.kg;
    });
    const rmMonths = Object.keys(rmByMonth).sort();
    chartsRef.current.rm = new Chart(c2, {
      type: 'bar',
      data: {
        labels: rmMonths.map((m) => m.slice(2)),
        datasets: [{
          label: 'Kg',
          data: rmMonths.map((m) => rmByMonth[m]),
          backgroundColor: '#10B981',
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { font: { size: 9 } }, grid: { display: false } } },
      },
    });

    const ucupByMonth: Record<string, number> = {};
    data.payments
      .filter((p: any) => p.desc.toLowerCase().includes('ucup'))
      .forEach((p: any) => {
        const m = p.date.slice(0, 7);
        ucupByMonth[m] = (ucupByMonth[m] || 0) + p.idr;
      });
    const ucupMonths = Object.keys(ucupByMonth).sort();
    chartsRef.current.ucup = new Chart(c3, {
      type: 'bar',
      data: {
        labels: ucupMonths.map((m) => m.slice(2)),
        datasets: [{
          label: 'IDR',
          data: ucupMonths.map((m) => ucupByMonth[m]),
          backgroundColor: '#8B5CF6',
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { font: { size: 9 } }, grid: { display: false } },
          y: { ticks: { callback: (v: any) => 'Rp ' + (v / 1e9).toFixed(0) + 'M' } },
        },
      },
    });

    return () => {
      Object.values(chartsRef.current).forEach((c) => c.destroy());
    };
  }, [data]);

  const recent = [...data.payments].reverse().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Balance Chart — full width */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Balance USD Mr Islam (Timeline)</CardTitle>
        </CardHeader>
        <CardContent>
          <canvas id="import-chart-balance" />
        </CardContent>
      </Card>

      {/* Two charts side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Raw Material per Bulan (Kg)</CardTitle>
          </CardHeader>
          <CardContent>
            <canvas id="import-chart-rm" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Pembayaran Pak Ucup per Bulan (IDR)</CardTitle>
          </CardHeader>
          <CardContent>
            <canvas id="import-chart-ucup" />
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">10 Transaksi Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">IDR</TableHead>
                <TableHead className="text-right">Kurs</TableHead>
                <TableHead className="text-right">USD</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((p: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="whitespace-nowrap">{fmtDate(p.date)}</TableCell>
                  <TableCell>{p.desc}</TableCell>
                  <TableCell className="text-right">{idrFull(p.idr)}</TableCell>
                  <TableCell className="text-right">{p.kurs > 0 ? num(p.kurs) : '-'}</TableCell>
                  <TableCell className="text-right">{usd(p.usd)}</TableCell>
                  <TableCell className="text-right font-semibold">{usd(p.bal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
   Import Raw Material — searchable raw material list
   ============================================================ */

function ImportRawMaterial({ data }: { data: any }) {
  const [q, setQ] = useState('');
  const rm = data.raw_materials.filter(
    (r: any) => !q || r.desc.toLowerCase().includes(q) || r.date.includes(q)
  );
  const totalKg = rm.reduce((s: number, r: any) => s + r.kg, 0);
  const totalUsd = rm.reduce((s: number, r: any) => s + r.usd, 0);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          type="text"
          placeholder="Cari pengiriman..."
          value={q}
          onChange={(e) => setQ(e.target.value.toLowerCase())}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPIStatCard
          icon={<Ship className="h-4 w-4" />}
          iconColor="text-blue-600 bg-blue-50"
          label="Total Pengiriman"
          value={`${rm.length} shipment`}
        />
        <KPIStatCard
          icon={<Weight className="h-4 w-4" />}
          iconColor="text-emerald-600 bg-emerald-50"
          label="Total Kg"
          value={kg(totalKg)}
          valueColor="text-emerald-600"
        />
        <KPIStatCard
          icon={<DollarSign className="h-4 w-4" />}
          iconColor="text-violet-600 bg-violet-50"
          label="Total Nilai"
          value={usd(totalUsd)}
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">
            Detail Penerimaan Raw Material India ({rm.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Kg</TableHead>
                <TableHead className="text-right">Nilai USD</TableHead>
                <TableHead className="text-right">Harga/Kg</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rm.map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="whitespace-nowrap">{fmtDate(r.date)}</TableCell>
                  <TableCell>{r.desc}</TableCell>
                  <TableCell className="text-right font-semibold">{kg(r.kg)}</TableCell>
                  <TableCell className="text-right">{usd(r.usd)}</TableCell>
                  <TableCell className="text-right">{usd(r.kg > 0 ? r.usd / r.kg : 0)}</TableCell>
                </TableRow>
              ))}
              {/* Total Row */}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell>TOTAL</TableCell>
                <TableCell>{rm.length} pengiriman</TableCell>
                <TableCell className="text-right text-emerald-600">{kg(totalKg)}</TableCell>
                <TableCell className="text-right">{usd(totalUsd)}</TableCell>
                <TableCell className="text-right">{usd(totalKg > 0 ? totalUsd / totalKg : 0)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
   Import Pembayaran — Pak Ucup payments
   ============================================================ */

function ImportPembayaran({ data }: { data: any }) {
  const [q, setQ] = useState('');
  const all = data.payments.filter((p: any) => p.desc.toLowerCase().includes('ucup'));
  const rows = all.filter(
    (p: any) => !q || p.desc.toLowerCase().includes(q) || p.date.includes(q)
  );
  const totalIdr = rows.reduce((s: number, p: any) => s + p.idr, 0);
  const totalUsd = rows.reduce((s: number, p: any) => s + p.usd, 0);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          type="text"
          placeholder="Cari pembayaran..."
          value={q}
          onChange={(e) => setQ(e.target.value.toLowerCase())}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStatCard
          icon={<Receipt className="h-4 w-4" />}
          iconColor="text-blue-600 bg-blue-50"
          label="Total Transaksi"
          value={`${rows.length}x`}
        />
        <KPIStatCard
          icon={<Banknote className="h-4 w-4" />}
          iconColor="text-red-600 bg-red-50"
          label="Total IDR"
          value={idr(totalIdr)}
          valueColor="text-red-600"
        />
        <KPIStatCard
          icon={<DollarSign className="h-4 w-4" />}
          iconColor="text-violet-600 bg-violet-50"
          label="Total USD"
          value={usd(totalUsd)}
        />
        <KPIStatCard
          icon={<TrendingUp className="h-4 w-4" />}
          iconColor="text-amber-600 bg-amber-50"
          label="Kurs Rata-rata"
          value={`Rp ${num(Math.round(totalIdr / totalUsd))}`}
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">
            Detail Pembayaran Pak Ucup ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">IDR</TableHead>
                <TableHead className="text-right">Kurs</TableHead>
                <TableHead className="text-right">USD</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Tipe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p: any, i: number) => {
                const isTax = p.desc.toLowerCase().includes('tax');
                return (
                  <TableRow key={i}>
                    <TableCell className="whitespace-nowrap">{fmtDate(p.date)}</TableCell>
                    <TableCell>{p.desc}</TableCell>
                    <TableCell className="text-right text-red-600 font-medium">
                      {idrFull(p.idr)}
                    </TableCell>
                    <TableCell className="text-right">{p.kurs > 0 ? num(p.kurs) : '-'}</TableCell>
                    <TableCell className="text-right">{usd(p.usd)}</TableCell>
                    <TableCell className="text-right font-semibold">{usd(p.bal)}</TableCell>
                    <TableCell>
                      <Badge variant={isTax ? 'warning' : 'success'}>
                        {isTax ? 'Tax' : 'Payment'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Tidak ada data pembayaran
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
   Import Semua Transaksi — all Mr Islam account transactions
   ============================================================ */

function ImportSemuaTxn({ data }: { data: any }) {
  const [q, setQ] = useState('');
  const rows = data.payments.filter(
    (p: any) => !q || p.desc.toLowerCase().includes(q) || p.date.includes(q)
  );

  const getTxnBadge = (desc: string): { variant: 'success' | 'destructive' | 'warning' | 'secondary'; label: string } => {
    const dl = desc.toLowerCase();
    if (dl.includes('tax')) return { variant: 'warning', label: 'Tax' };
    if (dl.includes('ucup')) return { variant: 'success', label: 'Pak Ucup' };
    if (dl.includes('transfer') && !dl.includes('ucup')) return { variant: 'destructive', label: 'Transfer' };
    return { variant: 'secondary', label: 'Lainnya' };
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          type="text"
          placeholder="Cari transaksi..."
          value={q}
          onChange={(e) => setQ(e.target.value.toLowerCase())}
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">
            Semua Transaksi Account Mr Islam ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">IDR</TableHead>
                <TableHead className="text-right">Kurs</TableHead>
                <TableHead className="text-right">USD</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Tipe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p: any, i: number) => {
                const badge = getTxnBadge(p.desc);
                return (
                  <TableRow key={i}>
                    <TableCell className="whitespace-nowrap">{fmtDate(p.date)}</TableCell>
                    <TableCell>{p.desc}</TableCell>
                    <TableCell className="text-right">{idrFull(p.idr)}</TableCell>
                    <TableCell className="text-right">{p.kurs > 0 ? num(p.kurs) : '-'}</TableCell>
                    <TableCell className="text-right">{usd(p.usd)}</TableCell>
                    <TableCell className="text-right font-semibold">{usd(p.bal)}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Tidak ada data transaksi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
   Shared KPI Stat Card
   ============================================================ */

function KPIStatCard({
  icon,
  iconColor,
  label,
  value,
  valueColor,
  sub,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <div className={cn('rounded-lg p-2', iconColor)}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
            <p className={cn('text-lg font-bold tracking-tight mt-0.5', valueColor)}>
              {value}
            </p>
            {sub && (
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
