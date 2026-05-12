# CLAUDE.md — Purchasing Dashboard (Indo Hair Corp)

> Context file untuk Claude Code. Baca ini sebelum melakukan perubahan apapun.

---

## Project Overview

Dashboard pembelian bahan baku rambut untuk **PT Indo Hair Corp (IHC)**.
Mengelola: pembelian lokal (3 provinsi), impor (India via Mr Islam & Pak Ucup), fee Pak Regen, kas, dan operasional.

**User utama**: Pak Regen (Administrator/PIC lapangan)

---

## Stack — NFPG

| Layer | Tech | Port |
|-------|------|------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS v4 + shadcn/ui | 3002 → 3000 |
| Backend | FastAPI (async) + SQLAlchemy 2.0 (asyncpg) | 4100 → 8000 |
| Database | PostgreSQL 15 (Alpine) | 5436 → 5432 |
| Infra | Docker Compose (3 services) | - |

---

## Architecture

```
purchasing-dashboard/
├── docker-compose.yml
├── data/                         # JSON seed data
│   ├── purchase_data.json
│   ├── kas_data.json
│   ├── operasional_data.json
│   ├── fee_data.json
│   └── import_data.json
│
├── backend-fastapi/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py               # FastAPI app + CORS + SPA fallback
│       ├── database.py           # async engine + session
│       ├── models.py             # SQLAlchemy models (8 tabel)
│       ├── seed.py               # Auto-seed dari JSON
│       ├── schemas.py            # Pydantic schemas (belum banyak dipakai)
│       └── routers/
│           ├── overview.py       # GET /api/overview
│           ├── suppliers.py      # GET /api/suppliers
│           ├── master_bahan.py   # CRUD /api/master-bahan
│           ├── purchases.py      # GET /api/purchases
│           ├── payments.py       # GET /api/payments
│           ├── kas.py            # GET /api/kas
│           ├── operasional.py    # GET /api/operasional
│           ├── fees.py           # GET /api/fees
│           └── import_india.py   # GET /api/import
│
├── frontend-next/
│   ├── Dockerfile
│   ├── next.config.mjs           # standalone + API rewrite
│   ├── app/
│   │   ├── layout.tsx            # Root layout + Sidebar + Topbar
│   │   ├── globals.css           # Tailwind v4 (@import "tailwindcss")
│   │   ├── page.tsx              # Overview dashboard
│   │   ├── supplier/page.tsx
│   │   ├── master-bahan/page.tsx # Master bahan baku CRUD
│   │   ├── pembelian/page.tsx    # Lokal + Impor tabs + Buat PO modal
│   │   ├── keuangan/page.tsx     # Kas + Pembayaran
│   │   ├── fee-report/page.tsx   # Fee Pak Regen per partai
│   │   ├── analytics/page.tsx
│   │   └── pengaturan/page.tsx   # Settings (4 tabs)
│   ├── components/
│   │   ├── Sidebar.tsx           # Left nav
│   │   ├── Topbar.tsx
│   │   ├── DataTable.tsx
│   │   ├── KPICard.tsx
│   │   ├── Loading.tsx
│   │   ├── Pagination.tsx
│   │   └── ui/                   # shadcn-style components
│   │       ├── badge.tsx         # cva variants (default, success, warning, destructive, purple, jateng, jatim, jabar)
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       ├── table.tsx
│   │       └── tabs.tsx
│   └── lib/
│       ├── api.ts                # API client (fetchJSON + manual fetch)
│       ├── format.ts             # rupiah, kg, usd, fmtDate helpers
│       └── utils.ts              # cn() = clsx + tailwind-merge
│
├── backend/                      # DEPRECATED — Node.js + Prisma (jangan pakai)
└── frontend/                     # DEPRECATED — vanilla HTML/JS (jangan pakai)
```

---

## Docker Commands

```bash
# Rebuild semua (setelah code change)
docker compose up -d --build

# Rebuild 1 service
docker compose up -d --build backend
docker compose up -d --build frontend

# Lihat log
docker compose logs -f backend
docker compose logs -f frontend

# Reset database (hapus volume)
docker compose down -v && docker compose up -d --build

# Health check
curl http://localhost:4100/api/health
```

