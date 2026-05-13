'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Database, MapPin, Users, Sprout, UserCog, Ruler, Palette,
  Plus, Search, Pencil, Power, Trash2, X, Loader2,
  Package, CheckCircle2, Layers,
} from 'lucide-react';

export default function MasterDataPage() {
  const [tab, setTab] = useState('bahan');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Master Data</h1>
        <p className="text-muted-foreground">Kelola semua data referensi untuk modul purchasing.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="bahan" className="gap-1.5"><Package className="h-3.5 w-3.5" />Bahan</TabsTrigger>
          <TabsTrigger value="sub-bahan" className="gap-1.5"><Layers className="h-3.5 w-3.5" />Sub-Bahan</TabsTrigger>
          <TabsTrigger value="ukuran" className="gap-1.5"><Ruler className="h-3.5 w-3.5" />Ukuran</TabsTrigger>
          <TabsTrigger value="warna" className="gap-1.5"><Palette className="h-3.5 w-3.5" />Warna</TabsTrigger>
          <TabsTrigger value="wilayah" className="gap-1.5"><MapPin className="h-3.5 w-3.5" />Wilayah</TabsTrigger>
          <TabsTrigger value="subcon" className="gap-1.5"><Users className="h-3.5 w-3.5" />Supplier</TabsTrigger>
          <TabsTrigger value="pic" className="gap-1.5"><UserCog className="h-3.5 w-3.5" />PIC</TabsTrigger>
        </TabsList>

        <TabsContent value="bahan"><BahanTab /></TabsContent>
        <TabsContent value="sub-bahan"><SubBahanTab /></TabsContent>
        <TabsContent value="ukuran"><UkuranTab /></TabsContent>
        <TabsContent value="warna"><WarnaTab /></TabsContent>
        <TabsContent value="wilayah"><WilayahTab /></TabsContent>
        <TabsContent value="subcon"><SubconTab /></TabsContent>
        <TabsContent value="pic"><PICTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ================================================================
   GENERIC HELPERS
   ================================================================ */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-card border shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-sm font-medium mb-1.5 block">{label}</label>{children}</div>;
}

function StatusBadge({ aktif }: { aktif: boolean }) {
  return <Badge variant={aktif ? 'success' : 'secondary'}>{aktif ? 'Aktif' : 'Nonaktif'}</Badge>;
}

function ActionButtons({ onEdit, onToggle, onDelete, aktif }: { onEdit: () => void; onToggle: () => void; onDelete: () => void; aktif: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={onEdit} className="rounded-lg p-1.5 hover:bg-accent" title="Edit"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
      <button onClick={onToggle} className="rounded-lg p-1.5 hover:bg-accent" title={aktif ? 'Nonaktifkan' : 'Aktifkan'}><Power className={cn("h-4 w-4", aktif ? "text-emerald-500" : "text-muted-foreground")} /></button>
      <button onClick={onDelete} className="rounded-lg p-1.5 hover:bg-accent" title="Hapus"><Trash2 className="h-4 w-4 text-destructive" /></button>
    </div>
  );
}

function EmptyRow({ cols }: { cols: number }) {
  return <TableRow><TableCell colSpan={cols} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell></TableRow>;
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className={cn("rounded-lg p-2", color)}>{icon}</div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /><span>Memuat data...</span>
    </div>
  );
}

/* ================================================================
   TAB: BAHAN
   ================================================================ */
