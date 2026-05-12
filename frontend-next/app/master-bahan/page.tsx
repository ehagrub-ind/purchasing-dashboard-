'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import Loading from '@/components/Loading';
import {
  Database, Package, Layers, RefreshCw, Plus, Search,
  Pencil, Power, X, CheckCircle2, AlertTriangle, Loader2,
  Hash, Tag, FileText,
} from 'lucide-react';

const KATEGORI_OPTIONS = ['Bahan Baku', 'Bahan Proses', 'Recycle/WIP'];

function kategoriBadgeVariant(k: string) {
  if (k === 'Bahan Baku') return 'success' as const;
  if (k === 'Bahan Proses') return 'purple' as const;
  if (k === 'Recycle/WIP') return 'warning' as const;
  return 'secondary' as const;
}

export default function MasterBahanPage() {
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  function loadData() {
    Promise.all([api.getMasterBahan(), api.getMasterBahanStats()])
      .then(([list, s]) => { setData(list); setStats(s); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    let list = data;
    if (kategoriFilter) list = list.filter(b => b.kategori_bahan === kategoriFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(b =>
        b.kode_bahan.toLowerCase().includes(q) ||
        b.nama_bahan.toLowerCase().includes(q) ||
        (b.catatan || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, search, kategoriFilter]);

  async function handleToggle(id: number) {
    await api.toggleMasterBahan(id);
    loadData();
  }

  function handleEdit(item: any) {
    setEditItem(item);
    setShowModal(true);
  }

  function handleAdd() {
    setEditItem(null);
    setShowModal(true);
  }

  function handleModalDone() {
    setShowModal(false);
    setEditItem(null);
    loadData();
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center text-destructive font-medium">Error: {error}</CardContent>
        </Card>
      </div>
    );
  }
  if (loading) return <Loading />;

  const byKategori = stats?.by_kategori || {};

  return (
    <div className="space-y-6">
      {showModal && (
        <BahanModal
          item={editItem}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onDone={handleModalDone}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Master Bahan Baku</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Data referensi bahan baku untuk dropdown pembelian.
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Bahan
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Database className="h-5 w-5" />}
          iconColor="bg-blue-100 text-blue-600"
          label="Total Bahan Aktif"
          value={stats?.total_aktif ?? 0}
        />
        <StatCard
          icon={<Package className="h-5 w-5" />}
          iconColor="bg-emerald-100 text-emerald-600"
          label="Bahan Baku"
          value={byKategori['Bahan Baku'] ?? 0}
        />
        <StatCard
          icon={<Layers className="h-5 w-5" />}
          iconColor="bg-violet-100 text-violet-600"
          label="Bahan Proses"
          value={byKategori['Bahan Proses'] ?? 0}
        />
        <StatCard
          icon={<RefreshCw className="h-5 w-5" />}
          iconColor="bg-amber-100 text-amber-600"
          label="Recycle/WIP"
          value={byKategori['Recycle/WIP'] ?? 0}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari kode atau nama bahan..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          className="sm:w-48"
          value={kategoriFilter}
          onChange={e => setKategoriFilter(e.target.value)}
        >
          <option value="">Semua Kategori</option>
          {KATEGORI_OPTIONS.map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Bahan ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama Bahan</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Satuan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(b => (
                <TableRow key={b.id}>
                  <TableCell>
                    <span className="font-mono text-sm font-semibold bg-muted px-2 py-0.5 rounded">
                      {b.kode_bahan}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{b.nama_bahan}</TableCell>
                  <TableCell>
                    <Badge variant={kategoriBadgeVariant(b.kategori_bahan)}>{b.kategori_bahan}</Badge>
                  </TableCell>
                  <TableCell>{b.satuan}</TableCell>
                  <TableCell>
                    <Badge variant={b.aktif ? 'success' : 'secondary'}>
                      {b.aktif ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{b.catatan || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(b)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(b.id)}
                        title={b.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        <Power className={cn("h-4 w-4", b.aktif ? "text-emerald-600" : "text-muted-foreground")} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Tidak ada bahan ditemukan
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

/* ─── Stat Card ─── */

function StatCard({ icon, iconColor, label, value }: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={cn("rounded-lg p-2.5", iconColor)}>{icon}</div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Tambah / Edit Modal ─── */

function BahanModal({ item, onClose, onDone }: {
  item: any | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const isEdit = !!item;
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    kode_bahan: item?.kode_bahan || '',
    nama_bahan: item?.nama_bahan || '',
    kategori_bahan: item?.kategori_bahan || '',
    ukuran_default: item?.ukuran_default || '',
    satuan: item?.satuan || 'kg',
    catatan: item?.catatan || '',
  });

  function update(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  const valid = form.kode_bahan && form.nama_bahan && form.kategori_bahan;

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError('');
    try {
      if (isEdit) {
        await api.updateMasterBahan(item.id, form);
      } else {
        await api.createMasterBahan(form);
      }
      setSuccess(true);
      setTimeout(() => onDone(), 1000);
    } catch (e: any) {
      setSubmitError(e.message || 'Gagal menyimpan');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-card border shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{isEdit ? 'Edit Bahan' : 'Tambah Bahan Baru'}</h3>
              <p className="text-sm text-muted-foreground">
                {isEdit ? `Ubah data ${item.nama_bahan}` : 'Tambahkan bahan baku baru ke master data'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="rounded-full bg-emerald-100 p-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">
              {isEdit ? 'Bahan Berhasil Diperbarui!' : 'Bahan Berhasil Ditambahkan!'}
            </h3>
          </div>
        ) : (
          <>
            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    Kode Bahan
                  </label>
                  <Input
                    type="text"
                    placeholder="BRK"
                    value={form.kode_bahan}
                    onChange={e => update('kode_bahan', e.target.value.toUpperCase())}
                    maxLength={5}
                    disabled={isEdit}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    Nama Bahan
                  </label>
                  <Input
                    type="text"
                    placeholder="Brangkas"
                    value={form.nama_bahan}
                    onChange={e => update('nama_bahan', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    Kategori
                  </label>
                  <Select
                    value={form.kategori_bahan}
                    onChange={e => update('kategori_bahan', e.target.value)}
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {KATEGORI_OPTIONS.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Satuan</label>
                  <Select
                    value={form.satuan}
                    onChange={e => update('satuan', e.target.value)}
                  >
                    <option value="kg">kg</option>
                    <option value="pcs">pcs</option>
                    <option value="meter">meter</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Ukuran Default</label>
                  <Select
                    value={form.ukuran_default}
                    onChange={e => update('ukuran_default', e.target.value)}
                  >
                    <option value="">Tanpa Ukuran</option>
                    <optgroup label="── Kelipatan 1&quot; ──">
                      {[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,22,24].map(n => (
                        <option key={n} value={`${n}"`}>{n}&quot;</option>
                      ))}
                    </optgroup>
                    <optgroup label="── Range ──">
                      {['6-8', '8-10', '10-12', '12-14', '14-16', '16-18', '18-20', '20-24'].map(r => (
                        <option key={r} value={`${r}"`}>{r}&quot;</option>
                      ))}
                    </optgroup>
                    <optgroup label="── Kelipatan 5 ──">
                      {[5,10,15,20,25,30].map(n => (
                        <option key={`k5-${n}`} value={`${n}"`}>{n}&quot;</option>
                      ))}
                    </optgroup>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Tipe Harga</label>
                  <Select
                    value={form.catatan}
                    onChange={e => update('catatan', e.target.value)}
                  >
                    <option value="">-- Pilih --</option>
                    <option value="Harga Rate">Harga Rate (flat)</option>
                    <option value="Harga Per Ukuran">Harga Per Ukuran</option>
                    <option value="Multi PO">Multi PO</option>
                  </Select>
                </div>
              </div>

              {submitError && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {submitError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t px-6 py-4">
              <Button variant="outline" onClick={onClose}>Batal</Button>
              <Button onClick={handleSubmit} disabled={!valid || submitting}>
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</>
                ) : (
                  <><CheckCircle2 className="mr-2 h-4 w-4" />{isEdit ? 'Simpan Perubahan' : 'Tambah Bahan'}</>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