---

## Database Models

| Model | Table | Key Fields |
|-------|-------|------------|
| Supplier | suppliers | name (unique), wilayah |
| MasterBahan | master_bahan | kode_bahan (unique), nama_bahan, kategori_bahan, satuan, aktif |
| Purchase | purchases | date, supplier_id (FK), wilayah, jenis, kategori, qty, price, total, currency |
| Payment | payments | date, supplier_id (FK), wilayah, amount, type (IN/OUT) |
| Kas | kas | date, wilayah, masuk, keluar, balance |
| Operasional | operasional | date, wilayah, deskripsi, jumlah |
| Fee | fees | date, partai, wilayah, kategori, qty, fee, total |
| Penjualan | penjualan | date, customer, jenis, kategori, qty, harga_beli, margin_pct, harga_jual, total, terbayar, status, keterangan |
| Wilayah | wilayah | kode_wilayah, nama_wilayah, provinsi, pic, aktif |
| PIC | pic | kode_pic, nama_pic, telepon, aktif |
| MasterUkuran | master_ukuran | kode_ukuran, nama_ukuran, satuan, aktif |
| MasterWarna | master_warna | kode_warna, nama_warna, aktif |
| Petani | petani | nama, supplier_id (FK), wilayah |

**Auto-create**: Tabel dibuat otomatis via `Base.metadata.create_all` di lifespan.
**Auto-seed**: `seed.py` jalan di startup, cek count sebelum insert.

---

## API Endpoints

Semua endpoint prefix `/api/`. Backend routes HARUS pakai trailing slash (`/stats/`, bukan `/stats`) karena Next.js rewrite menambah trailing slash.

| Method | Path | Keterangan |
|--------|------|------------|
| GET | /api/overview/ | Dashboard summary |
| GET/POST/PUT/DELETE | /api/suppliers/ | CRUD suppliers |
| GET/POST/PUT/PATCH/DELETE | /api/master-bahan/ | CRUD bahan baku + toggle aktif |
| GET/POST/PUT/PATCH/DELETE | /api/wilayah/ | CRUD wilayah + toggle aktif |
| GET/POST/PUT/PATCH/DELETE | /api/pic/ | CRUD PIC + toggle aktif |
| GET/POST/PUT/PATCH/DELETE | /api/master-ukuran/ | CRUD ukuran + toggle aktif |
| GET/POST/PUT/PATCH/DELETE | /api/master-warna/ | CRUD warna + toggle aktif |
| GET/POST/PUT/PATCH/DELETE | /api/petani/ | CRUD petani/subcon |
| GET/POST | /api/purchases/ | List + buat PO, filter: wilayah, kategori, jenis, supplier, page |
| GET | /api/purchases/stats/ | Statistik pembelian per supplier + per bulan |
| GET | /api/payments/ | List pembayaran |
| GET/POST/DELETE | /api/kas/ | Arus kas CRUD |
| GET/POST/DELETE | /api/operasional/ | Biaya operasional CRUD |
| GET/POST/DELETE | /api/fees/ | Fee Pak Regen CRUD |
| GET | /api/import/ | Data impor (raw) |
| GET | /api/import/summary/ | Ringkasan impor |
| GET | /api/hutang/ | Hutang ke supplier (purchases - payments) |
| GET | /api/hutang/stats/ | Ringkasan hutang |
| POST | /api/hutang/{supplier_id}/bayar/ | Bayar hutang supplier |
| GET/POST/PUT/DELETE | /api/piutang/ | CRUD piutang customer |
| GET | /api/penjualan/ | List penjualan, filter: status |
| GET | /api/penjualan/stats/ | Statistik penjualan |
| GET | /api/penjualan/stok/ | Stok per jenis (beli - jual) |
| GET | /api/penjualan/harga-bahan/ | Kontrol harga: rate/kg per supplier per jenis |
| POST | /api/penjualan/ | Buat penjualan (auto-fill harga, validasi stok) |
| POST | /api/penjualan/{id}/bayar/ | Terima pembayaran penjualan |
| DELETE | /api/penjualan/{id}/ | Hapus penjualan |

