'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { rupiahFull, fmtDate, kg } from '@/lib/format';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  User, Bell, Palette, Shield, Save, Check,
  Mail, Phone, MapPin, Building2, Eye, EyeOff,
  Plus, Pencil, Trash2, X, Users, Loader2,
  Database, AlertTriangle, Lock, ShoppingCart, CreditCard, Search, Clock,
} from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  Owner: 'bg-amber-100 text-amber-700 border-amber-200',
  Admin: 'bg-blue-100 text-blue-700 border-blue-200',
  PIC: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const ROLE_BG: Record<string, string> = {
  Owner: 'bg-amber-100 text-amber-700',
  Admin: 'bg-blue-100 text-blue-700',
  PIC: 'bg-emerald-100 text-emerald-700',
};

export default function PengaturanPage() {
  const [tab, setTab] = useState('profil');
  const [saved, setSaved] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [notif, setNotif] = useState({
    transaksi: true,
    saldoMinus: true,
    supplierBaru: false,
    laporanMingguan: true,
    emailNotif: true,
  });

  const [tampilan, setTampilan] = useState({
    bahasa: 'id',
    matauang: 'IDR',
    formatTanggal: 'dd/MM/yyyy',
    barisPerHalaman: '50',
  });

  const loadUsers = useCallback(() => {
    api.getUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const owner = users.find((u: any) => u.role === 'Owner') || {
    nama: 'David', email: 'david@indohaircorp.co.id', telepon: '0812-3456-7890', role: 'Owner',
  };

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pengaturan</h2>
          <p className="text-sm text-muted-foreground mt-1">Kelola profil, tim, notifikasi, dan preferensi tampilan dashboard.</p>
        </div>
        <Button onClick={handleSave} disabled={saved}>
          {saved ? <Check className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
          {saved ? 'Tersimpan!' : 'Simpan Perubahan'}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="profil"><User className="mr-2 h-4 w-4" />Profil</TabsTrigger>
          <TabsTrigger value="tim"><Users className="mr-2 h-4 w-4" />Tim</TabsTrigger>
          <TabsTrigger value="notifikasi"><Bell className="mr-2 h-4 w-4" />Notifikasi</TabsTrigger>
          <TabsTrigger value="tampilan"><Palette className="mr-2 h-4 w-4" />Tampilan</TabsTrigger>
          <TabsTrigger value="keamanan"><Shield className="mr-2 h-4 w-4" />Keamanan</TabsTrigger>
          <TabsTrigger value="data"><Database className="mr-2 h-4 w-4" />Data</TabsTrigger>
        </TabsList>

        <TabsContent value="profil">
          <ProfilTab owner={owner} />
        </TabsContent>
        <TabsContent value="tim">
          <TimTab users={users} loading={loading} onReload={loadUsers} />
        </TabsContent>
        <TabsContent value="notifikasi">
          <NotifikasiTab notif={notif} setNotif={setNotif} />
        </TabsContent>
        <TabsContent value="tampilan">
          <TampilanTab tampilan={tampilan} setTampilan={setTampilan} />
        </TabsContent>
        <TabsContent value="keamanan">
          <KeamananTab />
        </TabsContent>
        <TabsContent value="data">
          <DataTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Profil Tab
   ═══════════════════════════════════════════ */

function ProfilTab({ owner }: { owner: any }) {
  const [profil, setProfil] = useState({
    nama: owner.nama || 'David',
    email: owner.email || '',
    telepon: owner.telepon || '',
    perusahaan: 'PT Indo Hair Corp',
    alamat: 'Jawa Timur, Indonesia',
    role: owner.role || 'Owner',
  });

  function update(key: string, value: string) {
    setProfil((p: any) => ({ ...p, [key]: value }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary mb-4">
              {profil.nama.charAt(0).toUpperCase()}
            </div>
            <h3 className="text-lg font-semibold">{profil.nama}</h3>
            <span className={cn('mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', ROLE_COLORS[profil.role] || 'bg-muted text-foreground')}>
              {profil.role}
            </span>
            <p className="text-sm text-muted-foreground mt-2">{profil.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Informasi Profil</CardTitle>
          <CardDescription>Data pribadi yang digunakan di dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField icon={User} label="Nama Lengkap" value={profil.nama} onChange={v => update('nama', v)} />
          <FormField icon={Mail} label="Email" value={profil.email} onChange={v => update('email', v)} type="email" />
          <FormField icon={Phone} label="Telepon" value={profil.telepon} onChange={v => update('telepon', v)} />
          <FormField icon={Building2} label="Perusahaan" value={profil.perusahaan} onChange={v => update('perusahaan', v)} />
          <FormField icon={MapPin} label="Alamat" value={profil.alamat} onChange={v => update('alamat', v)} />
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Tim Tab — CRUD dari API
   ═══════════════════════════════════════════ */

function TimTab({ users, loading, onReload }: { users: any[]; loading: boolean; onReload: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  function handleAdd() {
    setEditUser(null);
    setShowModal(true);
  }

  function handleEdit(u: any) {
    setEditUser(u);
    setShowModal(true);
  }

  async function handleDelete(id: number) {
    if (!confirm('Hapus anggota tim ini?')) return;
    setDeleting(id);
    try {
      await api.deleteUser(id);
      onReload();
    } catch { }
    setDeleting(null);
  }

  async function handleToggle(id: number) {
    await api.toggleUser(id);
    onReload();
  }

  function handleSaved() {
    setShowModal(false);
    setEditUser(null);
    onReload();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Memuat data tim...</span>
      </div>
    );
  }

  return (
    <>
      {showModal && (
        <UserModal
          user={editUser}
          onClose={() => { setShowModal(false); setEditUser(null); }}
          onSaved={handleSaved}
        />
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Anggota Tim</h3>
            <p className="text-sm text-muted-foreground">{users.length} anggota terdaftar</p>
          </div>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Anggota
          </Button>
        </div>

        <div className="space-y-3">
          {users.map((u: any) => (
            <Card key={u.id} className={cn(!u.aktif && 'opacity-50')}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold', ROLE_BG[u.role] || 'bg-muted text-foreground')}>
                      {u.nama.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{u.nama}</p>
                        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', ROLE_COLORS[u.role] || 'bg-muted text-foreground')}>
                          {u.role}
                        </span>
                        {!u.aktif && <Badge variant="secondary">Nonaktif</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                        {u.telepon && <p className="text-xs text-muted-foreground">{u.telepon}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggle(u.id)}
                      className={cn(
                        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                        u.aktif ? 'bg-primary' : 'bg-muted'
                      )}
                    >
                      <span className={cn(
                        'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform',
                        u.aktif ? 'translate-x-4' : 'translate-x-0'
                      )} />
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(u)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)} disabled={deleting === u.id || u.role === 'Owner'}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   User Modal (Add / Edit)
   ═══════════════════════════════════════════ */

function UserModal({ user, onClose, onSaved }: { user: any | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    nama: user?.nama || '',
    email: user?.email || '',
    password: '',
    telepon: user?.telepon || '',
    role: user?.role || 'PIC',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function update(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nama || !form.email) return;
    if (!isEdit && !form.password) { setError('Password wajib diisi'); return; }
    if (form.password && form.password.length < 6) { setError('Password minimal 6 karakter'); return; }
    setSubmitting(true);
    setError('');
    try {
      const payload: any = { nama: form.nama, email: form.email, telepon: form.telepon, role: form.role };
      if (form.password) payload.password = form.password;
      if (isEdit) {
        await api.updateUser(user.id, payload);
      } else {
        await api.createUser(payload);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-card border shadow-xl mx-4">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold">{isEdit ? 'Edit Anggota' : 'Tambah Anggota Baru'}</h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Nama</label>
            <Input value={form.nama} onChange={e => update('nama', e.target.value)} placeholder="Nama lengkap" required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="email@indohaircorp.co.id" required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">{isEdit ? 'Password Baru' : 'Password'}</label>
            <Input
              type="password"
              value={form.password}
              onChange={e => update('password', e.target.value)}
              placeholder={isEdit ? 'Kosongkan jika tidak diubah' : 'Minimal 6 karakter'}
              required={!isEdit}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Telepon</label>
            <Input value={form.telepon} onChange={e => update('telepon', e.target.value)} placeholder="0812-xxxx-xxxx" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Role</label>
            <Select value={form.role} onChange={e => update('role', e.target.value)}>
              <option value="Owner">Owner</option>
              <option value="Admin">Admin</option>
              <option value="PIC">PIC</option>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={submitting || !form.nama || !form.email}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEdit ? 'Simpan' : 'Tambah'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Other Tabs (unchanged)
   ═══════════════════════════════════════════ */

function NotifikasiTab({ notif, setNotif }: { notif: any; setNotif: (v: any) => void }) {
  function toggle(key: string) {
    setNotif((n: any) => ({ ...n, [key]: !n[key] }));
  }

  const items = [
    { key: 'transaksi', label: 'Transaksi Baru', desc: 'Notifikasi saat ada transaksi pembelian atau pembayaran baru.' },
    { key: 'saldoMinus', label: 'Saldo Minus', desc: 'Peringatan saat saldo wilayah menjadi minus.' },
    { key: 'supplierBaru', label: 'Supplier Baru', desc: 'Notifikasi saat supplier baru ditambahkan.' },
    { key: 'laporanMingguan', label: 'Laporan Mingguan', desc: 'Ringkasan mingguan transaksi dan keuangan.' },
    { key: 'emailNotif', label: 'Email Notifikasi', desc: 'Kirim salinan notifikasi ke email.' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Preferensi Notifikasi</CardTitle>
        <CardDescription>Atur notifikasi yang ingin Anda terima.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.map(item => (
          <div key={item.key} className="flex items-center justify-between rounded-lg p-4 hover:bg-accent/50 transition-colors">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <button
              onClick={() => toggle(item.key)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                notif[item.key] ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
                  notif[item.key] ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TampilanTab({ tampilan, setTampilan }: { tampilan: any; setTampilan: (v: any) => void }) {
  function update(key: string, value: string) {
    setTampilan((t: any) => ({ ...t, [key]: value }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Regional</CardTitle>
          <CardDescription>Bahasa dan format yang digunakan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Bahasa</label>
            <select
              value={tampilan.bahasa}
              onChange={e => update('bahasa', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Mata Uang</label>
            <select
              value={tampilan.matauang}
              onChange={e => update('matauang', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="IDR">Rupiah (IDR)</option>
              <option value="USD">US Dollar (USD)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Format Tanggal</label>
            <select
              value={tampilan.formatTanggal}
              onChange={e => update('formatTanggal', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="dd/MM/yyyy">DD/MM/YYYY</option>
              <option value="MM/dd/yyyy">MM/DD/YYYY</option>
              <option value="yyyy-MM-dd">YYYY-MM-DD</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tabel & Data</CardTitle>
          <CardDescription>Pengaturan tampilan data di tabel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Baris per Halaman</label>
            <select
              value={tampilan.barisPerHalaman}
              onChange={e => update('barisPerHalaman', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KeamananTab() {
  const [showPw, setShowPw] = useState(false);
  const [pwOld, setPwOld] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    api.getActivityLog(20).then(setLogs).catch(() => {}).finally(() => setLogsLoading(false));
  }, []);

  const ACTION_LABELS: Record<string, string> = {
    login: 'Login',
    hapus_pembelian: 'Hapus Pembelian',
    hapus_semua_pembelian: 'Hapus Semua Pembelian',
    hapus_pembayaran: 'Hapus Pembayaran',
    hapus_semua_pembayaran: 'Hapus Semua Pembayaran',
  };

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Baru saja';
    if (m < 60) return `${m} menit lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} jam lalu`;
    const d = Math.floor(h / 24);
    return `${d} hari lalu`;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ganti Password</CardTitle>
          <CardDescription>Pastikan password baru minimal 6 karakter.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Password Lama</label>
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                value={pwOld}
                onChange={e => setPwOld(e.target.value)}
                placeholder="Masukkan password lama"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Password Baru</label>
            <Input
              type="password"
              value={pwNew}
              onChange={e => setPwNew(e.target.value)}
              placeholder="Masukkan password baru"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Konfirmasi Password</label>
            <Input
              type="password"
              value={pwConfirm}
              onChange={e => setPwConfirm(e.target.value)}
              placeholder="Ulangi password baru"
            />
          </div>
          <Button className="w-full">Ganti Password</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Log Aktivitas
          </CardTitle>
          <CardDescription>Aktivitas terbaru di sistem.</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /><span>Memuat...</span>
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada aktivitas</p>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{log.user_nama || 'System'}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {ACTION_LABELS[log.action] || log.action}
                      </Badge>
                    </div>
                    {log.target && <p className="text-xs text-muted-foreground truncate">{log.target}</p>}
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">{timeAgo(log.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DataTab() {
  const { user } = useAuth();
  const isOwner = user?.role === 'Owner';
  const [subTab, setSubTab] = useState<'pembelian' | 'hutang'>('pembelian');
  const [purchases, setPurchases] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPurchases({ limit: '500' });
      setPurchases(res.data || []);
    } catch { }
    setLoading(false);
  }, []);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPayments({ limit: '500' });
      setPayments(res.data || []);
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (subTab === 'pembelian') loadPurchases();
    else loadPayments();
  }, [subTab, loadPurchases, loadPayments]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleDeletePurchase(id: number) {
    if (!confirm('Hapus data pembelian ini?')) return;
    setDeletingId(id);
    try {
      await api.deletePurchase(id);
      setPurchases(p => p.filter(x => x.id !== id));
      showToast('1 pembelian dihapus');
    } catch { }
    setDeletingId(null);
  }

  async function handleDeletePayment(id: number) {
    if (!confirm('Hapus data pembayaran ini?')) return;
    setDeletingId(id);
    try {
      await api.deletePayment(id);
      setPayments(p => p.filter(x => x.id !== id));
      showToast('1 pembayaran dihapus');
    } catch { }
    setDeletingId(null);
  }

  async function handleClearAll() {
    const label = subTab === 'pembelian' ? 'HAPUS SEMUA PEMBELIAN' : 'HAPUS SEMUA HUTANG';
    const confirmText = prompt(`Ketik "${label}" untuk konfirmasi:`);
    if (confirmText !== label) return;
    setClearingAll(true);
    try {
      if (subTab === 'pembelian') {
        const res = await api.clearPurchases();
        setPurchases([]);
        showToast(`${res.deleted} pembelian dihapus`);
      } else {
        const res = await api.clearPayments();
        setPayments([]);
        showToast(`${res.deleted} pembayaran dihapus`);
      }
    } catch { }
    setClearingAll(false);
  }

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="py-16">
          <div className="flex flex-col items-center text-center gap-3">
            <Lock className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold">Akses Terbatas</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Hanya akun dengan role <span className="font-semibold text-amber-600">Owner</span> yang dapat mengelola dan menghapus data.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredPurchases = purchases.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.supplier?.name || '').toLowerCase().includes(s)
      || (p.deskripsi || '').toLowerCase().includes(s)
      || (p.wilayah || '').toLowerCase().includes(s);
  });

  const filteredPayments = payments.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.supplier?.name || '').toLowerCase().includes(s)
      || (p.deskripsi || '').toLowerCase().includes(s)
      || (p.wilayah || '').toLowerCase().includes(s);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button
            variant={subTab === 'pembelian' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setSubTab('pembelian'); setSearch(''); }}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Pembelian ({purchases.length})
          </Button>
          <Button
            variant={subTab === 'hutang' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setSubTab('hutang'); setSearch(''); }}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Hutang ({payments.length})
          </Button>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari supplier, deskripsi..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button variant="destructive" size="sm" onClick={handleClearAll} disabled={clearingAll}>
            {clearingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
            Hapus Semua
          </Button>
        </div>
      </div>

      {toast && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm text-green-700 flex items-center gap-2">
            <Check className="h-4 w-4" />{toast}
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Memuat data...</span>
        </div>
      ) : subTab === 'pembelian' ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Tanggal</th>
                    <th className="text-left px-4 py-3 font-medium">Supplier</th>
                    <th className="text-left px-4 py-3 font-medium">Deskripsi</th>
                    <th className="text-left px-4 py-3 font-medium">Wilayah</th>
                    <th className="text-right px-4 py-3 font-medium">Qty</th>
                    <th className="text-right px-4 py-3 font-medium">Total</th>
                    <th className="text-center px-4 py-3 font-medium w-16">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPurchases.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Tidak ada data pembelian</td></tr>
                  ) : filteredPurchases.map(p => (
                    <tr key={p.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-2.5">{fmtDate(p.date)}</td>
                      <td className="px-4 py-2.5 font-medium">{p.supplier?.name || '-'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{p.deskripsi}</td>
                      <td className="px-4 py-2.5">{p.wilayah}</td>
                      <td className="px-4 py-2.5 text-right">{kg(p.qty)}</td>
                      <td className="px-4 py-2.5 text-right">{rupiahFull(p.total)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleDeletePurchase(p.id)}
                          disabled={deletingId === p.id}
                        >
                          {deletingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Tanggal</th>
                    <th className="text-left px-4 py-3 font-medium">Supplier</th>
                    <th className="text-left px-4 py-3 font-medium">Deskripsi</th>
                    <th className="text-left px-4 py-3 font-medium">Wilayah</th>
                    <th className="text-right px-4 py-3 font-medium">Nominal</th>
                    <th className="text-center px-4 py-3 font-medium w-16">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPayments.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada data pembayaran</td></tr>
                  ) : filteredPayments.map(p => (
                    <tr key={p.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-2.5">{fmtDate(p.date)}</td>
                      <td className="px-4 py-2.5 font-medium">{p.supplier?.name || '-'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{p.deskripsi}</td>
                      <td className="px-4 py-2.5">{p.wilayah}</td>
                      <td className="px-4 py-2.5 text-right">{rupiahFull(p.amount)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleDeletePayment(p.id)}
                          disabled={deletingId === p.id}
                        >
                          {deletingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FormField({ icon: Icon, label, value, onChange, type = 'text' }: {
  icon: React.ElementType;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}
