'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  User, Bell, Palette, Shield, Save, Check,
  Mail, Phone, MapPin, Building2, Eye, EyeOff,
} from 'lucide-react';

export default function PengaturanPage() {
  const [tab, setTab] = useState('profil');
  const [saved, setSaved] = useState(false);

  const [profil, setProfil] = useState({
    nama: 'Pak Regen',
    email: 'pakregen@purchasing.co.id',
    telepon: '0812-3456-7890',
    perusahaan: 'Purchasing Bahan Baku',
    alamat: 'Jawa Timur, Indonesia',
    role: 'Administrator',
  });

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

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pengaturan</h2>
          <p className="text-sm text-muted-foreground mt-1">Kelola profil, notifikasi, dan preferensi tampilan dashboard.</p>
        </div>
        <Button onClick={handleSave} disabled={saved}>
          {saved ? <Check className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
          {saved ? 'Tersimpan!' : 'Simpan Perubahan'}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="profil"><User className="mr-2 h-4 w-4" />Profil</TabsTrigger>
          <TabsTrigger value="notifikasi"><Bell className="mr-2 h-4 w-4" />Notifikasi</TabsTrigger>
          <TabsTrigger value="tampilan"><Palette className="mr-2 h-4 w-4" />Tampilan</TabsTrigger>
          <TabsTrigger value="keamanan"><Shield className="mr-2 h-4 w-4" />Keamanan</TabsTrigger>
        </TabsList>

        <TabsContent value="profil">
          <ProfilTab profil={profil} setProfil={setProfil} />
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

function ProfilTab({ profil, setProfil }: { profil: any; setProfil: (v: any) => void }) {
  function update(key: string, value: string) {
    setProfil((p: any) => ({ ...p, [key]: value }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary mb-4">
              PR
            </div>
            <h3 className="text-lg font-semibold">{profil.nama}</h3>
            <Badge variant="info" className="mt-1">{profil.role}</Badge>
            <p className="text-sm text-muted-foreground mt-2">{profil.email}</p>
            <Button variant="outline" size="sm" className="mt-4 w-full">Ganti Foto</Button>
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