function BahanTab() {
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [katFilter, setKatFilter] = useState('');
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: any } | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([api.getMasterBahan(), api.getMasterBahanStats()])
      .then(([d, s]) => { setData(d); setStats(s); })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const filtered = data.filter(b => {
    if (katFilter && b.kategori_bahan !== katFilter) return false;
    if (search && !`${b.kode_bahan} ${b.nama_bahan}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleToggle(id: number) { await api.toggleMasterBahan(id); load(); }
  async function handleDelete(id: number) { if (confirm('Hapus bahan ini?')) { await api.deleteMasterBahan(id); load(); } }
  async function handleSave(item: any) {
    if (item.id) await api.updateMasterBahan(item.id, item);
    else await api.createMasterBahan(item);
    setModal(null); load();
  }

  function kategoriBadge(k: string) {
    const l = (k || '').toLowerCase();
    if (/bahan baku/.test(l)) return 'success' as const;
    if (/bahan proses/.test(l)) return 'purple' as const;
    if (/recycle|wip/.test(l)) return 'warning' as const;
    return 'secondary' as const;
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Database className="h-4 w-4 text-blue-600" />} label="Total Aktif" value={stats?.total_aktif || 0} color="bg-blue-100" />
        <StatCard icon={<Package className="h-4 w-4 text-emerald-600" />} label="Bahan Baku" value={stats?.by_kategori?.['Bahan Baku'] || 0} color="bg-emerald-100" />
        <StatCard icon={<Package className="h-4 w-4 text-violet-600" />} label="Bahan Proses" value={stats?.by_kategori?.['Bahan Proses'] || 0} color="bg-violet-100" />
        <StatCard icon={<Package className="h-4 w-4 text-amber-600" />} label="Recycle/WIP" value={stats?.by_kategori?.['Recycle/WIP'] || 0} color="bg-amber-100" />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Cari kode atau nama bahan..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button onClick={() => setModal({ mode: 'add' })}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Daftar Bahan ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Kode</TableHead><TableHead>Bahan</TableHead>
              <TableHead>Satuan</TableHead><TableHead>Aksi</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? <EmptyRow cols={4} /> : filtered.map(b => (
                <TableRow key={b.id}>
                  <TableCell><Badge variant="secondary" className="font-mono">{b.kode_bahan}</Badge></TableCell>
                  <TableCell className="font-medium">{b.nama_bahan}</TableCell>
                  <TableCell>{b.satuan}</TableCell>
                  <TableCell><ActionButtons onEdit={() => setModal({ mode: 'edit', item: b })} onToggle={() => handleToggle(b.id)} onDelete={() => handleDelete(b.id)} aktif={b.aktif} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {modal && <BahanModal mode={modal.mode} item={modal.item} onClose={() => setModal(null)} onSave={handleSave} />}
    </div>
  );
}

function BahanModal({ mode, item, onClose, onSave }: { mode: string; item?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [f, setF] = useState({ kode_bahan: item?.kode_bahan || '', nama_bahan: item?.nama_bahan || '', kategori_bahan: item?.kategori_bahan || 'Bahan Baku', satuan: item?.satuan || 'Kg', catatan: item?.catatan || '' });
  return (
    <Modal title={mode === 'add' ? 'Tambah Bahan' : 'Edit Bahan'} onClose={onClose}>
      <Field label="Kode Bahan"><Input value={f.kode_bahan} onChange={e => setF({ ...f, kode_bahan: e.target.value })} placeholder="Contoh: RMS" /></Field>
      <Field label="Nama Bahan"><Input value={f.nama_bahan} onChange={e => setF({ ...f, nama_bahan: e.target.value })} /></Field>
      <Field label="Satuan"><Input value={f.satuan} onChange={e => setF({ ...f, satuan: e.target.value })} /></Field>
      <Field label="Catatan"><Input value={f.catatan} onChange={e => setF({ ...f, catatan: e.target.value })} /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={() => onSave({ ...f, ...(item?.id ? { id: item.id } : {}) })} disabled={!f.kode_bahan || !f.nama_bahan}>Simpan</Button>
      </div>
    </Modal>
  );
}

/* ================================================================
   TAB: SUB-BAHAN
   ================================================================ */
function SubBahanTab() {
  const [data, setData] = useState<any[]>([]);
  const [bahanList, setBahanList] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [bahanFilter, setBahanFilter] = useState('');
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: any } | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([api.getSubBahan(), api.getSubBahanStats(), api.getMasterBahan()])
      .then(([d, s, b]) => { setData(d); setStats(s); setBahanList(b); })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const filtered = data.filter(s => {
    if (bahanFilter && String(s.bahan_id) !== bahanFilter) return false;
    if (search && !`${s.kode_sub} ${s.nama_sub}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleToggle(id: number) { await api.toggleSubBahan(id); load(); }
  async function handleDelete(id: number) { if (confirm('Hapus sub-bahan ini?')) { await api.deleteSubBahan(id); load(); } }
  async function handleSave(item: any) {
    if (item.id) await api.updateSubBahan(item.id, item);
    else await api.createSubBahan(item);
    setModal(null); load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Layers className="h-4 w-4 text-blue-600" />} label="Total Sub-Bahan" value={stats?.total || 0} color="bg-blue-100" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Aktif" value={stats?.total_aktif || 0} color="bg-emerald-100" />
        {Object.entries(stats?.by_bahan || {}).slice(0, 2).map(([k, v]) => (
          <StatCard key={k} icon={<Package className="h-4 w-4 text-violet-600" />} label={k} value={v as number} color="bg-violet-100" />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Cari kode atau nama sub-bahan..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button onClick={() => setModal({ mode: 'add' })}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Daftar Sub-Bahan ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Kode</TableHead><TableHead>Nama</TableHead><TableHead>Bahan Induk</TableHead>
              <TableHead>Status</TableHead><TableHead>Aksi</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? <EmptyRow cols={5} /> : filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell><Badge variant="secondary" className="font-mono">{s.kode_sub}</Badge></TableCell>
                  <TableCell className="font-medium">{s.nama_sub}</TableCell>
                  <TableCell><Badge variant="success">{s.bahan_nama || '-'}</Badge></TableCell>
                  <TableCell><StatusBadge aktif={s.aktif} /></TableCell>
                  <TableCell><ActionButtons onEdit={() => setModal({ mode: 'edit', item: s })} onToggle={() => handleToggle(s.id)} onDelete={() => handleDelete(s.id)} aktif={s.aktif} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {modal && <SubBahanModal mode={modal.mode} item={modal.item} bahanList={bahanList} onClose={() => setModal(null)} onSave={handleSave} />}
    </div>
  );
}

function SubBahanModal({ mode, item, bahanList, onClose, onSave }: { mode: string; item?: any; bahanList: any[]; onClose: () => void; onSave: (d: any) => void }) {
  const [f, setF] = useState({
    kode_sub: item?.kode_sub || '',
    nama_sub: item?.nama_sub || '',
    bahan_id: item?.bahan_id ? String(item.bahan_id) : '',
    catatan: item?.catatan || '',
  });
  return (
    <Modal title={mode === 'add' ? 'Tambah Sub-Bahan' : 'Edit Sub-Bahan'} onClose={onClose}>
      <Field label="Kode Sub-Bahan"><Input value={f.kode_sub} onChange={e => setF({ ...f, kode_sub: e.target.value })} placeholder="Contoh: RMS" /></Field>
      <Field label="Nama Sub-Bahan"><Input value={f.nama_sub} onChange={e => setF({ ...f, nama_sub: e.target.value })} placeholder="Contoh: Remy Super" /></Field>
      <Field label="Bahan Induk">
        <Select value={f.bahan_id} onChange={e => setF({ ...f, bahan_id: e.target.value })}>
          <option value="">-- Pilih Bahan --</option>
          {bahanList.map(b => <option key={b.id} value={b.id}>{b.nama_bahan} ({b.kode_bahan})</option>)}
        </Select>
      </Field>
      <Field label="Catatan"><Input value={f.catatan} onChange={e => setF({ ...f, catatan: e.target.value })} /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={() => onSave({ ...f, bahan_id: parseInt(f.bahan_id), ...(item?.id ? { id: item.id } : {}) })} disabled={!f.kode_sub || !f.nama_sub || !f.bahan_id}>Simpan</Button>
      </div>
    </Modal>
  );
}

/* ================================================================
   TAB: UKURAN
   ================================================================ */
function UkuranTab() {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: any } | null>(null);
  const [loading, setLoading] = useState(true);

  function load() { setLoading(true); api.getUkuran().then(setData).finally(() => setLoading(false)); }
  useEffect(load, []);

  const filtered = data.filter(u => {
    if (search && !`${u.kode_ukuran} ${u.nama_ukuran}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleToggle(id: number) { await api.toggleUkuran(id); load(); }
  async function handleDelete(id: number) { if (confirm('Hapus ukuran ini?')) { await api.deleteUkuran(id); load(); } }
  async function handleSave(item: any) {
    await api.updateUkuran(item.id, item);
    setModal(null); load();
  }
  async function handleGenerate(bulk: { dari: number; sampai: number; kelipatan: number; satuan: string }) {
    const res = await api.bulkCreateUkuran(bulk);
    alert(`${res.created} ukuran ditambah, ${res.skipped} di-skip (sudah ada)`);
    setModal(null); load();
  }
  async function handleDeleteAll() {
    if (!confirm(`Hapus semua ${data.length} ukuran? Aksi ini tidak bisa dibatalkan.`)) return;
    const res = await api.deleteAllUkuran();
    alert(`${res.deleted} ukuran dihapus`);
    load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={<Ruler className="h-4 w-4 text-blue-600" />} label="Total Ukuran" value={data.length} color="bg-blue-100" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Aktif" value={data.filter(u => u.aktif).length} color="bg-emerald-100" />
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Cari ukuran..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        {data.length > 0 && <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleDeleteAll}><Trash2 className="h-4 w-4 mr-1" />Hapus Semua</Button>}
        <Button onClick={() => setModal({ mode: 'add' })}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Daftar Ukuran ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Kode</TableHead><TableHead>Nama Ukuran</TableHead><TableHead>Satuan</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? <EmptyRow cols={5} /> : filtered.map(u => (
                <TableRow key={u.id}>
                  <TableCell><Badge variant="secondary" className="font-mono">{u.kode_ukuran}</Badge></TableCell>
                  <TableCell className="font-medium">{u.nama_ukuran}</TableCell>
                  <TableCell>{u.satuan}</TableCell>
                  <TableCell><StatusBadge aktif={u.aktif} /></TableCell>
                  <TableCell><ActionButtons onEdit={() => setModal({ mode: 'edit', item: u })} onToggle={() => handleToggle(u.id)} onDelete={() => handleDelete(u.id)} aktif={u.aktif} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {modal && (modal.mode === 'add'
        ? <UkuranGenerateModal onClose={() => setModal(null)} onGenerate={handleGenerate} />
        : <UkuranEditModal item={modal.item} onClose={() => setModal(null)} onSave={handleSave} />
      )}
    </div>
  );
}

function UkuranGenerateModal({ onClose, onGenerate }: { onClose: () => void; onGenerate: (d: any) => void }) {
  const [dari, setDari] = useState(1);
  const [sampai, setSampai] = useState(30);
  const [kelipatan, setKelipatan] = useState(1);
  const [satuan, setSatuan] = useState('inch');
  const [submitting, setSubmitting] = useState(false);

  const preview: number[] = [];
  if (dari > 0 && sampai >= dari && kelipatan > 0) {
    const start = kelipatan > 1 ? Math.ceil(dari / kelipatan) * kelipatan : dari;
    for (let n = start; n <= sampai; n += kelipatan) preview.push(n);
  }

  const unit = satuan === 'inch' ? '"' : ' cm';

  async function handleGenerate() {
    setSubmitting(true);
    try { await onGenerate({ dari, sampai, kelipatan, satuan }); }
    finally { setSubmitting(false); }
  }

  return (
    <Modal title="Generate Ukuran" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Range</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dari"><Input type="number" min={1} value={dari} onChange={e => setDari(Number(e.target.value))} /></Field>
            <Field label="Sampai"><Input type="number" min={1} value={sampai} onChange={e => setSampai(Number(e.target.value))} /></Field>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Kelipatan</p>
            <div className="flex items-center gap-3">
              {[1, 5].map(k => (
                <button key={k} type="button" onClick={() => setKelipatan(k)}
                  className={cn("flex-1 rounded-lg border-2 py-2 text-center text-sm font-bold transition-all",
                    kelipatan === k ? "border-primary bg-primary/10 text-primary" : "border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/40"
                  )}>{k}</button>
              ))}
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Satuan</p>
            <div className="flex items-center gap-3">
              {(['inch', 'cm'] as const).map(s => (
                <button key={s} type="button" onClick={() => setSatuan(s)}
                  className={cn("flex-1 rounded-lg border-2 py-2 text-center text-sm font-bold transition-all",
                    satuan === s ? "border-primary bg-primary/10 text-primary" : "border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/40"
                  )}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        {preview.length > 0 && (
          <div className="rounded-lg border p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Preview — {preview.length} ukuran</p>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {preview.map(n => (
                <span key={n} className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2 py-1 text-xs font-mono font-semibold">{n}{unit}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={handleGenerate} disabled={preview.length === 0 || submitting}>
          {submitting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generating...</> : <>Generate {preview.length} Ukuran</>}
        </Button>
      </div>
    </Modal>
  );
}

function UkuranEditModal({ item, onClose, onSave }: { item: any; onClose: () => void; onSave: (d: any) => void }) {
  const [f, setF] = useState({ kode_ukuran: item?.kode_ukuran || '', nama_ukuran: item?.nama_ukuran || '', satuan: item?.satuan || 'inch' });
  return (
    <Modal title="Edit Ukuran" onClose={onClose}>
      <Field label="Kode Ukuran"><Input value={f.kode_ukuran} onChange={e => setF({ ...f, kode_ukuran: e.target.value })} /></Field>
      <Field label="Nama Ukuran"><Input value={f.nama_ukuran} onChange={e => setF({ ...f, nama_ukuran: e.target.value })} /></Field>
      <Field label="Satuan"><Input value={f.satuan} onChange={e => setF({ ...f, satuan: e.target.value })} /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={() => onSave({ ...f, id: item.id })} disabled={!f.kode_ukuran || !f.nama_ukuran}>Simpan</Button>
      </div>
    </Modal>
  );
}

/* ================================================================
   TAB: WARNA
   ================================================================ */
function WarnaTab() {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: any } | null>(null);
  const [loading, setLoading] = useState(true);

  function load() { setLoading(true); api.getWarna().then(setData).finally(() => setLoading(false)); }
  useEffect(load, []);

  const filtered = data.filter(w => {
    if (search && !`${w.kode_warna} ${w.nama_warna}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleToggle(id: number) { await api.toggleWarna(id); load(); }
  async function handleDelete(id: number) { if (confirm('Hapus warna ini?')) { await api.deleteWarna(id); load(); } }
  async function handleSave(item: any) {
    if (item.id) await api.updateWarna(item.id, item);
    else await api.createWarna(item);
    setModal(null); load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={<Palette className="h-4 w-4 text-blue-600" />} label="Total Warna" value={data.length} color="bg-blue-100" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Aktif" value={data.filter(w => w.aktif).length} color="bg-emerald-100" />
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Cari warna..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button onClick={() => setModal({ mode: 'add' })}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Daftar Warna ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Kode</TableHead><TableHead>Nama Warna</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? <EmptyRow cols={4} /> : filtered.map(w => (
                <TableRow key={w.id}>
                  <TableCell><Badge variant="secondary" className="font-mono">{w.kode_warna}</Badge></TableCell>
                  <TableCell className="font-medium">{w.nama_warna}</TableCell>
                  <TableCell><StatusBadge aktif={w.aktif} /></TableCell>
                  <TableCell><ActionButtons onEdit={() => setModal({ mode: 'edit', item: w })} onToggle={() => handleToggle(w.id)} onDelete={() => handleDelete(w.id)} aktif={w.aktif} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {modal && <WarnaModal mode={modal.mode} item={modal.item} onClose={() => setModal(null)} onSave={handleSave} />}
    </div>
  );
}

function WarnaModal({ mode, item, onClose, onSave }: { mode: string; item?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [f, setF] = useState({ kode_warna: item?.kode_warna || '', nama_warna: item?.nama_warna || '' });
  return (
    <Modal title={mode === 'add' ? 'Tambah Warna' : 'Edit Warna'} onClose={onClose}>
      <Field label="Kode Warna"><Input value={f.kode_warna} onChange={e => setF({ ...f, kode_warna: e.target.value })} placeholder="Contoh: HT" /></Field>
      <Field label="Nama Warna"><Input value={f.nama_warna} onChange={e => setF({ ...f, nama_warna: e.target.value })} placeholder="Contoh: Hitam" /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={() => onSave({ ...f, ...(item?.id ? { id: item.id } : {}) })} disabled={!f.kode_warna || !f.nama_warna}>Simpan</Button>
      </div>
    </Modal>
  );
}

/* ================================================================
   TAB: WILAYAH
   ================================================================ */
function WilayahTab() {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [provFilter, setProvFilter] = useState('');
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: any } | null>(null);
  const [loading, setLoading] = useState(true);

  function load() { setLoading(true); api.getWilayah().then(setData).finally(() => setLoading(false)); }
  useEffect(load, []);

  const filtered = data.filter(w => {
    if (provFilter && w.provinsi !== provFilter) return false;
    if (search && !`${w.kode_wilayah} ${w.nama_wilayah}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const byProv = data.reduce((acc: Record<string, number>, w: any) => { if (w.aktif) acc[w.provinsi] = (acc[w.provinsi] || 0) + 1; return acc; }, {});

  async function handleToggle(id: number) { await api.toggleWilayah(id); load(); }
  async function handleDelete(id: number) { if (confirm('Hapus wilayah ini?')) { await api.deleteWilayah(id); load(); } }
  async function handleSave(item: any) {
    if (item.id) await api.updateWilayah(item.id, item);
    else await api.createWilayah(item);
    setModal(null); load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Cari wilayah..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button onClick={() => setModal({ mode: 'add' })}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Daftar Wilayah ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nama Wilayah</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? <EmptyRow cols={3} /> : filtered.map(w => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.nama_wilayah}</TableCell>
                  <TableCell><StatusBadge aktif={w.aktif} /></TableCell>
                  <TableCell><ActionButtons onEdit={() => setModal({ mode: 'edit', item: w })} onToggle={() => handleToggle(w.id)} onDelete={() => handleDelete(w.id)} aktif={w.aktif} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {modal && <WilayahModal mode={modal.mode} item={modal.item} onClose={() => setModal(null)} onSave={handleSave} />}
    </div>
  );
}

function WilayahModal({ mode, item, onClose, onSave }: { mode: string; item?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [f, setF] = useState({ kode_wilayah: item?.kode_wilayah || '', nama_wilayah: item?.nama_wilayah || '', provinsi: item?.provinsi || '', pic: item?.pic || '' });
  return (
    <Modal title={mode === 'add' ? 'Tambah Wilayah' : 'Edit Wilayah'} onClose={onClose}>
      <Field label="Nama Wilayah"><Input value={f.nama_wilayah} onChange={e => setF({ ...f, nama_wilayah: e.target.value, kode_wilayah: e.target.value.toUpperCase().replace(/\s+/g, '-'), provinsi: e.target.value.toUpperCase(), pic: 'RIGEN' })} placeholder="Contoh: Jawa Timur" /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={() => onSave({ ...f, ...(item?.id ? { id: item.id } : {}) })} disabled={!f.nama_wilayah}>Simpan</Button>
      </div>
    </Modal>
  );
}

/* ================================================================
   TAB: SUBCON / SUPPLIER
   ================================================================ */
function SubconTab() {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [jalurFilter, setJalurFilter] = useState('');
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: any } | null>(null);
  const [loading, setLoading] = useState(true);

  function load() { setLoading(true); api.getSuppliers().then(setData).finally(() => setLoading(false)); }
  useEffect(load, []);

  const filtered = data.filter(s => {
    if (jalurFilter && s.jalur !== jalurFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const lokal = data.filter(s => s.jalur !== 'Impor').length;
  const impor = data.filter(s => s.jalur === 'Impor').length;

  async function handleToggle(id: number) { await api.toggleSupplier(id); load(); }
  async function handleDelete(id: number) { if (confirm('Hapus supplier ini?')) { await api.deleteSupplier(id); load(); } }
  async function handleSave(item: any) {
    if (item.id) await api.updateSupplier(item.id, item);
    else await api.createSupplier(item);
    setModal(null); load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Cari supplier..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button onClick={() => setModal({ mode: 'add' })}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Daftar Supplier ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nama</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? <EmptyRow cols={3} /> : filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell><StatusBadge aktif={s.aktif !== false} /></TableCell>
                  <TableCell><ActionButtons onEdit={() => setModal({ mode: 'edit', item: s })} onToggle={() => handleToggle(s.id)} onDelete={() => handleDelete(s.id)} aktif={s.aktif !== false} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {modal && <SubconModal mode={modal.mode} item={modal.item} onClose={() => setModal(null)} onSave={handleSave} />}
    </div>
  );
}

function SubconModal({ mode, item, onClose, onSave }: { mode: string; item?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [f, setF] = useState({ name: item?.name || '', wilayah: item?.wilayah || 'Lokal', pic: item?.pic || 'RIGEN', jalur: item?.jalur || 'Lokal' });
  return (
    <Modal title={mode === 'add' ? 'Tambah Supplier' : 'Edit Supplier'} onClose={onClose}>
      <Field label="Nama Supplier"><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Contoh: Regen" /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={() => onSave({ ...f, ...(item?.id ? { id: item.id } : {}) })} disabled={!f.name}>Simpan</Button>
      </div>
    </Modal>
  );
}

/* ================================================================
   TAB: PETANI
   ================================================================ */
function PetaniTab() {
  const [data, setData] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [supFilter, setSupFilter] = useState('');
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: any } | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([api.getPetani(), api.getSuppliers()])
      .then(([p, s]) => { setData(p); setSuppliers(s.filter((x: any) => x.jalur !== 'Impor')); })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const filtered = data.filter(p => {
    if (supFilter && String(p.supplier_id) !== supFilter) return false;
    if (search && !p.nama.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleToggle(id: number) { await api.togglePetani(id); load(); }
  async function handleDelete(id: number) { if (confirm('Hapus petani ini?')) { await api.deletePetani(id); load(); } }
  async function handleSave(item: any) {
    if (item.id) await api.updatePetani(item.id, item);
    else await api.createPetani(item);
    setModal(null); load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={<Sprout className="h-4 w-4 text-blue-600" />} label="Total Petani" value={data.length} color="bg-blue-100" />
        <StatCard icon={<Sprout className="h-4 w-4 text-emerald-600" />} label="Aktif" value={data.filter(p => p.aktif !== false).length} color="bg-emerald-100" />
        <StatCard icon={<Users className="h-4 w-4 text-violet-600" />} label="Supplier Terkait" value={new Set(data.map(p => p.supplier_id)).size} color="bg-violet-100" />
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Cari petani..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={supFilter} onChange={e => setSupFilter(e.target.value)}>
          <option value="">Semua Supplier</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Button onClick={() => setModal({ mode: 'add' })}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Daftar Petani ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nama</TableHead><TableHead>Supplier</TableHead><TableHead>Wilayah</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? <EmptyRow cols={5} /> : filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nama}</TableCell>
                  <TableCell>{p.supplier_name || '-'}</TableCell>
                  <TableCell><Badge variant={(p.wilayah || '').toLowerCase() as any}>{p.wilayah || '-'}</Badge></TableCell>
                  <TableCell><StatusBadge aktif={p.aktif !== false} /></TableCell>
                  <TableCell><ActionButtons onEdit={() => setModal({ mode: 'edit', item: p })} onToggle={() => handleToggle(p.id)} onDelete={() => handleDelete(p.id)} aktif={p.aktif !== false} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {modal && <PetaniModal mode={modal.mode} item={modal.item} suppliers={suppliers} onClose={() => setModal(null)} onSave={handleSave} />}
    </div>
  );
}

function PetaniModal({ mode, item, suppliers, onClose, onSave }: { mode: string; item?: any; suppliers: any[]; onClose: () => void; onSave: (d: any) => void }) {
  const [f, setF] = useState({ nama: item?.nama || '', supplier_id: item?.supplier_id ? String(item.supplier_id) : '', wilayah: item?.wilayah || '' });
  function handleSupplierChange(sid: string) {
    const s = suppliers.find((s: any) => String(s.id) === sid);
    setF(p => ({ ...p, supplier_id: sid, wilayah: s?.wilayah || '' }));
  }
  return (
    <Modal title={mode === 'add' ? 'Tambah Petani' : 'Edit Petani'} onClose={onClose}>
      <Field label="Nama Petani"><Input value={f.nama} onChange={e => setF({ ...f, nama: e.target.value })} /></Field>
      <Field label="Supplier">
        <Select value={f.supplier_id} onChange={e => handleSupplierChange(e.target.value)}>
          <option value="">-- Pilih --</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.wilayah})</option>)}
        </Select>
      </Field>
      <Field label="Wilayah"><Input value={f.wilayah} onChange={e => setF({ ...f, wilayah: e.target.value })} placeholder="Auto dari supplier" /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={() => onSave({ ...f, supplier_id: parseInt(f.supplier_id), ...(item?.id ? { id: item.id } : {}) })} disabled={!f.nama || !f.supplier_id}>Simpan</Button>
      </div>
    </Modal>
  );
}

/* ================================================================
   TAB: PIC
   ================================================================ */
function PICTab() {
  const [data, setData] = useState<any[]>([]);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: any } | null>(null);
  const [loading, setLoading] = useState(true);

  function load() { setLoading(true); api.getPIC().then(setData).finally(() => setLoading(false)); }
  useEffect(load, []);

  async function handleToggle(id: number) { await api.togglePIC(id); load(); }
  async function handleDelete(id: number) { if (confirm('Hapus PIC ini?')) { await api.deletePIC(id); load(); } }
  async function handleSave(item: any) {
    if (item.id) await api.updatePIC(item.id, item);
    else await api.createPIC(item);
    setModal(null); load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={<UserCog className="h-4 w-4 text-blue-600" />} label="Total PIC" value={data.length} color="bg-blue-100" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Aktif" value={data.filter(p => p.aktif).length} color="bg-emerald-100" />
      </div>
      <div className="flex items-center justify-end">
        <Button onClick={() => setModal({ mode: 'add' })}><Plus className="h-4 w-4 mr-1" />Tambah PIC</Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Daftar PIC ({data.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nama</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.length === 0 ? <EmptyRow cols={3} /> : data.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nama_pic}</TableCell>
                  <TableCell><StatusBadge aktif={p.aktif} /></TableCell>
                  <TableCell><ActionButtons onEdit={() => setModal({ mode: 'edit', item: p })} onToggle={() => handleToggle(p.id)} onDelete={() => handleDelete(p.id)} aktif={p.aktif} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {modal && <PICModal mode={modal.mode} item={modal.item} onClose={() => setModal(null)} onSave={handleSave} />}
    </div>
  );
}

function PICModal({ mode, item, onClose, onSave }: { mode: string; item?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [f, setF] = useState({ kode_pic: item?.kode_pic || '', nama_pic: item?.nama_pic || '', telepon: '' });
  return (
    <Modal title={mode === 'add' ? 'Tambah PIC' : 'Edit PIC'} onClose={onClose}>
      <Field label="Nama PIC"><Input value={f.nama_pic} onChange={e => setF({ ...f, nama_pic: e.target.value, kode_pic: e.target.value.toUpperCase().replace(/\s+/g, '') })} placeholder="Contoh: Rigen" /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={() => onSave({ ...f, ...(item?.id ? { id: item.id } : {}) })} disabled={!f.nama_pic}>Simpan</Button>
      </div>
    </Modal>
  );
}
