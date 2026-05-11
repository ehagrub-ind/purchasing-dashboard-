'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { rupiah, rupiahFull, kg, num, fmtDate } from '@/lib/format';
import Loading from '@/components/Loading';
import DataTable from '@/components/DataTable';

interface Supplier {
  id: number;
  name: string;
  wilayah: string;
  total_kg: number;
  total_transaksi: number;
  total_masuk: number;
  saldo: number;
}

interface SupplierDetail extends Supplier {
  by_kategori: { kategori: string; count: number; total_kg: number; total_nilai: number }[];
  purchases: { date: string; jenis: string; kategori: string; qty: number; price: number; total: number }[];
  payments: { date: string; deskripsi: string; type: string; amount: number }[];
}

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [detail, setDetail] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [wilayah, setWilayah] = useState('');
  const [sort, setSort] = useState('kg');

  useEffect(() => {
    api.getSuppliers()
      .then((data: Supplier[]) => { setSuppliers(data); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  const maxKg = useMemo(() => Math.max(...suppliers.map(s => Number(s.total_kg)), 1), [suppliers]);

  const filtered = useMemo(() => {
    let list = suppliers.filter(s => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (wilayah && s.wilayah !== wilayah) return false;
      return true;
    });
    const sortKey: Record<string, keyof Supplier> = { kg: 'total_kg', transaksi: 'total_transaksi', masuk: 'total_masuk', saldo: 'saldo' };
    const key = sortKey[sort] || 'total_kg';
    list.sort((a, b) => Number(b[key]) - Number(a[key]));
    return list;
  }, [suppliers, search, wilayah, sort]);

  const totals = useMemo(() => suppliers.reduce(
    (a, s) => ({ kg: a.kg + Number(s.total_kg), masuk: a.masuk + Number(s.total_masuk), saldo: a.saldo + Number(s.saldo) }),
    { kg: 0, masuk: 0, saldo: 0 }
  ), [suppliers]);

  async function openDetail(id: number) {
    setLoading(true);
    try {
      const s = await api.getSupplier(id);
      setDetail(s);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  if (error) return <div className="loading">Error: {error}</div>;
  if (loading) return <Loading />;

  if (detail) {
    return <DetailView detail={detail} onBack={() => setDetail(null)} />;
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Supplier</h2>
          <p className="page-subtitle">Ringkasan supplier, total pembelian, dana masuk, dan saldo.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary">+ Tambah Supplier</button>
          <button className="btn">Export</button>
          <button className="btn" onClick={() => window.location.reload()}>Refresh</button>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Total Supplier" value={String(suppliers.length)} color="blue" />
        <StatCard label="Total Kg" value={kg(totals.kg)} color="purple" />
        <StatCard label="Total Dana Masuk" value={rupiah(totals.masuk)} color="green" />
        <StatCard label="Total Saldo" value={rupiah(totals.saldo)} color={totals.saldo >= 0 ? 'green' : 'yellow'} />
      </div>

      <div className="supplier-toolbar">
        <input
          className="search-input"
          type="text"
          placeholder="Cari supplier..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={wilayah} onChange={e => setWilayah(e.target.value)}>
          <option value="">Semua Wilayah</option>
          <option value="Jatim">Jatim</option>
          <option value="Jateng">Jateng</option>
          <option value="Jabar">Jabar</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)}>
          <option value="kg">Total Kg</option>
          <option value="transaksi">Transaksi</option>
          <option value="masuk">Dana Masuk</option>
          <option value="saldo">Saldo</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="supplier-empty">
          <div className="supplier-empty-title">Supplier tidak ditemukan</div>
          <div className="supplier-empty-sub">Coba ubah kata pencarian atau filter wilayah.</div>
        </div>
      ) : (
        <div className="supplier-grid">
          {filtered.map(s => (
            <SupplierCard key={s.id} supplier={s} maxKg={maxKg} onClick={() => openDetail(s.id)} />
          ))}
        </div>
      )}
    </>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="stat-card">
      <div className="stat-card-row">
        <div className={`stat-icon ${color}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
        <div>
          <div className="stat-label">{label}</div>
          <div className={`stat-value ${color}`}>{value}</div>
        </div>
      </div>
    </div>
  );
}

function SupplierCard({ supplier: s, maxKg, onClick }: { supplier: Supplier; maxKg: number; onClick: () => void }) {
  const wLower = s.wilayah.toLowerCase();
  const initials = s.name.slice(0, 2).toUpperCase();
  const pct = maxKg > 0 ? Math.max(4, (Number(s.total_kg) / maxKg) * 100) : 4;
  const saldoColor = Number(s.saldo) >= 0 ? 'green' : 'yellow';

  return (
    <div className="supplier-card" onClick={onClick}>
      <div className="supplier-card-top">
        <div className={`supplier-avatar ${wLower}`}>{initials}</div>
        <div className="supplier-card-info">
          <div className="supplier-name">{s.name}</div>
          <span className={`supplier-wilayah wilayah-${wLower}`}>{s.wilayah}</span>
        </div>
      </div>
      <div className="supplier-card-body">
        <div>
          <div className="supplier-stat-label">Total Kg</div>
          <div className="supplier-stat-value">{kg(s.total_kg)}</div>
        </div>
        <div>
          <div className="supplier-stat-label">Transaksi</div>
          <div className="supplier-stat-value">{num(s.total_transaksi)}</div>
        </div>
        <div>
          <div className="supplier-stat-label">Dana Masuk</div>
          <div className="supplier-stat-value green">{rupiah(s.total_masuk)}</div>
        </div>
        <div>
          <div className="supplier-stat-label">Saldo</div>
          <div className={`supplier-stat-value ${saldoColor}`}>{rupiah(s.saldo)}</div>
        </div>
      </div>
      <div className="supplier-progress">
        <div className="supplier-progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <div className="supplier-card-footer">
        <span className="supplier-detail-link">Detail →</span>
      </div>
    </div>
  );
}

function DetailView({ detail: s, onBack }: { detail: SupplierDetail; onBack: () => void }) {
  const wLower = s.wilayah.toLowerCase();
  const initials = s.name.slice(0, 2).toUpperCase();

  return (
    <>
      <button className="btn-back" onClick={onBack}>← Kembali ke Daftar Supplier</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div className={`supplier-avatar ${wLower}`} style={{ width: 52, height: 52, fontSize: 20 }}>
          {initials}
        </div>
        <div>
          <h2 className="page-title">{s.name}</h2>
          <span className={`supplier-wilayah wilayah-${wLower}`}>{s.wilayah}</span>
        </div>
      </div>

      {s.by_kategori?.length > 0 && (
        <DataTable
          title="Breakdown Kategori"
          columns={[
            { label: 'Kategori' },
            { label: 'Transaksi', align: 'right' },
            { label: 'Total Kg', align: 'right' },
            { label: 'Total Nilai', align: 'right' },
          ]}
          rows={s.by_kategori.map(k => [
            k.kategori,
            num(k.count),
            kg(k.total_kg),
            rupiahFull(k.total_nilai),
          ])}
        />
      )}

      {s.purchases?.length > 0 && (
        <DataTable
          title={`Pembelian (${s.purchases.length})`}
          columns={[
            { label: 'Tanggal' },
            { label: 'Jenis' },
            { label: 'Kategori' },
            { label: 'Qty (kg)', align: 'right' },
            { label: 'Harga', align: 'right' },
            { label: 'Total', align: 'right' },
          ]}
          rows={s.purchases.map(p => [
            fmtDate(p.date),
            p.jenis,
            p.kategori,
            kg(p.qty),
            rupiahFull(p.price),
            rupiahFull(p.total),
          ])}
        />
      )}

      {s.payments?.length > 0 && (
        <DataTable
          title={`Pembayaran (${s.payments.length})`}
          columns={[
            { label: 'Tanggal' },
            { label: 'Keterangan' },
            { label: 'Tipe' },
            { label: 'Jumlah', align: 'right' },
          ]}
          rows={s.payments.map(p => [
            fmtDate(p.date),
            p.deskripsi,
            <span key="badge" className={`badge badge-${p.type.toLowerCase()}`}>{p.type}</span>,
            rupiahFull(p.amount),
          ])}
        />
      )}
    </>
  );
}