---

## Critical Conventions

### Trailing Slash (PENTING!)

Next.js rewrite di `next.config.mjs` menambahkan trailing slash:
```
destination: 'http://backend:8000/api/:path*/'
```

FastAPI default redirect trailing → non-trailing (307). Ini GAGAL di Docker karena redirect ke `http://backend:8000` (hostname internal, unreachable dari browser).

**Solusi**: Semua backend sub-routes WAJIB pakai trailing slash:
```python
@router.get("/stats/")    # BENAR
@router.get("/stats")     # SALAH — akan 307
```

### Frontend API Client

- `fetchJSON()` di `lib/api.ts` otomatis tambah trailing slash
- Untuk endpoint custom (POST, PUT, PATCH), pakai `fetch()` langsung DENGAN trailing slash
- Untuk endpoint GET yang bermasalah (stats), bisa pakai `fetch()` langsung

### CSS — Tailwind v4

Menggunakan Tailwind CSS v4 syntax:
```css
@import "tailwindcss";
@theme { ... }
```
BUKAN `@tailwind base; @tailwind components;` (itu v3).

### UI Components

- shadcn/ui style (copy-paste, bukan npm install)
- `cn()` dari `lib/utils.ts` = `clsx` + `tailwind-merge`
- Badge variants: `default`, `secondary`, `success`, `warning`, `destructive`, `purple`, `jateng`, `jatim`, `jabar`
- `cva` (class-variance-authority) untuk component variants

### Format Rupiah

Data di database disimpan dalam **ribuan** (1000 = Rp 1.000.000):
- `rupiah()` / `rupiahFull()` mengalikan × 1000
- `idr()` / `idrFull()` TIDAK mengalikan (untuk nilai absolut)

---

## Domain Knowledge — Bisnis Rambut

### Master Data (dari database)

**PIC**:
| Kode | Nama |
|------|------|
| RIGEN | Rigen |
| PAKDE | Pakde |

**Wilayah**:
| Kode | Nama | Provinsi | PIC |
|------|------|----------|-----|
| JATIM | Jawa Timur | JATIM | RIGEN |
| JABAR | Jawa Barat | JABAR | RIGEN |
| JATENG | Jawa Tengah | JATENG | RIGEN |
| SUMATRA | Sumatra | SUMATRA | RIGEN |
| INDIA | India | INDIA | RIGEN |

**Supplier**:
| ID | Nama | Wilayah |
|----|------|---------|
| 1 | Dani | Jawa Timur |
| 2 | Topik | Jawa Timur |
| 3 | Gandi | Jawa Timur |
| 4 | Regen | Jawa Timur |
| 5 | Indra | Jawa Tengah |
| 6 | Feri | Jawa Tengah |
| 7 | Solihin | Jawa Tengah |
| 8 | Uyi | Jawa Barat |
| 9 | Kosim | Jawa Barat |
| 10 | Mr Islam | India |
| 14 | Pakde | Jawa Timur |

**Bahan Baku** (semua kategori "Bahan Baku"):
| Kode | Nama | Satuan |
|------|------|--------|
| BRK | Brangkas | Kg |
| CCN | Cucian | Kg |
| KRT | Kritingan | Kg |
| LUS | Lus | Kg |
| RMY | Remy | Kg |
| RTL | Retulan | Kg |

**Ukuran**:
- **Inch** (untuk Retulan): 1" sampai 30" — dipakai oleh Mr Islam (India)
- **Cm** (untuk Remy): 5cm, 10cm, 15cm, 20cm, 25cm, 30cm

**Warna**:
| Kode | Nama |
|------|------|
| HT | Hitam |
| UB | Uban |
| MRH | Merah |
| CMR | Campuran |

### Logika Bisnis

**Penjualan**: Dijual ke PT Indo Hair Corp sebagai customer. Margin default 5%.
- Harga jual = harga beli × (1 + margin%)
- Stok = total beli (purchases) - total jual (penjualan) per jenis
- Auto-fill harga beli dari harga terakhir PO

