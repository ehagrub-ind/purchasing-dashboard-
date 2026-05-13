# Deployment Guide — IHC Purchasing Dashboard

> Dokumen handoff untuk deploy & maintain di VPS via CLI.

---

## Quick Deploy (Pertama Kali)

```bash
# 1. Clone repo
git clone git@github.com:ehagrub-ind/purchasing-dashboard-.git
cd purchasing-dashboard-

# 2. Build & jalankan semua service
docker compose up -d --build

# 3. Tunggu ~30 detik, cek status
docker compose ps

# 4. Cek health
curl http://localhost:4100/api/health
```

Dashboard bisa diakses di `http://<IP_VPS>:3002`

---

## Update dari Git

```bash
git pull origin main
docker compose up -d --build
```

---

## Fix Error 500 — Kolom Database Belum Ada

Jika ada error `column "xxx" does not exist`, jalankan:

```bash
docker compose exec backend python -c "
from app.database import engine
from app.models import Base
import asyncio
async def fix():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
asyncio.run(fix())
print('OK')
"
```

### Kolom yang mungkin belum ada (tambahan terbaru):

```bash
# sub_bahan di tabel purchases
docker compose exec backend python -c "
from app.database import engine
import asyncio
async def fix():
    async with engine.begin() as conn:
        await conn.execute(__import__('sqlalchemy').text(\"ALTER TABLE purchases ADD COLUMN IF NOT EXISTS sub_bahan VARCHAR DEFAULT ''\"))
asyncio.run(fix())
print('OK')
"
```

---

## Akun Login

| Nama | Email | Role | Password |
|------|-------|------|----------|
| David | david@indohaircorp.co.id | Owner | indohair123 |
| Dian | dian@indohaircorp.co.id | Admin | indohair123 |
| Rigen | rigen@indohaircorp.co.id | PIC | indohair123 |
| Pakde | pakde@indohaircorp.co.id | PIC | indohair123 |
| Demo | demo@indohaircorp.co.id | Admin | indohair123 |

> Password default `indohair123`. Bisa diganti via menu Pengaturan > Keamanan.

---

## Arsitektur & Port

| Service | Internal | External | Keterangan |
|---------|----------|----------|------------|
| PostgreSQL 15 | 5432 | 5436 | Database |
| FastAPI | 8000 | 4100 | Backend API |
| Next.js 14 | 3000 | 3002 | Frontend |

---

## Perintah Berguna

```bash
# Lihat log realtime
docker compose logs -f backend
docker compose logs -f frontend

# Restart tanpa rebuild
docker compose restart

# Rebuild 1 service saja
docker compose up -d --build backend
docker compose up -d --build frontend

# Cek status container
docker compose ps

# Masuk ke database
docker compose exec db psql -U postgres -d purchasing

# Reset total (⚠️ DATA HILANG)
docker compose down -v && docker compose up -d --build
```

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Error 500 / column not exist | Jalankan fix migration di atas |
| Frontend blank / loading terus | `docker compose up -d --build frontend` |
| Backend crash loop | `docker compose logs --tail=50 backend` → fix error → rebuild |
| Port sudah dipakai | `docker compose down && docker compose up -d --build` |
| Database connection refused | `docker compose restart db` → tunggu 10 detik → restart backend |
| Login gagal "Email atau password salah" | Cek user aktif: `curl http://localhost:4100/api/users/` |

---

## Nginx Reverse Proxy (Opsional)

Jika ingin akses via domain:

```nginx
server {
    listen 80;
    server_name purchasing.indohaircorp.co.id;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4100/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Lalu: `sudo nginx -t && sudo systemctl reload nginx`

---

## Backup Database

```bash
# Backup
docker compose exec db pg_dump -U postgres purchasing > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20260513.sql | docker compose exec -T db psql -U postgres purchasing
```
