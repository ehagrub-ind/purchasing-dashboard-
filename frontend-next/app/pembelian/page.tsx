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
import { Combobox } from '@/components/ui/combobox';
import Pagination from '@/components/Pagination';
import {
  Package, Ship, Weight, DollarSign, Loader2,
  Search, ArrowRight, TrendingUp, Banknote, Scale,
  Receipt, Globe, Wallet, CreditCard,
  Plus, X, ShoppingCart, FileText, CheckCircle2,
  AlertTriangle, Calendar, MapPin, Tag, Hash,
  User, Truck, Plane, ClipboardPaste, Trash2, Edit3,
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
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [masterBahan, setMasterBahan] = useState<any[]>([]);
  const [masterUkuran, setMasterUkuran] = useState<any[]>([]);
  const [masterWarna, setMasterWarna] = useState<any[]>([]);
  const [masterWilayah, setMasterWilayah] = useState<any[]>([]);
  const [masterPIC, setMasterPIC] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({ page: 1 });
  const [showPOModal, setShowPOModal] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getPurchases(filters),
      api.getImport(),
      api.getSuppliers(),
      api.getMasterBahan({ aktif: 'true' }),
      api.getUkuran({ aktif: 'true' }),
      api.getWarna({ aktif: 'true' }),
      api.getWilayah({ aktif: 'true' }),
      api.getPIC({ aktif: 'true' }),
    ])
      .then(([local, imp, sup, mb, uk, wr, wil, pic]) => {
        setLocalData(local); setImportData(imp); setSuppliers(sup);
        setMasterBahan(mb); setMasterUkuran(uk); setMasterWarna(wr);
        setMasterWilayah(wil); setMasterPIC(pic);
      })
      .catch((e) => setError(e.message));
  }, []);

  const reloadLocal = useCallback((f: Record<string, any>) => {
    api.getPurchases(f).then(setLocalData);
  }, []);

  function handlePOCreated() {
    setShowPOModal(false);
    reloadLocal(filters);
  }

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
      {/* PO Modal */}
      {showPOModal && (
        <BuatPOModal
          suppliers={suppliers}
          masterBahan={masterBahan}
          masterUkuran={masterUkuran}
          masterWarna={masterWarna}
          masterWilayah={masterWilayah}
          masterPIC={masterPIC}
          onClose={() => setShowPOModal(false)}
          onCreated={handlePOCreated}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pembelian Bahan Baku</h2>
          <p className="text-muted-foreground mt-1">
            Pembelian lokal (Jawa Timur, Jawa Tengah, Jawa Barat, Sumatra) dan impor (India)
          </p>
        </div>
        <Button onClick={() => setShowPOModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Buat PO Baru
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="semua">Semua Pembelian</TabsTrigger>
          <TabsTrigger value="lokal">Lokal</TabsTrigger>
          <TabsTrigger value="impor">Impor (India)</TabsTrigger>
        </TabsList>

        <TabsContent value="semua">
          <SemuaTab localData={localData} importData={importData} setMainTab={setMainTab} />
        </TabsContent>
        <TabsContent value="lokal">
          <LokalTab data={localData} filters={filters} setFilters={setFilters} reloadLocal={reloadLocal} masterBahan={masterBahan} masterWilayah={masterWilayah} />
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

      {/* 2 Kartu Besar — Lokal & Impor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => setMainTab('lokal')}
          className="group relative overflow-hidden rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-8 text-left transition-all hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100"
        >
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-blue-100 opacity-50 transition-transform group-hover:scale-150" />
          <div className="relative space-y-4">
            <div className="inline-flex items-center justify-center rounded-lg bg-blue-100 p-3">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Pembelian Lokal</h3>
              <p className="mt-1 text-sm text-muted-foreground">Jawa Timur, Jawa Tengah, Jawa Barat, Sumatra</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-blue-600">{localCount}</span>
              <span className="text-sm text-muted-foreground">transaksi</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
              Lihat Detail <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </button>

        <button
          onClick={() => setMainTab('impor')}
          className="group relative overflow-hidden rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-8 text-left transition-all hover:border-violet-400 hover:shadow-lg hover:shadow-violet-100"
        >
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-violet-100 opacity-50 transition-transform group-hover:scale-150" />
          <div className="relative space-y-4">
            <div className="inline-flex items-center justify-center rounded-lg bg-violet-100 p-3">
              <Plane className="h-8 w-8 text-violet-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Pembelian Impor</h3>
              <p className="mt-1 text-sm text-muted-foreground">India — Mr Islam & Pak Ucup</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-violet-600">{rmCount}</span>
              <span className="text-sm text-muted-foreground">pengiriman &middot; {kg(totalKg)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-violet-600">
              Lihat Detail <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Lokal Tab — Filtered local purchases
   ============================================================ */

function LokalTab({ data, filters, setFilters, reloadLocal, masterBahan, masterWilayah }: any) {
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
              {(masterWilayah || []).filter((w: any) => w.nama_wilayah !== 'India').map((w: any) => (
                <option key={w.id} value={w.nama_wilayah}>{w.nama_wilayah}</option>
              ))}
            </Select>
            <Select
              className="sm:w-48"
              value={filters.jenis || ''}
              onChange={(e) => handleFilter('jenis', e.target.value)}
            >
              <option value="">Semua Bahan</option>
              {(masterBahan || []).map((b: any) => (
                <option key={b.id} value={b.nama_bahan}>{b.nama_bahan}</option>
              ))}
            </Select>
            <Select
              className="sm:w-56"
              value={filters.kategori || ''}
              onChange={(e) => handleFilter('kategori', e.target.value)}
            >
              <option value="">Semua Kategori</option>
              <option value="Bahan Baku">Bahan Baku</option>
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

function kategoriBahanVariant(k: string) {
  const lower = (k || '').toLowerCase();
  if (/bahan baku|brangkas|remy|kritingan/.test(lower)) return 'success' as const;
  if (/bahan proses|lus|retulan|cucian/.test(lower)) return 'purple' as const;
  if (/recycle|wip|sadur/.test(lower)) return 'warning' as const;
  return 'secondary' as const;
}

function LocalTable({ data }: { data: any[] }) {
  const wilayahVariant = (w: string) => {
    const lower = (w || '').toLowerCase();
    const map: Record<string, string> = {
      'jawa timur': 'jawa timur', 'jatim': 'jawa timur',
      'jawa tengah': 'jawa tengah', 'jateng': 'jawa tengah',
      'jawa barat': 'jawa barat', 'jabar': 'jawa barat',
      'sumatra': 'sumatra', 'india': 'india',
    };
    return (map[lower] || 'secondary') as any;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tanggal</TableHead>
          <TableHead>Supplier</TableHead>
          <TableHead>Wilayah</TableHead>
          <TableHead>Bahan</TableHead>
          <TableHead>Sub-Bahan</TableHead>
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
            <TableCell>
              <Badge variant={kategoriBahanVariant(p.kategori)}>{p.kategori}</Badge>
            </TableCell>
            <TableCell className="text-right">{kg(p.qty)}</TableCell>
            <TableCell className="text-right">{p.currency === 'USD' ? usd(p.price) : rupiahFull(p.price)}</TableCell>
            <TableCell className="text-right font-semibold">{p.currency === 'USD' ? usd(p.total) : rupiahFull(p.total)}</TableCell>
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
   Buat PO Baru Modal
   ============================================================ */

const KATEGORI_OPTIONS = ['Bahan Baku'];

type PastedRow = {
  jenis: string;
  kategori: string;
  sub_bahan: string;
  qty: string;
  price: string;
  petani: string;
  keterangan: string;
  valid: boolean;
  error?: string;
};

function parsePastedText(text: string, masterBahan: any[]): PastedRow[] {
  const lines = text.trim().split('\n').filter(l => l.trim());
  const rows: PastedRow[] = [];

  for (const line of lines) {
    const cols = line.split('\t').map(c => c.trim());
    if (cols.length < 3) {
      rows.push({ jenis: cols[0] || '', kategori: '', sub_bahan: '', qty: '', price: '', petani: '', keterangan: '', valid: false, error: 'Minimal 3 kolom (Jenis, Qty, Harga)' });
      continue;
    }

    let jenis = '', kategori = '', qty = '', price = '', petani = '', keterangan = '';

    if (cols.length === 3) {
      [jenis, qty, price] = cols;
    } else if (cols.length === 4) {
      [jenis, kategori, qty, price] = cols;
    } else if (cols.length === 5) {
      [jenis, kategori, qty, price, petani] = cols;
    } else {
      [jenis, kategori, qty, price, petani, keterangan] = cols;
    }

    const qtyNum = parseFloat(qty.replace(/[,\.]/g, (m, i) => {
      const rest = qty.slice(i + 1);
      return rest.includes(',') || rest.includes('.') ? '' : '.';
    }).replace(/[^0-9.]/g, ''));
    const priceNum = parseFloat(price.replace(/[,\.]/g, (m, i) => {
      const rest = price.slice(i + 1);
      return rest.includes(',') || rest.includes('.') ? '' : '.';
    }).replace(/[^0-9.]/g, ''));

    const mb = masterBahan.find((b: any) =>
      b.nama_bahan.toLowerCase() === jenis.toLowerCase() ||
      b.kode_bahan?.toLowerCase() === jenis.toLowerCase()
    );
    if (mb) {
      jenis = mb.nama_bahan;
      if (!kategori) kategori = mb.kategori_bahan;
    }

    const valid = !!(jenis && !isNaN(qtyNum) && qtyNum > 0 && !isNaN(priceNum) && priceNum > 0);
    const error = !jenis ? 'Jenis kosong' : (isNaN(qtyNum) || qtyNum <= 0) ? 'Qty tidak valid' : (isNaN(priceNum) || priceNum <= 0) ? 'Harga tidak valid' : undefined;

    rows.push({
      jenis,
      kategori: kategori || '',
      sub_bahan: '',
      qty: isNaN(qtyNum) ? qty : String(qtyNum),
      price: isNaN(priceNum) ? price : String(priceNum),
      petani,
      keterangan,
      valid,
      error,
    });
  }
  return rows;
}

function BuatPOModal({ suppliers, masterBahan, masterUkuran, masterWarna, masterWilayah, masterPIC, onClose, onCreated }: {
  suppliers: any[];
  masterBahan: any[];
  masterUkuran: any[];
  masterWarna: any[];
  masterWilayah: any[];
  masterPIC: any[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isManualJenis, setIsManualJenis] = useState(false);
  const [petaniList, setPetaniList] = useState<any[]>([]);
  const [mode, setMode] = useState<'manual' | 'paste'>('manual');
  const [pasteText, setPasteText] = useState('');
  const [pastedRows, setPastedRows] = useState<PastedRow[]>([]);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, errors: [] as string[] });

  const [subBahanList, setSubBahanList] = useState<any[]>([]);

  const [form, setForm] = useState({
    jalur: 'Lokal' as 'Lokal' | 'Impor',
    date: new Date().toISOString().slice(0, 10),
    pic: '',
    supplierId: '',
    petani: '',
    wilayah: '',
    jenis: '',
    kategori: '',
    sub_bahan: '',
    ukuran: '',
    warna: '',
    qty: '',
    price: '',
    deskripsi: '',
  });

  const isImpor = form.jalur === 'Impor';

  const filteredUkuran = masterUkuran
    .filter((u: any) => {
      const j = form.jenis.toLowerCase();
      const satuan = (u.satuan || '').toLowerCase();
      if (j.includes('retul')) {
        if (satuan !== 'inch') return false;
        const code = parseInt(u.kode_ukuran);
        return !isNaN(code) && code >= 7 && code <= 30;
      }
      if (j.includes('remy')) {
        return satuan === 'cm';
      }
      return true;
    })
    .sort((a: any, b: any) => parseInt(a.kode_ukuran) - parseInt(b.kode_ukuran));

  const lokalSuppliers = suppliers.filter((s: any) => (s.jalur || 'Lokal') === 'Lokal');
  const imporSuppliers = suppliers.filter((s: any) => s.jalur === 'Impor');
  const picOptions = masterPIC.map((p: any) => ({ kode: p.kode_pic, nama: p.nama_pic }));
  const wilayahOptions = masterWilayah.map((w: any) => w.nama_wilayah);
  const filteredSuppliers = form.pic
    ? lokalSuppliers.filter((s: any) => s.pic === form.pic)
    : lokalSuppliers;

  function update(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleJalurChange(jalur: 'Lokal' | 'Impor') {
    setForm(f => ({
      ...f, jalur, pic: '', supplierId: '', petani: '', wilayah: jalur === 'Impor' ? 'Impor' : '',
      jenis: '', kategori: '', ukuran: '', warna: '', qty: '', price: '', deskripsi: '',
    }));
    setPetaniList([]);
    setIsManualJenis(false);
    setPastedRows([]);
    setPasteText('');
  }

  function handlePicChange(pic: string) {
    setForm(f => ({ ...f, pic, supplierId: '', petani: '', wilayah: '' }));
    setPetaniList([]);
  }

  function handleSupplierChange(supplierId: string) {
    const s = suppliers.find((s: any) => String(s.id) === supplierId);
    setForm(f => ({
      ...f, supplierId, petani: '',
      wilayah: s?.wilayah || (isImpor ? 'Impor' : ''),
    }));
    if (supplierId) {
      api.getPetani({ supplier_id: supplierId }).then(setPetaniList).catch(() => setPetaniList([]));
    } else {
      setPetaniList([]);
    }
  }

  function handleJenisSelect(value: string) {
    if (value === '__manual__') {
      setIsManualJenis(true);
      setForm(f => ({ ...f, jenis: '', kategori: '', sub_bahan: '' }));
      setSubBahanList([]);
      return;
    }
    setIsManualJenis(false);
    const mb = masterBahan.find((b: any) => b.nama_bahan === value);
    if (mb) {
      setForm(f => ({ ...f, jenis: mb.nama_bahan, kategori: mb.kategori_bahan, sub_bahan: '' }));
      api.getSubBahan({ bahan_id: mb.id, aktif: 'true' }).then(setSubBahanList).catch(() => setSubBahanList([]));
    } else {
      setForm(f => ({ ...f, jenis: value, sub_bahan: '' }));
      setSubBahanList([]);
    }
  }

  function handleParsePaste() {
    const rows = parsePastedText(pasteText, masterBahan);
    setPastedRows(rows);
  }

  function removePastedRow(idx: number) {
    setPastedRows(r => r.filter((_, i) => i !== idx));
  }

  function editPastedRow(idx: number, field: keyof PastedRow, value: string) {
    setPastedRows(prev => {
      const updated = [...prev];
      const row = { ...updated[idx], [field]: value };
      const qtyNum = parseFloat(row.qty);
      const priceNum = parseFloat(row.price);
      row.valid = !!(row.jenis && !isNaN(qtyNum) && qtyNum > 0 && !isNaN(priceNum) && priceNum > 0);
      row.error = !row.jenis ? 'Jenis kosong' : (isNaN(qtyNum) || qtyNum <= 0) ? 'Qty tidak valid' : (isNaN(priceNum) || priceNum <= 0) ? 'Harga tidak valid' : undefined;
      updated[idx] = row;
      return updated;
    });
  }

  const jenisNotInMaster = isManualJenis && form.jenis && !masterBahan.some((b: any) => b.nama_bahan === form.jenis);

  const qty = parseFloat(form.qty) || 0;
  const price = parseFloat(form.price) || 0;
  const total = qty * price;

  const validPastedRows = pastedRows.filter(r => r.valid);
  const pastedTotal = validPastedRows.reduce((s, r) => s + (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0), 0);
  const pastedTotalQty = validPastedRows.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0);

  const selectedSupplier = suppliers.find((s: any) => String(s.id) === form.supplierId);

  const step1Valid = isImpor
    ? (form.date && form.supplierId)
    : (form.date && form.pic && form.supplierId && form.wilayah);

  const step2Valid = mode === 'paste'
    ? validPastedRows.length > 0
    : isImpor
      ? (form.ukuran && qty > 0 && price > 0)
      : (form.jenis && form.kategori && qty > 0 && price > 0);

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError('');

    if (mode === 'paste') {
      const rows = validPastedRows;
      setBulkProgress({ done: 0, total: rows.length, errors: [] });
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        try {
          const jenis = r.jenis;
          const kategori = r.kategori || 'Lainnya';
          const desc = r.keterangan || `${jenis} ${kategori}`;
          await api.createPurchase({
            date: form.date,
            supplierId: form.supplierId,
            petani: r.petani || form.petani,
            wilayah: form.wilayah || 'Impor',
            jenis, kategori,
            sub_bahan: r.sub_bahan || form.sub_bahan || '',
            qty: r.qty,
            price: r.price,
            deskripsi: desc,
          });
        } catch (e: any) {
          errors.push(`Baris ${i + 1} (${r.jenis}): ${e.message}`);
        }
        setBulkProgress({ done: i + 1, total: rows.length, errors });
      }

      setSubmitting(false);
      if (errors.length === 0) {
        setSuccess(true);
        setTimeout(() => onCreated(), 1500);
      } else if (errors.length < rows.length) {
        setSuccess(true);
        setTimeout(() => onCreated(), 2000);
      } else {
        setSubmitError(`Semua ${rows.length} baris gagal disimpan`);
      }
      return;
    }

    try {
      const jenis = isImpor ? `Rambut India ${form.ukuran}"` : form.jenis;
      const kategori = isImpor ? 'Impor' : form.kategori;
      const desc = form.deskripsi || (isImpor
        ? `${jenis} - ${selectedSupplier?.name} (USD)`
        : `${jenis} ${kategori}`);
      await api.createPurchase({
        date: form.date,
        supplierId: form.supplierId,
        petani: form.petani,
        wilayah: form.wilayah || 'India',
        jenis, kategori,
        sub_bahan: form.sub_bahan || '',
        qty: form.qty,
        price: form.price,
        deskripsi: desc,
        currency: isImpor ? 'USD' : 'IDR',
      });
      setSuccess(true);
      setTimeout(() => onCreated(), 1500);
    } catch (e: any) {
      setSubmitError(e.message || 'Gagal menyimpan PO');
    } finally {
      setSubmitting(false);
    }
  }

  const fmtPrice = (v: number) => isImpor ? usd(v) : rupiahFull(v);
  const fmtTotal = (v: number) => isImpor ? usd(v) : rupiahFull(v);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-card border shadow-xl mx-4">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-6 py-4 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Buat PO Baru</h3>
              <p className="text-sm text-muted-foreground">
                {mode === 'paste' && step >= 2 ? `Bulk — ${validPastedRows.length} item` : 'Purchase Order pembelian bahan baku'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="rounded-full bg-emerald-100 p-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">
              {mode === 'paste' ? 'PO Bulk Berhasil!' : 'PO Berhasil Dibuat!'}
            </h3>
            <p className="mt-2 text-muted-foreground">
              {mode === 'paste' ? (
                <>
                  {bulkProgress.done - bulkProgress.errors.length} dari {bulkProgress.total} item berhasil disimpan.
                  {bulkProgress.errors.length > 0 && (
                    <span className="block mt-1 text-amber-600">{bulkProgress.errors.length} gagal.</span>
                  )}
                </>
              ) : (
                <>Pembelian {isImpor ? `Rambut India ${form.ukuran}"` : form.jenis} dari {selectedSupplier?.name}{form.petani ? ` (${form.petani})` : ''} sebesar {fmtTotal(total)} telah disimpan.</>
              )}
            </p>
            {bulkProgress.errors.length > 0 && (
              <div className="mt-4 w-full max-w-md text-left">
                <p className="text-sm font-medium text-destructive mb-2">Detail error:</p>
                {bulkProgress.errors.map((e, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{e}</p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Step Indicator */}
            <div className="px-6 pt-5 pb-2">
              <div className="flex items-center gap-2">
                {[
                  { n: 1, label: 'Jalur & Sumber' },
                  { n: 2, label: mode === 'paste' ? 'Paste Data' : 'Detail Barang' },
                  { n: 3, label: 'Konfirmasi' },
                ].map((s, i) => (
                  <div key={s.n} className="flex items-center gap-2 flex-1">
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                      step >= s.n
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {step > s.n ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                    </div>
                    <span className={cn(
                      "text-sm font-medium hidden sm:block",
                      step >= s.n ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {s.label}
                    </span>
                    {i < 2 && <div className={cn(
                      "h-0.5 flex-1",
                      step > s.n ? "bg-primary" : "bg-muted"
                    )} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 1: Jalur & Sumber */}
            {step === 1 && (
              <div className="space-y-5 px-6 py-4">
                {/* Jalur Selector */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Jalur Pembelian</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleJalurChange('Lokal')}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                        form.jalur === 'Lokal'
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <div className={cn(
                        "rounded-lg p-2",
                        form.jalur === 'Lokal' ? "bg-primary/10" : "bg-muted"
                      )}>
                        <Truck className={cn("h-5 w-5", form.jalur === 'Lokal' ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Lokal</p>
                        <p className="text-xs text-muted-foreground">Jawa Timur, Jawa Tengah, Jawa Barat, Sumatra</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleJalurChange('Impor')}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                        form.jalur === 'Impor'
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <div className={cn(
                        "rounded-lg p-2",
                        form.jalur === 'Impor' ? "bg-primary/10" : "bg-muted"
                      )}>
                        <Plane className={cn("h-5 w-5", form.jalur === 'Impor' ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Impor</p>
                        <p className="text-xs text-muted-foreground">India (USD)</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Tanggal PO
                  </label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={e => update('date', e.target.value)}
                  />
                </div>

                {/* LOKAL Flow: PIC → Supplier → Wilayah */}
                {!isImpor && (
                  <>
                    <div>
                      <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        PIC (Penanggung Jawab)
                      </label>
                      <Select value={form.pic} onChange={e => handlePicChange(e.target.value)}>
                        <option value="">-- Pilih PIC --</option>
                        {picOptions.map(p => (
                          <option key={p.kode} value={p.kode}>{p.nama}</option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        Supplier
                      </label>
                      <Combobox
                        value={form.supplierId}
                        onChange={handleSupplierChange}
                        disabled={!form.pic}
                        placeholder={form.pic ? 'Cari supplier...' : '-- Pilih PIC dulu --'}
                        options={filteredSuppliers.map((s: any) => ({
                          value: String(s.id),
                          label: s.name,
                          group: s.wilayah,
                        }))}
                      />
                      {selectedSupplier && (
                        <div className="mt-2 rounded-lg bg-accent/50 px-3 py-2 text-sm">
                          <Badge variant={(selectedSupplier.wilayah || '').toLowerCase() as any}>
                            {selectedSupplier.wilayah}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Petani combo: dropdown + ketik baru */}
                    {form.supplierId && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          Petani / Pengumpul
                        </label>
                        <div className="relative">
                          <Input
                            type="text"
                            list="petani-list"
                            placeholder="Ketik atau pilih nama petani..."
                            value={form.petani}
                            onChange={e => update('petani', e.target.value)}
                          />
                          <datalist id="petani-list">
                            {petaniList.map((p: any) => (
                              <option key={p.id} value={p.nama} />
                            ))}
                          </datalist>
                        </div>
                        {form.petani && !petaniList.some((p: any) => p.nama === form.petani) && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Petani baru — akan otomatis tersimpan saat PO dibuat
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        Wilayah
                      </label>
                      <Select
                        value={form.wilayah}
                        onChange={e => update('wilayah', e.target.value)}
                        disabled={!!form.supplierId}
                      >
                        <option value="">-- Otomatis dari supplier --</option>
                        {wilayahOptions.map(w => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </Select>
                    </div>
                  </>
                )}

                {/* IMPOR Flow: Account */}
                {isImpor && (
                  <div>
                    <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      Account Impor
                    </label>
                    <Select
                      value={form.supplierId}
                      onChange={e => handleSupplierChange(e.target.value)}
                    >
                      <option value="">-- Pilih Account --</option>
                      {imporSuppliers.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </Select>
                    {selectedSupplier && (
                      <div className="mt-2 rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
                        <div className="flex items-center gap-2">
                          <Plane className="h-4 w-4" />
                          <span>Pembelian impor India — harga dalam USD</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mode selector at bottom of step 1 */}
                {step1Valid && !isImpor && (
                  <div className="pt-2 border-t">
                    <label className="text-sm font-medium mb-2 block">Mode Input Barang</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setMode('manual')}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all",
                          mode === 'manual'
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:border-muted-foreground/30"
                        )}
                      >
                        <Edit3 className={cn("h-4 w-4", mode === 'manual' ? "text-primary" : "text-muted-foreground")} />
                        <div>
                          <p className="font-semibold text-sm">Manual</p>
                          <p className="text-xs text-muted-foreground">Input 1 item</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('paste')}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all",
                          mode === 'paste'
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:border-muted-foreground/30"
                        )}
                      >
                        <ClipboardPaste className={cn("h-4 w-4", mode === 'paste' ? "text-primary" : "text-muted-foreground")} />
                        <div>
                          <p className="font-semibold text-sm">Paste dari Excel</p>
                          <p className="text-xs text-muted-foreground">Bulk banyak item</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Paste Mode */}
            {step === 2 && mode === 'paste' && (
              <div className="space-y-5 px-6 py-4">
                {pastedRows.length === 0 ? (
                  <>
                    <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <ClipboardPaste className="h-5 w-5 text-primary" />
                        <p className="font-semibold text-sm">Paste Data dari Excel</p>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">
                        Copy baris dari Excel lalu paste di bawah. Format kolom (pisah Tab):
                      </p>
                      <div className="rounded-lg bg-muted/80 p-3 mb-4">
                        <p className="text-xs font-mono text-muted-foreground">
                          <span className="font-semibold text-foreground">Jenis</span> &nbsp;[Tab]&nbsp;
                          <span className="font-semibold text-foreground">Sub-Bahan</span> &nbsp;[Tab]&nbsp;
                          <span className="font-semibold text-foreground">Qty</span> &nbsp;[Tab]&nbsp;
                          <span className="font-semibold text-foreground">Harga</span> &nbsp;[Tab]&nbsp;
                          <span className="text-muted-foreground">Petani</span> &nbsp;[Tab]&nbsp;
                          <span className="text-muted-foreground">Keterangan</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          Minimal 3 kolom (Jenis, Qty, Harga). Kategori, Petani, Keterangan opsional.
                        </p>
                      </div>
                      <textarea
                        className="w-full min-h-[140px] rounded-lg border bg-white p-3 text-sm font-mono placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                        placeholder={"Brangkas\tBahan Baku\t50\t200000\nRemy Biasa\tRemy\t10\t650000\tPak Tarno\nLus Panjang\t\t25\t450000"}
                        value={pasteText}
                        onChange={e => setPasteText(e.target.value)}
                      />
                      <Button
                        className="w-full mt-3"
                        disabled={!pasteText.trim()}
                        onClick={handleParsePaste}
                      >
                        <ClipboardPaste className="mr-2 h-4 w-4" />
                        Proses Data ({pasteText.trim().split('\n').filter(l => l.trim()).length} baris)
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Parsed results table */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <p className="text-sm font-semibold">
                          {validPastedRows.length} item valid
                          {pastedRows.length !== validPastedRows.length && (
                            <span className="text-destructive font-normal ml-1">
                              ({pastedRows.length - validPastedRows.length} error)
                            </span>
                          )}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setPastedRows([]); setPasteText(''); }}
                      >
                        <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" />
                        Paste Ulang
                      </Button>
                    </div>

                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8">#</TableHead>
                            <TableHead>Bahan</TableHead>
                            <TableHead>Sub-Bahan</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Harga</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="w-8"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pastedRows.map((row, i) => {
                            const rQty = parseFloat(row.qty) || 0;
                            const rPrice = parseFloat(row.price) || 0;
                            return (
                              <TableRow key={i} className={!row.valid ? 'bg-destructive/5' : undefined}>
                                <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                                <TableCell>
                                  <input
                                    className="bg-transparent text-sm font-medium w-full outline-none border-b border-transparent hover:border-muted-foreground/30 focus:border-primary transition-colors"
                                    value={row.jenis}
                                    onChange={e => editPastedRow(i, 'jenis', e.target.value)}
                                  />
                                  {row.error && (
                                    <p className="text-[10px] text-destructive mt-0.5">{row.error}</p>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <input
                                    className="bg-transparent text-sm w-full outline-none border-b border-transparent hover:border-muted-foreground/30 focus:border-primary transition-colors"
                                    value={row.sub_bahan}
                                    onChange={e => editPastedRow(i, 'sub_bahan', e.target.value)}
                                    placeholder="-"
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <input
                                    className="bg-transparent text-sm text-right w-16 outline-none border-b border-transparent hover:border-muted-foreground/30 focus:border-primary transition-colors"
                                    value={row.qty}
                                    onChange={e => editPastedRow(i, 'qty', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <input
                                    className="bg-transparent text-sm text-right w-24 outline-none border-b border-transparent hover:border-muted-foreground/30 focus:border-primary transition-colors"
                                    value={row.price}
                                    onChange={e => editPastedRow(i, 'price', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell className="text-right font-semibold text-sm">
                                  {rQty > 0 && rPrice > 0 ? rupiahFull(rQty * rPrice) : '-'}
                                </TableCell>
                                <TableCell>
                                  <button onClick={() => removePastedRow(i)} className="p-1 rounded hover:bg-destructive/10 transition-colors">
                                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                  </button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Paste totals */}
                    {validPastedRows.length > 0 && (
                      <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Total {validPastedRows.length} item</span>
                            <p className="text-xs text-muted-foreground mt-0.5">{kg(pastedTotalQty)} total berat</p>
                          </div>
                          <span className="text-2xl font-bold text-primary">{rupiahFull(pastedTotal)}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Step 2: Detail Barang — Manual Lokal */}
            {step === 2 && mode === 'manual' && !isImpor && (
              <div className="space-y-5 px-6 py-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    Bahan
                  </label>
                  {!isManualJenis ? (
                    <Select
                      value={form.jenis}
                      onChange={e => handleJenisSelect(e.target.value)}
                    >
                      <option value="">-- Pilih Bahan --</option>
                      {['Bahan Baku', 'Bahan Proses', 'Recycle/WIP'].map(kat => {
                        const group = masterBahan.filter((b: any) => b.kategori_bahan === kat);
                        if (group.length === 0) return null;
                        return (
                          <optgroup key={kat} label={`── ${kat} ──`}>
                            {group.map((b: any) => (
                              <option key={b.id} value={b.nama_bahan}>
                                {b.nama_bahan} ({b.kode_bahan})
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                      <optgroup label="──────────">
                        <option value="__manual__">Input Manual...</option>
                      </optgroup>
                    </Select>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Ketik nama bahan..."
                          value={form.jenis}
                          onChange={e => update('jenis', e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setIsManualJenis(false); setForm(f => ({ ...f, jenis: '', kategori: '' })); }}
                        >
                          Batal
                        </Button>
                      </div>
                      {jenisNotInMaster && (
                        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          Bahan belum masuk master
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Sub-Bahan
                  </label>
                  <Select
                    value={form.sub_bahan}
                    onChange={e => update('sub_bahan', e.target.value)}
                    disabled={!form.jenis}
                  >
                    <option value="">{form.jenis ? (subBahanList.length > 0 ? '-- Pilih Sub-Bahan --' : 'Tidak ada sub-bahan') : '-- Pilih Bahan dulu --'}</option>
                    {subBahanList.map((sb: any) => (
                      <option key={sb.id} value={sb.nama_sub}>{sb.nama_sub} ({sb.kode_sub})</option>
                    ))}
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      Ukuran
                    </label>
                    <Select value={form.ukuran} onChange={e => update('ukuran', e.target.value)}>
                      <option value="">-- Pilih Ukuran --</option>
                      {filteredUkuran.map((u: any) => (
                        <option key={u.id} value={u.kode_ukuran}>{u.nama_ukuran}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      Warna
                    </label>
                    <Select value={form.warna} onChange={e => update('warna', e.target.value)}>
                      <option value="">-- Pilih Warna --</option>
                      {masterWarna.map((w: any) => (
                        <option key={w.id} value={w.kode_warna}>{w.nama_warna}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                      <Weight className="h-4 w-4 text-muted-foreground" />
                      Qty (Kg)
                    </label>
                    <Input type="number" step="0.01" min="0" placeholder="0.00"
                      value={form.qty} onChange={e => update('qty', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-muted-foreground" />
                      Harga/Kg (Rp)
                    </label>
                    <Input type="number" step="100" min="0" placeholder="0"
                      value={form.price} onChange={e => update('price', e.target.value)} />
                  </div>
                </div>

                {total > 0 && (
                  <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Total Pembelian</span>
                      <span className="text-2xl font-bold text-primary">{rupiahFull(total)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{kg(qty)} × {rupiahFull(price)}/Kg</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    Keterangan (opsional)
                  </label>
                  <Input type="text" placeholder="Contoh: Rambut kualitas A, sudah dicek"
                    value={form.deskripsi} onChange={e => update('deskripsi', e.target.value)} />
                </div>
              </div>
            )}

            {/* Step 2: Detail Barang — IMPOR */}
            {step === 2 && isImpor && (
              <div className="space-y-5 px-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      Ukuran
                    </label>
                    <Select value={form.ukuran} onChange={e => update('ukuran', e.target.value)}>
                      <option value="">-- Pilih Ukuran --</option>
                      {filteredUkuran.map((u: any) => (
                        <option key={u.id} value={u.kode_ukuran}>{u.nama_ukuran}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      Warna
                    </label>
                    <Select value={form.warna} onChange={e => update('warna', e.target.value)}>
                      <option value="">-- Pilih Warna --</option>
                      {masterWarna.map((w: any) => (
                        <option key={w.id} value={w.kode_warna}>{w.nama_warna}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                      <Weight className="h-4 w-4 text-muted-foreground" />
                      Qty (Kg)
                    </label>
                    <Input type="number" step="0.001" min="0" placeholder="0.000"
                      value={form.qty} onChange={e => update('qty', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      Harga/Kg (USD)
                    </label>
                    <Input type="number" step="1" min="0" placeholder="0"
                      value={form.price} onChange={e => update('price', e.target.value)} />
                  </div>
                </div>

                {total > 0 && (
                  <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-600">Total (USD)</span>
                      <span className="text-2xl font-bold text-blue-700">{usd(total)}</span>
                    </div>
                    <p className="text-xs text-blue-500 mt-1">{kg(qty)} × {usd(price)}/Kg</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    Keterangan (opsional)
                  </label>
                  <Input type="text" placeholder="Contoh: Shipment batch #12, via Mr Islam"
                    value={form.deskripsi} onChange={e => update('deskripsi', e.target.value)} />
                </div>
              </div>
            )}

            {/* Step 3: Konfirmasi */}
            {step === 3 && (
              <div className="space-y-5 px-6 py-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      Ringkasan PO
                      <Badge variant={isImpor ? 'default' : 'success'}>{form.jalur}</Badge>
                      {mode === 'paste' && <Badge variant="purple">Bulk {validPastedRows.length} item</Badge>}
                    </CardTitle>
                    <CardDescription>Pastikan semua data sudah benar sebelum menyimpan.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Tanggal</p>
                        <p className="font-medium">{fmtDate(form.date)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{isImpor ? 'Account' : 'Supplier'}</p>
                        <p className="font-medium">{selectedSupplier?.name || '-'}</p>
                      </div>
                      {!isImpor && (
                        <>
                          <div>
                            <p className="text-muted-foreground">PIC</p>
                            <Badge variant="secondary">{picOptions.find(p => p.kode === form.pic)?.nama || form.pic}</Badge>
                          </div>
                          {form.petani && (
                            <div>
                              <p className="text-muted-foreground">Petani</p>
                              <p className="font-medium">{form.petani}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-muted-foreground">Wilayah</p>
                            <Badge variant={(form.wilayah || '').toLowerCase() as any}>{form.wilayah}</Badge>
                          </div>
                        </>
                      )}
                    </div>

                    {mode === 'paste' ? (
                      <>
                        <div className="mt-3 rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Bahan</TableHead>
                                <TableHead>Sub-Bahan</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Harga</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {validPastedRows.map((row, i) => {
                                const rQ = parseFloat(row.qty) || 0;
                                const rP = parseFloat(row.price) || 0;
                                return (
                                  <TableRow key={i}>
                                    <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                                    <TableCell className="font-medium">{row.jenis}</TableCell>
                                    <TableCell>{row.sub_bahan || '-'}</TableCell>
                                    <TableCell className="text-right">{kg(rQ)}</TableCell>
                                    <TableCell className="text-right">{rupiahFull(rP)}</TableCell>
                                    <TableCell className="text-right font-semibold">{rupiahFull(rQ * rP)}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium">TOTAL {validPastedRows.length} item</span>
                              <p className="text-xs text-muted-foreground mt-0.5">{kg(pastedTotalQty)} total berat</p>
                            </div>
                            <span className="text-2xl font-bold text-primary">{rupiahFull(pastedTotal)}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">{isImpor ? 'Barang' : 'Bahan'}</p>
                            <p className="font-medium">{isImpor ? `Rambut India ${form.ukuran}"` : form.jenis}</p>
                          </div>
                          {!isImpor && form.sub_bahan && (
                            <div>
                              <p className="text-muted-foreground">Sub-Bahan</p>
                              <p className="font-medium">{form.sub_bahan}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-muted-foreground">Qty</p>
                            <p className="font-medium">{kg(qty)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Harga/Kg</p>
                            <p className="font-medium">{fmtPrice(price)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Keterangan</p>
                            <p className="font-medium">{form.deskripsi || '-'}</p>
                          </div>
                        </div>

                        <div className={cn(
                          "mt-4 rounded-lg border-2 p-4",
                          isImpor ? "border-blue-200 bg-blue-50" : "border-primary/20 bg-primary/5"
                        )}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">TOTAL</span>
                            <span className={cn(
                              "text-2xl font-bold",
                              isImpor ? "text-blue-700" : "text-primary"
                            )}>{fmtTotal(total)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {submitting && mode === 'paste' && bulkProgress.total > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Menyimpan...</span>
                      <span className="text-sm text-muted-foreground">{bulkProgress.done}/{bulkProgress.total}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {submitError && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {submitError}
                  </div>
                )}
              </div>
            )}

            {/* Footer Navigation */}
            <div className="sticky bottom-0 flex items-center justify-between border-t bg-card px-6 py-4 rounded-b-xl">
              <Button
                variant="outline"
                onClick={() => step === 1 ? onClose() : setStep(step - 1)}
              >
                {step === 1 ? 'Batal' : 'Kembali'}
              </Button>

              {step < 3 ? (
                <Button
                  disabled={step === 1 ? !step1Valid : !step2Valid}
                  onClick={() => setStep(step + 1)}
                >
                  Lanjut
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {mode === 'paste' ? `Menyimpan ${bulkProgress.done}/${bulkProgress.total}...` : 'Menyimpan...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {mode === 'paste' ? `Simpan ${validPastedRows.length} PO` : 'Simpan PO'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
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
