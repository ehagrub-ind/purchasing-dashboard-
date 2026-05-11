'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
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
    setSubmitting(true);
    setError('');
    try {
      if (isEdit) {
        await api.updateUser(user.id, form);
      } else {
        await api.createUser(form);
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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ganti Password</CardTitle>
          <CardDescription>Pastikan password baru minimal 8 karakter.</CardDescription>
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
          <CardTitle className="text-base">Sesi Aktif</CardTitle>
          <CardDescription>Perangkat yang sedang login.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { device: 'MacBook Air — Chrome', location: 'Surabaya, ID', time: 'Aktif sekarang', current: true },
            { device: 'iPhone 15 — Safari', location: 'Surabaya, ID', time: '2 jam lalu', current: false },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{s.device}</p>
                <p className="text-xs text-muted-foreground">{s.location} · {s.time}</p>
              </div>
              {s.current ? (
                <Badge variant="success">Aktif</Badge>
              ) : (
                <Button variant="outline" size="sm">Logout</Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
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
