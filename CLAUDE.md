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
| Purchase | purchases | date, supplier_id (FK), wilayah, jenis, kategori, qty, price, total |
| Payment | payments | date, supplier_id (FK), wilayah, amount, type (IN/OUT) |
| Kas | kas | date, wilayah, masuk, keluar, balance |
| Operasional | operasional | wilayah, deskripsi, jumlah |
| Fee | fees | partai, wilayah, kategori, qty, fee, total |

**Auto-create**: Tabel dibuat otomatis via `Base.metadata.create_all` di lifespan.
**Auto-seed**: `seed.py` jalan di startup, cek count sebelum insert.

---

## API Endpoints

Semua endpoint prefix `/api/`. Backend routes HARUS pakai trailing slash (`/stats/`, bukan `/stats`) karena Next.js rewrite menambah trailing slash.

| Method | Path | Keterangan |
|--------|------|------------|
| GET | /api/overview/ | Dashboard summary |
| GET | /api/suppliers/ | List suppliers |
| GET | /api/master-bahan/ | List bahan, filter: kategori, aktif |
| GET | /api/master-bahan/stats/ | Count per kategori |
| GET | /api/master-bahan/{id}/ | Detail bahan |
| POST | /api/master-bahan/ | Buat bahan baru |
| PUT | /api/master-bahan/{id}/ | Update bahan |
| PATCH | /api/master-bahan/{id}/toggle/ | Toggle aktif |
| GET | /api/purchases/ | List pembelian, filter: wilayah, kategori, jenis, page |
| POST | /api/purchases/ | Buat PO baru |
| GET | /api/purchases/stats/ | Statistik pembelian |
| GET | /api/payments/ | List pembayaran |
| GET | /api/kas/ | Arus kas |
| GET | /api/operasional/ | Biaya operasional |
| GET | /api/fees/ | Fee Pak Regen per partai |
| GET | /api/import/ | Data impor (raw) |
| GET | /api/import/summary/ | Ringkasan impor |

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

### Pembelian Lokal

Hierarki: **PIC → Subcon/Supplier → Wilayah → Barang**

**PIC (Person In Charge)**:
- RIGEN — handle wilayah: Purbalingga, Banjarnegara, Wonosobo, Cilacap, Surabaya, Malang, Madiun, Bandung
- PAKDE — handle wilayah: Pemalang, Tegal, Brebes, Kebumen, Kediri, Jember, Ponorogo

**Wilayah per Provinsi**:
- JATENG: Purbalingga, Banjarnegara, Wonosobo, Pemalang, Tegal, Brebes, Cilacap, Kebumen
- JATIM: Surabaya, Malang, Kediri, Jember, Madiun, Ponorogo
- JABAR: Bandung, Bekasi, Bogor, Garut, Tasikmalaya, Ciamis

**Subcon/Petani** = supplier lokal (Pak Tarno, Bu Siti, Pak Joko, dll.), tiap subcon terikat ke 1 wilayah dan 1 PIC.

**Barang Lokal** (kategori RAMBUT + LIMBAH):
| Nama | Harga/Kg (Rp) |
|------|---------------|
| Remy Super | 850.000 |
| Remy Anak | 750.000 |
| Remy Biasa | 650.000 |
| Lus Panjang | 450.000 |
| Lus Pendek | 350.000 |
| Kribo/Ombak | 300.000 |
| Brangkas | 200.000 |
| Uban | 150.000 |
| Gimbal | 100.000 |
| Limbah Rambut | 50.000 |

**Sistem Deposit**: Subcon diberi deposit tunai/transfer. Pembelian mengurangi saldo deposit.

### Pembelian Impor (India)

**Account**: Mr Islam, Pak Ucup
**Mata uang**: USD
**Barang**: Rambut India per ukuran (10"–27")
**Harga**: Per kg per ukuran, makin panjang makin mahal
**Struktur**: Tanggal → Keterangan (Transfer/Receive/Payment tax) → Kg → Harga → Total (USD) → Balance

Contoh range harga (USD/kg):
- 10"–12": $100–140
- 17"–18": $340–375
- 19"–20": $385–425
- 21"–22": $465–475
- 23"–24": $515–530
- 25"–26": $565–580
- 27": $615–630

### Fee Pak Regen

Fee dihitung per partai (Part 1-10), untuk bahan brangkas dan retul 9up.
Fee = Rp 50/kg (dari data RESUME.xlsx).

### Nota/Invoice

Format: `INV-{PROV}-{DATE}-{SEQ}`
Contoh: INV-JTG-20260212-1 (Jawa Tengah, 12 Feb 2026, nota ke-1)
Field: No Invoice, Tanggal, PIC, Subcon, Wilayah, Barang, Qty(kg), Harga/Kg, Total, Saldo Sebelum, Saldo Sesudah, Status, Keterangan

---

## Current State (Per Mei 2026)

### Sudah Selesai
- Overview dashboard dengan KPI cards
- Supplier list + detail
- Master Bahan Baku (CRUD + toggle aktif)
- Pembelian: tab Lokal + Impor, tabel + chart + pagination
- Buat PO modal (3 step: Supplier → Detail Barang → Konfirmasi)
- Keuangan: Kas + Pembayaran
- Fee Report per partai
- Analytics page
- Pengaturan (4 tabs: Profil, Notifikasi, Tampilan, Keamanan)

### Dalam Pengerjaan
- Restructure PO modal: Jalur (Lokal/Impor) → PIC → Supplier → Wilayah flow
- Integrasi master data dari dokumen Excel ke dashboard

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