**Hutang 2 Arah**:
- **Hutang** (kita → supplier): dihitung dari total purchases - total payments per supplier
- **Piutang** (PT IHC → kita): dihitung dari penjualan.total - penjualan.terbayar

**Currency**: IDR untuk pembelian lokal, USD untuk impor (India/Mr Islam)

**Kontrol Harga**: Rate/kg per supplier per jenis = total nilai ÷ total kg

### Pembelian Impor (India)

**Account**: Mr Islam
**Mata uang**: USD
**Barang**: Retulan per ukuran inch (7"–30")
**Harga**: Per kg per ukuran, makin panjang makin mahal

### Fee Pak Regen

Fee dihitung per partai (Part 1-10), untuk bahan brangkas dan retul 9up.
Fee = Rp 50/kg (dari data RESUME.xlsx).

### Nota/Invoice

Format: `INV-{PROV}-{DATE}-{SEQ}`
Contoh: INV-JTG-20260212-1 (Jawa Tengah, 12 Feb 2026, nota ke-1)
Field: No Invoice, Tanggal, PIC, Subcon, Wilayah, Barang, Qty(kg), Harga/Kg, Total, Saldo Sebelum, Saldo Sesudah, Status, Keterangan

---

## Current State (Per 12 Mei 2026)

### Sudah Selesai

- Overview dashboard dengan KPI cards
- Supplier CRUD + detail
- Master Data CRUD: Bahan Baku, Wilayah, PIC, Ukuran, Warna, Petani
- Pembelian: tab Lokal + Impor, Buat PO modal, pagination, currency (IDR/USD)
- Keuangan: Kas CRUD, Operasional CRUD, Fee CRUD, Pembayaran
- Hutang (kita → supplier) + Bayar hutang
- Piutang (customer → kita) CRUD
- Penjualan ke PT IHC: CRUD + bayar + stok management + kontrol harga per supplier
- Fee Report per partai
- Analytics page
- Pengaturan (4 tabs: Profil, Notifikasi, Tampilan, Keamanan)

### Belum Dikerjakan

- Deposit management per subcon
- Invoice/nota system
- Rekap saldo per subcon
- Multi-item per nota (1 nota bisa beberapa barang)

---

## Important Rules

- **JANGAN** pakai `backend/` atau `frontend/` folder — itu DEPRECATED, pakai `backend-fastapi/` dan `frontend-next/`
- **JANGAN** definisikan route backend TANPA trailing slash
- **SELALU** rebuild Docker setelah ubah backend code: `docker compose up -d --build backend`
- **SELALU** rebuild Docker setelah ubah frontend dependencies: `docker compose up -d --build frontend`
- **Frontend hot-reload TIDAK bekerja** di Docker — harus rebuild
- Database volume persist, jadi data tidak hilang saat rebuild (kecuali `docker compose down -v`)
- Seed berjalan otomatis, cek count dulu agar tidak duplikat
- Bahasa UI = **Bahasa Indonesia**
- Semua currency lokal dalam **Rupiah (Rp)**, impor dalam **USD ($)**
- Data harga di database disimpan dalam **ribuan rupiah** (bukan rupiah penuh)

---

## Data Source — File Excel

File-file Excel di `/Users/david/Downloads/feepakregen/` dan `/Users/david/Downloads/`:
- `PART 1-10 Fee pak Regen*.xlsx` — Data fee per partai per wilayah
- `RESUME.xlsx` — Ringkasan fee semua partai
- `Purchase_IndoHair_v2.xlsx` — Master Data (Wilayah+PIC, Subcon, Barang), Nota per provinsi, Deposit, Rekap Saldo
- `Account Mr Islam dan Pak Ucup*.xlsx` — Akun impor, raw material, pembayaran
- `MasterData_IndoHairCorp.xlsx` — Master data lengkap
- `HPP_Kalkulator_IndoHairCorp.xlsx` — Kalkulator HPP

Gunakan file-file ini sebagai referensi struktur data dan business logic.
